const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Coupon = require('../models/Coupon');

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status } = req.query;
    const query = {};
    if (search) query.code = { $regex: search.toUpperCase(), $options: 'i' };
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;
    const total = await Coupon.countDocuments(query);
    const coupons = await Coupon.find(query)
      .populate('createdBy', 'username')
      .populate('targetUser', 'username email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    res.json({ success: true, coupons, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  const { code, value, description, totalUsesAllowed, maxUsesPerUser, expiryDate, targetUser } = req.body;
  if (!code || !value || !totalUsesAllowed || !expiryDate) return res.status(400).json({ success: false, message: 'code, value, totalUsesAllowed, and expiryDate are required' });
  if (new Date(expiryDate) <= new Date()) return res.status(400).json({ success: false, message: 'Expiry date must be in the future' });
  try {
    const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (existing) return res.status(400).json({ success: false, message: 'A coupon with this code already exists' });
    const targetUserId = targetUser && targetUser.toString().trim() !== '' ? targetUser : null;
    const coupon = await Coupon.create({
      code: code.trim().toUpperCase(),
      value,
      description,
      totalUsesAllowed,
      maxUsesPerUser: maxUsesPerUser || 1,
      expiryDate: new Date(expiryDate),
      targetUser: targetUserId,
      createdBy: req.user.id
    });
    await coupon.populate('targetUser', 'username email');
    res.status(201).json({ success: true, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

router.patch('/:id/toggle', protect, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ success: true, message: `Coupon ${coupon.isActive ? 'activated' : 'deactivated'}`, coupon });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
