import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import socket from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Banknote,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Save,
  AlertTriangle,
  Smartphone,
  Building,
  User,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Sliders,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

export default function CashoutManager() {
  const { refreshUser } = useAuth();

  // Rules Configuration State
  const [rules, setRules] = useState({
    minCashout: 100,
    maxCashoutPerDay: 5000,
    maxRequestsPerDay: 5,
    guidelines: ''
  });
  const [rulesLoading, setRulesLoading] = useState(true);
  const [savingRules, setSavingRules] = useState(false);
  const [rulesCollapsed, setRulesCollapsed] = useState(false);

  // Pending Cashout Requests State
  const [pendingRequests, setPendingRequests] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);

  // History Requests State
  const [historyRequests, setHistoryRequests] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all'); // 'all' | 'approved' | 'rejected'
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState({ total: 0, page: 1, pages: 1 });

  // Dialog State: Approve
  const [approveDialog, setApproveDialog] = useState({
    open: false,
    request: null,
    adminNote: '',
    processing: false
  });

  // Dialog State: Reject
  const [rejectDialog, setRejectDialog] = useState({
    open: false,
    request: null,
    reason: '',
    processing: false
  });

  // Sound Chime for new request
  const playNewRequestChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Ignore audio failure
    }
  };

  // Fetch Rules
  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const { data } = await api.get('/cashouts/rules');
      if (data?.rules) {
        setRules({
          minCashout: data.rules.minCashout ?? 100,
          maxCashoutPerDay: data.rules.maxCashoutPerDay ?? 5000,
          maxRequestsPerDay: data.rules.maxRequestsPerDay ?? 5,
          guidelines: data.rules.guidelines ?? ''
        });
      }
    } catch {
      toast.error('Failed to load cashout rules');
    } finally {
      setRulesLoading(false);
    }
  }, []);

  // Save Rules
  const handleSaveRules = async (e) => {
    e.preventDefault();
    setSavingRules(true);
    try {
      const { data } = await api.put('/cashouts/rules', {
        minCashout: Number(rules.minCashout),
        maxCashoutPerDay: Number(rules.maxCashoutPerDay),
        maxRequestsPerDay: Number(rules.maxRequestsPerDay),
        guidelines: rules.guidelines
      });
      toast.success(data.message || 'Cashout rules saved successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update cashout rules');
    } finally {
      setSavingRules(false);
    }
  };

  // Fetch Pending Requests
  const fetchPendingRequests = useCallback(async () => {
    setPendingLoading(true);
    try {
      const { data } = await api.get('/cashouts/admin/all', {
        params: { status: 'pending', limit: 50 }
      });
      setPendingRequests(data.requests || []);
    } catch {
      toast.error('Failed to load pending cashout requests');
    } finally {
      setPendingLoading(false);
    }
  }, []);

  // Fetch History Requests
  const fetchHistoryRequests = useCallback(async (targetPage = historyPage, filter = historyStatusFilter) => {
    setHistoryLoading(true);
    try {
      const params = {
        page: targetPage,
        limit: 15
      };
      if (filter && filter !== 'all') {
        params.status = filter;
      }
      const { data } = await api.get('/cashouts/admin/all', { params });

      // If user filtered for 'all', we only show resolved requests (approved/rejected) in history table
      // because pending has its own dedicated top table
      const filtered = (data.requests || []).filter((r) =>
        filter === 'all' ? r.status !== 'pending' : r.status === filter
      );

      setHistoryRequests(filtered);
      if (data.pagination) {
        setHistoryPagination(data.pagination);
      }
    } catch {
      toast.error('Failed to load cashout history');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyStatusFilter]);

  // Initial Load
  useEffect(() => {
    fetchRules();
    fetchPendingRequests();
    fetchHistoryRequests(1, historyStatusFilter);
  }, [fetchRules, fetchPendingRequests, fetchHistoryRequests, historyStatusFilter]);

  // Real-Time Socket Listeners
  useEffect(() => {
    // 1. Listen for new cashout requests submitted by players
    const handleNewRequest = (payload) => {
      if (!payload || !payload.request) return;
      playNewRequestChime();
      const amount = payload.request.amount ?? 0;
      const username = payload.username || payload.request.userId?.username || 'player';

      toast(`🔔 New Cashout Request: ₹${amount} from @${username}`, {
        duration: 7000,
        icon: '🔔',
        style: {
          border: '1px solid #10b981',
          padding: '16px',
          color: '#10b981'
        }
      });

      // Automatically prepend the new request to the Pending table!
      setPendingRequests((prev) => {
        // Prevent duplicate if already exists
        if (prev.some((r) => String(r._id) === String(payload.request._id))) {
          return prev;
        }
        return [payload.request, ...prev];
      });
    };

    // 2. Listen for cashout updates (e.g. processed by another admin or socket echo)
    const handleCashoutUpdated = (payload) => {
      if (!payload) return;
      // If a request was approved or rejected or cancelled, remove from pending
      setPendingRequests((prev) => prev.filter((r) => String(r._id) !== String(payload.requestId)));
      // Refresh history to show the update
      fetchHistoryRequests(historyPage, historyStatusFilter);
    };

    // 3. Listen for player self-cancellation of pending cashout
    const handleCashoutCancelled = (payload) => {
      if (!payload) return;
      const { requestId, username, amount, reason } = payload;
      toast(`⚠️ Player @${username} cancelled cashout of ₹${amount}. Reason: ${reason || 'No reason provided'}`, {
        duration: 8000,
        icon: '⚠️',
        style: {
          border: '1px solid #f59e0b',
          padding: '16px',
          color: '#f59e0b'
        }
      });

      // Automatically updates the pending list!
      setPendingRequests((prev) => prev.filter((r) => String(r._id) !== String(requestId)));
      // Refresh history to reflect cancellation
      fetchHistoryRequests(historyPage, historyStatusFilter);
    };

    socket.on('cashout:new_request', handleNewRequest);
    socket.on('cashout:updated', handleCashoutUpdated);
    socket.on('cashout:cancelled', handleCashoutCancelled);

    return () => {
      socket.off('cashout:new_request', handleNewRequest);
      socket.off('cashout:updated', handleCashoutUpdated);
      socket.off('cashout:cancelled', handleCashoutCancelled);
    };
  }, [fetchHistoryRequests, historyPage, historyStatusFilter]);

  // Approve Handler
  const openApproveModal = (request) => {
    setApproveDialog({
      open: true,
      request,
      adminNote: 'Processed via UPI / Bank Transfer',
      processing: false
    });
  };

  const confirmApprove = async () => {
    const { request, adminNote } = approveDialog;
    if (!request) return;

    setApproveDialog((prev) => ({ ...prev, processing: true }));
    try {
      const { data } = await api.patch(`/cashouts/admin/${request._id}/approve`, {
        adminNote: adminNote.trim()
      });
      toast.success(data.message || 'Cashout approved and transferred to Admin wallet!');
      setApproveDialog({ open: false, request: null, adminNote: '', processing: false });

      // Remove from pending list immediately
      setPendingRequests((prev) => prev.filter((r) => r._id !== request._id));

      // Refresh history and admin wallet balance
      fetchHistoryRequests(1, historyStatusFilter);
      if (refreshUser) {
        refreshUser();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve cashout');
      setApproveDialog((prev) => ({ ...prev, processing: false }));
    }
  };

  // Reject Handler
  const openRejectModal = (request) => {
    setRejectDialog({
      open: true,
      request,
      reason: '',
      processing: false
    });
  };

  const confirmReject = async () => {
    const { request, reason } = rejectDialog;
    if (!request) return;

    if (!reason || !reason.trim()) {
      return toast.error('Rejection description/reason is required');
    }

    setRejectDialog((prev) => ({ ...prev, processing: true }));
    try {
      const { data } = await api.patch(`/cashouts/admin/${request._id}/reject`, {
        adminNote: reason.trim()
      });
      toast.success(data.message || 'Cashout request rejected.');
      setRejectDialog({ open: false, request: null, reason: '', processing: false });

      // Remove from pending list immediately
      setPendingRequests((prev) => prev.filter((r) => r._id !== request._id));

      // Refresh history
      fetchHistoryRequests(1, historyStatusFilter);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject cashout');
      setRejectDialog((prev) => ({ ...prev, processing: false }));
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'dd MMM yyyy, hh:mm a');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-black flex items-center gap-2.5 text-white">
            <Banknote size={28} className="text-[#FFB51B] flex-shrink-0" />
            <span>Potly Cashout &amp; Withdrawal Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#C4BBD5] mt-1">
            Process player payouts and configure cashout rules
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => {
              fetchRules();
              fetchPendingRequests();
              fetchHistoryRequests(1, historyStatusFilter);
              toast.success('Refreshed cashout center');
            }}
            className="btn-secondary flex items-center gap-2 text-xs sm:text-sm py-2 px-3 sm:px-4"
          >
            <RefreshCw
              size={16}
              className={pendingLoading || historyLoading ? 'animate-spin' : ''}
            />
            <span>Refresh All</span>
          </button>
        </div>
      </div>

      {/* TOP SECTION: Cashout Rules Configuration Card */}
      <div className="card bg-[#21183A] border-[#3B3152] p-4 sm:p-6 transition-all">
        <div className="flex items-center justify-between border-b border-[#3B3152] pb-3 sm:pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/35 flex-shrink-0">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-base font-heading font-bold text-white">Cashout Rules Configuration</h2>
              <p className="text-xs text-[#C4BBD5]">
                Define withdrawal thresholds, daily limits, and policies shown to players
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRulesCollapsed(!rulesCollapsed)}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            title={rulesCollapsed ? 'Expand Configuration' : 'Collapse Configuration'}
          >
            {rulesCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>

        {!rulesCollapsed && (
          <form onSubmit={handleSaveRules} className="space-y-4">
            {rulesLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-8 bg-gray-800 rounded w-1/3" />
                <div className="h-16 bg-gray-800 rounded" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Min Cashout Limit (₹) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={rules.minCashout}
                      onChange={(e) => setRules({ ...rules, minCashout: e.target.value })}
                      className="input-field font-mono font-semibold text-sm"
                      required
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Minimum amount a player can request per cashout.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Max Cashout Limit Per Day (₹) *
                    </label>
                    <input
                      type="number"
                      min={10}
                      value={rules.maxCashoutPerDay}
                      onChange={(e) => setRules({ ...rules, maxCashoutPerDay: e.target.value })}
                      className="input-field font-mono font-semibold text-sm"
                      required
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Aggregated daily maximum cashout per player.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Max Requests Per Day *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={rules.maxRequestsPerDay}
                      onChange={(e) => setRules({ ...rules, maxRequestsPerDay: e.target.value })}
                      className="input-field font-mono font-semibold text-sm"
                      required
                    />
                    <p className="text-[11px] text-gray-500 mt-1">
                      Max count of withdrawal submissions per day.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-950/60 border border-gray-800 flex flex-col justify-center">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                      Withdrawal Policy
                    </span>
                    <p className="text-xs text-emerald-400 font-medium mt-0.5">
                      Thresholds enforced automatically on submission
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Cashout Guidelines / Instructions Text
                  </label>
                  <textarea
                    rows={2}
                    value={rules.guidelines}
                    onChange={(e) => setRules({ ...rules, guidelines: e.target.value })}
                    className="input-field text-xs resize-none"
                    placeholder="Instructions shown to players in the cashout modal"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingRules}
                    className="btn-primary flex items-center gap-2 text-xs py-2 px-5"
                  >
                    {savingRules ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Saving Rules...</span>
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>Save Rules</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>

      {/* MIDDLE SECTION: Pending Cashout Requests */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock size={20} className="text-amber-400" />
              <span>Pending Cashout Requests</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {pendingRequests.length} Pending
            </span>
          </div>

          <button
            onClick={fetchPendingRequests}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} className={pendingLoading ? 'animate-spin' : ''} />
            <span>Reload Pending</span>
          </button>
        </div>

        {pendingLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse card p-5 space-y-3 border-gray-800">
                <div className="h-6 bg-gray-800 rounded w-1/4" />
                <div className="h-4 bg-gray-800/60 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="card text-center py-12 bg-gray-950/40 border-dashed border-gray-800 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-sm font-semibold text-gray-300">All Cashouts Cleared</h3>
            <p className="text-xs text-gray-500 mt-1">
              There are currently no pending cashout requests awaiting admin approval.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {pendingRequests.map((req) => {
              const player = req.userId || {};
              const playerUsername = player.username || 'unknown';
              const playerEmail = player.email || '';
              const playerBalance = player.balance ?? 0;

              return (
                <div
                  key={req._id}
                  className="card bg-gray-900 border border-amber-500/30 hover:border-amber-500/50 transition-all p-4 sm:p-5 shadow-lg shadow-black/40 space-y-3.5 sm:space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
                    {/* Player Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold flex-shrink-0">
                        <User size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-sm sm:text-base">@{playerUsername}</span>
                          <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 text-[11px] px-2 py-0.5 rounded font-mono font-medium">
                            Wallet: ₹{playerBalance.toFixed(2)}
                          </span>
                        </div>
                        {playerEmail && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{playerEmail}</p>
                        )}
                      </div>
                    </div>

                    {/* Requested Amount & Time */}
                    <div className="flex sm:flex-col sm:items-end justify-between items-center flex-shrink-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs text-gray-400 uppercase font-semibold">Cashout:</span>
                        <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400 tracking-tight">
                          ₹{req.amount.toFixed(2)}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                        <Clock size={12} /> Requested: {formatDateDisplay(req.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Details & User Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-gray-950/70 border border-gray-800 space-y-1.5">
                      <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">
                        Payout Destination ({req.paymentMethod === 'upi' ? 'UPI' : 'Bank Transfer'}):
                      </span>
                      {req.paymentMethod === 'upi' ? (
                        <div className="flex items-center gap-2 text-white font-mono text-sm">
                          <Smartphone size={16} className="text-emerald-400 flex-shrink-0" />
                          <span className="font-bold break-all">{req.paymentDetails?.upiId || 'N/A'}</span>
                        </div>
                      ) : (
                        <div className="space-y-1 text-white">
                          <div className="flex items-center gap-2">
                            <Building size={16} className="text-emerald-400 flex-shrink-0" />
                            <span>Name: <strong>{req.paymentDetails?.accountHolderName || 'N/A'}</strong></span>
                          </div>
                          <div className="font-mono text-gray-300 pl-6 space-y-0.5 text-[11px]">
                            <p>A/C: <span className="text-white font-semibold">{req.paymentDetails?.accountNumber || 'N/A'}</span></p>
                            <p>IFSC: <span className="text-white font-semibold">{req.paymentDetails?.ifsc || 'N/A'}</span></p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-gray-950/70 border border-gray-800 space-y-1">
                      <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">
                        Audit &amp; Notes:
                      </span>
                      <p className="text-gray-300 font-mono text-[11px] truncate">
                        Request ID: {req._id}
                      </p>
                      {req.paymentDetails?.notes ? (
                        <p className="text-gray-300 line-clamp-2">
                          <span className="text-gray-500">Player Note:</span> &ldquo;{req.paymentDetails.notes}&rdquo;
                        </p>
                      ) : (
                        <p className="text-gray-500 italic">No note submitted by player</p>
                      )}
                      {playerBalance < req.amount && (
                        <p className="text-rose-400 font-semibold text-[11px] flex items-center gap-1 pt-1">
                          <AlertTriangle size={13} /> Warning: Player balance (₹{playerBalance}) is lower than requested amount!
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons: Approve & Reject */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => openRejectModal(req)}
                      className="flex-1 sm:flex-none justify-center px-4 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle size={15} />
                      <span>Reject Request</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openApproveModal(req)}
                      className="flex-1 sm:flex-none justify-center px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02]"
                    >
                      <CheckCircle2 size={15} />
                      <span>Approve Payout</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BOTTOM SECTION: Completed & Rejected History Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <FileText size={20} className="text-blue-400" />
              <span>Completed &amp; Rejected History</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Historical ledger of all resolved payout requests
            </p>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-gray-900 p-1 rounded-lg border border-gray-800 overflow-x-auto no-scrollbar flex-nowrap self-start sm:self-auto">
            <button
              onClick={() => {
                setHistoryStatusFilter('all');
                setHistoryPage(1);
                fetchHistoryRequests(1, 'all');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors flex-shrink-0 ${
                historyStatusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Resolved
            </button>
            <button
              onClick={() => {
                setHistoryStatusFilter('approved');
                setHistoryPage(1);
                fetchHistoryRequests(1, 'approved');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors flex-shrink-0 ${
                historyStatusFilter === 'approved'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => {
                setHistoryStatusFilter('rejected');
                setHistoryPage(1);
                fetchHistoryRequests(1, 'rejected');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors flex-shrink-0 ${
                historyStatusFilter === 'rejected'
                  ? 'bg-rose-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => {
                setHistoryStatusFilter('cancelled');
                setHistoryPage(1);
                fetchHistoryRequests(1, 'cancelled');
              }}
              className={`px-3 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors flex-shrink-0 ${
                historyStatusFilter === 'cancelled'
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Cancelled
            </button>
          </div>
        </div>

        {/* History Table */}
        <div className="card overflow-hidden p-0 border border-gray-800">
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="bg-gray-800/80 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Payment Method / Destination</th>
                  <th className="py-3 px-4">Admin Note / Reason</th>
                  <th className="py-3 px-4 text-right">Processed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-medium">
                {historyLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-gray-400" />
                      Loading history...
                    </td>
                  </tr>
                ) : historyRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No resolved cashout records found.
                    </td>
                  </tr>
                ) : (
                  historyRequests.map((req) => {
                    const player = req.userId || {};
                    const isApproved = req.status === 'approved';
                    const isRejected = req.status === 'rejected';

                    return (
                      <tr key={req._id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-white">
                            @{player.username || 'unknown'}
                          </p>
                          <p className="text-[11px] text-gray-500 font-mono">
                            {player.email || req._id.slice(-6)}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`font-bold font-mono text-sm ${
                              isApproved ? 'text-emerald-400' : 'text-gray-300'
                            }`}
                          >
                            ₹{req.amount.toFixed(2)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 size={12} /> Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <XCircle size={12} /> Rejected
                            </span>
                          )}
                          {req.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-800 text-gray-300 border border-gray-700">
                              <XCircle size={12} className="text-gray-400" /> Cancelled
                            </span>
                          )}
                          {req.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock size={12} /> Pending
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5 text-gray-300">
                            <span className="uppercase text-[10px] text-gray-500 font-bold block">
                              {req.paymentMethod === 'upi' ? 'UPI' : 'Bank'}
                            </span>
                            {req.paymentMethod === 'upi' ? (
                              <span className="font-mono text-xs">{req.paymentDetails?.upiId || '—'}</span>
                            ) : (
                              <span className="font-mono text-[11px]">
                                A/C: {req.paymentDetails?.accountNumber || '—'} ({req.paymentDetails?.accountHolderName || '—'})
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          {req.adminNote || req.cancelReason ? (
                            <p
                              className={`text-xs truncate ${
                                isRejected
                                  ? 'text-rose-300 font-semibold'
                                  : req.status === 'cancelled'
                                  ? 'text-amber-300 font-medium'
                                  : 'text-gray-300'
                              }`}
                              title={req.adminNote || req.cancelReason}
                            >
                              {req.adminNote || req.cancelReason}
                            </p>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right text-gray-400 font-mono text-[11px]">
                          {formatDateDisplay(req.processedAt || req.updatedAt || req.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {historyPagination.pages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-gray-800 text-xs">
              <span className="text-gray-400">
                Page {historyPagination.page} of {historyPagination.pages} ({historyPagination.total} records)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const p = Math.max(1, historyPage - 1);
                    setHistoryPage(p);
                    fetchHistoryRequests(p, historyStatusFilter);
                  }}
                  disabled={historyPage <= 1}
                  className="p-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 text-gray-300"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => {
                    const p = Math.min(historyPagination.pages, historyPage + 1);
                    setHistoryPage(p);
                    fetchHistoryRequests(p, historyStatusFilter);
                  }}
                  disabled={historyPage >= historyPagination.pages}
                  className="p-1 rounded bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 text-gray-300"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* APPROVAL DIALOG MODAL */}
      {approveDialog.open && approveDialog.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-h-[90vh] overflow-y-auto w-full max-w-md mx-3 sm:mx-auto p-4 sm:p-6 rounded-2xl bg-gray-900 border border-emerald-800/40 shadow-2xl space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Approve Cashout Request</h3>
                  <p className="text-xs text-gray-400">Confirm payout execution and record transaction</p>
                </div>
              </div>
              <button
                onClick={() => setApproveDialog({ open: false, request: null, adminNote: '', processing: false })}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Warning / Transfer Explanatory Banner */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 space-y-2 text-xs">
              <p className="text-emerald-300 font-semibold leading-relaxed">
                Approving will deduct{' '}
                <span className="font-extrabold text-white font-mono text-sm">
                  ₹{approveDialog.request.amount.toFixed(2)}
                </span>{' '}
                from @{approveDialog.request.userId?.username || 'player'} and transfer it into your Admin wallet.
              </p>
              <div className="text-[11px] text-gray-300 pt-1 border-t border-emerald-800/30">
                Destination:{' '}
                {approveDialog.request.paymentMethod === 'upi' ? (
                  <span className="font-mono text-white break-all">
                    UPI ID: {approveDialog.request.paymentDetails?.upiId || 'N/A'}
                  </span>
                ) : (
                  <span className="font-mono text-white break-all">
                    A/C {approveDialog.request.paymentDetails?.accountNumber} ({approveDialog.request.paymentDetails?.ifsc})
                  </span>
                )}
              </div>
            </div>

            {/* Description Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Description / Payment Reference (Optional/Recommended)
              </label>
              <input
                type="text"
                value={approveDialog.adminNote}
                onChange={(e) =>
                  setApproveDialog({ ...approveDialog, adminNote: e.target.value })
                }
                placeholder="e.g. Processed via UPI Ref #12345"
                className="input-field text-sm"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Visible to the player in their cashout status list and debit statement.
              </p>
            </div>

            {/* Dialog Buttons */}
            <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setApproveDialog({ open: false, request: null, adminNote: '', processing: false })}
                className="btn-secondary text-xs px-4 py-2"
                disabled={approveDialog.processing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmApprove}
                disabled={approveDialog.processing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-950/40 disabled:opacity-50"
              >
                {approveDialog.processing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Confirm &amp; Approve</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION DIALOG MODAL */}
      {rejectDialog.open && rejectDialog.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-h-[90vh] overflow-y-auto w-full max-w-md mx-3 sm:mx-auto p-4 sm:p-6 rounded-2xl bg-gray-900 border border-rose-800/40 shadow-2xl space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex-shrink-0">
                  <XCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Reject Cashout Request</h3>
                  <p className="text-xs text-gray-400">Cancel request and inform player with a mandatory reason</p>
                </div>
              </div>
              <button
                onClick={() => setRejectDialog({ open: false, request: null, reason: '', processing: false })}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Warning Banner */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300">
              <p className="font-semibold leading-relaxed">
                You are rejecting the withdrawal of{' '}
                <span className="font-bold text-white font-mono">
                  ₹{rejectDialog.request.amount.toFixed(2)}
                </span>{' '}
                requested by @{rejectDialog.request.userId?.username || 'player'}.
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                The player&apos;s balance will remain unchanged in their wallet. They will be notified via real-time WebSocket of your rejection reason.
              </p>
            </div>

            {/* Mandatory Reason Input */}
            <div>
              <label className="block text-xs font-semibold text-rose-300 uppercase tracking-wider mb-1.5">
                Mandatory Rejection Reason *
              </label>
              <textarea
                rows={3}
                value={rejectDialog.reason}
                onChange={(e) =>
                  setRejectDialog({ ...rejectDialog, reason: e.target.value })
                }
                placeholder="e.g. Invalid UPI ID provided, please check and resubmit"
                className="input-field text-sm resize-none border-rose-900/50 focus:ring-rose-500"
                required
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Player will see this message prominently in their cashout status tab.
              </p>
            </div>

            {/* Dialog Buttons */}
            <div className="flex items-center justify-end gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectDialog({ open: false, request: null, reason: '', processing: false })}
                className="btn-secondary text-xs px-4 py-2"
                disabled={rejectDialog.processing}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={rejectDialog.processing || !rejectDialog.reason.trim()}
                className="bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-md shadow-rose-950/40 disabled:opacity-50"
              >
                {rejectDialog.processing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={15} />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
