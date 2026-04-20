const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  seats: {
    type: Number,
    default: 1,
    min: 1,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed',
  },
  reminder24Sent: {
    type: Boolean,
    default: false,
  },
  reminder1Sent: {
    type: Boolean,
    default: false,
  },
  emailReminder24Sent: {
    type: Boolean,
    default: false,
  },
  emailReminder1Sent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

bookingSchema.index({ userId: 1 });
bookingSchema.index({ eventId: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Booking', bookingSchema);


