const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper: get userId from Bearer token
const getUserIdFromRequest = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  return decoded.userId;
};

// Генерация JWT токена
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// POST /api/auth/register - Регистрация нового пользователя
router.post('/register', async (req, res) => {
  try {
    const { name, firstName, lastName, email, password, role = 'user', avatar } = req.body;

    const finalName = (name || '').trim() || [firstName, lastName].filter(Boolean).join(' ').trim();

    // Walidacja
    if (!finalName || !email || !password) {
      return res.status(400).json({ 
        error: 'Imię, nazwisko i e-mail są wymagane' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Hasło musi mieć co najmniej 6 znaków' 
      });
    }

    // Sprawdzamy, czy użytkownik istnieje
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'Użytkownik z takim adresem e-mail już istnieje' 
      });
    }

    // Tworzenie nowego użytkownika
    const user = new User({
      name: finalName,
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      role,
      avatar,
      pushEnabled: true,
      emailEnabled: true,
    });

    await user.save();

    // Generowanie tokenu
    const token = generateToken(user._id);

    // Zwracamy użytkownika bez hasła
    const userResponse = {
      id: user._id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      pushEnabled: user.pushEnabled,
      emailEnabled: user.emailEnabled,
    };

    res.status(201).json({
      user: userResponse,
      token,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /api/auth/login - Вход пользователя
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Walidacja
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'E-mail i hasło są wymagane' 
      });
    }

    // Szukamy użytkownika
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        error: 'Nieprawidłowy e-mail lub hasło' 
      });
    }

    // Sprawdzamy hasło
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Nieprawidłowy e-mail lub hasło' 
      });
    }

    // Generowanie tokenu
    const token = generateToken(user._id);

    // Zwracamy użytkownika bez hasła
    const userResponse = {
      id: user._id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      pushEnabled: user.pushEnabled,
      emailEnabled: user.emailEnabled,
    };

    res.json({
      user: userResponse,
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/auth/me - Pobierz aktualnego użytkownika (wymaga tokenu)
router.get('/me', async (req, res) => {
  try {
    // Pobieramy token z nagłówka
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Brak tokenu' });
    }

    // Weryfikujemy token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'Nie znaleziono użytkownika' });
    }

    const userResponse = {
      id: user._id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      pushEnabled: user.pushEnabled,
      emailEnabled: user.emailEnabled,
    };

    res.json({ user: userResponse });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/profile - Aktualizacja profilu (imię, nazwisko, email)
router.put('/profile', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Brak tokenu' });
    }

    const { firstName, lastName, name, email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail jest wymagany' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }

    // Sprawdzenie czy email nie jest zajęty przez innego użytkownika
    const emailLower = email.toLowerCase();
    const existingByEmail = await User.findOne({ email: emailLower });
    if (existingByEmail && existingByEmail._id.toString() !== userId.toString()) {
      return res.status(400).json({ error: 'Email jest już zajęty' });
    }

    user.firstName = firstName ?? user.firstName;
    user.lastName = lastName ?? user.lastName;
    user.name = (name || '').trim() || [firstName, lastName].filter(Boolean).join(' ').trim() || user.name;
    user.email = emailLower;
    if (req.body.avatar) {
      user.avatar = req.body.avatar;
    }

    await user.save();

    const userResponse = {
      id: user._id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      pushEnabled: user.pushEnabled,
      emailEnabled: user.emailEnabled,
    };

    res.json({ user: userResponse });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/notifications - Aktualizacja ustawień powiadomień
router.put('/notifications', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Brak tokenu' });
    }
    const { pushEnabled, emailEnabled } = req.body || {};
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }
    if (typeof pushEnabled === 'boolean') {
      user.pushEnabled = pushEnabled;
    }
    if (typeof emailEnabled === 'boolean') {
      user.emailEnabled = emailEnabled;
    }
    await user.save();
    res.json({
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        pushEnabled: user.pushEnabled,
        emailEnabled: user.emailEnabled,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/auth/password - Zmiana hasła
router.put('/password', async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Brak tokenu' });
    }

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Hasło musi mieć co najmniej 6 znaków' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Użytkownik nie znaleziony' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Hasło zostało zmienione' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Nieprawidłowy lub wygasły token' });
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;



