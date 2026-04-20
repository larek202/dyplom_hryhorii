const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const User = require('../models/User');
const {
  notifyBookingCreated,
  notifyBookingCancelled,
  logMail,
} = require('../utils/mailService');

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

// GET /api/bookings?organizerId=... - бронирования пользователя или для событий организатора
router.get('/', authenticate, async (req, res) => {
  try {
    const { organizerId } = req.query;
    let query = {};

    if (organizerId) {
      // Бронирования по событиям указанного организатора
      const organizerEvents = await Event.find({ organizerId }).select('_id');
      query.eventId = { $in: organizerEvents.map((e) => e._id) };
    } else {
      // Бронирования текущего пользователя
      query.userId = req.user._id;
    }

    const bookings = await Booking.find(query)
      .populate('eventId')
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bookings/:eventId - создать бронирование события
router.post('/:eventId', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { seats = 1 } = req.body || {};

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Wydarzenie nie zostało znalezione' });

    // Проверка уникальности (одна бронь на пользователя/событие)
    const existing = await Booking.findOne({ userId: req.user._id, eventId });
    if (existing) {
      return res.status(400).json({ error: 'Rezerwacja już istnieje' });
    }

    const booking = new Booking({
      userId: req.user._id,
      eventId: eventId,
      seats: Number(seats) || 1,
      status: 'confirmed',
    });

    await booking.save();
    const populated = await Booking.findById(booking._id).populate('eventId');

    notifyBookingCreated({ user: req.user, event, booking }).catch((e) => {
      logMail('warn', 'booking-confirmation', 'Failed to send booking confirmation', {
        bookingId: String(booking._id),
        eventId: String(event._id),
        userId: String(req.user._id),
        error: e.message,
      });
    });

    res.status(201).json({ booking: populated });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 11000) {
      // уникальный индекс сработал
      return res.status(400).json({ error: 'Rezerwacja już istnieje' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/bookings/:eventId - отменить бронирование пользователя
router.delete('/:eventId', authenticate, async (req, res) => {
  try {
    const { eventId } = req.params;
    const deleted = await Booking.findOneAndDelete({
      userId: req.user._id,
      eventId,
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Rezerwacja nie została znaleziona' });
    }

    const event = await Event.findById(eventId).select('_id title date');
    if (event) {
      notifyBookingCancelled({ user: req.user, event, booking: deleted }).catch((e) => {
        logMail('warn', 'booking-cancellation', 'Failed to send booking cancellation', {
          bookingId: String(deleted._id),
          eventId: String(event._id),
          userId: String(req.user._id),
          error: e.message,
        });
      });
    }

    res.json({ success: true, eventId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

