import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import {
  Flame,
  Trophy,
  Clock,
  Users,
  Wallet as WalletIcon,
  Sparkles,
  Loader2,
  RefreshCw,
  Coins,
  CheckCircle,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Crown
} from 'lucide-react';
import api from '../api/axios';
import socket from '../services/socket';
import { useAuth } from '../context/AuthContext';

const DEFAULT_LOBBY_RULES = [
  'Minimum Players Threshold: Every room requires a minimum number of players. If the room is not filled with minimum players within the countdown time, 100% of the entry fee is automatically refunded to participants.',
  'Lockdown: Once the countdown hits 00:00, the room status changes to In Progress and registration locks permanently.',
  'Fair RNG Draw: A cryptographically randomized selection algorithm picks one winner from the registered participant pool.',
  'Instant Payout: The winning prize is credited immediately to the winner wallet upon draw completion.',
  'Entry fees are non-refundable after a successful draw.'
];

export default function Lobby() {
  const { user, updateBalance } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [activeTab, setActiveTab] = useState('open'); // 'open' | 'in_progress' | 'completed'
  const [winnerCelebration, setWinnerCelebration] = useState(null);
  const [rulesModalRoom, setRulesModalRoom] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const currentUserId = user?.id || user?._id;

  // Real-time ticking interval for all countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch rooms from backend
  const fetchRooms = useCallback(async () => {
    try {
      const { data } = await api.get('/rooms', { params: { limit: 100 } });
      if (data?.rooms) {
        setRooms(data.rooms);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Trigger celebration confetti
  const fireConfetti = useCallback(() => {
    try {
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 9999
      };

      const fire = (particleRatio, opts) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio)
        });
      };

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
    } catch (err) {
      console.error('Confetti error:', err);
    }
  }, []);

  // Real-time Socket.IO event listeners
  useEffect(() => {
    // 1. Room user joined listener
    const handleUserJoined = (payload) => {
      if (!payload) return;
      const { roomId, id, participantsCount, newParticipant } = payload;
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          const match =
            (id && String(room._id) === String(id)) ||
            (roomId && (room.roomId === roomId || String(room._id) === String(roomId)));
          if (!match) return room;

          let updatedParticipants = Array.isArray(room.participants) ? [...room.participants] : [];
          if (newParticipant) {
            const alreadyHas = updatedParticipants.some(
              (p) =>
                (p.userId && String(p.userId) === String(newParticipant.userId)) ||
                (p.userId?._id && String(p.userId._id) === String(newParticipant.userId)) ||
                (p.username && p.username === newParticipant.username)
            );
            if (!alreadyHas) {
              updatedParticipants.push(newParticipant);
            }
          }

          return {
            ...room,
            participantsCount: typeof participantsCount === 'number' ? participantsCount : updatedParticipants.length,
            participants: updatedParticipants
          };
        })
      );
    };

    // 2. Room status change listener (lockdown -> in_progress, etc.)
    const handleRoomStatus = (payload) => {
      if (!payload) return;
      const { roomId, id, status, winner, prize, title, roomTitle, reason, notes, endedAt } = payload;
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          const match =
            (id && String(room._id) === String(id)) ||
            (roomId && (room.roomId === roomId || String(room._id) === String(roomId)));
          if (!match) return room;
          return {
            ...room,
            status: status || room.status,
            ...(winner ? { winner } : {}),
            ...(prize !== undefined ? { prize } : {}),
            ...(reason || notes ? { notes: reason || notes } : {}),
            ...(endedAt ? { endedAt } : status === 'completed' ? { endedAt: new Date().toISOString() } : {})
          };
        })
      );

      if (status === 'completed' && winner) {
        handleRoomCompleted(payload);
      }
    };

    // 3. Room completed & winner resolution listener
    const handleRoomCompleted = (payload) => {
      if (!payload) return;
      const { roomId, id, winner, prize, roomTitle, title, endedAt } = payload;
      const effectiveTitle = roomTitle || title;

      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          const match =
            (id && String(room._id) === String(id)) ||
            (roomId && (room.roomId === roomId || String(room._id) === String(roomId)));
          if (!match) return room;
          return {
            ...room,
            status: 'completed',
            winner: winner || room.winner,
            prize: prize ?? room.prize,
            endedAt: endedAt || room.endedAt || new Date().toISOString()
          };
        })
      );

      // Check if current user is the winner
      const winnerId = winner?._id || winner?.id || (typeof winner === 'string' ? winner : null);
      const isMe =
        (currentUserId && String(winnerId) === String(currentUserId)) ||
        (user?.username && (winner?.username === user.username || (typeof winner === 'string' && winner === user.username)));

      if (isMe) {
        fireConfetti();
        setWinnerCelebration({
          title: effectiveTitle || 'Game Room',
          prize: prize || 0,
          winner
        });
        toast.success(`🎉 JACKPOT! You won ₹${Number(prize || 0).toFixed(2)} in ${effectiveTitle || 'Room'}!`, {
          duration: 6000
        });
      }
    };

    // 4. Room created or updated by admin listener
    const handleRoomCreated = (payload) => {
      if (!payload) return;
      const rawRoom = payload.room || payload;
      if (!rawRoom || !rawRoom._id) return;
      const cleanRoom = {
        ...rawRoom,
        participants: Array.isArray(rawRoom.participants) ? rawRoom.participants : [],
        participantsCount: Array.isArray(rawRoom.participants)
          ? rawRoom.participants.length
          : (Number(rawRoom.participantsCount) || 0)
      };

      setRooms((prev) => {
        const exists = prev.some(
          (r) =>
            String(r._id) === String(cleanRoom._id) ||
            (r.roomId && r.roomId === cleanRoom.roomId)
        );
        if (exists) {
          return prev.map((r) =>
            String(r._id) === String(cleanRoom._id) || (r.roomId && r.roomId === cleanRoom.roomId)
              ? cleanRoom
              : r
          );
        }
        return [cleanRoom, ...prev];
      });
    };

    const handleRoomUpdated = (payload) => {
      if (!payload) return;
      const updatedRoom = payload.room || payload;
      if (!updatedRoom || !updatedRoom._id) return;
      setRooms((prev) =>
        prev.map((r) =>
          String(r._id) === String(updatedRoom._id) || (r.roomId && r.roomId === updatedRoom.roomId)
            ? { ...r, ...updatedRoom }
            : r
        )
      );
    };

    // 5. Room cancelled / auto-refund listener
    const handleRoomCancelled = (payload) => {
      if (!payload) return;
      const { roomId, id, reason, notes } = payload;
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          const match =
            (id && String(room._id) === String(id)) ||
            (roomId && (room.roomId === roomId || String(room._id) === String(roomId)));
          if (!match) return room;
          return { ...room, status: 'cancelled', notes: reason || notes || room.notes };
        })
      );
    };

    // 6. Room deleted listener
    const handleRoomDeleted = (payload) => {
      if (!payload) return;
      const { id, roomId } = payload;
      setRooms((prev) =>
        prev.filter((r) => String(r._id) !== String(id) && r.roomId !== roomId)
      );
    };

    socket.on('room:user_joined', handleUserJoined);
    socket.on('room:status', handleRoomStatus);
    socket.on('room:status_changed', handleRoomStatus);
    socket.on('room:completed', handleRoomCompleted);
    socket.on('room:winner_drawn', handleRoomCompleted);
    socket.on('room:created', handleRoomCreated);
    socket.on('room:updated', handleRoomUpdated);
    socket.on('room:cancelled', handleRoomCancelled);
    socket.on('room:deleted', handleRoomDeleted);

    return () => {
      socket.off('room:user_joined', handleUserJoined);
      socket.off('room:status', handleRoomStatus);
      socket.off('room:status_changed', handleRoomStatus);
      socket.off('room:completed', handleRoomCompleted);
      socket.off('room:winner_drawn', handleRoomCompleted);
      socket.off('room:created', handleRoomCreated);
      socket.off('room:updated', handleRoomUpdated);
      socket.off('room:cancelled', handleRoomCancelled);
      socket.off('room:deleted', handleRoomDeleted);
    };
  }, [currentUserId, user?.username, fireConfetti]);

  // Handle joining a room
  const handleJoinRoom = async (room) => {
    if (!user) {
      toast.error('Please sign in to join a room');
      return;
    }

    const entryFee = Number(room.entryFee ?? 0);
    const userBalance = Number(user.balance ?? 0);

    if (userBalance < entryFee) {
      toast.error(`Insufficient balance. You need ₹${(entryFee - userBalance).toFixed(2)} more to join.`);
      return;
    }

    setJoiningId(room._id || room.roomId);
    try {
      const { data } = await api.post(`/rooms/${room._id || room.roomId}/join`);
      toast.success(data?.message || '🎉 Successfully joined the room!');

      // Update user wallet balance locally & globally
      if (typeof data?.newBalance === 'number') {
        updateBalance(data.newBalance);
      } else {
        updateBalance(userBalance - entryFee);
      }

      // Optimistically mark as joined locally
      setRooms((prevRooms) =>
        prevRooms.map((r) => {
          if (String(r._id) === String(room._id)) {
            const currentParticipants = r.participants ? [...r.participants] : [];
            currentParticipants.push({
              userId: currentUserId,
              username: user.username,
              joinedAt: new Date().toISOString()
            });
            return {
              ...r,
              participants: currentParticipants,
              participantsCount: currentParticipants.length
            };
          }
          return r;
        })
      );
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to join room';
      toast.error(errMsg);
    } finally {
      setJoiningId(null);
    }
  };

  // Live countdown calculation helper
  const getCountdown = (startTime, status) => {
    if (status === 'in_progress') return { text: 'In Progress', isPast: true };
    if (status === 'completed') return { text: 'Draw Completed', isPast: true };
    if (status === 'cancelled') return { text: 'Cancelled', isPast: true };
    if (!startTime) return { text: '--:--', isPast: false };

    const diff = new Date(startTime).getTime() - now;
    if (diff <= 0) {
      return { text: '00:00', isPast: true };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hours > 0) {
      return { text: `${hours}h ${pad(minutes)}m ${pad(seconds)}s`, isPast: false };
    }
    return { text: `${pad(minutes)}:${pad(seconds)}`, isPast: false };
  };

  // Metrics summary
  const counts = useMemo(() => {
    let open = 0;
    let in_progress = 0;
    let completed = 0;

    rooms.forEach((r) => {
      if (r.status === 'open') open += 1;
      else if (r.status === 'in_progress') in_progress += 1;
      else if (r.status === 'completed') completed += 1;
    });

    return {
      open,
      in_progress,
      completed,
      totalActive: open + in_progress
    };
  }, [rooms]);

  const totalPrizePool = useMemo(() => {
    return rooms
      .filter((r) => r.status === 'open' || r.status === 'in_progress')
      .reduce((acc, curr) => acc + (Number(curr.prize) || 0), 0);
  }, [rooms]);

  // Tab filtering
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (activeTab === 'open') {
        if (r.status === 'open') return true;
        if (r.status === 'in_progress') return true;
        // Keep completed room visible for 45s so users watching the draw see the winner appear without vanishing abruptly
        if (r.status === 'completed' && r.endedAt && now - new Date(r.endedAt).getTime() < 45000) return true;
        return false;
      }
      if (activeTab === 'in_progress') return r.status === 'in_progress';
      if (activeTab === 'completed') return r.status === 'completed';
      return true;
    });
  }, [rooms, activeTab, now]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Winner Celebration Modal */}
      {winnerCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative max-h-[90vh] overflow-y-auto w-full max-w-lg mx-3 sm:mx-auto bg-gradient-to-b from-[#21183A] via-[#17102D] to-[#2B1254] border-2 border-[#FFB51B]/70 rounded-[22px] p-5 sm:p-8 text-center shadow-2xl shadow-[#6419D6]/30">
            <button
              onClick={() => setWinnerCelebration(null)}
              className="absolute top-4 right-4 text-[#C4BBD5] hover:text-white p-1.5 rounded-full bg-[#17102D]/80 border border-[#3B3152] transition-colors"
            >
              <X size={20} />
            </button>

            {/* Potly Celebration Badge */}
            <div className="w-20 h-20 mx-auto mb-4 relative flex items-center justify-center">
              <img
                src="/potly-logo.png"
                alt="Potly Winner"
                className="w-full h-full object-contain animate-bounce drop-shadow-[0_4px_16px_rgba(255,181,27,0.4)]"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-bold bg-[#FFB51B]/20 text-[#FFB51B] border border-[#FFB51B]/40 mb-2 font-mono uppercase tracking-wider">
              <Crown size={14} className="text-[#FFB51B]" /> ONE ROOM. ONE WINNER.
            </div>

            <h2 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
              CONGRATULATIONS!
            </h2>
            <p className="text-xs sm:text-sm text-[#C4BBD5] mt-1">
              You won the prize pool in <span className="font-semibold text-white">"{winnerCelebration.title}"</span>!
            </p>

            <div className="my-5 sm:my-6 p-4 rounded-xl bg-gradient-to-r from-[#FFB51B]/15 via-[#6419D6]/20 to-[#FF762B]/15 border border-[#FFB51B]/40">
              <p className="text-xs text-[#FFB51B] uppercase font-bold tracking-wider">Prize Credited</p>
              <p className="text-3xl sm:text-4xl font-extrabold text-[#FFB51B] font-mono mt-1 drop-shadow-[0_2px_12px_rgba(255,181,27,0.35)]">
                +₹{Number(winnerCelebration.prize).toFixed(2)}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setWinnerCelebration(null)}
                className="btn-gold w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                <span>Awesome! Continue Playing</span>
              </button>
              <Link
                to="/wallet"
                onClick={() => setWinnerCelebration(null)}
                className="btn-secondary w-full py-2.5 text-xs text-[#C4BBD5] hover:text-white"
              >
                View in Wallet &amp; Ledger
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Official Potly Room Rules Modal */}
      {rulesModalRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-h-[90vh] overflow-y-auto w-full max-w-lg mx-3 sm:mx-auto bg-[#21183A] border border-[#3B3152] rounded-[22px] shadow-2xl p-5 sm:p-7 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#3B3152]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 sm:p-2.5 rounded-xl bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/35">
                  <ShieldCheck size={22} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-heading font-bold text-white">Official Potly Room Rules</h3>
                  <p className="text-xs text-[#C4BBD5] line-clamp-1">{rulesModalRoom.title}</p>
                </div>
              </div>
              <button
                onClick={() => setRulesModalRoom(null)}
                className="text-[#C4BBD5] hover:text-white p-1.5 rounded-control hover:bg-[#17102D] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Room Parameters summary */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 p-3 rounded-xl bg-[#17102D] border border-[#3B3152] font-mono text-center">
              <div>
                <span className="text-[10px] text-[#C4BBD5] block uppercase">Min Players</span>
                <span className="text-xs sm:text-sm font-bold text-[#A78BFA]">{rulesModalRoom.minUsers || 2} players</span>
              </div>
              <div>
                <span className="text-[10px] text-[#C4BBD5] block uppercase">Entry Amount</span>
                <span className="text-xs sm:text-sm font-bold text-[#F7F5FC]">₹{(rulesModalRoom.entryFee ?? 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#C4BBD5] block uppercase">Prize Pool</span>
                <span className="text-xs sm:text-sm font-bold text-[#FFB51B]">₹{(rulesModalRoom.prize ?? 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Rules list */}
            <div className="space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#C4BBD5] block">
                Rule Requirements &amp; Policy:
              </span>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {(rulesModalRoom.rules && rulesModalRoom.rules.length > 0
                  ? rulesModalRoom.rules
                  : DEFAULT_LOBBY_RULES
                ).map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 sm:p-3 rounded-xl bg-[#17102D]/70 border border-[#3B3152] flex items-start gap-2.5 text-xs"
                  >
                    <span className="font-mono font-bold text-[#A78BFA] mt-0.5 text-[11px] w-5 text-center flex-shrink-0">
                      #{idx + 1}
                    </span>
                    <p className="text-[#C4BBD5] leading-relaxed text-[11px]">{rule}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[#3B3152] flex justify-end">
              <button
                type="button"
                onClick={() => setRulesModalRoom(null)}
                className="btn-primary text-xs py-2.5 px-6 rounded-control w-full sm:w-auto"
              >
                Understood &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header / Hero Section with Potly Branding */}
      <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#21183A] via-[#17102D] to-[#2B1254] border border-[#3B3152] p-4 sm:p-8 shadow-elevated">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-[#6419D6]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-[#FFB51B]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill text-xs font-bold bg-[#FFB51B]/15 text-[#FFB51B] border border-[#FFB51B]/35">
              <Crown size={14} className="text-[#FFB51B]" />
              <span className="tracking-wide">One Room. One Winner.</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-white tracking-tight leading-tight">
              Explore Potly Rooms
            </h1>
            <p className="text-xs sm:text-sm text-[#C4BBD5] leading-relaxed max-w-xl">
              Create. Join. Experience. Transparent multiplayer game rooms with live ticking countdowns, fair RNG draws, and instant prize credit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={fetchRooms}
              className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-2"
              title="Refresh Room List"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <Link
              to="/wallet"
              className="btn-primary text-xs py-2.5 px-4 flex items-center gap-2 font-bold"
            >
              <Sparkles size={14} className="text-[#FFB51B]" />
              <span>Redeem Coupon</span>
            </Link>
          </div>
        </div>

        {/* Quick Summary Stats Bar */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-[#3B3152]">
          <div className="bg-[#17102D]/90 border border-[#3B3152] rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-[#FF762B]/15 border border-[#FF762B]/30 text-[#FF762B] rounded-xl">
              <Flame size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs text-[#C4BBD5] uppercase tracking-wider font-semibold">Active Games</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-white mt-0.5">
                {counts.totalActive} <span className="text-xs text-[#C4BBD5] font-sans font-normal">Rooms</span>
              </p>
            </div>
          </div>

          <div className="bg-[#17102D]/90 border border-[#3B3152] rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 sm:gap-4">
            <div className="p-2.5 sm:p-3 bg-[#FFB51B]/15 border border-[#FFB51B]/35 text-[#FFB51B] rounded-xl">
              <Coins size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[11px] sm:text-xs text-[#C4BBD5] uppercase tracking-wider font-semibold">Total Prize Pool</p>
              <p className="text-xl sm:text-2xl font-bold font-mono text-[#FFB51B] mt-0.5">
                ₹{totalPrizePool.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="bg-[#17102D]/90 border border-[#3B3152] rounded-xl p-3.5 sm:p-4 flex items-center justify-between">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="p-2.5 sm:p-3 bg-[#6419D6]/20 border border-[#6419D6]/35 text-[#A78BFA] rounded-xl">
                <WalletIcon size={22} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-[11px] sm:text-xs text-[#C4BBD5] uppercase tracking-wider font-semibold">Your Wallet</p>
                <p className="text-xl sm:text-2xl font-bold font-mono text-[#FFB51B] mt-0.5">
                  ₹{(user?.balance ?? 0).toFixed(2)}
                </p>
              </div>
            </div>
            <Link
              to="/wallet"
              className="text-xs text-[#A78BFA] hover:text-white font-semibold flex items-center gap-1 transition-colors"
            >
              Deposit <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#3B3152] overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 pb-1 flex-nowrap sm:flex-wrap">
        <button
          onClick={() => setActiveTab('open')}
          className={`flex items-center gap-2 rounded-control whitespace-nowrap shrink-0 text-xs sm:text-sm py-2 px-3.5 font-semibold transition-all ${
            activeTab === 'open'
              ? 'bg-brand-purple text-white shadow-brand'
              : 'bg-[#21183A] text-[#C4BBD5] hover:text-white hover:bg-[#2C214C] border border-[#3B3152]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            🔥 Open Rooms
          </span>
          <span
            className={`px-2 py-0.5 rounded-pill text-xs font-mono font-bold ${
              activeTab === 'open'
                ? 'bg-[#4710A8] text-white'
                : 'bg-[#17102D] text-[#C4BBD5]'
            }`}
          >
            {counts.open}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('in_progress')}
          className={`flex items-center gap-2 rounded-control whitespace-nowrap shrink-0 text-xs sm:text-sm py-2 px-3.5 font-semibold transition-all ${
            activeTab === 'in_progress'
              ? 'bg-[#FF762B] text-white shadow-orange'
              : 'bg-[#21183A] text-[#C4BBD5] hover:text-white hover:bg-[#2C214C] border border-[#3B3152]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            ⏳ Drawing / In Progress
          </span>
          <span
            className={`px-2 py-0.5 rounded-pill text-xs font-mono font-bold ${
              activeTab === 'in_progress'
                ? 'bg-[#D95514] text-white'
                : 'bg-[#17102D] text-[#C4BBD5]'
            }`}
          >
            {counts.in_progress}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 rounded-control whitespace-nowrap shrink-0 text-xs sm:text-sm py-2 px-3.5 font-semibold transition-all ${
            activeTab === 'completed'
              ? 'bg-[#FFB51B] text-[#211A32] shadow-gold font-bold'
              : 'bg-[#21183A] text-[#C4BBD5] hover:text-white hover:bg-[#2C214C] border border-[#3B3152]'
          }`}
        >
          <span className="flex items-center gap-1.5">
            🏆 Recent Winners
          </span>
          <span
            className={`px-2 py-0.5 rounded-pill text-xs font-mono font-bold ${
              activeTab === 'completed'
                ? 'bg-[#211A32] text-[#FFB51B]'
                : 'bg-[#17102D] text-[#C4BBD5]'
            }`}
          >
            {counts.completed}
          </span>
        </button>
      </div>

      {/* Room Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-[#21183A] border border-[#3B3152] rounded-[18px] p-5 space-y-4 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 bg-[#17102D] rounded w-24" />
                <div className="h-5 bg-[#17102D] rounded-full w-28" />
              </div>
              <div className="h-7 bg-[#17102D] rounded w-3/4" />
              <div className="h-16 bg-[#17102D] rounded-xl" />
              <div className="h-4 bg-[#17102D] rounded w-1/2" />
              <div className="h-10 bg-[#17102D] rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-[#21183A]/50 border border-dashed border-[#3B3152] rounded-[22px] text-center py-16 px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#17102D] flex items-center justify-center text-[#A78BFA] border border-[#3B3152]">
            <Flame size={32} />
          </div>
          <h3 className="text-lg font-heading font-bold text-white">No rooms in this category</h3>
          <p className="text-sm text-[#C4BBD5] mt-1 max-w-sm mx-auto">
            {activeTab === 'open'
              ? 'All current rooms have either completed or started drawing. Check back soon for new games!'
              : activeTab === 'in_progress'
              ? 'No rooms are currently drawing. Jump into an open room to start the action!'
              : 'No completed games yet. Be the first player to win!'}
          </p>
          {activeTab !== 'open' && (
            <button
              onClick={() => setActiveTab('open')}
              className="btn-primary mt-4 text-xs font-semibold"
            >
              Browse Open Rooms
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredRooms.map((room) => {
            const countdown = getCountdown(room.startTime, room.status);
            const participantCount = Array.isArray(room.participants)
              ? room.participants.length
              : (typeof room.participantsCount === 'number' ? room.participantsCount : 0);
            const maxUsers = room.maxUsers;
            const isFull = maxUsers ? participantCount >= maxUsers : false;
            const progressPercent = maxUsers
              ? Math.min(100, Math.round((participantCount / maxUsers) * 100))
              : participantCount > 0 ? 100 : 0;

            const isJoined = room.participants?.some((p) => {
              const pId = p.userId?._id || p.userId || p._id;
              return (
                (currentUserId && String(pId) === String(currentUserId)) ||
                (user?.username && p.username === user.username)
              );
            });

            const userBalance = Number(user?.balance ?? 0);
            const entryFee = Number(room.entryFee ?? 0);
            const prize = Number(room.prize ?? 0);
            const hasEnoughBalance = userBalance >= entryFee;
            const isJoiningThis = joiningId === (room._id || room.roomId);

            const winnerName =
              typeof room.winner === 'object'
                ? room.winner?.username
                : (typeof room.winner === 'string' && room.winner ? room.winner : null);

            return (
              <div
                key={room._id || room.roomId}
                className="group relative flex flex-col justify-between bg-[#21183A] border border-[#3B3152] hover:border-brand-purple/60 rounded-[18px] p-4 sm:p-6 transition-all duration-300 hover:shadow-elevated overflow-hidden"
              >
                {/* Background ambient subtle glow on hover */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#6419D6]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="space-y-4">
                  {/* Top Bar: Room ID & Status Badge */}
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-control bg-[#17102D] text-[#C4BBD5] border border-[#3B3152]">
                      {room.roomId || (room._id ? `ROOM-${room._id.slice(-4).toUpperCase()}` : 'ROOM-LIVE')}
                    </span>

                    {/* Status Badge */}
                    {room.status === 'open' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A78BFA] opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6419D6]"></span>
                        </span>
                        OPEN
                      </span>
                    )}

                    {room.status === 'in_progress' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold bg-[#FF762B]/20 text-[#FF762B] border border-[#FF762B]/40">
                        <Loader2 size={12} className="animate-spin text-[#FF762B]" />
                        DRAWING WINNER...
                      </span>
                    )}

                    {room.status === 'completed' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold bg-[#FFB51B]/20 text-[#FFB51B] border border-[#FFB51B]/40 font-mono">
                        <Trophy size={12} className="text-[#FFB51B]" />
                        COMPLETED
                      </span>
                    )}

                    {room.status === 'cancelled' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        CANCELLED
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3
                    className="text-base sm:text-lg font-heading font-bold text-white tracking-tight line-clamp-1 group-hover:text-[#FFB51B] transition-colors"
                    title={room.title}
                  >
                    {room.title}
                  </h3>

                  {/* Min Players Badge & Rules Button */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold bg-[#17102D] text-[#C4BBD5] border border-[#3B3152] min-w-0">
                      <Users size={12} className="text-[#A78BFA] shrink-0" />
                      <span className="truncate">Min {room.minUsers || 2} players required</span>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRulesModalRoom(room);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-xs font-semibold bg-[#17102D] hover:bg-[#2C214C] text-[#A78BFA] hover:text-white border border-[#3B3152] transition-colors shrink-0"
                      title="View Room Rules"
                    >
                      <ShieldCheck size={13} className="text-[#A78BFA]" />
                      <span>Rules</span>
                    </button>
                  </div>

                  {/* Big Prize Pool Display */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#FFB51B]/15 via-[#6419D6]/20 to-[#FF762B]/15 border border-[#FFB51B]/35 p-3.5 sm:p-4 text-center">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold text-[#FFB51B]">
                          Prize Pool
                        </span>
                        <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#FFB51B] drop-shadow-[0_2px_10px_rgba(255,181,27,0.3)]">
                          ₹{prize.toFixed(2)}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-3 py-1 rounded-pill text-xs font-bold font-mono bg-[#17102D] text-[#F7F5FC] border border-[#3B3152] shadow-inner">
                          {entryFee === 0 ? 'FREE Entry' : `₹${entryFee.toFixed(2)} Entry`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Live Ticking Countdown Timer */}
                  <div className="flex items-center justify-between text-xs py-1 px-1">
                    <div className="flex items-center gap-1.5 text-[#C4BBD5]">
                      <Clock size={14} className={countdown.isPast ? 'text-[#FF762B]' : 'text-[#A78BFA]'} />
                      <span>{room.status === 'open' ? 'Time Remaining:' : 'Status:'}</span>
                    </div>
                    <div className="font-mono font-bold">
                      {room.status === 'open' ? (
                        countdown.isPast ? (
                          <span className="text-[#FF762B] animate-pulse">Drawing in progress...</span>
                        ) : (
                          <span className="text-[#FFB51B] font-mono text-xs sm:text-sm bg-[#17102D] px-2.5 py-0.5 rounded-control border border-[#FFB51B]/30">
                            ⏱️ {countdown.text}
                          </span>
                        )
                      ) : room.status === 'in_progress' ? (
                        <span className="text-[#FF762B] animate-pulse">Drawing in progress...</span>
                      ) : room.status === 'completed' ? (
                        <span className="text-[#FFB51B] flex items-center gap-1 font-mono">
                          <Trophy size={13} className="text-[#FFB51B]" /> Draw Finalized
                        </span>
                      ) : (
                        <span className="text-rose-400">Cancelled &amp; Refunded</span>
                      )}
                    </div>
                  </div>

                  {/* Real-time Users Joined Counter & Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#C4BBD5] flex items-center gap-1.5">
                        <Users size={14} className="text-[#A78BFA]" />
                        <span>Players Joined:</span>
                      </span>
                      <span className="font-mono font-semibold text-white">
                        {maxUsers
                          ? `${participantCount} / ${maxUsers} Joined`
                          : `${participantCount} Joined`}
                      </span>
                    </div>

                    <div className="w-full bg-[#17102D] rounded-full h-2 overflow-hidden border border-[#3B3152]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFull
                            ? 'bg-[#FF762B]'
                            : progressPercent > 80
                            ? 'bg-[#FFB51B]'
                            : 'bg-gradient-to-r from-brand-purple to-[#A78BFA]'
                        }`}
                        style={{
                          width: `${maxUsers ? progressPercent : Math.min(100, participantCount * 10)}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Winner Display if completed */}
                  {room.status === 'completed' && (
                    <div className="p-3 rounded-xl bg-[#6419D6]/15 border border-[#6419D6]/35 flex items-center justify-between text-xs">
                      <span className="text-[#A78BFA] flex items-center gap-1.5 font-medium">
                        <Trophy size={14} className="text-[#FFB51B]" /> Winner:
                      </span>
                      <span className="font-bold text-[#FFB51B] font-mono bg-[#17102D] px-2.5 py-0.5 rounded-pill border border-[#FFB51B]/30">
                        @{winnerName || 'Winner Drawn'}
                      </span>
                    </div>
                  )}

                  {/* Cancelled Room Reason */}
                  {room.status === 'cancelled' && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs flex items-start gap-2">
                      <AlertTriangle size={15} className="text-rose-400 mt-0.5 flex-shrink-0" />
                      <span className="text-rose-300 text-xs font-medium leading-tight">
                        {room.notes || `Auto-cancelled & refunded: Minimum ${room.minUsers || 2} players not reached.`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Join Room Interactive Button Section */}
                <div className="pt-4 sm:pt-5 mt-2 border-t border-[#3B3152]">
                  {isJoined ? (
                    <button
                      disabled
                      className="w-full py-3 px-4 rounded-control font-bold text-sm flex items-center justify-center gap-2 bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40 cursor-default shadow-inner"
                    >
                      <CheckCircle size={15} className="text-[#A78BFA]" />
                      <span>Joined ✓</span>
                    </button>
                  ) : room.status !== 'open' ? (
                    <button
                      disabled
                      className="w-full py-3 px-4 rounded-control font-bold text-sm flex items-center justify-center gap-2 bg-[#17102D] text-[#C4BBD5] border border-[#3B3152] cursor-not-allowed"
                    >
                      {room.status === 'in_progress' ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-[#FF762B]" />
                          <span>Draw In Progress...</span>
                        </>
                      ) : room.status === 'completed' ? (
                        <span className="flex items-center gap-1.5 text-[#FFB51B] font-mono">
                          <Trophy size={14} className="text-[#FFB51B]" /> Completed • Winner: @{winnerName || 'Winner Drawn'}
                        </span>
                      ) : (
                        <span>Closed</span>
                      )}
                    </button>
                  ) : isFull ? (
                    <button
                      disabled
                      className="w-full py-3 px-4 rounded-control font-bold text-sm bg-[#17102D] text-[#C4BBD5] border border-[#3B3152] cursor-not-allowed"
                    >
                      Room Full
                    </button>
                  ) : !hasEnoughBalance ? (
                    <Link
                      to="/wallet"
                      className="w-full py-3 px-4 rounded-control font-bold text-sm flex items-center justify-center gap-1.5 bg-rose-500/15 text-rose-300 border border-rose-500/35 hover:bg-rose-500/25 transition-colors shadow-sm text-center"
                    >
                      <AlertCircle size={14} className="text-rose-400" />
                      <span>Low Balance (Need ₹{(entryFee - userBalance).toFixed(2)})</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleJoinRoom(room)}
                      disabled={isJoiningThis}
                      className="btn-primary w-full py-3 px-4 rounded-control font-bold text-sm flex items-center justify-center gap-2 group/btn"
                    >
                      {isJoiningThis ? (
                        <>
                          <Loader2 size={15} className="animate-spin text-white" />
                          <span>Joining Room...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="text-[#FFB51B] group-hover/btn:rotate-12 transition-transform" />
                          <span>Join Room (₹{entryFee.toFixed(2)})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
