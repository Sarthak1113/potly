const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const Transaction = require('../models/Transaction');

// GET /api/wallet - Get wallet balance and transactions with optional filters and pagination
router.get('/', protect, async (req, res) => {
  try {
    const { type, category, page = 1, limit = 20 } = req.query;
    const query = { userId: req.user.id };

    if (type && type !== 'all') {
      query.type = type;
    }
    if (category && category !== 'all') {
      query.category = category;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const [user, total, transactions] = await Promise.all([
      User.findById(req.user.id),
      Transaction.countDocuments(query),
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      balance: user.balance,
      transactions,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/wallet/redeem - Redeem coupon code
router.post('/redeem', protect, async (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string') return res.status(400).json({ success: false, message: 'Coupon code is required' });

  try {
    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    if (!coupon.isActive) return res.status(400).json({ success: false, message: 'This coupon is no longer active' });
    if (new Date() > coupon.expiryDate) return res.status(400).json({ success: false, message: 'This coupon has expired' });
    if (coupon.timesUsed >= coupon.totalUsesAllowed) return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });

    if (coupon.targetUser && coupon.targetUser.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'This coupon is exclusively reserved for another user' });
    }

    const userUsage = coupon.usedBy.find(u => u.userId.toString() === req.user.id.toString());
    if (userUsage && userUsage.timesUsedByThisUser >= coupon.maxUsesPerUser) {
      return res.status(400).json({ success: false, message: 'You have already used this coupon' });
    }

    const user = await User.findById(req.user.id);
    const balanceBefore = user.balance;
    user.balance += coupon.value;
    user.redeemedCoupons.push({ couponId: coupon._id });
    await user.save();

    coupon.timesUsed += 1;
    if (userUsage) { userUsage.timesUsedByThisUser += 1; } else { coupon.usedBy.push({ userId: req.user.id }); }
    await coupon.save();

    const transaction = await Transaction.create({
      userId: req.user.id,
      amount: coupon.value,
      type: 'credit',
      description: `Coupon redeemed: ${coupon.code} — ${coupon.description || 'Coupon reward'}`,
      category: 'coupon_redemption',
      balanceBefore,
      balanceAfter: user.balance,
      metadata: { couponCode: coupon.code }
    });

    res.json({ success: true, message: `₹${coupon.value} credited to your wallet!`, credited: coupon.value, newBalance: user.balance, transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
