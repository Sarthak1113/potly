const mongoose = require('mongoose');

const cashoutRuleSchema = new mongoose.Schema({
  minCashout: { type: Number, default: 100, min: 1 },
  maxCashoutPerDay: { type: Number, default: 5000, min: 10 },
  maxRequestsPerDay: { type: Number, default: 5, min: 1 },
  guidelines: {
    type: String,
    default: 'Withdrawals are processed manually by Admin. Maximum cashout is capped at your available balance. Please ensure your payment details are accurate.'
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('CashoutRule', cashoutRuleSchema);
