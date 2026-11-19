const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const CashoutRule = require('../models/CashoutRule');
const CashoutRequest = require('../models/CashoutRequest');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { getIO } = require('../socket');

// Helper to get or create latest CashoutRule
const getOrCreateRules = async () => {
  let rules = await CashoutRule.findOne().sort({ createdAt: -1 });
  if (!rules) {
    rules = await CashoutRule.create({});
  }
  return rules;
};

// GET /api/cashouts/rules
router.get('/rules', protect, async (req, res) => {
  try {
    const rules = await getOrCreateRules();
    res.json({ success: true, rules });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PUT /api/cashouts/rules
router.put('/rules', protect, adminOnly, async (req, res) => {
  try {
    const { minCashout, maxCashoutPerDay, maxRequestsPerDay, guidelines } = req.body;
    let rules = await CashoutRule.findOne().sort({ createdAt: -1 });
    if (!rules) {
      rules = new CashoutRule({});
    }

    if (minCashout !== undefined && minCashout !== null && minCashout !== '') {
      rules.minCashout = Number(minCashout);
    }
    if (maxCashoutPerDay !== undefined && maxCashoutPerDay !== null && maxCashoutPerDay !== '') {
      rules.maxCashoutPerDay = Number(maxCashoutPerDay);
    }
    if (maxRequestsPerDay !== undefined && maxRequestsPerDay !== null && maxRequestsPerDay !== '') {
      rules.maxRequestsPerDay = Number(maxRequestsPerDay);
    }
    if (guidelines !== undefined && guidelines !== null) {
      rules.guidelines = guidelines;
    }
    rules.updatedBy = req.user.id;
    await rules.save();

    res.json({ success: true, rules, message: 'Rules updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/cashouts/request
router.post('/request', protect, async (req, res) => {
  try {
    const { amount, paymentMethod, paymentDetails } = req.body;
    const numericAmount = Number(amount);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid cashout amount greater than zero'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const rules = await getOrCreateRules();

    // Validation 1: user.balance >= amount
    if (user.balance < numericAmount) {
      return res.status(400).json({
        success: false,
        message: `Cannot cashout more than available balance. Available balance: ₹${user.balance}`
      });
    }

    // Validation 2: amount >= rules.minCashout
    if (numericAmount < rules.minCashout) {
      return res.status(400).json({
        success: false,
        message: `Minimum cashout amount is ₹${rules.minCashout}`
      });
    }

    // Validation 3: Check requests made today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRequests = await CashoutRequest.find({
      userId: user._id,
      createdAt: { $gte: today }
    });

    const sumToday = todayRequests
      .filter(r => r.status === 'approved' || r.status === 'pending')
      .reduce((sum, r) => sum + r.amount, 0);

    if (sumToday + numericAmount > rules.maxCashoutPerDay) {
      return res.status(400).json({
        success: false,
        message: `Daily cashout limit exceeded. You have already requested ₹${sumToday} today. Max allowed per day is ₹${rules.maxCashoutPerDay}.`
      });
    }

    if (todayRequests.length >= rules.maxRequestsPerDay) {
      return res.status(400).json({
        success: false,
        message: `Daily cashout request count limit reached. Maximum ${rules.maxRequestsPerDay} requests allowed per day.`
      });
    }

    // Deduct from user balance immediately (HOLD)
    const balanceBefore = user.balance;
    user.balance -= numericAmount;
    await user.save();

    const request = await CashoutRequest.create({
      userId: user._id,
      amount: numericAmount,
      paymentMethod: paymentMethod || 'upi',
      paymentDetails: paymentDetails || {},
      status: 'pending'
    });

    await Transaction.create({
      userId: user._id,
      amount: numericAmount,
      type: 'debit',
      category: 'cashout_hold',
      description: 'Cashout Request (Held): Funds reserved for withdrawal',
      balanceBefore,
      balanceAfter: user.balance,
      metadata: { cashoutRequestId: request._id }
    });

    try {
      getIO().emit('cashout:new_request', { request, username: user.username });
      getIO().emit('wallet:update', {
        userId: user._id.toString(),
        newBalance: user.balance,
        debited: numericAmount
      });
    } catch (e) {
      console.warn('[Socket] Failed to emit cashout:new_request or wallet:update:', e.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Cashout request submitted for review',
      request,
      newBalance: user.balance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/cashouts/my-requests
router.get('/my-requests', protect, async (req, res) => {
  try {
    const requests = await CashoutRequest.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/cashouts/admin/all
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const [total, requests] = await Promise.all([
      CashoutRequest.countDocuments(query),
      CashoutRequest.find(query)
        .populate('userId', 'username email balance')
        .populate('processedBy', 'username')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
    ]);

    res.json({
      success: true,
      requests,
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

// PATCH /api/cashouts/admin/:id/approve
router.patch('/admin/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const { adminNote } = req.body;
    const request = await CashoutRequest.findById(req.params.id);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cashout request not found or not in pending status'
      });
    }

    const player = await User.findById(request.userId);

    // 1) Transfer amount to Admin wallet (player balance was held at request time)
    const admin = await User.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }
    const adminBalanceBefore = admin.balance;
    admin.balance += request.amount;
    await admin.save();

    await Transaction.create({
      userId: admin._id,
      amount: request.amount,
      type: 'credit',
      category: 'cashout_received',
      description: 'Cashout Received from @' + (player ? player.username : 'player') + ': ' + (adminNote ? adminNote.trim() : 'Approved withdrawal'),
      balanceBefore: adminBalanceBefore,
      balanceAfter: admin.balance,
      metadata: { cashoutRequestId: request._id, playerUsername: player ? player.username : undefined }
    });

    // 2) Update CashoutRequest
    request.status = 'approved';
    request.adminNote = adminNote ? adminNote.trim() : 'Cashout approved and transferred';
    request.processedBy = req.user.id;
    request.processedAt = new Date();
    await request.save();

    // 3) Real-Time Socket Broadcasts
    try {
      const io = getIO();
      io.emit('cashout:updated', {
        requestId: request._id,
        userId: request.userId.toString(),
        status: 'approved',
        adminNote: request.adminNote,
        amount: request.amount
      });
      io.emit('wallet:update', {
        userId: admin._id.toString(),
        newBalance: admin.balance,
        credited: request.amount
      });
    } catch (e) {
      console.warn('[Socket] Failed to emit cashout approval events:', e.message);
    }

    return res.json({
      success: true,
      message: 'Cashout approved and funds transferred to admin wallet',
      request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PATCH /api/cashouts/admin/:id/reject
router.patch('/admin/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const { adminNote } = req.body;
    if (!adminNote || !adminNote.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Admin description/reason is required to reject cashout'
      });
    }

    const request = await CashoutRequest.findById(req.params.id);
    if (!request || request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cashout request not found or not in pending status'
      });
    }

    const player = await User.findById(request.userId);
    if (player) {
      const balanceBefore = player.balance;
      player.balance += request.amount;
      await player.save();

      await Transaction.create({
        userId: player._id,
        amount: request.amount,
        type: 'credit',
        category: 'cashout_refund',
        description: 'Cashout Rejected Refund: ' + adminNote.trim(),
        balanceBefore,
        balanceAfter: player.balance,
        metadata: { cashoutRequestId: request._id, adminNote: adminNote.trim() }
      });
    }

    request.status = 'rejected';
    request.adminNote = adminNote.trim();
    request.processedBy = req.user.id;
    request.processedAt = new Date();
    await request.save();

    try {
      const io = getIO();
      io.emit('cashout:updated', {
        requestId: request._id,
        userId: request.userId.toString(),
        status: 'rejected',
        adminNote: request.adminNote,
        amount: request.amount
      });
      if (player) {
        io.emit('wallet:update', {
          userId: player._id.toString(),
          newBalance: player.balance,
          credited: request.amount
        });
      }
    } catch (e) {
      console.warn('[Socket] Failed to emit cashout rejection event:', e.message);
    }

    return res.json({
      success: true,
      message: 'Cashout request rejected and player refunded',
      request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/cashouts/:id/cancel - Player self-cancels pending cashout
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const request = await CashoutRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Cashout request not found' });
    }

    if (request.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this cashout request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot cancel cashout request with status '${request.status}'` });
    }

    const player = await User.findById(req.user.id);
    if (!player) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const balanceBefore = player.balance;
    player.balance += request.amount;
    await player.save();

    await Transaction.create({
      userId: player._id,
      amount: request.amount,
      type: 'credit',
      category: 'refund',
      description: 'Cashout Cancelled by User: ' + (req.body.reason || 'Player cancelled'),
      balanceBefore,
      balanceAfter: player.balance,
      metadata: { cashoutRequestId: request._id, cancelReason: req.body.reason }
    });

    request.status = 'cancelled';
    request.cancelReason = req.body.reason || 'Player requested cancellation';
    await request.save();

    try {
      const io = getIO();
      io.emit('cashout:cancelled', {
        requestId: request._id,
        username: player.username,
        amount: request.amount,
        reason: req.body.reason
      });
      io.emit('cashout:updated', {
        requestId: request._id,
        userId: player._id.toString(),
        status: 'cancelled',
        cancelReason: request.cancelReason,
        amount: request.amount
      });
      io.emit('wallet:update', {
        userId: player._id.toString(),
        newBalance: player.balance,
        credited: request.amount
      });
    } catch (e) {
      console.warn('[Socket] Failed to emit cashout cancellation events:', e.message);
    }

    return res.json({
      success: true,
      message: 'Cashout cancelled and ₹' + request.amount + ' refunded to your wallet immediately!',
      newBalance: player.balance,
      request
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
