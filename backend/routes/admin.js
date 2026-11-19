const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Room = require('../models/Room');

// GET /api/admin/users - List users with pagination and search
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = 'all' } = req.query;
    const query = {};

    if (search && search.trim()) {
      query.$or = [
        { username: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (role && role !== 'all') {
      query.role = role;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -redeemedCoupons')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/admin/stats - Admin platform statistics
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [totalUsers, totalPlayers, totalTransactions, revenueResult, floatAgg, activeRoomsCount, completedRoomsCount] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'player' }),
      Transaction.countDocuments(),
      Transaction.aggregate([{ $match: { type: 'credit', category: 'coupon_redemption' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      User.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]),
      Room.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
      Room.countDocuments({ status: 'completed' })
    ]);
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalPlayers,
        totalTransactions,
        totalCouponsRedeemed: revenueResult[0]?.total || 0,
        floatingCurrency: floatAgg[0]?.total || 0,
        activeRoomsCount,
        completedRoomsCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/admin/transactions - Master Ledger system-wide transactions
router.get('/transactions', protect, adminOnly, async (req, res) => {
  try {
    const { userId, type, category, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (type && type !== 'all') {
      query.type = type;
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    if (userId && userId !== 'all' && userId.trim()) {
      query.userId = userId.trim();
    }
    if (search && search.trim()) {
      query.description = { $regex: search.trim(), $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const [total, transactions, floatAgg, creditAgg, debitAgg] = await Promise.all([
      Transaction.countDocuments(query),
      Transaction.find(query)
        .populate('userId', 'username email role balance')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      User.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]),
      Transaction.aggregate([{ $match: { type: 'credit' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transaction.aggregate([{ $match: { type: 'debit' } }, { $group: { _id: null, total: { $sum: '$amount' } } }])
    ]);

    const totalFloatingCurrency = floatAgg[0]?.total || 0;
    const totalCredits = creditAgg[0]?.total || 0;
    const totalDebits = debitAgg[0]?.total || 0;

    res.json({
      success: true,
      transactions,
      stats: {
        totalFloatingCurrency,
        totalCredits,
        totalDebits
      },
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

// POST /api/admin/credit - Admin manual credit
router.post('/credit', protect, adminOnly, async (req, res) => {
  const { userId, amount, note } = req.body;
  if (!userId || !amount || amount <= 0) return res.status(400).json({ success: false, message: 'userId and positive amount are required' });
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const balanceBefore = user.balance;
    user.balance += amount;
    await user.save();
    await Transaction.create({ userId: user._id, amount, type: 'credit', description: note || `Admin manual credit of ₹${amount}`, category: 'admin_credit', balanceBefore, balanceAfter: user.balance, metadata: { adminNote: note } });
    res.json({ success: true, message: `₹${amount} credited to ${user.username}`, newBalance: user.balance });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/admin/users/:id/transactions - User audit & transaction breakdown
router.get('/users/:id/transactions', protect, adminOnly, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id).select('-password');
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const transactions = await Transaction.find({ userId: targetUser._id }).sort({ createdAt: -1 });

    const summary = {
      totalCredits: 0,
      totalDebits: 0,
      couponsAdded: 0,
      cashouts: 0,
      winnings: 0,
      roomEntries: 0
    };

    transactions.forEach(t => {
      if (t.type === 'credit') summary.totalCredits += t.amount;
      if (t.type === 'debit') summary.totalDebits += t.amount;
      if (t.category === 'coupon_redemption') summary.couponsAdded += t.amount;
      if (t.category === 'cashout' || t.category === 'cashout_hold') summary.cashouts += t.amount;
      if (t.category === 'prize_won') summary.winnings += t.amount;
      if (t.category === 'room_entry') summary.roomEntries += t.amount;
    });

    res.json({
      success: true,
      user: targetUser,
      transactions,
      summary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
