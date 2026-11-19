const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    unique: true,
    default: () => 'ROOM-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  },
  title: {
    type: String,
    required: [true, 'Room title is required'],
    trim: true
  },
  entryFee: {
    type: Number,
    required: [true, 'Entry fee is required'],
    min: [0, 'Entry fee cannot be negative']
  },
  prize: {
    type: Number,
    required: [true, 'Prize is required'],
    min: [1, 'Prize must be at least 1']
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  maxUsers: {
    type: Number,
    default: null
  },
  minUsers: {
    type: Number,
    default: 2,
    min: 1
  },
  rules: [{
    type: String
  }],
  status: {
    type: String,
    enum: ['open', 'in_progress', 'completed', 'cancelled'],
    default: 'open'
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  endedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
