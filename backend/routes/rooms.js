const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect, adminOnly } = require('../middleware/auth');
const Room = require('../models/Room');
const RoomRule = require('../models/RoomRule');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { getIO } = require('../socket');

// Helper to query room by _id or roomId
const getRoomQuery = (id) => {
  return mongoose.Types.ObjectId.isValid(id)
    ? { $or: [{ _id: id }, { roomId: id }] }
    : { roomId: id };
};

// GET /api/rooms - List rooms
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status && status !== 'all') {
      filter.status = status;
    } else if (req.user.role !== 'admin') {
      filter.status = { $ne: 'cancelled' };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const total = await Room.countDocuments(filter);
    const rooms = await Room.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('createdBy', 'username')
      .populate('winner', 'username');

    res.json({
      success: true,
      rooms,
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

// GET /api/rooms/rules - Get room rules
router.get('/rules', protect, async (req, res) => {
  try {
    let roomRule = await RoomRule.findOne();
    if (!roomRule) {
      roomRule = await RoomRule.create({});
    }
    res.json({ success: true, roomRule });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PUT /api/rooms/rules - Update room rules (admin only)
router.put('/rules', protect, adminOnly, async (req, res) => {
  try {
    const { rules, minUsersDefault, title } = req.body;
    let roomRule = await RoomRule.findOne();
    if (!roomRule) {
      roomRule = new RoomRule();
    }
    if (rules !== undefined && Array.isArray(rules)) {
      roomRule.rules = rules;
    }
    if (minUsersDefault !== undefined && !isNaN(Number(minUsersDefault))) {
      roomRule.minUsersDefault = Math.max(1, Number(minUsersDefault));
    }
    if (title !== undefined && typeof title === 'string') {
      roomRule.title = title.trim();
    }
    roomRule.updatedBy = req.user.id;
    await roomRule.save();

    res.json({ success: true, roomRule });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// GET /api/rooms/:id - Get room by _id or roomId
router.get('/:id', protect, async (req, res) => {
  try {
    const room = await Room.findOne(getRoomQuery(req.params.id))
      .populate('participants.userId', 'username email')
      .populate('winner', 'username')
      .populate('createdBy', 'username');

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/rooms - Create new room (admin only)
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { title, entryFee, prize, startTime, maxUsers, minUsers, rules, customRoomId, roomId } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Room title is required' });
    }
    if (entryFee === undefined || entryFee === null || isNaN(Number(entryFee)) || Number(entryFee) < 0) {
      return res.status(400).json({ success: false, message: 'Entry fee must be a number >= 0' });
    }
    if (prize === undefined || prize === null || isNaN(Number(prize)) || Number(prize) < 1) {
      return res.status(400).json({ success: false, message: 'Prize must be a number >= 1' });
    }
    if (!startTime) {
      return res.status(400).json({ success: false, message: 'Start time is required' });
    }
    const parsedStartTime = new Date(startTime);
    if (isNaN(parsedStartTime.getTime())) {
      return res.status(400).json({ success: false, message: 'Valid start time is required' });
    }

    const generatedId = 'ROOM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const finalRoomId = (customRoomId || roomId || generatedId).trim().toUpperCase();

    const existing = await Room.findOne({ roomId: finalRoomId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A room with this roomId already exists' });
    }

    let finalRules = rules;
    let defaultRuleDoc = null;
    if (!finalRules || !Array.isArray(finalRules) || finalRules.length === 0) {
      defaultRuleDoc = await RoomRule.findOne();
      if (!defaultRuleDoc) {
        defaultRuleDoc = await RoomRule.create({});
      }
      finalRules = defaultRuleDoc.rules;
    }

    const defaultMinUsers = defaultRuleDoc ? defaultRuleDoc.minUsersDefault : 2;
    const finalMinUsers = minUsers !== undefined && minUsers !== null && !isNaN(Number(minUsers))
      ? Math.max(1, Number(minUsers))
      : (defaultMinUsers || 2);

    const room = await Room.create({
      roomId: finalRoomId,
      title: title.trim(),
      entryFee: Number(entryFee),
      prize: Number(prize),
      startTime: parsedStartTime,
      maxUsers: maxUsers ? Number(maxUsers) : null,
      minUsers: finalMinUsers,
      rules: finalRules,
      status: 'open',
      participants: [],
      createdBy: req.user.id
    });

    const populatedRoom = await Room.findById(room._id)
      .populate('createdBy', 'username')
      .populate('winner', 'username');

    const cleanRoom = populatedRoom ? populatedRoom.toObject() : room.toObject();
    cleanRoom.participants = cleanRoom.participants || [];
    cleanRoom.participantsCount = 0;

    try {
      getIO().emit('room:created', cleanRoom);
      getIO().emit('room:created', { room: cleanRoom });
    } catch (e) {}

    res.status(201).json({ success: true, room: cleanRoom });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PATCH /api/rooms/:id/status - Update room status & winner (admin only)
router.patch('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, winnerId } = req.body;
    const allowedStatuses = ['open', 'in_progress', 'completed', 'cancelled'];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    const room = await Room.findOne(getRoomQuery(req.params.id));
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const prevStatus = room.status;
    room.status = status;

    if (winnerId !== undefined) {
      room.winner = winnerId || null;
    }

    // Automatically credit prize to winner when transitioning to completed
    if (status === 'completed' && room.winner && prevStatus !== 'completed') {
      const winnerUser = await User.findById(room.winner);
      if (winnerUser) {
        const balanceBefore = winnerUser.balance;
        winnerUser.balance += room.prize;
        await winnerUser.save();

        await Transaction.create({
          userId: winnerUser._id,
          amount: room.prize,
          type: 'credit',
          description: `Prize won for room: ${room.title} (${room.roomId})`,
          category: 'prize_won',
          balanceBefore,
          balanceAfter: winnerUser.balance,
          metadata: { roomId: room.roomId }
        });
      }
    }

    await room.save();

    await room.populate('createdBy', 'username');
    if (room.winner) {
      await room.populate('winner', 'username');
    }

    const winnerData = room.winner
      ? {
          _id: room.winner._id,
          id: room.winner._id,
          username: room.winner.username
        }
      : null;

    const statusPayload = {
      roomId: room.roomId,
      id: room._id,
      status: room.status,
      winner: winnerData,
      prize: room.prize,
      title: room.title,
      roomTitle: room.title,
      endedAt: room.endedAt || (status === 'completed' ? new Date() : null),
      participantsCount: room.participants ? room.participants.length : 0
    };

    try {
      getIO().emit('room:status_changed', statusPayload);
      getIO().emit('room:status', statusPayload);
      if (status === 'completed') {
        getIO().emit('room:completed', statusPayload);
        getIO().emit('room:winner_drawn', statusPayload);
      } else if (status === 'cancelled') {
        getIO().emit('room:cancelled', statusPayload);
      }
    } catch (e) {}

    res.json({
      success: true,
      room,
      message: 'Room status updated to ' + status
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// PATCH /api/rooms/:id - Update room details if status is open (admin only)
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const room = await Room.findOne(getRoomQuery(req.params.id));
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit room details unless status is open'
      });
    }

    const { title, entryFee, prize, startTime, maxUsers, minUsers, rules } = req.body;

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Room title cannot be empty' });
      }
      room.title = title.trim();
    }
    if (entryFee !== undefined) {
      if (isNaN(Number(entryFee)) || Number(entryFee) < 0) {
        return res.status(400).json({ success: false, message: 'Entry fee must be >= 0' });
      }
      room.entryFee = Number(entryFee);
    }
    if (prize !== undefined) {
      if (isNaN(Number(prize)) || Number(prize) < 1) {
        return res.status(400).json({ success: false, message: 'Prize must be >= 1' });
      }
      room.prize = Number(prize);
    }
    if (startTime !== undefined) {
      const parsedStartTime = new Date(startTime);
      if (isNaN(parsedStartTime.getTime())) {
        return res.status(400).json({ success: false, message: 'Valid start time is required' });
      }
      room.startTime = parsedStartTime;
    }
    if (maxUsers !== undefined) {
      room.maxUsers = maxUsers ? Number(maxUsers) : null;
    }
    if (minUsers !== undefined) {
      if (!isNaN(Number(minUsers)) && Number(minUsers) >= 1) {
        room.minUsers = Math.max(1, Number(minUsers));
      }
    }
    if (rules !== undefined && Array.isArray(rules)) {
      room.rules = rules;
    }

    await room.save();
    res.json({ success: true, room });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// DELETE /api/rooms/:id - Delete room (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const room = await Room.findOneAndDelete(getRoomQuery(req.params.id));
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    try {
      getIO().emit('room:deleted', { id: room._id, roomId: room.roomId });
    } catch (e) {}

    res.json({ success: true, message: 'Room deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// POST /api/rooms/:id/join - User joins room
router.post('/:id/join', protect, async (req, res) => {
  try {
    const room = await Room.findOne(getRoomQuery(req.params.id));
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    if (room.status !== 'open') {
      return res.status(400).json({ success: false, message: `Cannot join room: status is ${room.status}` });
    }

    if (room.maxUsers && room.participants.length >= room.maxUsers) {
      return res.status(400).json({ success: false, message: 'Room is full' });
    }

    const alreadyJoined = room.participants.some(p => p.userId && p.userId.toString() === req.user.id.toString());
    if (alreadyJoined) {
      return res.status(400).json({ success: false, message: 'You have already joined this room' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.balance < room.entryFee) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Required: ₹${room.entryFee}, Available: ₹${user.balance}`
      });
    }

    if (room.entryFee > 0) {
      const balanceBefore = user.balance;
      user.balance -= room.entryFee;
      await user.save();

      await Transaction.create({
        userId: user._id,
        amount: room.entryFee,
        type: 'debit',
        description: `Entry fee for room: ${room.title} (${room.roomId})`,
        category: 'room_entry',
        balanceBefore,
        balanceAfter: user.balance,
        metadata: { roomId: room.roomId }
      });
    }

    room.participants.push({
      userId: user._id,
      username: user.username,
      joinedAt: new Date()
    });

    await room.save();

    try { getIO().emit('room:user_joined', { roomId: room.roomId, id: room._id, participantsCount: room.participants.length, maxUsers: room.maxUsers, newParticipant: { userId: user._id, username: user.username } }); } catch (e) {}

    res.json({
      success: true,
      message: 'Successfully joined room!',
      room,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
