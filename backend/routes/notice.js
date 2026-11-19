const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Notice = require('../models/Notice');
const { getIO } = require('../socket');

// Helper to get or create the single notice config document
const getOrCreateNotice = async () => {
  let notice = await Notice.findOne().sort({ updatedAt: -1 });
  if (!notice) {
    notice = await Notice.create({
      title: 'Important Notice for Players',
      content: 'Welcome to Potly! Enjoy fair gameplay, live multiplayer game rooms, and instant payouts. Please ensure your account details are verified.',
      isActive: false,
      type: 'announcement'
    });
  }
  return notice;
};

// GET /api/notice/active - Public / Player endpoint to fetch active notice
router.get('/active', async (req, res) => {
  try {
    const notice = await Notice.findOne({ isActive: true }).sort({ updatedAt: -1 });
    if (!notice) {
      return res.json({
        success: true,
        isActive: false,
        notice: null
      });
    }

    res.json({
      success: true,
      isActive: true,
      notice: {
        _id: notice._id,
        title: notice.title,
        content: notice.content,
        type: notice.type,
        isActive: notice.isActive,
        updatedAt: notice.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/notice/admin - Admin endpoint to get notice configuration
router.get('/admin', protect, adminOnly, async (req, res) => {
  try {
    const notice = await getOrCreateNotice();
    res.json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PUT /api/notice/admin - Admin endpoint to update notice details and toggle active status
router.put('/admin', protect, adminOnly, async (req, res) => {
  try {
    const { title, content, isActive, type } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Notice title is required' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Notice content is required' });
    }

    let notice = await getOrCreateNotice();

    notice.title = title.trim();
    notice.content = content.trim();
    if (typeof isActive === 'boolean') {
      notice.isActive = isActive;
    }
    if (type && ['announcement', 'maintenance', 'offer', 'info', 'warning'].includes(type)) {
      notice.type = type;
    }
    notice.updatedBy = req.user._id;

    await notice.save();

    // Broadcast notice update to all connected clients in real-time
    try {
      const io = getIO();
      if (io) {
        io.emit('notice:updated', {
          _id: notice._id,
          title: notice.title,
          content: notice.content,
          type: notice.type,
          isActive: notice.isActive,
          updatedAt: notice.updatedAt
        });
      }
    } catch (socketErr) {
      console.warn('Socket broadcast warning:', socketErr.message);
    }

    res.json({
      success: true,
      message: `Notice ${notice.isActive ? 'enabled and broadcasted' : 'saved (currently disabled)'}`,
      notice
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
