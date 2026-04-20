const express = require('express');
const router = express.Router();
const Event = require('../models/Event');

// GET /api/events - Получить все события с фильтрацией
router.get('/', async (req, res) => {
  try {
    const { city, search, organizerId, page = 1, limit = 20 } = req.query;
    
    // Построение запроса
    let query = {};
    
    if (city) {
      query.city = new RegExp(city, 'i');
    }
    
    if (organizerId) {
      query.organizerId = organizerId;
    }
    
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
      ];
    }
    
    // Пагинация
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const events = await Event.find(query)
      .populate('organizerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Event.countDocuments(query);
    
    res.json({
      events,
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
    
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/events - Создать событие
router.post('/', async (req, res) => {
  try {
    const event = new Event(req.body);
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

// PUT /api/events/:id - Обновить событие
router.put('/:id', async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('organizerId', 'name email');
    
    if (!event) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }
    
    res.json(event);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/events/:id - Удалить событие
router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    
    if (!event) {
      return res.status(404).json({ error: 'Событие не найдено' });
    }
    
    res.json({ message: 'Событие успешно удалено', id: event._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
















