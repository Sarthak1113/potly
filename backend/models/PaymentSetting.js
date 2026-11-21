const mongoose = require('mongoose');

const paymentSettingSchema = new mongoose.Schema({
  isEnabled: {
    type: Boolean,
    default: true
  },
  upiId: {
    type: String,
    trim: true,
    default: ''
  },
  qrCode: {
    type: String,
    default: ''
  },
  autoReplyTemplate: {
    type: String,
    default: 'Thank you for your payment of ₹{amount}! We have received your screenshot and details. Admin is reviewing your transaction and your exclusive coupon code will be sent here shortly.'
  },
  instructions: {
    type: String,
    default: '1. Scan the QR code or copy the UPI ID.\n2. Pay the exact amount via your UPI app (GPay, PhonePe, Paytm, etc.).\n3. Take a screenshot of the payment receipt showing the UTR / Ref No.\n4. Upload the screenshot and amount below to receive your exclusive coupon.'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('PaymentSetting', paymentSettingSchema);
