import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import socket from '../../services/socket';
import toast from 'react-hot-toast';
import {
  Gamepad2,
  Dice5,
  Plus,
  RefreshCw,
  Trophy,
  Users,
  Clock,
  Trash2,
  Eye,
  X,
  Play,
  CheckCircle,
  Loader2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Save,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Sliders
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export default function RoomManager() {
  const [rooms, setRooms] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  // Creation modal/drawer state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    entryFee: '',
    prize: '',
    startTime: '',
    maxUsers: '',
    minUsers: 2
  });

  // Default Lottery & Room Rules state
  const [defaultRules, setDefaultRules] = useState({
    title: 'Official Room & Lottery Rules',
    rules: [
      'Minimum Players Threshold: Every room requires a minimum number of players. If the room is not filled with minimum players within the countdown time, 100% of the entry fee is automatically refunded to participants.',
      'Lockdown: Once the countdown hits 00:00, the room status changes to In Progress and registration locks permanently.',
      'Fair RNG Draw: A cryptographically randomized selection algorithm picks one winner from the registered participant pool.',
      'Instant Payout: The winning prize is credited immediately to the winner wallet upon draw completion.',
      'Entry fees are non-refundable after a successful draw.'
    ],
    minUsersDefault: 2
  });
  const [rulesLoading, setRulesLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [rulesCollapsed, setRulesCollapsed] = useState(true);
  const [newRuleText, setNewRuleText] = useState('');

  // Details modal state
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Status updating state
  const [updatingId, setUpdatingId] = useState(null);

  // Timer tick for live countdowns
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDefaultRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const { data } = await api.get('/rooms/rules');
      const ruleData = data?.roomRule || data?.rules;
      if (ruleData) {
        setDefaultRules({
          title: ruleData.title || 'Official Potly Game Rules',
          rules: Array.isArray(ruleData.rules) ? ruleData.rules : [],
          minUsersDefault: ruleData.minUsersDefault ?? 2
        });
      }
    } catch (err) {
      console.error('Failed to load default room rules:', err);
    } finally {
      setRulesLoading(false);
    }
  }, []);

  const formatDateSafe = (dateString, pattern = 'dd MMM, HH:mm') => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '—';
      return format(d, pattern);
    } catch {
      return '—';
    }
  };

  useEffect(() => {
    fetchDefaultRules();
  }, [fetchDefaultRules]);

  const handleSaveDefaultRules = async (e) => {
    if (e) e.preventDefault();
    setSavingRules(true);
    try {
      const { data } = await api.put('/rooms/rules', {
        rules: defaultRules.rules,
        minUsersDefault: Number(defaultRules.minUsersDefault) || 2
      });
      toast.success(data.message || 'Default room rules saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rules');
    } finally {
      setSavingRules(false);
    }
  };

  const handleAddRule = () => {
    if (!newRuleText.trim()) return;
    setDefaultRules((prev) => ({
      ...prev,
      rules: [...prev.rules, newRuleText.trim()]
    }));
    setNewRuleText('');
  };

  const handleRemoveRule = (index) => {
    setDefaultRules((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, idx) => idx !== index)
    }));
  };

  const handleRuleChange = (index, value) => {
    setDefaultRules((prev) => {
      const updated = [...prev.rules];
      updated[index] = value;
      return { ...prev, rules: updated };
    });
  };

  const fetchRooms = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const params = { page: targetPage, limit: 12 };
      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const { data } = await api.get('/rooms', { params });
      setRooms(data.rooms || []);
      if (data.pagination) {
        setPagination(data.pagination);
      } else {
        setPagination({
          total: (data.rooms || []).length,
          page: targetPage,
          pages: 1
        });
      }
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchRooms(page);
  }, [fetchRooms, page]);

  // Real-time Socket.IO event listeners for live updates without page refresh
  useEffect(() => {
    // 1. Room created
    const handleRoomCreated = (payload) => {
      if (!payload) return;
      const rawRoom = payload.room || payload;
      if (!rawRoom || !rawRoom._id) return;
      const rawParticipants = Array.isArray(rawRoom.participants) ? rawRoom.participants : [];
      const cleanRoom = {
        ...rawRoom,
        participants: rawParticipants,
        participantsCount: typeof rawRoom.participantsCount === 'number'
          ? rawRoom.participantsCount
          : rawParticipants.length
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
      setPagination((prev) => ({ ...prev, total: (prev.total || 0) + 1 }));
    };

    // 2. Room user joined
    const handleUserJoined = (payload) => {
      if (!payload) return;
      const { roomId, id, participantsCount, newParticipant } = payload;

      const updateParticipantList = (prevParticipants) => {
        let updated = Array.isArray(prevParticipants) ? [...prevParticipants] : [];
        if (newParticipant) {
          const newUid = String(newParticipant.userId?._id || newParticipant.userId || '');
          const newUname = newParticipant.username ? String(newParticipant.username).toLowerCase() : '';

          const alreadyHas = updated.some((p) => {
            const pUid = String(p.userId?._id || p.userId || p._id || '');
            const pUname = p.username ? String(p.username).toLowerCase() : '';
            return (newUid && pUid && pUid === newUid) || (newUname && pUname && pUname === newUname);
          });

          if (!alreadyHas) {
            updated.push(newParticipant);
          }
        }
        return updated;
      };

      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          const match =
            (id && String(room._id) === String(id)) ||
            (roomId && (room.roomId === roomId || String(room._id) === String(roomId)));
          if (!match) return room;

          const updatedParticipants = updateParticipantList(room.participants);
          const finalCount = typeof participantsCount === 'number'
            ? participantsCount
            : updatedParticipants.length;

          return {
            ...room,
            participantsCount: finalCount,
            participants: updatedParticipants
          };
        })
      );

      // Also update selectedRoom if details modal is open
      setSelectedRoom((prev) => {
        if (!prev) return prev;
        const match =
          (id && String(prev._id) === String(id)) ||
          (roomId && (prev.roomId === roomId || String(prev._id) === String(roomId)));
        if (!match) return prev;

        const updatedParticipants = updateParticipantList(prev.participants);
        const finalCount = typeof participantsCount === 'number'
          ? participantsCount
          : updatedParticipants.length;

        return {
          ...prev,
          participantsCount: finalCount,
          participants: updatedParticipants
        };
      });
    };

    // 3. Status changed / completed / winner drawn
    const handleStatusUpdate = (payload) => {
      if (!payload) return;
      const { roomId, id, status, winner, prize, reason, notes } = payload;

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
            ...(reason || notes ? { notes: reason || notes } : {})
          };
        })
      );

      setSelectedRoom((prev) => {
        if (!prev) return prev;
        const match =
          (id && String(prev._id) === String(id)) ||
          (roomId && (prev.roomId === roomId || String(prev._id) === String(roomId)));
        if (!match) return prev;
        return {
          ...prev,
          status: status || prev.status,
          ...(winner ? { winner } : {}),
          ...(prize !== undefined ? { prize } : {}),
          ...(reason || notes ? { notes: reason || notes } : {})
        };
      });
    };

    // 4. Room deleted
    const handleRoomDeleted = (payload) => {
      if (!payload) return;
      const { id, roomId } = payload;
      setRooms((prev) => prev.filter((r) => String(r._id) !== String(id) && r.roomId !== roomId));
    };

    socket.on('room:created', handleRoomCreated);
    socket.on('room:user_joined', handleUserJoined);
    socket.on('room:status', handleStatusUpdate);
    socket.on('room:status_changed', handleStatusUpdate);
    socket.on('room:completed', handleStatusUpdate);
    socket.on('room:winner_drawn', handleStatusUpdate);
    socket.on('room:cancelled', handleStatusUpdate);
    socket.on('room:deleted', handleRoomDeleted);

    return () => {
      socket.off('room:created', handleRoomCreated);
      socket.off('room:user_joined', handleUserJoined);
      socket.off('room:status', handleStatusUpdate);
      socket.off('room:status_changed', handleStatusUpdate);
      socket.off('room:completed', handleStatusUpdate);
      socket.off('room:winner_drawn', handleStatusUpdate);
      socket.off('room:cancelled', handleStatusUpdate);
      socket.off('room:deleted', handleRoomDeleted);
    };
  }, []);

  // Open Room Details
  const handleViewDetails = async (room) => {
    setSelectedRoom(room);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    try {
      const { data } = await api.get(`/rooms/${room._id}`);
      if (data.room) {
        setSelectedRoom(data.room);
      }
    } catch {
      // Fallback to room passed
    } finally {
      setDetailsLoading(false);
    }
  };

  // Create Room
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return toast.error('Room title is required');
    if (formData.entryFee === '' || Number(formData.entryFee) < 0) {
      return toast.error('Valid entry fee (>= 0) is required');
    }
    if (!formData.prize || Number(formData.prize) < 1) {
      return toast.error('Winning prize must be at least ₹1');
    }
    if (!formData.startTime) {
      return toast.error('Draw/Start time is required');
    }

    const minUsersVal = Number(formData.minUsers || defaultRules.minUsersDefault || 2);
    if (minUsersVal < 1) {
      return toast.error('Minimum users must be at least 1');
    }

    setCreating(true);
    try {
      const payload = {
        title: formData.title.trim(),
        entryFee: Number(formData.entryFee),
        prize: Number(formData.prize),
        startTime: new Date(formData.startTime).toISOString(),
        maxUsers: formData.maxUsers ? Number(formData.maxUsers) : null,
        minUsers: minUsersVal
      };

      await api.post('/rooms', payload);
      toast.success('Room created successfully!');
      setShowCreateModal(false);
      setFormData({
        title: '',
        entryFee: '',
        prize: '',
        startTime: '',
        maxUsers: '',
        minUsers: defaultRules.minUsersDefault || 2
      });
      fetchRooms(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  // Update Status
  const handleStatusChange = async (roomId, nextStatus, winnerId = null) => {
    setUpdatingId(roomId);
    try {
      const payload = { status: nextStatus };
      if (winnerId) payload.winnerId = winnerId;

      const { data } = await api.patch(`/rooms/${roomId}/status`, payload);
      toast.success(data.message || `Room marked as ${nextStatus}`);

      // Update in local state
      setRooms((prev) =>
        prev.map((r) => (r._id === roomId ? { ...r, ...data.room } : r))
      );
      if (selectedRoom && selectedRoom._id === roomId) {
        setSelectedRoom((prev) => ({ ...prev, ...data.room }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete Room
  const handleDeleteRoom = async (roomId, title) => {
    if (!window.confirm(`Are you sure you want to delete room "${title}"?`)) return;
    try {
      await api.delete(`/rooms/${roomId}`);
      toast.success('Room deleted successfully');
      setRooms((prev) => prev.filter((r) => r._id !== roomId));
      if (selectedRoom && selectedRoom._id === roomId) {
        setShowDetailsModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete room');
    }
  };

  // Live countdown helper
  const getCountdownDisplay = (startTimeStr) => {
    try {
      const target = new Date(startTimeStr);
      const diffMs = target.getTime() - now;

      if (diffMs <= 0) {
        return { isPast: true, text: `Started ${formatDistanceToNow(target)} ago` };
      }

      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      const pad = (n) => String(n).padStart(2, '0');

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        return { isPast: false, text: `Starts in ${days}d ${hours % 24}h` };
      }

      return {
        isPast: false,
        text: `Starts in ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
      };
    } catch {
      return { isPast: true, text: 'Scheduled' };
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Open • Accepting Players
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Loader2 size={13} className="animate-spin text-amber-400" />
            In Progress • Drawing
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Trophy size={13} className="text-blue-400" />
            Completed • Winner Drawn
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle size={13} className="text-rose-400" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#6419D6]/20 border border-[#6419D6]/35 text-[#A78BFA] rounded-xl flex-shrink-0">
              <Dice5 size={28} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">Potly Room Management</h1>
              <p className="text-xs sm:text-sm text-[#C4BBD5]">
                Create and manage multiplayer game rooms, configure rules, and monitor participant pools
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
          <button
            onClick={() => fetchRooms(page)}
            className="btn-secondary flex items-center gap-2 text-xs sm:text-sm py-2 px-3 sm:px-4"
            title="Refresh Rooms"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 text-xs sm:text-sm py-2 px-3.5 sm:px-4"
          >
            <Plus size={18} />
            <span>Create New Room</span>
          </button>
        </div>
      </div>

      {/* Default Potly & Room Rules Section */}
      <div className="card bg-[#21183A] border-[#3B3152] p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/35 flex-shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-heading font-bold text-white">Default Potly Game Rules</h2>
                <span className="px-2 py-0.5 rounded-pill text-[11px] font-mono font-semibold bg-[#6419D6]/25 text-[#A78BFA] border border-[#6419D6]/40">
                  Min {defaultRules.minUsersDefault} Players Default
                </span>
              </div>
              <p className="text-xs text-[#C4BBD5] mt-0.5">
                Applied to all newly launched Potly rooms and visible to players before entering
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setRulesCollapsed(!rulesCollapsed)}
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
            >
              <span>{rulesCollapsed ? 'View & Edit Rules' : 'Collapse Rules'}</span>
              {rulesCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          </div>
        </div>

        {!rulesCollapsed && (
          <div className="mt-5 pt-5 border-t border-gray-800 space-y-5">
            {rulesLoading ? (
              <div className="py-6 text-center text-gray-500 flex items-center justify-center gap-2 text-xs">
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span>Loading room rules...</span>
              </div>
            ) : (
              <form onSubmit={handleSaveDefaultRules} className="space-y-4">
                {/* Min Users Default setting */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-gray-950/60 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-300 block">
                      Default Minimum Users (Threshold) *
                    </label>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Rooms with fewer players when countdown ends are auto-cancelled and 100% refunded to wallet
                    </p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={defaultRules.minUsersDefault}
                      onChange={(e) =>
                        setDefaultRules({ ...defaultRules, minUsersDefault: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className="input-field font-mono text-sm w-28 text-center"
                    />
                    <span className="text-xs text-gray-400 font-medium">players</span>
                  </div>
                </div>

                {/* Rules List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                      Standard Lottery Rules List ({defaultRules.rules.length})
                    </label>
                    <span className="text-[11px] text-gray-500">
                      Displayed on room cards and player modals
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {defaultRules.rules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-950/40 border border-gray-800/80 group hover:border-gray-700"
                      >
                        <span className="font-mono text-xs font-bold text-blue-400 mt-2.5 w-6 text-center">
                          #{idx + 1}
                        </span>
                        <textarea
                          rows={2}
                          value={rule}
                          onChange={(e) => handleRuleChange(idx, e.target.value)}
                          className="input-field text-xs text-gray-200 resize-none flex-1 leading-relaxed"
                          placeholder="Rule description..."
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(idx)}
                          className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors mt-1"
                          title="Remove Rule"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Rule input */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={newRuleText}
                      onChange={(e) => setNewRuleText(e.target.value)}
                      placeholder="Add new rule statement..."
                      className="input-field text-xs flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRule();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddRule}
                      disabled={!newRuleText.trim()}
                      className="btn-secondary text-xs flex items-center gap-1.5 px-3 py-2 disabled:opacity-50 flex-shrink-0"
                    >
                      <Plus size={15} />
                      <span>Add Rule</span>
                    </button>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end pt-3 border-t border-gray-800">
                  <button
                    type="submit"
                    disabled={savingRules}
                    className="btn-primary text-xs flex items-center gap-2 px-5 py-2"
                  >
                    {savingRules ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>{savingRules ? 'Saving Default Rules...' : 'Save Default Rules'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3 overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
              statusFilter === tab.value
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rooms Grid / Display */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card animate-pulse space-y-4 p-4 sm:p-6">
              <div className="h-6 bg-gray-700/60 rounded w-3/4" />
              <div className="h-4 bg-gray-700/40 rounded w-1/2" />
              <div className="grid grid-cols-2 gap-3 pt-3">
                <div className="h-12 bg-gray-800 rounded-lg" />
                <div className="h-12 bg-gray-800 rounded-lg" />
              </div>
              <div className="h-9 bg-gray-800 rounded-lg pt-2" />
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="card text-center py-16 border-dashed border-gray-800 p-4 sm:p-6">
          <Gamepad2 size={44} className="mx-auto text-gray-600 mb-3 opacity-60" />
          <h3 className="text-lg font-semibold text-gray-300">No rooms found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {statusFilter !== 'all'
              ? `There are currently no rooms with status "${statusFilter}".`
              : 'Get started by creating your first jackpot gaming room!'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center gap-2 mt-5 text-sm"
          >
            <Plus size={16} /> Create Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {rooms.map((room) => {
            const countdown = getCountdownDisplay(room.startTime);
            const participantCount = typeof room.participantsCount === 'number'
              ? room.participantsCount
              : (Array.isArray(room.participants) ? room.participants.length : 0);
            const maxUsers = room.maxUsers;
            const isFull = maxUsers && participantCount >= maxUsers;
            const winnerName =
              typeof room.winner === 'object'
                ? room.winner?.username
                : (typeof room.winner === 'string' && room.winner ? room.winner : null);

            return (
              <div
                key={room._id}
                className="card flex flex-col justify-between hover:border-gray-700 transition-all duration-200 border-gray-800/80 bg-gray-900/90 shadow-xl p-4 sm:p-6"
              >
                <div>
                  {/* Top Bar: Room ID & Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700/60">
                      {room.roomId || room._id.substring(0, 8)}
                    </span>
                    <div>{renderStatusBadge(room.status)}</div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-white tracking-tight line-clamp-1 mb-1" title={room.title}>
                    {room.title}
                  </h3>

                  {/* Countdown / Start Time */}
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-blue-400/90 font-medium mb-3 sm:mb-4">
                    <Clock size={14} className={countdown.isPast ? 'text-gray-400' : 'text-blue-400'} />
                    <span className={countdown.isPast ? 'text-gray-400' : 'text-blue-300 font-mono'}>
                      {countdown.text}
                    </span>
                    <span className="text-gray-600">•</span>
                    <span className="text-gray-400 text-[11px]">
                      {formatDateSafe(room.startTime)}
                    </span>
                  </div>

                  {/* Entry Fee & Winning Prize Metric Cards */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-xl bg-gray-950/60 border border-gray-800/80 mb-3 sm:mb-4">
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase font-medium">Entry Fee</p>
                      <p className="text-base font-bold font-mono text-white mt-0.5">
                        ₹{(room.entryFee ?? 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase font-medium">Jackpot Prize</p>
                      <p className="text-base font-bold font-mono text-amber-400 mt-0.5">
                        ₹{(room.prize ?? 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Participants & Capacity & Min Users */}
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Users size={14} className="text-gray-400" />
                      <span>Participants:</span>
                    </span>
                    <div className="text-right">
                      <span className="font-semibold font-mono text-gray-200">
                        {participantCount} {maxUsers ? `/ ${maxUsers} players` : 'joined'}
                      </span>
                      <span className="text-[11px] text-blue-400 block font-mono">
                        Min Required: {room.minUsers || 2} players
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar if maxUsers is set */}
                  {maxUsers && (
                    <div className="w-full bg-gray-800 rounded-full h-1.5 mb-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isFull ? 'bg-amber-500' : 'bg-blue-500'}`}
                        style={{
                          width: `${Math.min(100, (participantCount / maxUsers) * 100)}%`
                        }}
                      />
                    </div>
                  )}

                  {/* Winner display if completed */}
                  {room.status === 'completed' && (
                    <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/40 text-xs mb-3 flex items-center justify-between">
                      <span className="text-blue-300 flex items-center gap-1.5 font-medium">
                        <Trophy size={14} className="text-amber-400" /> Winner:
                      </span>
                      <span className="font-bold text-white">
                        @{winnerName || 'Winner Drawn'}
                      </span>
                    </div>
                  )}

                  {/* Cancellation Reason if cancelled */}
                  {room.status === 'cancelled' && (
                    <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-xs mb-3 flex items-start gap-2">
                      <AlertTriangle size={15} className="text-rose-400 mt-0.5 flex-shrink-0" />
                      <span className="text-rose-300 text-[11px] leading-tight font-medium">
                        {room.notes || `Auto-cancelled & refunded: Minimum ${room.minUsers || 2} players not reached.`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 sm:pt-4 border-t border-gray-800/80 space-y-2 mt-2">
                  <div className="flex items-center gap-2">
                    {/* View Details */}
                    <button
                      onClick={() => handleViewDetails(room)}
                      className="btn-secondary flex-1 flex items-center justify-center gap-1 text-xs py-2 px-2.5"
                    >
                      <Eye size={14} />
                      <span>Details</span>
                    </button>

                    {/* Quick Status Flow Buttons */}
                    {room.status === 'open' && (
                      <button
                        onClick={() => handleStatusChange(room._id, 'in_progress')}
                        disabled={updatingId === room._id}
                        className="btn-primary flex items-center justify-center gap-1 text-xs py-2 px-2.5 bg-amber-600 hover:bg-amber-700"
                        title="Mark In Progress"
                      >
                        <Play size={13} />
                        <span>Start Draw</span>
                      </button>
                    )}

                    {room.status === 'in_progress' && (
                      <button
                        onClick={() => handleViewDetails(room)}
                        disabled={updatingId === room._id}
                        className="btn-primary flex items-center justify-center gap-1 text-xs py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                        title="Finalize Winner"
                      >
                        <CheckCircle size={13} />
                        <span>Draw Winner</span>
                      </button>
                    )}

                    {/* Delete room */}
                    <button
                      onClick={() => handleDeleteRoom(room._id, room.title)}
                      className="p-2 rounded-lg bg-gray-800 hover:bg-rose-900/40 text-gray-400 hover:text-rose-400 border border-gray-700 transition-colors"
                      title="Delete Room"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-800 text-xs">
          <span className="text-gray-400">
            Page <span className="text-white font-medium">{pagination.page}</span> of{' '}
            <span className="text-white font-medium">{pagination.pages}</span> (Total{' '}
            {pagination.total} rooms)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 text-gray-300"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 text-gray-300"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* MODAL 1: Create New Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-2xl bg-gray-900 border border-gray-700 shadow-2xl relative max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Gamepad2 size={20} className="text-blue-400" />
                <h2 className="text-base sm:text-lg font-bold text-white">Create New Gaming Room</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Room Title / Name *
                </label>
                <input
                  type="text"
                  required
                  className="input-field text-sm"
                  placeholder="e.g. Weekend Mega Jackpot #1"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Entry Fee (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  className="input-field font-mono text-sm"
                  placeholder="e.g. 50"
                  value={formData.entryFee}
                  onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                />
                <p className="text-[10px] text-gray-500 mt-1">Bet amount deducted from wallet</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Winning Prize (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  className="input-field font-mono text-sm"
                  placeholder="e.g. 500"
                  value={formData.prize}
                  onChange={(e) => setFormData({ ...formData, prize: e.target.value })}
                />
                <p className="text-[10px] text-gray-500 mt-1">Total prize winner receives</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Draw / Start Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  className="input-field text-xs text-gray-200"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Max Users Cap (Optional)
                </label>
                <input
                  type="number"
                  min="2"
                  step="1"
                  className="input-field font-mono text-sm"
                  placeholder="Blank for unlimited"
                  value={formData.maxUsers}
                  onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value })}
                />
                <p className="text-[10px] text-gray-500 mt-1">Leave empty for unlimited</p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Minimum Users to Start *</span>
                  <span className="text-[11px] text-blue-400 font-mono font-normal">Draw execution threshold</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  className="input-field font-mono text-sm"
                  placeholder="e.g. 2"
                  value={formData.minUsers}
                  onChange={(e) => setFormData({ ...formData, minUsers: e.target.value })}
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  If this room has fewer than {formData.minUsers || 2} players when countdown hits 00:00, 100% of fees are auto-refunded.
                </p>
              </div>

              {/* Preview of rules that will be assigned to this room */}
              <div className="sm:col-span-2 p-3.5 rounded-xl bg-gray-950/70 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>Assigned Room Rules Preview</span>
                  </span>
                  <span className="text-[11px] font-mono text-blue-400">
                    {defaultRules.rules.length} rules
                  </span>
                </div>
                <div className="max-h-24 overflow-y-auto space-y-1.5 text-[11px] text-gray-400 pr-1">
                  {defaultRules.rules.map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-1.5">
                      <span className="text-blue-400 font-mono font-bold">•</span>
                      <span className="line-clamp-2 leading-relaxed">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-3 sm:pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-xs sm:text-sm px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex items-center gap-2 text-xs sm:text-sm px-5 py-2"
                >
                  {creating && <Loader2 size={16} className="animate-spin" />}
                  <span>{creating ? 'Creating Room...' : 'Launch Room'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Room Details & Participants Modal */}
      {showDetailsModal && selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-2xl bg-gray-900 border border-gray-700 shadow-2xl relative max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                    {selectedRoom.roomId || selectedRoom._id}
                  </span>
                  {renderStatusBadge(selectedRoom.status)}
                </div>
                <h2 className="text-xl font-bold text-white mt-1">{selectedRoom.title}</h2>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5">
              {detailsLoading ? (
                <div className="py-12 text-center text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 size={20} className="animate-spin text-blue-500" />
                  <span>Loading room data...</span>
                </div>
              ) : (
                <>
                  {/* Quick Specs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800">
                      <p className="text-[11px] text-gray-400">Entry Fee</p>
                      <p className="text-lg font-bold font-mono text-white">₹{selectedRoom.entryFee}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800">
                      <p className="text-[11px] text-gray-400">Jackpot Prize</p>
                      <p className="text-lg font-bold font-mono text-amber-400">₹{selectedRoom.prize}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800">
                      <p className="text-[11px] text-gray-400">Participants</p>
                      <p className="text-lg font-bold font-mono text-blue-400">
                        {selectedRoom.participants?.length || 0}
                        {selectedRoom.maxUsers ? ` / ${selectedRoom.maxUsers}` : ''}
                      </p>
                      <span className="text-[10px] text-blue-300/80 font-mono block mt-0.5">
                        Min Required: {selectedRoom.minUsers || 2}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800">
                      <p className="text-[11px] text-gray-400">Draw Time</p>
                      <p className="text-xs font-bold text-gray-200 mt-1">
                        {formatDateSafe(selectedRoom.startTime)}
                      </p>
                    </div>
                  </div>

                  {/* Cancellation Reason Note */}
                  {(selectedRoom.status === 'cancelled' || selectedRoom.notes) && (
                    <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs flex items-start gap-2.5">
                      <AlertTriangle size={18} className="text-rose-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-rose-300 block">Cancellation / System Note:</span>
                        <p className="text-rose-200 mt-0.5 leading-relaxed font-mono text-[11px]">
                          {selectedRoom.notes || `Auto-cancelled & refunded: Minimum ${selectedRoom.minUsers || 2} players not reached.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rules of this Room */}
                  {selectedRoom.rules && selectedRoom.rules.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
                        <ShieldCheck size={14} className="text-emerald-400" />
                        <span>Room Rules &amp; Execution Criteria</span>
                      </div>
                      <ul className="text-xs text-gray-400 space-y-1.5 list-disc list-inside">
                        {selectedRoom.rules.map((rule, idx) => (
                          <li key={idx} className="leading-relaxed text-[11px]">
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Status Action Controls */}
                  <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-800 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-300">
                      Room Status Controls
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedRoom.status !== 'in_progress' && selectedRoom.status !== 'completed' && (
                        <button
                          onClick={() => handleStatusChange(selectedRoom._id, 'in_progress')}
                          disabled={updatingId === selectedRoom._id}
                          className="btn-primary text-xs py-2 px-3 bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5"
                        >
                          <Play size={14} /> Mark In Progress
                        </button>
                      )}

                      {selectedRoom.status !== 'completed' && (
                        <button
                          onClick={() => {
                            // If participants exist, pick a winner or first
                            const pList = selectedRoom.participants || [];
                            const winner = pList.length > 0 ? (pList[0].userId?._id || pList[0].userId) : null;
                            handleStatusChange(selectedRoom._id, 'completed', winner);
                          }}
                          disabled={updatingId === selectedRoom._id}
                          className="btn-primary text-xs py-2 px-3 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                        >
                          <CheckCircle size={14} /> Mark Completed
                        </button>
                      )}

                      {selectedRoom.status !== 'cancelled' && selectedRoom.status !== 'completed' && (
                        <button
                          onClick={() => handleStatusChange(selectedRoom._id, 'cancelled')}
                          disabled={updatingId === selectedRoom._id}
                          className="btn-secondary text-xs py-2 px-3 text-rose-300 hover:text-rose-200 hover:bg-rose-900/40 border-rose-800/40 flex items-center gap-1.5"
                        >
                          <XCircle size={14} /> Cancel Room
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteRoom(selectedRoom._id, selectedRoom.title)}
                        className="btn-secondary text-xs py-2 px-3 text-gray-400 hover:text-rose-400 flex items-center gap-1.5 ml-auto"
                      >
                        <Trash2 size={14} /> Delete Room
                      </button>
                    </div>
                  </div>

                  {/* Winner Showcase */}
                  {selectedRoom.winner && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/30 to-amber-900/30 border border-amber-500/30 flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                        <Trophy size={24} />
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                          Declared Winner
                        </span>
                        <p className="text-base font-bold text-white">
                          @{typeof selectedRoom.winner === 'object' ? selectedRoom.winner.username : selectedRoom.winner}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Participants List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Users size={16} className="text-blue-400" />
                        <span>Registered Participants ({selectedRoom.participants?.length || 0})</span>
                      </h3>
                    </div>

                    {!selectedRoom.participants || selectedRoom.participants.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-xs bg-gray-950/40 rounded-xl border border-gray-800">
                        No users have entered this room yet.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {selectedRoom.participants.map((p, idx) => {
                          const userObj = p.userId && typeof p.userId === 'object' ? p.userId : null;
                          const username = p.username || userObj?.username || 'Player';
                          const pUserId = userObj?._id || p.userId;
                          const isWinner =
                            selectedRoom.winner &&
                            (selectedRoom.winner === pUserId || selectedRoom.winner._id === pUserId);

                          return (
                            <div
                              key={p._id || idx}
                              className={`flex items-center justify-between p-3 rounded-lg border text-xs ${
                                isWinner
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                                  : 'bg-gray-800/40 border-gray-800 text-gray-300'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-gray-500 text-[11px] w-5">
                                  #{idx + 1}
                                </span>
                                <div>
                                  <p className="font-semibold text-white">@{username}</p>
                                  {userObj?.email && (
                                    <p className="text-[10px] text-gray-500 font-mono">{userObj.email}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-[11px] text-gray-500">
                                  {p.joinedAt ? formatDateSafe(p.joinedAt, 'HH:mm:ss, dd MMM') : ''}
                                </span>

                                {isWinner && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <Trophy size={10} /> WINNER
                                  </span>
                                )}

                                {selectedRoom.status === 'in_progress' && !selectedRoom.winner && (
                                  <button
                                    onClick={() => handleStatusChange(selectedRoom._id, 'completed', pUserId)}
                                    className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-semibold"
                                    title="Pick as winner"
                                  >
                                    Pick Winner
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
