const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [3, 'Code must be at least 3 characters'],
    maxlength: [20, 'Code cannot exceed 20 characters']
  },
  value: {
    type: Number,
    required: [true, 'Coupon value is required'],
    min: [1, 'Value must be at least 1']
  },
  description: {
    type: String,
    default: '',
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  totalUsesAllowed: {
    type: Number,
    required: [true, 'Total uses allowed is required'],
    min: [1, 'Must allow at least 1 use']
  },
  maxUsesPerUser: {
    type: Number,
    default: 1,
    min: [1, 'Must allow at least 1 use per user']
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  timesUsed: {
    type: Number,
    default: 0
  },
  usedBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    usedAt: { type: Date, default: Date.now },
    timesUsedByThisUser: { type: Number, default: 1 }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

couponSchema.virtual('isValid').get(function() {
  return this.isActive && new Date() < this.expiryDate && this.timesUsed < this.totalUsesAllowed;
});

module.exports = mongoose.model('Coupon', couponSchema);
