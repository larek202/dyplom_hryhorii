const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Event = require('../models/Event');
const Like = require('../models/Like');
const jwt = require('jsonwebtoken');

const getFavoritesSnapshot = async (userId) => {
  let likes = await Like.find({ userId })
    .populate('eventId')
    .sort({ createdAt: -1 });

  // Fallback na stare dane: jeśli likes puste, próbujemy jednorazowo zasilić z User.favorites.
  if (!likes.length) {
    const userWithLegacyFavorites = await User.findById(userId).select('favorites');
    const legacyFavorites = Array.isArray(userWithLegacyFavorites?.favorites)
      ? userWithLegacyFavorites.favorites
      : [];
    if (legacyFavorites.length) {
      await Promise.all(
        legacyFavorites.map((eventId) =>
          Like.updateOne(
            { userId, eventId },
            { $setOnInsert: { userId, eventId, createdAt: new Date() } },
            { upsert: true }
          )
        )
      );
      likes = await Like.find({ userId })
        .populate('eventId')
        .sort({ createdAt: -1 });
    }
  }

  const events = likes.map((like) => like.eventId).filter(Boolean);
  const ids = events.map((event) => event._id);
  return { ids, events };
};

// Простое middleware аутентификации (как в events.js)
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }

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

// GET /api/favorites - получить избранное пользователя
router.get('/', authenticate, async (req, res) => {
  try {
    const snapshot = await getFavoritesSnapshot(req.user._id);
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/favorites/:eventId - добавить в избранное
router.post('/:eventId', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }

    await Like.updateOne(
      { userId: req.user._id, eventId },
      { $setOnInsert: { userId: req.user._id, eventId, createdAt: new Date() } },
      { upsert: true }
    );

    const snapshot = await getFavoritesSnapshot(req.user._id);
    res.json(snapshot);
  } catch (error) {
    if (error.code === 11000) {
      const snapshot = await getFavoritesSnapshot(req.user._id);
      return res.json(snapshot);
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/favorites/:eventId - убрать из избранного
router.delete('/:eventId', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    await Like.findOneAndDelete({ userId: req.user._id, eventId });

    const snapshot = await getFavoritesSnapshot(req.user._id);
    res.json(snapshot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;















