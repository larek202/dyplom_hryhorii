const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PushToken = require('../models/PushToken');

const router = express.Router();

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

const sendExpoNotifications = async (messages) => {
  if (!messages.length) return { data: [] };
  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(messages),
  });
  return { status: response.status };
};

// POST /api/push-test
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, body, eventId } = req.body || {};
    if (req.user?.pushEnabled === false) {
      return res.status(400).json({ error: 'Powiadomienia push są wyłączone' });
    }
    const tokens = await PushToken.find({ userId: req.user._id }).select('token');
    if (!tokens.length) {
      return res.status(400).json({ error: 'Brak tokenów push dla użytkownika' });
    }
    const messages = tokens.map((t) => ({
      to: t.token,
      sound: 'default',
      title: title || 'Test powiadomienia',
      body: body || 'To jest testowe powiadomienie push.',
      data: eventId ? { eventId } : { type: 'test' },
    }));
    await sendExpoNotifications(messages);
    res.json({ success: true, sent: messages.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/push-test/ping
router.get('/ping', (req, res) => {
  res.json({ ok: true });
});

module.exports = router;
