const sgMail = require('@sendgrid/mail');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');

const WINDOW_MINUTES = 5;

function nowIso() {
  return new Date().toISOString();
}

function logMail(level, scope, message, meta = {}) {
  const payload = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const line = `[mail][${nowIso()}][${scope}] ${message}${payload}`;
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

function getMailConfigStatus() {
  const hasApiKey = Boolean(process.env.SENDGRID_API_KEY);
  const hasFrom = Boolean(process.env.SENDGRID_FROM);
  return {
    provider: 'sendgrid',
    configured: hasApiKey && hasFrom,
    hasApiKey,
    hasFrom,
    from: process.env.SENDGRID_FROM || null,
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}

function ensureMailConfigured() {
  const status = getMailConfigStatus();
  if (!status.configured) {
    logMail('warn', 'config', 'SendGrid is not configured', status);
    return false;
  }
  if (typeof sgMail.setDataResidency === 'function') {
    sgMail.setDataResidency('eu');
  }
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  return true;
}

async function sendMessages(messages, { scope = 'generic' } = {}) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { attempted: 0, sent: 0, failed: 0, results: [] };
  }
  if (!ensureMailConfigured()) {
    return {
      attempted: messages.length,
      sent: 0,
      failed: messages.length,
      results: messages.map((msg) => ({
        ok: false,
        to: msg.to,
        bookingId: msg.bookingId || null,
        error: 'SendGrid not configured',
      })),
    };
  }

  const settled = await Promise.allSettled(
    messages.map((message) =>
      sgMail.send({
        to: message.to,
        from: message.from || process.env.SENDGRID_FROM,
        subject: message.subject,
        text: message.text,
        html: message.html,
      })
    )
  );

  const results = settled.map((entry, idx) => {
    const base = {
      to: messages[idx].to,
      bookingId: messages[idx].bookingId || null,
      eventId: messages[idx].eventId || null,
      type: messages[idx].type || scope,
    };
    if (entry.status === 'fulfilled') {
      return { ...base, ok: true };
    }
    return {
      ...base,
      ok: false,
      error: entry.reason?.message || String(entry.reason),
    };
  });

  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  logMail('info', scope, 'Send attempt finished', {
    attempted: results.length,
    sent,
    failed,
  });
  if (failed) {
    const sample = results.filter((r) => !r.ok).slice(0, 3);
    logMail('warn', scope, 'Some messages failed', { sample });
  }

  return { attempted: results.length, sent, failed, results };
}

function formatDateTime(date) {
  const d = new Date(date);
  return {
    dateLabel: d.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    timeLabel: d.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

function reminderText(event, hours) {
  const { dateLabel, timeLabel } = formatDateTime(event.date);
  const lead =
    hours === 1
      ? 'To krótkie przypomnienie, że wydarzenie rozpocznie się już za 1 godzinę.'
      : 'To krótkie przypomnienie, że wydarzenie rozpocznie się już za 24 godziny.';
  return [
    'Cześć!',
    '',
    lead,
    '',
    `📌 Wydarzenie: ${event.title}`,
    `🗓 Data: ${dateLabel}`,
    `⏰ Godzina: ${timeLabel}`,
    '',
    'Przygotuj się i dołącz na czas - do zobaczenia wkrótce!',
    '',
    'Pozdrawiamy,',
    'MoveMint',
  ].join('\n');
}

async function getReminderCandidates({ hours, flagField }) {
  const now = new Date();
  const targetMs = hours * 60 * 60 * 1000;
  const windowMs = WINDOW_MINUTES * 60 * 1000;
  const targetStart = new Date(now.getTime() + targetMs - windowMs);
  const targetEnd = new Date(now.getTime() + targetMs + windowMs);

  const events = await Event.find({
    date: { $gte: targetStart, $lte: targetEnd },
  }).select('_id title date');

  if (!events.length) {
    return {
      events: [],
      bookings: [],
      usersById: new Map(),
      eventMap: new Map(),
      targetStart,
      targetEnd,
    };
  }

  const eventIds = events.map((e) => e._id);
  const eventMap = new Map(events.map((e) => [String(e._id), e]));
  const bookings = await Booking.find({
    eventId: { $in: eventIds },
    status: { $ne: 'cancelled' },
    [flagField]: { $ne: true },
  }).select('_id userId eventId status');

  if (!bookings.length) {
    return { events, bookings: [], usersById: new Map(), eventMap, targetStart, targetEnd };
  }

  const userIds = Array.from(new Set(bookings.map((b) => String(b.userId))));
  const users = await User.find({
    _id: { $in: userIds },
    emailEnabled: { $ne: false },
    email: { $exists: true, $ne: '' },
  }).select('_id email firstName name emailEnabled');
  const usersById = new Map(users.map((u) => [String(u._id), u]));

  return { events, bookings, usersById, eventMap, targetStart, targetEnd };
}

function buildReminderMessages({ bookings, usersById, eventMap, hours }) {
  const messages = [];
  for (const booking of bookings) {
    const user = usersById.get(String(booking.userId));
    const event = eventMap.get(String(booking.eventId));
    if (!user?.email || !event) continue;
    messages.push({
      type: 'reminder',
      bookingId: String(booking._id),
      eventId: String(event._id),
      to: user.email,
      subject: `Przypomnienie: ${event.title}`,
      text: reminderText(event, hours),
    });
  }
  return messages;
}

async function runEmailReminder({ hours, flagField, dryRun = false } = {}) {
  const scope = `reminder-${hours}h`;
  const candidates = await getReminderCandidates({ hours, flagField });
  const messages = buildReminderMessages({
    bookings: candidates.bookings,
    usersById: candidates.usersById,
    eventMap: candidates.eventMap,
    hours,
  });

  const preview = {
    scope,
    hours,
    flagField,
    window: {
      from: candidates.targetStart?.toISOString() || null,
      to: candidates.targetEnd?.toISOString() || null,
    },
    matchingEvents: candidates.events.length,
    qualifyingBookings: candidates.bookings.length,
    messageCandidates: messages.length,
  };

  if (dryRun) return { ...preview, dryRun: true };
  if (!messages.length) return { ...preview, sent: 0, failed: 0, marked: 0 };

  const sendResult = await sendMessages(messages, { scope });
  const deliveredBookingIds = sendResult.results
    .filter((r) => r.ok && r.bookingId)
    .map((r) => r.bookingId);

  let marked = 0;
  if (deliveredBookingIds.length) {
    const upd = await Booking.updateMany(
      { _id: { $in: deliveredBookingIds } },
      { $set: { [flagField]: true } }
    );
    marked = upd.modifiedCount || 0;
  }

  logMail('info', scope, 'Reminder run completed', {
    ...preview,
    sent: sendResult.sent,
    failed: sendResult.failed,
    marked,
  });
  return { ...preview, sent: sendResult.sent, failed: sendResult.failed, marked };
}

async function previewEligibleReminderBookings({ hours, flagField }) {
  const candidates = await getReminderCandidates({ hours, flagField });
  const items = candidates.bookings.map((booking) => {
    const user = candidates.usersById.get(String(booking.userId));
    const event = candidates.eventMap.get(String(booking.eventId));
    return {
      bookingId: String(booking._id),
      eventId: event ? String(event._id) : null,
      eventTitle: event?.title || null,
      eventDate: event?.date || null,
      userId: String(booking.userId),
      email: user?.email || null,
      emailEnabled: user?.emailEnabled ?? null,
      willSend: Boolean(user?.email && event),
    };
  });
  return {
    hours,
    flagField,
    window: {
      from: candidates.targetStart?.toISOString() || null,
      to: candidates.targetEnd?.toISOString() || null,
    },
    matchingEvents: candidates.events.length,
    qualifyingBookings: candidates.bookings.length,
    sendableBookings: items.filter((x) => x.willSend).length,
    items,
  };
}

function eventInfoBlock(event) {
  const { dateLabel, timeLabel } = formatDateTime(event.date);
  return [
    `📌 Wydarzenie: ${event.title}`,
    `🗓 Data: ${dateLabel}`,
    `⏰ Godzina: ${timeLabel}`,
  ].join('\n');
}

async function notifyBookingCreated({ user, event, booking }) {
  if (!user?.email || user.emailEnabled === false) return { skipped: true };
  return sendMessages(
    [
      {
        type: 'booking-confirmation',
        to: user.email,
        bookingId: String(booking._id),
        eventId: String(event._id),
        subject: `Potwierdzenie rezerwacji: ${event.title}`,
        text: [
          'Cześć!',
          '',
          'Twoja rezerwacja została potwierdzona.',
          '',
          eventInfoBlock(event),
          '',
          'Do zobaczenia na wydarzeniu!',
          '',
          'Pozdrawiamy,',
          'MoveMint',
        ].join('\n'),
      },
    ],
    { scope: 'booking-confirmation' }
  );
}

async function notifyBookingCancelled({ user, event, booking }) {
  if (!user?.email || user.emailEnabled === false) return { skipped: true };
  return sendMessages(
    [
      {
        type: 'booking-cancellation',
        to: user.email,
        bookingId: String(booking._id),
        eventId: String(event._id),
        subject: `Anulowanie rezerwacji: ${event.title}`,
        text: [
          'Cześć!',
          '',
          'Twoja rezerwacja została anulowana.',
          '',
          eventInfoBlock(event),
          '',
          'Jeśli to pomyłka, możesz zarezerwować ponownie w aplikacji.',
          '',
          'Pozdrawiamy,',
          'MoveMint',
        ].join('\n'),
      },
    ],
    { scope: 'booking-cancellation' }
  );
}

function hasEventSignificantChange(before, payload) {
  const watched = ['title', 'date', 'description', 'city'];
  return watched.some((key) => key in payload && String(before[key] || '') !== String(payload[key] || ''));
}

async function collectEventAudience(eventId) {
  const bookings = await Booking.find({
    eventId,
    status: { $ne: 'cancelled' },
  }).select('_id userId eventId');
  if (!bookings.length) return [];
  const userIds = Array.from(new Set(bookings.map((b) => String(b.userId))));
  const users = await User.find({
    _id: { $in: userIds },
    emailEnabled: { $ne: false },
    email: { $exists: true, $ne: '' },
  }).select('_id email');
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  return bookings
    .map((b) => ({ booking: b, user: userMap.get(String(b.userId)) }))
    .filter((x) => Boolean(x.user?.email));
}

async function notifyEventUpdated({ event, reason = 'Wydarzenie zostało zaktualizowane.' }) {
  const audience = await collectEventAudience(event._id);
  if (!audience.length) return { skipped: true };
  const messages = audience.map(({ booking, user }) => ({
    type: 'event-updated',
    to: user.email,
    bookingId: String(booking._id),
    eventId: String(event._id),
    subject: `Aktualizacja wydarzenia: ${event.title}`,
    text: [
      'Cześć!',
      '',
      reason,
      '',
      eventInfoBlock(event),
      '',
      'Sprawdź szczegóły wydarzenia w aplikacji.',
      '',
      'Pozdrawiamy,',
      'MoveMint',
    ].join('\n'),
  }));
  return sendMessages(messages, { scope: 'event-updated' });
}

async function notifyEventCancelled({ event }) {
  const audience = await collectEventAudience(event._id);
  if (!audience.length) return { skipped: true };
  const messages = audience.map(({ booking, user }) => ({
    type: 'event-cancelled',
    to: user.email,
    bookingId: String(booking._id),
    eventId: String(event._id),
    subject: `Odwołanie wydarzenia: ${event.title}`,
    text: [
      'Cześć!',
      '',
      'Niestety to wydarzenie zostało odwołane.',
      '',
      eventInfoBlock(event),
      '',
      'Przepraszamy za niedogodności.',
      '',
      'Pozdrawiamy,',
      'MoveMint',
    ].join('\n'),
  }));
  return sendMessages(messages, { scope: 'event-cancelled' });
}

module.exports = {
  getMailConfigStatus,
  sendMessages,
  runEmailReminder,
  previewEligibleReminderBookings,
  notifyBookingCreated,
  notifyBookingCancelled,
  notifyEventUpdated,
  notifyEventCancelled,
  hasEventSignificantChange,
  logMail,
};
