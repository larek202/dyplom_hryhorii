const Booking = require('../models/Booking');
const Event = require('../models/Event');
const PushToken = require('../models/PushToken');
const User = require('../models/User');
const Like = require('../models/Like');
const { runEmailReminder } = require('./mailService');

const CHECK_INTERVAL_MS = 60 * 1000;
const WINDOW_MINUTES = 5;

const formatEventTime = (date) =>
  new Date(date).toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const sendExpoNotifications = async (messages) => {
  if (!messages.length) return;
  const chunks = chunkArray(messages, 100);
  for (const chunk of chunks) {
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });
    } catch (e) {
      console.warn('⚠️ Expo push error:', e.message);
    }
  }
};

const buildMessages = (bookings, eventMap, tokensByUser, hours) => {
  const messages = [];
  for (const booking of bookings) {
    const event = eventMap.get(String(booking.eventId));
    if (!event) continue;
    const tokens = tokensByUser.get(String(booking.userId)) || [];
    if (!tokens.length) continue;
    const title = event.title || 'Wydarzenie';
    const body =
      hours === 1
        ? `🚀 Już za godzinę start wydarzenia!\n${formatEventTime(event.date)}`
        : `⏰ Już za 24 godziny start wydarzenia!\n${formatEventTime(event.date)}`;
    tokens.forEach((token) => {
      messages.push({
        to: token,
        sound: 'default',
        title,
        body,
        data: {
          type: 'reminder',
          hours,
          eventId: String(event._id),
        },
      });
    });
  }
  return messages;
};


const runReminder = async ({ hours, flagField }) => {
  const now = new Date();
  const targetStart = new Date(now.getTime() + hours * 60 * 60 * 1000 - WINDOW_MINUTES * 60 * 1000);
  const targetEnd = new Date(now.getTime() + hours * 60 * 60 * 1000 + WINDOW_MINUTES * 60 * 1000);

  const events = await Event.find({
    date: { $gte: targetStart, $lte: targetEnd },
  }).select('_id title date');
  if (!events.length) return;

  const eventIds = events.map((event) => event._id);
  const eventMap = new Map(events.map((event) => [String(event._id), event]));

  const bookings = await Booking.find({
    eventId: { $in: eventIds },
    status: { $ne: 'cancelled' },
    [flagField]: { $ne: true },
  }).select('_id userId eventId');

  if (!bookings.length) return;

  const userIds = Array.from(new Set(bookings.map((b) => String(b.userId))));
  const enabledUsers = await User.find({
    _id: { $in: userIds },
    pushEnabled: { $ne: false },
  }).select('_id');
  const enabledIds = enabledUsers.map((u) => String(u._id));
  if (!enabledIds.length) return;
  const tokens = await PushToken.find({ userId: { $in: enabledIds } }).select('userId token');
  const tokensByUser = new Map();
  tokens.forEach((entry) => {
    const key = String(entry.userId);
    if (!tokensByUser.has(key)) tokensByUser.set(key, []);
    tokensByUser.get(key).push(entry.token);
  });

  const messages = buildMessages(bookings, eventMap, tokensByUser, hours);
  await sendExpoNotifications(messages);

  const bookingsWithTokens = bookings
    .filter((b) => (tokensByUser.get(String(b.userId)) || []).length > 0)
    .map((b) => b._id);
  if (bookingsWithTokens.length) {
    await Booking.updateMany(
      { _id: { $in: bookingsWithTokens } },
      { $set: { [flagField]: true } }
    );
  }
};

const startReminderScheduler = () => {
  let running24 = false;
  let running1 = false;
  let cleanupRunning = false;

  setInterval(async () => {
    if (running24) return;
    running24 = true;
    try {
      await runReminder({ hours: 24, flagField: 'reminder24Sent' });
      await runEmailReminder({ hours: 24, flagField: 'emailReminder24Sent' });
    } catch (e) {
      console.warn('⚠️ Reminder 24h failed:', e.message);
    } finally {
      running24 = false;
    }
  }, CHECK_INTERVAL_MS);

  setInterval(async () => {
    if (running1) return;
    running1 = true;
    try {
      await runReminder({ hours: 1, flagField: 'reminder1Sent' });
      await runEmailReminder({ hours: 1, flagField: 'emailReminder1Sent' });
    } catch (e) {
      console.warn('⚠️ Reminder 1h failed:', e.message);
    } finally {
      running1 = false;
    }
  }, CHECK_INTERVAL_MS);

  setInterval(async () => {
    if (cleanupRunning) return;
    cleanupRunning = true;
    try {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const oldEvents = await Event.find({ date: { $lt: cutoff } }).select('_id');
      if (oldEvents.length) {
        const ids = oldEvents.map((e) => e._id);
        await Booking.deleteMany({ eventId: { $in: ids } });
        await Like.deleteMany({ eventId: { $in: ids } });
        await Event.deleteMany({ _id: { $in: ids } });
      }
    } catch (e) {
      console.warn('⚠️ Cleanup old events failed:', e.message);
    } finally {
      cleanupRunning = false;
    }
  }, 24 * 60 * 60 * 1000);
};

module.exports = { startReminderScheduler };

