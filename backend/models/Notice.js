const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Important Notice for Players',
    trim: true,
    required: true
  },
  content: {
    type: String,
    default: 'Welcome to Potly! Enjoy fair gameplay, live multiplayer game rooms, and instant payouts. Please ensure your account details are verified.',
    trim: true,
    required: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['announcement', 'maintenance', 'offer', 'info', 'warning'],
    default: 'announcement'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
