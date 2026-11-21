import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Banknote,
  CheckCircle,
  XCircle,
  Clock,
  QrCode,
  Copy,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Send,
  Eye,
  AlertCircle,
  Settings,
  Sparkles,
  Ticket,
  Users,
  Image as ImageIcon,
  MessageSquare,
  ShieldCheck,
  Calendar,
  X
} from 'lucide-react';
import api from '../../api/axios';
import socket from '../../services/socket';
import { compressImage } from '../../utils/imageCompressor';

export default function DepositManager() {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ total: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); // For Lightbox viewer

  // Modals
  const [approveModalReq, setApproveModalReq] = useState(null);
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Approval Form State
  const [approvalForm, setApprovalForm] = useState({
    couponCode: '',
    expiryDays: 7,
    customExpiryDate: '',
    expiryPreset: '7',
    adminReply: ''
  });
  const [approving, setApproving] = useState(false);

  // Reject Form State
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Settings Form State
  const [settings, setSettings] = useState({
    upiId: '',
    qrCode: '',
    autoReplyTemplate: '',
    instructions: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    try {
      const { data } = await api.get('/deposit-requests/admin', {
        params: { status: statusFilter, limit: 100 }
      });
      if (data?.success) {
        setRequests(data.requests || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load deposit requests:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/deposit-requests/admin/settings');
      if (data?.success && data.settings) {
        setSettings({
          upiId: data.settings.upiId || '',
          qrCode: data.settings.qrCode || '',
          autoReplyTemplate: data.settings.autoReplyTemplate || '',
          instructions: data.settings.instructions || ''
        });
      }
    } catch (err) {
      console.error('Failed to load payment settings:', err);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Real-time Socket.IO events
  useEffect(() => {
    const handleNewRequest = (newReq) => {
      toast('📥 New Deposit Screenshot Received!', {
        icon: '💰',
        duration: 5000,
        style: { background: '#21183A', color: '#FFB51B', border: '1px solid #FFB51B' }
      });
      setRequests((prev) => [newReq, ...prev]);
      setStats((prev) => ({
        ...prev,
        total: (prev.total || 0) + 1,
        pendingCount: (prev.pendingCount || 0) + 1
      }));
    };

    const handleResolvedRequest = (resolved) => {
      setRequests((prev) =>
        prev.map((r) => (String(r._id) === String(resolved.id || resolved._id) ? { ...r, ...resolved } : r))
      );
      if (resolved.status === 'approved') {
        setStats((prev) => ({
          ...prev,
          pendingCount: Math.max(0, (prev.pendingCount || 1) - 1),
          approvedCount: (prev.approvedCount || 0) + 1
        }));
      } else if (resolved.status === 'rejected') {
        setStats((prev) => ({
          ...prev,
          pendingCount: Math.max(0, (prev.pendingCount || 1) - 1),
          rejectedCount: (prev.rejectedCount || 0) + 1
        }));
      }
    };

    socket.on('deposit_request:new', handleNewRequest);
    socket.on('deposit_request:resolved', handleResolvedRequest);

    return () => {
      socket.off('deposit_request:new', handleNewRequest);
      socket.off('deposit_request:resolved', handleResolvedRequest);
    };
  }, []);

  // Open Approval Modal
  const handleOpenApprove = (req) => {
    const autoCode = 'DEP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setApproveModalReq(req);
    setApprovalForm({
      couponCode: autoCode,
      expiryDays: 7,
      customExpiryDate: '',
      expiryPreset: '7',
      adminReply: `Payment verified! Use code ${autoCode} to redeem ₹${Number(req.amount).toFixed(2)} into your wallet.`
    });
  };

  // Submit Approval
  const submitApprove = async () => {
    if (!approveModalReq) return;
    setApproving(true);
    try {
      const payload = {
        couponCode: approvalForm.couponCode.trim().toUpperCase(),
        adminReply: approvalForm.adminReply.trim(),
        ...(approvalForm.expiryPreset === 'custom' && approvalForm.customExpiryDate
          ? { expiryDate: approvalForm.customExpiryDate }
          : { expiryDays: Number(approvalForm.expiryPreset) || 7 })
      };

      const { data } = await api.post(`/deposit-requests/admin/${approveModalReq._id}/approve`, payload);
      toast.success(data.message || 'Deposit approved & coupon code issued!');
      setApproveModalReq(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve request');
    } finally {
      setApproving(false);
    }
  };

  // Submit Rejection
  const submitReject = async () => {
    if (!rejectModalReq) return;
    setRejecting(true);
    try {
      const { data } = await api.post(`/deposit-requests/admin/${rejectModalReq._id}/reject`, {
        reason: rejectReason.trim()
      });
      toast.success(data.message || 'Deposit request rejected.');
      setRejectModalReq(null);
      setRejectReason('');
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject request');
    } finally {
      setRejecting(false);
    }
  };

  // Save Settings
  const savePaymentSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const { data } = await api.put('/deposit-requests/admin/settings', settings);
      toast.success(data.message || 'Payment settings updated successfully!');
      setSettingsModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle QR Code upload with compression
  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrUploading(true);
    try {
      const compressed = await compressImage(file, 600, 0.7);
      setSettings((prev) => ({ ...prev, qrCode: compressed.dataUrl }));
      toast.success(`QR Code loaded (${compressed.formattedCompressed})`);
    } catch (err) {
      toast.error(err.message || 'Failed to process QR image');
    } finally {
      setQrUploading(false);
    }
  };

  // Compute 24-hour remaining time
  const getTimeLeft24h = (createdAtStr) => {
    if (!createdAtStr) return 'Expiring soon';
    const expiresAt = new Date(createdAtStr).getTime() + 24 * 60 * 60 * 1000;
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'Purging in next cycle';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left before auto-purge`;
  };

  // Filter requests by search term
  const filteredRequests = requests.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.username && r.username.toLowerCase().includes(term)) ||
      (r.utrReference && r.utrReference.toLowerCase().includes(term)) ||
      (r.couponCode && r.couponCode.toLowerCase().includes(term)) ||
      String(r.amount).includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-[#21183A] via-[#17102D] to-[#2B1254] border border-[#3B3152] rounded-[22px] p-5 sm:p-7 shadow-elevated">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill text-xs font-bold bg-[#FFB51B]/15 text-[#FFB51B] border border-[#FFB51B]/35">
            <Banknote size={14} className="text-[#FFB51B]" />
            <span>PAYMENT VERIFICATION &amp; COUPONS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight">
            Deposit Screenshot Manager
          </h1>
          <p className="text-xs sm:text-sm text-[#C4BBD5] max-w-xl">
            Review player deposit proofs, approve and issue user-locked coupons, and manage your payment UPI ID &amp; QR code.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="btn-primary text-xs py-2.5 px-4 flex items-center gap-2 font-bold"
            title="Edit UPI ID, QR Code & Auto-Reply Message"
          >
            <Settings size={15} />
            <span>Payment &amp; Auto-Reply Settings</span>
          </button>
          <button
            onClick={fetchRequests}
            className="btn-secondary text-xs py-2.5 px-3.5 flex items-center gap-2"
            title="Refresh List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 font-mono">
        <div className="bg-[#21183A] border border-[#3B3152] rounded-xl p-4">
          <p className="text-[11px] text-[#C4BBD5] uppercase tracking-wider font-semibold">Total Requests</p>
          <p className="text-2xl font-bold text-white mt-1">{stats.total || 0}</p>
        </div>
        <div className="bg-[#21183A] border border-[#FFB51B]/40 rounded-xl p-4">
          <p className="text-[11px] text-[#FFB51B] uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FFB51B] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFB51B]"></span>
            </span>
            Pending Review
          </p>
          <p className="text-2xl font-bold text-[#FFB51B] mt-1">{stats.pendingCount || 0}</p>
        </div>
        <div className="bg-[#21183A] border border-emerald-500/30 rounded-xl p-4">
          <p className="text-[11px] text-emerald-400 uppercase tracking-wider font-semibold">Approved &amp; Issued</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.approvedCount || 0}</p>
        </div>
        <div className="bg-[#21183A] border border-rose-500/30 rounded-xl p-4">
          <p className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold">Rejected</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">{stats.rejectedCount || 0}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'pending', label: 'Pending', count: stats.pendingCount },
            { id: 'approved', label: 'Approved', count: stats.approvedCount },
            { id: 'rejected', label: 'Rejected', count: stats.rejectedCount },
            { id: 'all', label: 'All (24h)', count: stats.total }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-control text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-brand-purple text-white shadow-brand'
                  : 'bg-[#21183A] text-[#C4BBD5] hover:text-white hover:bg-[#2C214C] border border-[#3B3152]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-pill text-[10px] font-mono ${
                  statusFilter === tab.id ? 'bg-[#4710A8] text-white' : 'bg-[#17102D] text-[#C4BBD5]'
                }`}
              >
                {tab.count || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C4BBD5]" />
          <input
            type="text"
            placeholder="Search username, UTR, code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-9 py-2 text-xs w-full"
          />
        </div>
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-[#21183A] border border-[#3B3152] rounded-[18px] p-5 space-y-4 animate-pulse">
              <div className="h-6 bg-[#17102D] rounded w-28" />
              <div className="h-32 bg-[#17102D] rounded-xl" />
              <div className="h-4 bg-[#17102D] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-[#21183A]/50 border border-dashed border-[#3B3152] rounded-[22px] text-center py-16 px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#17102D] flex items-center justify-center text-[#A78BFA] border border-[#3B3152]">
            <CheckCircle size={30} />
          </div>
          <h3 className="text-base font-heading font-bold text-white">No deposit requests in this view</h3>
          <p className="text-xs text-[#C4BBD5] mt-1 max-w-sm mx-auto">
            {statusFilter === 'pending'
              ? 'Great job! All pending deposit proofs have been verified and processed.'
              : 'No requests matched the current filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredRequests.map((req) => (
            <div
              key={req._id}
              className="bg-[#21183A] border border-[#3B3152] hover:border-brand-purple/60 rounded-[18px] p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-all shadow-elevated"
            >
              <div className="space-y-3.5">
                {/* Card Top Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#6419D6]/20 border border-[#6419D6]/40 flex items-center justify-center text-[#A78BFA] font-bold text-xs">
                      {req.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">@{req.username}</p>
                      <p className="text-[10px] text-[#C4BBD5] font-mono">
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {req.status === 'pending' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-[10px] font-bold bg-[#FFB51B]/20 text-[#FFB51B] border border-[#FFB51B]/40 font-mono">
                      PENDING
                    </span>
                  )}
                  {req.status === 'approved' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                      <CheckCircle size={11} /> APPROVED
                    </span>
                  )}
                  {req.status === 'rejected' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 font-mono">
                      <XCircle size={11} /> REJECTED
                    </span>
                  )}
                </div>

                {/* Amount Requested & UTR */}
                <div className="p-3 rounded-xl bg-[#17102D] border border-[#3B3152] flex items-center justify-between font-mono">
                  <div>
                    <span className="text-[10px] text-[#C4BBD5] uppercase block">Deposit Amount</span>
                    <span className="text-xl font-black text-[#FFB51B]">₹{Number(req.amount).toFixed(2)}</span>
                  </div>
                  {req.utrReference && (
                    <div className="text-right">
                      <span className="text-[10px] text-[#C4BBD5] uppercase block">UTR / Ref No.</span>
                      <span className="text-xs font-semibold text-white truncate max-w-[120px] block" title={req.utrReference}>
                        {req.utrReference}
                      </span>
                    </div>
                  )}
                </div>

                {/* Screenshot Preview with Click to Zoom */}
                <div className="relative group/img rounded-xl overflow-hidden border border-[#3B3152] bg-black/40">
                  <img
                    src={req.screenshot}
                    alt={`Payment proof for ₹${req.amount}`}
                    className="w-full h-40 object-cover group-hover/img:scale-105 transition-transform duration-300 cursor-pointer"
                    onClick={() => setSelectedImage(req.screenshot)}
                  />
                  <div
                    onClick={() => setSelectedImage(req.screenshot)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-1.5 text-xs text-white font-semibold transition-opacity cursor-pointer backdrop-blur-xs"
                  >
                    <Eye size={16} /> Click to Full View
                  </div>
                </div>

                {/* Auto-Deletion TTL Countdown Notice */}
                <div className="flex items-center gap-1.5 text-[10px] text-[#A78BFA] font-mono bg-[#6419D6]/10 px-2.5 py-1 rounded-control border border-[#6419D6]/20">
                  <Clock size={12} className="shrink-0" />
                  <span className="truncate">{getTimeLeft24h(req.createdAt)}</span>
                </div>

                {/* If approved, show issued coupon */}
                {req.status === 'approved' && req.couponCode && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-emerald-400 block uppercase">Issued Coupon</span>
                      <span className="font-bold text-white text-sm tracking-wider">{req.couponCode}</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(req.couponCode);
                        toast.success('Copied coupon code!');
                      }}
                      className="p-1.5 rounded-control bg-emerald-500/20 text-emerald-300 hover:text-white"
                      title="Copy Code"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}

                {/* If rejected, show reason */}
                {req.status === 'rejected' && req.adminReply && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs">
                    <span className="text-[10px] text-rose-400 block uppercase font-semibold">Rejection Note:</span>
                    <p className="text-rose-200 text-xs mt-0.5 line-clamp-2">{req.adminReply}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons (For Pending) */}
              {req.status === 'pending' && (
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#3B3152]">
                  <button
                    onClick={() => handleOpenApprove(req)}
                    className="btn-primary py-2 px-3 text-xs flex items-center justify-center gap-1.5 font-bold"
                  >
                    <CheckCircle size={14} /> Approve &amp; Code
                  </button>
                  <button
                    onClick={() => {
                      setRejectModalReq(req);
                      setRejectReason('Payment proof verification failed. UTR or amount mismatch.');
                    }}
                    className="btn-secondary py-2 px-3 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-900/30 border-rose-800/40 flex items-center justify-center gap-1.5"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* LIGHTBOX MODAL: FULL RESOLUTION SCREENSHOT */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-[#17102D] rounded-[20px] p-2 sm:p-3 border border-[#3B3152] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 text-white bg-black/70 hover:bg-black p-2 rounded-full border border-[#3B3152] transition-colors"
            >
              <X size={18} />
            </button>
            <img
              src={selectedImage}
              alt="Payment receipt proof"
              className="max-h-[82vh] w-auto max-w-full rounded-xl object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* APPROVAL & COUPON GENERATION MODAL */}
      {approveModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative max-h-[92vh] overflow-y-auto w-full max-w-lg bg-[#21183A] border-2 border-[#FFB51B]/60 rounded-[22px] shadow-2xl p-5 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3B3152]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Ticket size={20} />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold text-white">Approve Deposit &amp; Issue Coupon</h3>
                  <p className="text-xs text-[#C4BBD5]">Player: @{approveModalReq.username}</p>
                </div>
              </div>
              <button
                onClick={() => setApproveModalReq(null)}
                className="text-[#C4BBD5] hover:text-white p-1 rounded-control hover:bg-[#17102D]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Request Summary */}
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#17102D] border border-[#3B3152] font-mono text-center">
              <div>
                <span className="text-[10px] text-[#C4BBD5] block uppercase">Deposit Amount</span>
                <span className="text-base font-bold text-[#FFB51B]">₹{Number(approveModalReq.amount).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#C4BBD5] block uppercase">User Lockdown</span>
                <span className="text-xs font-bold text-[#A78BFA] truncate block">@{approveModalReq.username} ONLY</span>
              </div>
            </div>

            {/* Coupon Code Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#C4BBD5]">
                Special Coupon Code: <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={approvalForm.couponCode}
                  onChange={(e) => setApprovalForm({ ...approvalForm, couponCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. DEP-79XQ82"
                  className="input-field font-mono font-bold tracking-wider text-sm flex-1"
                />
                <button
                  type="button"
                  onClick={() =>
                    setApprovalForm({
                      ...approvalForm,
                      couponCode: 'DEP-' + Math.random().toString(36).substring(2, 8).toUpperCase()
                    })
                  }
                  className="btn-secondary text-xs py-2.5 px-3 flex items-center gap-1 whitespace-nowrap"
                  title="Generate new unique code"
                >
                  <Sparkles size={13} className="text-[#FFB51B]" /> Re-roll
                </button>
              </div>
              <p className="text-[11px] text-[#A78BFA]">
                🔒 <strong>Strictly User-Locked:</strong> Only @{approveModalReq.username} will be able to redeem this code.
              </p>
            </div>

            {/* Expiry Selector (Presets + Custom) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#C4BBD5]">
                Coupon Expiry Validity: <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                {[
                  { id: '3', label: '3 Days' },
                  { id: '7', label: '7 Days' },
                  { id: '14', label: '14 Days' },
                  { id: '30', label: '30 Days' }
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setApprovalForm({ ...approvalForm, expiryPreset: preset.id })}
                    className={`py-2 px-1 rounded-control text-center font-bold transition-all ${
                      approvalForm.expiryPreset === preset.id
                        ? 'bg-brand-purple text-white border border-[#A78BFA]'
                        : 'bg-[#17102D] text-[#C4BBD5] hover:text-white border border-[#3B3152]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Expiry Option */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setApprovalForm({
                      ...approvalForm,
                      expiryPreset: approvalForm.expiryPreset === 'custom' ? '7' : 'custom'
                    })
                  }
                  className="text-[#A78BFA] hover:text-white underline text-[11px] flex items-center gap-1"
                >
                  <Calendar size={12} />
                  <span>{approvalForm.expiryPreset === 'custom' ? 'Switch back to standard days' : 'Or select exact custom expiry date'}</span>
                </button>
              </div>
              {approvalForm.expiryPreset === 'custom' && (
                <input
                  type="datetime-local"
                  value={approvalForm.customExpiryDate}
                  onChange={(e) => setApprovalForm({ ...approvalForm, customExpiryDate: e.target.value })}
                  className="input-field text-xs w-full font-mono mt-1"
                />
              )}
            </div>

            {/* Message Sent to User */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#C4BBD5]">Message to Player:</label>
              <textarea
                rows={2}
                value={approvalForm.adminReply}
                onChange={(e) => setApprovalForm({ ...approvalForm, adminReply: e.target.value })}
                className="input-field text-xs w-full leading-relaxed"
                placeholder="Optional confirmation note..."
              />
            </div>

            {/* Confirm Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#3B3152]">
              <button
                type="button"
                onClick={() => setApproveModalReq(null)}
                className="btn-secondary text-xs py-2.5 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approving || !approvalForm.couponCode.trim()}
                onClick={submitApprove}
                className="btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2"
              >
                <CheckCircle size={15} />
                <span>{approving ? 'Issuing Coupon...' : 'Confirm & Issue Coupon'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative max-h-[90vh] overflow-y-auto w-full max-w-md bg-[#21183A] border-2 border-rose-500/50 rounded-[22px] shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#3B3152]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  <XCircle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold text-white">Reject Payment Proof</h3>
                  <p className="text-xs text-[#C4BBD5]">Player: @{rejectModalReq.username} (₹{rejectModalReq.amount})</p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalReq(null)}
                className="text-[#C4BBD5] hover:text-white p-1 rounded-control hover:bg-[#17102D]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#C4BBD5]">Reason for Rejection:</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input-field text-xs w-full"
                placeholder="Explain why payment could not be verified..."
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'Payment not received in account',
                  'Invalid UTR / Transaction ID',
                  'Amount mismatch on receipt',
                  'Duplicate screenshot already used'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReason(chip)}
                    className="text-[10px] bg-[#17102D] hover:bg-[#2C214C] text-[#C4BBD5] hover:text-white px-2 py-1 rounded-pill border border-[#3B3152] transition-colors"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#3B3152]">
              <button
                type="button"
                onClick={() => setRejectModalReq(null)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={submitReject}
                className="btn-secondary text-xs py-2 px-5 bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5"
              >
                <XCircle size={14} />
                <span>{rejecting ? 'Rejecting...' : 'Reject Request'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL: UPI ID, QR CODE & AUTO-REPLY TEMPLATE */}
      {settingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={savePaymentSettings}
            className="relative max-h-[92vh] overflow-y-auto w-full max-w-xl bg-[#21183A] border border-[#3B3152] rounded-[22px] shadow-2xl p-5 sm:p-7 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#3B3152]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="text-base font-heading font-bold text-white">Payment &amp; Auto-Reply Settings</h3>
                  <p className="text-xs text-[#C4BBD5]">Customize your official deposit UPI ID, QR Code &amp; Thank-You message</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="text-[#C4BBD5] hover:text-white p-1 rounded-control hover:bg-[#17102D]"
              >
                <X size={18} />
              </button>
            </div>

            {/* UPI ID Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#C4BBD5]">
                Admin Receiving UPI ID: <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={settings.upiId}
                onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                placeholder="e.g. potlygames@okaxis or yourbusiness@upi"
                className="input-field text-xs font-mono w-full"
                required
              />
              <p className="text-[11px] text-[#C4BBD5]">Players can copy this UPI ID on the wallet deposit screen.</p>
            </div>

            {/* QR Code Upload */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#C4BBD5]">Official UPI QR Code Image:</label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-[#17102D] border border-[#3B3152]">
                {settings.qrCode ? (
                  <div className="relative group/qr shrink-0">
                    <img
                      src={settings.qrCode}
                      alt="Active UPI QR Code"
                      className="w-24 h-24 object-contain rounded-lg border border-[#3B3152] bg-white p-1"
                    />
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, qrCode: '' })}
                      className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-1 shadow"
                      title="Remove QR Code"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border border-dashed border-[#3B3152] flex flex-col items-center justify-center text-[#C4BBD5] shrink-0 text-center p-2">
                    <QrCode size={24} className="text-[#A78BFA] mb-1" />
                    <span className="text-[10px]">No QR set</span>
                  </div>
                )}
                <div className="space-y-1.5 flex-1 w-full sm:w-auto">
                  <input
                    type="file"
                    accept="image/*"
                    id="qr-upload-input"
                    onChange={handleQrUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="qr-upload-input"
                    className="btn-secondary text-xs py-2 px-3 inline-flex items-center gap-1.5 cursor-pointer hover:text-white"
                  >
                    <ImageIcon size={14} />
                    <span>{qrUploading ? 'Compressing QR...' : settings.qrCode ? 'Change QR Image' : 'Upload QR Image'}</span>
                  </label>
                  <p className="text-[10px] text-[#C4BBD5] leading-relaxed">
                    Auto-compressed to ultra-lightweight WebP/JPEG format. Players can scan this QR code directly in GPay, PhonePe, or Paytm.
                  </p>
                </div>
              </div>
            </div>

            {/* Automated Thanks Message Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#C4BBD5]">
                  Automated Inbuilt Thanks Message Template: <span className="text-rose-400">*</span>
                </label>
              </div>
              <textarea
                rows={3}
                value={settings.autoReplyTemplate}
                onChange={(e) => setSettings({ ...settings, autoReplyTemplate: e.target.value })}
                className="input-field text-xs w-full leading-relaxed font-sans"
                placeholder="Type your thank you message..."
                required
              />
              <div className="flex items-center gap-1.5 text-[11px] text-[#C4BBD5]">
                <span>Click token to insert:</span>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      autoReplyTemplate: settings.autoReplyTemplate + ' ₹{amount}'
                    })
                  }
                  className="px-2 py-0.5 rounded-pill bg-[#6419D6]/30 text-[#A78BFA] border border-[#6419D6]/40 text-[10px] font-mono hover:bg-[#6419D6]/50"
                >
                  +{'{amount}'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      autoReplyTemplate: settings.autoReplyTemplate + ' @{username}'
                    })
                  }
                  className="px-2 py-0.5 rounded-pill bg-[#FFB51B]/20 text-[#FFB51B] border border-[#FFB51B]/40 text-[10px] font-mono hover:bg-[#FFB51B]/40"
                >
                  +{'{username}'}
                </button>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#C4BBD5]">Deposit Guidelines / Instructions for Players:</label>
              <textarea
                rows={3}
                value={settings.instructions}
                onChange={(e) => setSettings({ ...settings, instructions: e.target.value })}
                className="input-field text-xs w-full leading-relaxed"
                placeholder="Instructions shown on player's deposit screen..."
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#3B3152]">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="btn-secondary text-xs py-2.5 px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingSettings || qrUploading}
                className="btn-primary text-xs py-2.5 px-6 font-bold flex items-center gap-2"
              >
                <CheckCircle size={15} />
                <span>{savingSettings ? 'Saving Settings...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
