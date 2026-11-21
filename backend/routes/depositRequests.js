const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const DepositRequest = require('../models/DepositRequest');
const PaymentSetting = require('../models/PaymentSetting');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const { getIO } = require('../socket');

// Helper to get or initialize payment settings
const getOrCreateSettings = async () => {
  let settings = await PaymentSetting.findOne();
  if (!settings) {
    settings = await PaymentSetting.create({
      upiId: 'potly@upi',
      qrCode: '',
      autoReplyTemplate: 'Thank you for your payment of ₹{amount}! We have received your screenshot and details. Admin is reviewing your transaction and your exclusive coupon code will be sent here shortly.',
      instructions: '1. Scan the QR code or copy the UPI ID.\n2. Pay the exact amount via your UPI app (GPay, PhonePe, Paytm, etc.).\n3. Take a screenshot of the payment receipt showing the UTR / Ref No.\n4. Upload the screenshot and amount below to receive your exclusive coupon.'
    });
  }
  return settings;
};

// GET /api/deposit-requests/payment-info - Get current UPI/QR info for players
router.get('/payment-info', protect, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({
      success: true,
      paymentInfo: {
        upiId: settings.upiId,
        qrCode: settings.qrCode,
        instructions: settings.instructions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/deposit-requests - Player submits payment screenshot & amount
router.post('/', protect, async (req, res) => {
  try {
    const { amount, utrReference, screenshot } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) < 1) {
      return res.status(400).json({ success: false, message: 'Please enter a valid amount (at least ₹1)' });
    }

    if (!screenshot || typeof screenshot !== 'string' || !screenshot.startsWith('data:image')) {
      return res.status(400).json({ success: false, message: 'A valid payment screenshot is required' });
    }

    // Safety guard: reject oversized payloads (> 150KB) to keep database usage ultra-minimal
    if (screenshot.length > 150 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Image size exceeds maximum 150KB limit. Please use the compressed screenshot.'
      });
    }

    // Rate-limit: player cannot have more than 3 pending requests at one time
    const pendingCount = await DepositRequest.countDocuments({
      userId: req.user.id,
      status: 'pending'
    });
    if (pendingCount >= 3) {
      return res.status(400).json({
        success: false,
        message: 'You already have 3 pending deposit requests under review. Please wait for admin approval.'
      });
    }

    const settings = await getOrCreateSettings();
    const template = settings.autoReplyTemplate || 'Thank you for your payment of ₹{amount}! Admin is reviewing your screenshot.';
    const autoReplyMessage = template
      .replace(/{amount}/g, Number(amount).toFixed(2))
      .replace(/{username}/g, req.user.username);

    const depositRequest = await DepositRequest.create({
      userId: req.user.id,
      username: req.user.username,
      amount: Number(amount),
      utrReference: (utrReference || '').trim(),
      screenshot,
      status: 'pending',
      autoReplyMessage
    });

    try {
      getIO().emit('deposit_request:new', {
        id: depositRequest._id,
        _id: depositRequest._id,
        userId: depositRequest.userId,
        username: depositRequest.username,
        amount: depositRequest.amount,
        utrReference: depositRequest.utrReference,
        status: depositRequest.status,
        createdAt: depositRequest.createdAt
      });
    } catch (e) {}

    res.status(201).json({
      success: true,
      message: 'Deposit request submitted successfully! Your coupon will be sent shortly.',
      depositRequest
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/deposit-requests/my - Player views their active requests (last 24 hours)
router.get('/my', protect, async (req, res) => {
  try {
    const requests = await DepositRequest.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/deposit-requests/admin - Admin views all requests (with stats)
router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const [requests, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      DepositRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('reviewedBy', 'username'),
      DepositRequest.countDocuments(filter),
      DepositRequest.countDocuments({ status: 'pending' }),
      DepositRequest.countDocuments({ status: 'approved' }),
      DepositRequest.countDocuments({ status: 'rejected' })
    ]);

    res.json({
      success: true,
      requests,
      stats: {
        total,
        pendingCount,
        approvedCount,
        rejectedCount
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

// POST /api/deposit-requests/admin/:id/approve - Admin approves request & issues exclusive coupon
router.post('/admin/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const { couponCode, expiryDays, expiryDate, adminReply } = req.body;

    const depositRequest = await DepositRequest.findById(req.params.id);
    if (!depositRequest) {
      return res.status(404).json({ success: false, message: 'Deposit request not found' });
    }

    if (depositRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This request is already ${depositRequest.status}`
      });
    }

    // Expiry calculation
    let finalExpiry;
    if (expiryDate) {
      finalExpiry = new Date(expiryDate);
    } else if (expiryDays && !isNaN(Number(expiryDays))) {
      finalExpiry = new Date(Date.now() + Math.max(1, Number(expiryDays)) * 24 * 60 * 60 * 1000);
    } else {
      // Default to 7 days
      finalExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    if (isNaN(finalExpiry.getTime()) || finalExpiry <= new Date()) {
      return res.status(400).json({ success: false, message: 'Expiry date must be in the future' });
    }

    // Determine coupon code (custom or auto-generated)
    let finalCode = (couponCode || '').trim().toUpperCase();
    if (!finalCode) {
      let isUnique = false;
      while (!isUnique) {
        finalCode = 'DEP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const existing = await Coupon.findOne({ code: finalCode });
        if (!existing) isUnique = true;
      }
    } else {
      const existing = await Coupon.findOne({ code: finalCode });
      if (existing) {
        return res.status(400).json({ success: false, message: `Coupon code "${finalCode}" already exists. Please choose a different code.` });
      }
    }

    // Create targeted coupon restricted STRICTLY to the requesting player
    const coupon = await Coupon.create({
      code: finalCode,
      value: depositRequest.amount,
      description: `Exclusive deposit coupon for @${depositRequest.username}`,
      totalUsesAllowed: 1,
      maxUsesPerUser: 1,
      expiryDate: finalExpiry,
      targetUser: depositRequest.userId,
      createdBy: req.user.id
    });

    depositRequest.status = 'approved';
    depositRequest.couponCode = coupon.code;
    depositRequest.couponId = coupon._id;
    depositRequest.expiryDate = finalExpiry;
    depositRequest.adminReply = (adminReply || '').trim() || `Payment approved! Your exclusive coupon code is ${coupon.code}. Valid until ${finalExpiry.toLocaleDateString()}.`;
    depositRequest.reviewedBy = req.user.id;
    depositRequest.reviewedAt = new Date();
    await depositRequest.save();

    try {
      getIO().emit('deposit_request:resolved', {
        id: depositRequest._id,
        _id: depositRequest._id,
        userId: depositRequest.userId,
        status: 'approved',
        couponCode: coupon.code,
        amount: depositRequest.amount,
        adminReply: depositRequest.adminReply,
        expiryDate: depositRequest.expiryDate
      });
    } catch (e) {}

    res.json({
      success: true,
      message: `Deposit approved! Coupon ${coupon.code} issued for @${depositRequest.username}.`,
      depositRequest,
      coupon
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/deposit-requests/admin/:id/reject - Admin rejects payment request
router.post('/admin/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;

    const depositRequest = await DepositRequest.findById(req.params.id);
    if (!depositRequest) {
      return res.status(404).json({ success: false, message: 'Deposit request not found' });
    }

    if (depositRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `This request is already ${depositRequest.status}`
      });
    }

    depositRequest.status = 'rejected';
    depositRequest.adminReply = (reason || '').trim() || 'Payment verification failed. Screenshot or UTR mismatch. Please contact support.';
    depositRequest.reviewedBy = req.user.id;
    depositRequest.reviewedAt = new Date();
    await depositRequest.save();

    try {
      getIO().emit('deposit_request:resolved', {
        id: depositRequest._id,
        _id: depositRequest._id,
        userId: depositRequest.userId,
        status: 'rejected',
        adminReply: depositRequest.adminReply
      });
    } catch (e) {}

    res.json({
      success: true,
      message: 'Deposit request marked as rejected.',
      depositRequest
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/deposit-requests/admin/settings - Get settings for payment info & auto-reply
router.get('/admin/settings', protect, adminOnly, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PUT /api/deposit-requests/admin/settings - Admin updates UPI ID, QR code, and auto-reply template
router.put('/admin/settings', protect, adminOnly, async (req, res) => {
  try {
    const { upiId, qrCode, autoReplyTemplate, instructions } = req.body;

    let settings = await PaymentSetting.findOne();
    if (!settings) {
      settings = new PaymentSetting();
    }

    if (upiId !== undefined) settings.upiId = (upiId || '').trim();
    if (qrCode !== undefined) settings.qrCode = qrCode || '';
    if (autoReplyTemplate !== undefined && autoReplyTemplate.trim()) {
      settings.autoReplyTemplate = autoReplyTemplate.trim();
    }
    if (instructions !== undefined) settings.instructions = instructions;
    settings.updatedBy = req.user.id;

    await settings.save();

    res.json({
      success: true,
      message: 'Payment settings and auto-reply template updated successfully!',
      settings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
