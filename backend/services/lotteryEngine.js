const Room = require('../models/Room');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { getIO } = require('../socket');

let isRunning = false;
let intervalId = null;

const safeEmit = (event, data) => {
  try {
    const io = getIO();
    io.emit(event, data);
  } catch (err) {
    console.error(`[LotteryEngine] Socket emit error on ${event}:`, err.message);
  }
};

const processRoom = async (room) => {
  try {
    // 1. Lockdown
    room.status = 'in_progress';
    await room.save();

    const inProgressPayload = {
      roomId: room.roomId,
      id: room._id,
      status: 'in_progress',
      title: room.title,
      roomTitle: room.title
    };

    safeEmit('room:status_changed', inProgressPayload);
    safeEmit('room:status', inProgressPayload);

    // 2. RNG Draw & Resolution (with a brief 2-second suspense delay)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Reload room to get latest state in case participants joined before lockdown
    const freshRoom = await Room.findById(room._id);
    if (!freshRoom) return;

    const minRequired = freshRoom.minUsers || 2;
    if (!freshRoom.participants || freshRoom.participants.length < minRequired) {
      // Automatic Refund Execution - Admin cannot stop this
      freshRoom.status = 'cancelled';
      freshRoom.endedAt = new Date();
      freshRoom.notes = `Auto-cancelled & refunded: Only ${freshRoom.participants ? freshRoom.participants.length : 0}/${minRequired} players joined within time.`;

      if (freshRoom.participants && freshRoom.participants.length > 0 && freshRoom.entryFee > 0) {
        for (const p of freshRoom.participants) {
          try {
            const pUser = await User.findById(p.userId);
            if (pUser) {
              const balanceBefore = pUser.balance;
              pUser.balance += freshRoom.entryFee;
              await pUser.save();

              await Transaction.create({
                userId: pUser._id,
                amount: freshRoom.entryFee,
                type: 'credit',
                category: 'refund',
                description: `Auto-Refund: ${freshRoom.title} (Min ${minRequired} players not reached)`,
                balanceBefore,
                balanceAfter: pUser.balance,
                metadata: { roomId: freshRoom.roomId, reason: 'unfilled_min_users' }
              });

              safeEmit('wallet:update', {
                userId: pUser._id.toString(),
                newBalance: pUser.balance,
                credited: freshRoom.entryFee
              });
            }
          } catch (err) {
            console.error('[LotteryEngine] Error refunding participant:', err);
          }
        }
      }

      await freshRoom.save();

      const cancelPayload = {
        roomId: freshRoom.roomId,
        id: freshRoom._id,
        status: 'cancelled',
        notes: freshRoom.notes,
        reason: `Did not reach minimum ${minRequired} players. All entry fees automatically refunded.`
      };

      safeEmit('room:status_changed', cancelPayload);
      safeEmit('room:status', cancelPayload);
      safeEmit('room:cancelled', cancelPayload);
      return;
    }

    // Pick randomized winner
    const winnerIndex = Math.floor(Math.random() * freshRoom.participants.length);
    const winningParticipant = freshRoom.participants[winnerIndex];

    // Credit winning prize to winner's wallet
    const winnerUser = await User.findById(winningParticipant.userId);
    if (!winnerUser) {
      console.error(`[LotteryEngine] Winner user ${winningParticipant.userId} not found`);
      return;
    }

    const balanceBefore = winnerUser.balance;
    winnerUser.balance += freshRoom.prize;
    await winnerUser.save();

    // Create transaction for winner
    await Transaction.create({
      userId: winnerUser._id,
      amount: freshRoom.prize,
      type: 'credit',
      category: 'prize_won',
      description: 'Lottery Prize Won: ' + freshRoom.title + ' (₹' + freshRoom.prize + ')',
      balanceBefore,
      balanceAfter: winnerUser.balance,
      metadata: { roomId: freshRoom.roomId }
    });

    // Calculate and credit room profit / difference to admin account
    const totalCollected = (freshRoom.participants ? freshRoom.participants.length : 0) * (Number(freshRoom.entryFee) || 0);
    const adminProfit = totalCollected - (Number(freshRoom.prize) || 0);

    if (adminProfit > 0) {
      try {
        let adminUser = freshRoom.createdBy ? await User.findById(freshRoom.createdBy) : null;
        if (!adminUser) {
          adminUser = await User.findOne({ role: 'admin' });
        }
        if (adminUser) {
          const adminBalanceBefore = adminUser.balance;
          adminUser.balance += adminProfit;
          await adminUser.save();

          await Transaction.create({
            userId: adminUser._id,
            amount: adminProfit,
            type: 'credit',
            category: 'room_commission',
            description: `Room Profit / Commission: ${freshRoom.title} (${freshRoom.roomId}) - Total Collected: ₹${totalCollected}, Prize: ₹${freshRoom.prize}`,
            balanceBefore: adminBalanceBefore,
            balanceAfter: adminUser.balance,
            metadata: {
              roomId: freshRoom.roomId,
              totalCollected,
              prize: freshRoom.prize,
              adminProfit
            }
          });

          safeEmit('wallet:update', {
            userId: adminUser._id.toString(),
            newBalance: adminUser.balance,
            credited: adminProfit
          });
        }
      } catch (adminErr) {
        console.error(`[LotteryEngine] Error crediting admin profit for room ${freshRoom.roomId}:`, adminErr);
      }
    }

    // Update room
    freshRoom.winner = winningParticipant.userId;
    freshRoom.status = 'completed';
    freshRoom.endedAt = new Date();
    await freshRoom.save();

    const winnerData = {
      id: winnerUser._id,
      _id: winnerUser._id,
      username: winningParticipant.username || winnerUser.username,
      email: winnerUser.email
    };

    const winnerPayload = {
      roomId: freshRoom.roomId,
      id: freshRoom._id,
      title: freshRoom.title,
      roomTitle: freshRoom.title,
      prize: freshRoom.prize,
      winner: winnerData,
      status: 'completed',
      participantsCount: freshRoom.participants.length,
      endedAt: freshRoom.endedAt
    };

    // Broadcast completion to all clients
    safeEmit('room:completed', winnerPayload);
    safeEmit('room:status_changed', winnerPayload);

    safeEmit('wallet:update', {
      userId: winnerUser._id.toString(),
      newBalance: winnerUser.balance,
      credited: freshRoom.prize
    });
  } catch (error) {
    console.error(`[LotteryEngine] Error processing room ${room.roomId}:`, error);
  }
};

const tick = async () => {
  if (isRunning) return;
  isRunning = true;

  try {
    const expiredRooms = await Room.find({
      status: 'open',
      startTime: { $lte: new Date() }
    });

    if (expiredRooms.length > 0) {
      await Promise.all(expiredRooms.map((room) => processRoom(room)));
    }
  } catch (err) {
    console.error('[LotteryEngine] Error checking expired rooms:', err.message);
  } finally {
    isRunning = false;
  }
};

const start = () => {
  if (intervalId) return;
  console.log('[LotteryEngine] Service started (checking every 2 seconds)');
  intervalId = setInterval(tick, 2000);
};

const stop = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[LotteryEngine] Service stopped');
  }
};

module.exports = { start, stop };
