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

// POST /api/push-tokens - zapisz token urządzenia
router.post('/', authenticate, async (req, res) => {
  try {
    const { token, platform } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Brak tokenu push' });
    }
    const normalizedPlatform = ['ios', 'android', 'web'].includes(platform)
      ? platform
      : 'unknown';
    await PushToken.updateOne(
      { token },
      {
        $set: {
          userId: req.user._id,
          platform: normalizedPlatform,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/push-tokens - список токенов пользователя (debug)

module.exports = router;

