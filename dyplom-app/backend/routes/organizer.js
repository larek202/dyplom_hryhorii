const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Organization = require('../models/Organization');
const User = require('../models/User');

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

// GET /api/organizer/by-user/:userId — publiczny podgląd profilu organizacji (wg konta użytkownika)
router.get('/by-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Nieprawidłowy identyfikator organizatora.' });
    }
    const user = await User.findById(userId).select('_id role');
    if (!user || user.role !== 'organizer') {
      return res.status(404).json({ error: 'Organizator nie został znaleziony.' });
    }
    const organization = await Organization.findOne({ userId: user._id }).select(
      'name description contactEmail contactPhone website city logoUrl facebook instagram address',
    );
    if (!organization) {
      return res.status(404).json({ error: 'Profil organizacji nie istnieje.' });
    }
    res.json({ organization });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/organizer/register - Регистрация организатора
router.post('/register', authenticate, async (req, res) => {
  try {
    const {
      name,
      description,
      contactEmail,
      contactPhone,
      website,
      address,
      city,
      logoUrl,
      nip,
      regon,
      facebook,
      instagram,
    } = req.body;

    // Валидация
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        error: 'Название организации обязательно' 
      });
    }

    // Проверка, не является ли пользователь уже организатором
    if (req.user.role === 'organizer') {
      return res.status(400).json({ 
        error: 'Вы уже зарегистрированы как организатор' 
      });
    }

    // Проверка, не зарегистрирована ли уже организация для этого пользователя
    const existingOrg = await Organization.findOne({ userId: req.user._id });
    if (existingOrg) {
      return res.status(400).json({ 
        error: 'Организация уже зарегистрирована для этого пользователя' 
      });
    }

    // Создание организации
    const cityValue = city?.trim();
    const addressValue =
      typeof address === 'object' && address
        ? {
            street: address.street?.trim(),
            city: address.city?.trim() || cityValue,
            zipCode: address.zipCode?.trim(),
            country: address.country?.trim(),
          }
        : address?.trim() || cityValue
        ? { street: address?.trim(), city: cityValue }
        : undefined;

    const organization = new Organization({
      userId: req.user._id,
      name: name.trim(),
      description: description?.trim(),
      contactEmail: contactEmail?.trim(),
      contactPhone: contactPhone?.trim(),
      website: website?.trim(),
      address: addressValue,
      city: cityValue,
      logoUrl: logoUrl?.trim(),
      nip: nip?.trim(),
      regon: regon?.trim(),
      facebook: facebook?.trim(),
      instagram: instagram?.trim(),
      status: 'approved', // Автоматическое одобрение для упрощения
    });

    await organization.save();

    // Обновление роли пользователя
    req.user.role = 'organizer';
    await req.user.save();

    res.status(201).json({
      message: 'Регистрация организатора прошла успешно',
      organization: {
        id: organization._id,
        name: organization.name,
        description: organization.description,
        status: organization.status,
      },
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/organizer/profile - Получить профиль организатора
router.get('/profile', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'organizer') {
      return res.status(403).json({ error: 'Доступ запрещен. Требуется роль организатора' });
    }

    const organization = await Organization.findOne({ userId: req.user._id });
    
    if (!organization) {
      return res.status(404).json({ error: 'Организация не найдена' });
    }

    res.json({ organization });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/organizer/profile - Обновить профиль организатора
router.put('/profile', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'organizer') {
      return res.status(403).json({ error: 'Доступ запрещен. Требуется роль организатора' });
    }

    const organization = await Organization.findOne({ userId: req.user._id });
    if (!organization) {
      return res.status(404).json({ error: 'Организация не найдена' });
    }

    const updatableFields = [
      'name',
      'description',
      'contactEmail',
      'contactPhone',
      'website',
      'city',
      'logoUrl',
      'nip',
      'regon',
      'facebook',
      'instagram',
    ];

    updatableFields.forEach((field) => {
      if (typeof req.body[field] !== 'undefined') {
        const value = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
        organization[field] = value === '' ? undefined : value;
      }
    });

    if (typeof req.body.address !== 'undefined') {
      const address = req.body.address;
      if (typeof address === 'object' && address) {
        organization.address = {
          ...organization.address?.toObject?.(),
          street: address.street?.trim(),
          city: address.city?.trim() || organization.city,
          zipCode: address.zipCode?.trim(),
          country: address.country?.trim(),
        };
      } else {
        const streetValue = typeof address === 'string' ? address.trim() : undefined;
        const cityValue =
          typeof req.body.city === 'string' ? req.body.city.trim() : organization.city;
        organization.address = {
          street: streetValue || undefined,
          city: cityValue,
        };
      }
    }

    await organization.save();

    res.json({ organization });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;








