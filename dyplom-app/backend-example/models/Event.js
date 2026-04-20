const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Название события обязательно'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
  date: {
    type: Date,
  },
  price: {
    type: Number,
    default: 0,
  },
  organizerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  maxParticipants: {
    type: Number,
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  images: [String],
  category: String,
  tags: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Индексы для быстрого поиска
eventSchema.index({ city: 1 });
eventSchema.index({ date: 1 });
eventSchema.index({ organizerId: 1 });
eventSchema.index({ title: 'text', description: 'text' });

// Обновление updatedAt перед сохранением
eventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', eventSchema);
















