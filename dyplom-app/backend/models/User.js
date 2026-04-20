const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: function() {
      return this.role !== 'guest';
    },
  },
  role: {
    type: String,
    enum: ['user', 'organizer', 'guest'],
    default: 'user',
  },
  favorites: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      default: [],
    }
  ],
  avatar: String,
  pushEnabled: {
    type: Boolean,
    default: true,
  },
  emailEnabled: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Заполняем name из firstName/lastName если не задано явно
userSchema.pre('validate', function(next) {
  if (!this.name) {
    const fullName = [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
    if (fullName) {
      this.name = fullName;
    }
  }
  next();
});

// Хеширование пароля перед сохранением
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Метод для проверки пароля
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);


