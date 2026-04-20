const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const Organization = require('../models/Organization');
const {
  hasEventSignificantChange,
  notifyEventUpdated,
  notifyEventCancelled,
  logMail,
} = require('../utils/mailService');

const MAX_EVENT_IMAGES = 5;

/**
 * Walidacja URL-i zdjęć (S3 lub HTTPS). Odrzuca base64 w JSON — klient ma użyć POST /api/upload.
 */
function applyEventImagesRules(payload) {
  if (!('images' in payload)) return;
  let images = Array.isArray(payload.images) ? payload.images : [];
  images = images
    .map((u) => String(u || '').trim())
    .filter(Boolean)
    .slice(0, MAX_EVENT_IMAGES);
  for (const u of images) {
    if (u.startsWith('data:')) {
      throw new Error(
        'Zdjęcia wydarzenia muszą być przesłane przez endpoint /api/upload (S3), a nie jako base64 w JSON.',
      );
    }
    if (!/^https?:\/\//i.test(u)) {
      throw new Error('Każde zdjęcie musi być poprawnym adresem URL (https://).');
    }
  }
  payload.images = images;
  let idx = Number(payload.coverImageIndex);
  if (!Number.isFinite(idx) || idx < 0) idx = 0;
  payload.coverImageIndex = images.length ? Math.min(Math.floor(idx), images.length - 1) : 0;
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Z query: `category` (jedna lub powtórzenia) lub `categories` (CSV). */
function parseCategoryTokens(req) {
  const list = [];
  const csv = req.query.categories;
  if (csv != null) {
    if (Array.isArray(csv)) {
      for (const part of csv) {
        list.push(...String(part).split(',').map((s) => s.trim()).filter(Boolean));
      }
    } else if (String(csv).trim()) {
      list.push(...String(csv).split(',').map((s) => s.trim()).filter(Boolean));
    }
  }
  const one = req.query.category;
  if (one != null) {
    if (Array.isArray(one)) {
      one.forEach((x) => {
        const t = String(x).trim();
        if (t) list.push(t);
      });
    } else if (String(one).trim()) {
      list.push(String(one).trim());
    }
  }
  return [...new Set(list)];
}

/**
 * `category` = główna; `categories` = tylko dodatkowe (bez duplikatu głównej).
 * Legacy: samo `categories` — pierwsza pozycja staje się główną.
 */
function normalizeEventCategories(payload) {
  const primary = String(payload.category || '').trim();
  let additional = Array.isArray(payload.categories)
    ? payload.categories.map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  additional = [...new Set(additional)];

  if (primary) {
    additional = additional.filter((x) => x !== primary);
    payload.category = primary;
    payload.categories = additional;
    return;
  }

  if (additional.length > 0) {
    payload.category = additional[0];
    payload.categories = additional.slice(1);
    return;
  }

  payload.category = undefined;
  payload.categories = [];
}

// Middleware для проверки аутентификации
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Невалидный или истекший токен' });
    }
    res.status(500).json({ error: error.message });
  }
};

// GET /api/events - Получить все события с фильтрацией
router.get('/', async (req, res) => {
  try {
    const { city, search, date, address, organizerId, page = 1, limit = 20 } = req.query;

    const andParts = [];

    if (city && String(city).trim()) {
      andParts.push({ city: new RegExp(escapeRegex(String(city).trim()), 'i') });
    }

    if (organizerId) {
      andParts.push({ organizerId });
    }

    if (search && String(search).trim()) {
      const s = new RegExp(escapeRegex(String(search).trim()), 'i');
      andParts.push({
        $or: [
          { title: s },
          { description: s },
          { city: s },
          { 'location.address': s },
          { 'location.street': s },
          { 'location.houseNumber': s },
        ],
      });
    }

    if (address && String(address).trim()) {
      const a = new RegExp(escapeRegex(String(address).trim()), 'i');
      andParts.push({
        $or: [{ 'location.address': a }, { 'location.street': a }, { 'location.houseNumber': a }],
      });
    }

    const categoryTokens = parseCategoryTokens(req);
    if (categoryTokens.length === 1) {
      const c = new RegExp(escapeRegex(categoryTokens[0]), 'i');
      andParts.push({
        $or: [{ category: c }, { categories: c }],
      });
    } else if (categoryTokens.length > 1) {
      andParts.push({
        $or: categoryTokens.map((token) => {
          const c = new RegExp(escapeRegex(token), 'i');
          return { $or: [{ category: c }, { categories: c }] };
        }),
      });
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(String(date).trim())) {
      const d = String(date).trim();
      const start = new Date(`${d}T00:00:00.000Z`);
      const end = new Date(`${d}T23:59:59.999Z`);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        andParts.push({ date: { $gte: start, $lte: end } });
      }
    }

    const query = andParts.length ? { $and: andParts } : {};

    // Пагинация
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const events = await Event.find(query)
      .populate('organizerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const organizerIds = events
      .map((event) => event.organizerId?._id || event.organizerId)
      .filter(Boolean);
    const organizations = organizerIds.length
      ? await Organization.find({ userId: { $in: organizerIds } }).select('userId name')
      : [];
    const orgNameByUserId = organizations.reduce((acc, org) => {
      acc[org.userId.toString()] = org.name;
      return acc;
    }, {});

    const mappedEvents = events.map((event) => {
      const ev = event.toObject ? event.toObject() : event;
      const organizerId = ev.organizerId?._id || ev.organizerId;
      return {
        ...ev,
        organizationName: organizerId ? orgNameByUserId[organizerId.toString()] : undefined,
      };
    });
    
    const total = await Event.countDocuments(query);
    
    res.json({
      events: mappedEvents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/events/:id - Получить одно событие
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizerId', 'name email avatar');
    
    if (!event) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }
    
    const organizerId = event.organizerId?._id || event.organizerId;
    const organization = organizerId
      ? await Organization.findOne({ userId: organizerId }).select(
          'name description contactEmail contactPhone website city logoUrl nip regon facebook instagram address'
        )
      : null;
    const response = event.toObject ? event.toObject() : event;
    res.json({
      ...response,
      organizationName: organization?.name,
      organization,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/events - Создать событие (только для организаторов)
router.post('/', authenticate, async (req, res) => {
  try {
    // Проверка, что пользователь является организатором
    if (req.user.role !== 'organizer') {
      return res.status(403).json({ 
        error: 'Только организаторы могут создавать события' 
      });
    }

    // Создаем событие с автоматическим указанием организатора
    const payload = { ...req.body };
    normalizeEventCategories(payload);
    try {
      applyEventImagesRules(payload);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
    const event = new Event({
      ...payload,
      organizerId: req.user._id, // Автоматически подставляем ID организатора из токена
    });
    
    await event.save();
    
    const populatedEvent = await Event.findById(event._id)
      .populate('organizerId', 'name email');
    
    res.status(201).json(populatedEvent);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/events/:id - Обновить событие (только владелец)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }

    // Проверка, что пользователь является владельцем события
    if (event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Вы можете редактировать только свои события' });
    }

    const payload = { ...req.body };
    if ('category' in payload || 'categories' in payload) {
      normalizeEventCategories(payload);
    }
    try {
      if (Array.isArray(payload.images)) {
        applyEventImagesRules(payload);
      } else if (payload.coverImageIndex !== undefined) {
        const imgs = event.images || [];
        let idx = Number(payload.coverImageIndex);
        if (!Number.isFinite(idx) || idx < 0) idx = 0;
        payload.coverImageIndex = imgs.length ? Math.min(Math.floor(idx), imgs.length - 1) : 0;
      }
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    const shouldNotifyUpdate = hasEventSignificantChange(event, payload);
    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    ).populate('organizerId', 'name email');

    if (shouldNotifyUpdate && updatedEvent) {
      notifyEventUpdated({
        event: updatedEvent,
        reason: 'Wydarzenie, na które masz rezerwację, zostało zaktualizowane.',
      }).catch((e) => {
        logMail('warn', 'event-updated', 'Failed to send event update email', {
          eventId: String(updatedEvent._id),
          error: e.message,
        });
      });
    }

    res.json(updatedEvent);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/events/:id - Удалить событие (только владелец)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }

    // Проверка, что пользователь является владельцем события
    if (event.organizerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Вы можете удалять только свои события' });
    }

    await Event.findByIdAndDelete(req.params.id);

    notifyEventCancelled({ event }).catch((e) => {
      logMail('warn', 'event-cancelled', 'Failed to send event cancellation email', {
        eventId: String(event._id),
        error: e.message,
      });
    });

    res.json({ message: 'Событие успешно удалено', id: event._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

