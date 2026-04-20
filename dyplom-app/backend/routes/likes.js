const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Like = require('../models/Like');
const Event = require('../models/Event');
const User = require('../models/User');

// Proste middleware autoryzacji
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Brak tokenu' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: 'Nie znaleziono użytkownika' });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
    }
    res.status(500).json({ error: error.message });
  }
};

// GET /api/likes - lajki zalogowanego użytkownika
router.get('/', authenticate, async (req, res) => {
  try {
    const likes = await Like.find({ userId: req.user._id }).select('eventId');
    const ids = likes.map((l) => l.eventId?.toString?.() || l.eventId);
    res.json({ ids });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/likes/counts?eventIds=1,2,3&organizerId=... - liczba lajków dla listy wydarzeń lub wszystkich wydarzeń organizatora
router.get('/counts', authenticate, async (req, res) => {
  try {
    const { eventIds, organizerId: organizerIdRaw } = req.query;
    const organizerId = organizerIdRaw || (req.user && req.user._id && req.user._id.toString());

    // priorytet: podane eventIds; jeśli brak, bierzemy wydarzenia organizatora
    let idsArray = Array.isArray(eventIds)
      ? eventIds
      : typeof eventIds === 'string'
        ? eventIds.split(',').filter(Boolean)
        : [];

    if (!idsArray.length && organizerId) {
      const organizerQuery = {
        $or: [
          { organizerId },
          (() => {
            try {
              return { organizerId: require('mongoose').Types.ObjectId(organizerId) };
            } catch {
              return null;
            }
          })(),
        ].filter(Boolean),
      };
      const organizerEvents = await Event.find(organizerQuery).select('_id');
      idsArray = organizerEvents.map((e) => e._id.toString());
    }

    if (!idsArray.length) {
      return res.json({ counts: {} });
    }

    const objectIds = [];
    const stringIds = [];
    idsArray.forEach((id) => {
      stringIds.push(id);
      try {
        objectIds.push(require('mongoose').Types.ObjectId(id));
      } catch {
        // ignore invalid ObjectId
      }
    });

    const matchOr = [];
    if (objectIds.length) matchOr.push({ eventId: { $in: objectIds } });
    if (stringIds.length) matchOr.push({ eventIdStr: { $in: stringIds } });
    const matchStage = matchOr.length ? { $or: matchOr } : {};

    const agg = await Like.aggregate([
      { $addFields: { eventIdStr: { $toString: '$eventId' } } },
      { $match: matchStage },
      { $group: { _id: '$eventIdStr', count: { $sum: 1 } } },
    ]);
    const counts = {};
    agg.forEach((item) => {
      counts[item._id] = item.count;
    });
    res.json({ counts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/likes/:eventId - dodaj lajk
router.post('/:eventId', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const exists = await Like.findOne({ userId: req.user._id, eventId });
    if (exists) {
      return res.status(200).json({ success: true, eventId });
    }
    const like = new Like({
      userId: req.user._id,
      eventId,
    });
    await like.save();
    res.status(201).json({ success: true, eventId });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ success: true, eventId: req.params.eventId });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/likes/:eventId - usuń lajk użytkownika
router.delete('/:eventId', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    await Like.findOneAndDelete({ userId: req.user._id, eventId });
    res.json({ success: true, eventId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


