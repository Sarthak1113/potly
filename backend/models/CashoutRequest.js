const mongoose = require('mongoose');

const cashoutRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 1 },
  paymentMethod: { type: String, enum: ['upi', 'bank_transfer', 'other'], default: 'upi' },
  paymentDetails: {
    upiId: String,
    accountNumber: String,
    ifsc: String,
    accountHolderName: String,
    notes: String
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
  cancelReason: { type: String, default: '' },
  adminNote: { type: String, default: '' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('CashoutRequest', cashoutRequestSchema);
