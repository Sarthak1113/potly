const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: [300, 'Description cannot exceed 300 characters']
  },
  category: {
    type: String,
    enum: ['coupon_redemption', 'room_entry', 'prize_won', 'admin_credit', 'refund', 'cashout', 'cashout_hold', 'cashout_received', 'cashout_refund', 'room_commission'],
    required: true
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  metadata: {
    couponCode: String,
    roomId: String,
    adminNote: String,
    cashoutRequestId: mongoose.Schema.Types.Mixed,
    playerUsername: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
