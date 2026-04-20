const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: [true, 'Название организации обязательно'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  contactEmail: String,
  contactPhone: String,
  website: String,
  city: String,
  logoUrl: String,
  nip: String,
  regon: String,
  facebook: String,
  instagram: String,
  address: {
    street: String,
    city: String,
    zipCode: String,
    country: String,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Обновление updatedAt перед сохранением
organizationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Organization', organizationSchema);








