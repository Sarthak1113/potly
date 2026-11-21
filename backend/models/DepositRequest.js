const mongoose = require('mongoose');

const depositRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Deposit amount is required'],
    min: [1, 'Amount must be at least ₹1']
  },
  utrReference: {
    type: String,
    trim: true,
    default: ''
  },
  screenshot: {
    type: String,
    required: [true, 'Payment screenshot is required']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  autoReplyMessage: {
    type: String,
    default: ''
  },
  adminReply: {
    type: String,
    default: ''
  },
  couponCode: {
    type: String,
    default: null
  },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    default: null
  },
  expiryDate: {
    type: Date,
    default: null
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// 24-HOUR AUTO-PURGE TTL INDEX:
// MongoDB automatically deletes this document and attached screenshot exactly 86400 seconds (24h) after createdAt
depositRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('DepositRequest', depositRequestSchema);
