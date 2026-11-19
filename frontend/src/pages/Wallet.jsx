import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import socket from '../services/socket';
import toast from 'react-hot-toast';
import {
  Wallet as WalletIcon,
  ArrowUpCircle,
  ArrowDownCircle,
  Tag,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Gift,
  ArrowUpRight,
  Banknote,
  X,
  CheckCircle2,
  XCircle,
  Smartphone,
  Building,
  AlertCircle,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'coupon_redemption', label: 'Coupon Redemption' },
  { value: 'room_entry', label: 'Room Entry' },
  { value: 'prize_won', label: 'Prize Won' },
  { value: 'admin_credit', label: 'Admin Credit' },
  { value: 'refund', label: 'Refund' },
  { value: 'cashout', label: 'Cashout Debit' },
  { value: 'cashout_received', label: 'Cashout Received' },
  { value: 'cashout_refund', label: 'Cashout Refund' }
];

const categoryBadgeStyles = {
  coupon_redemption: 'bg-green-500/10 text-green-400 border border-green-500/20',
  room_entry: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  prize_won: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  admin_credit: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  refund: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  cashout: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  cashout_received: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  cashout_refund: 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
};

export default function Wallet() {
  const { user, updateBalance } = useAuth();
  const [activeTab, setActiveTab] = useState('wallet'); // 'wallet' | 'history' | 'cashouts'
  const [balance, setBalance] = useState(user?.balance ?? 0);
  const [couponCode, setCouponCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cashout Modal & Rules State
  const [isCashoutModalOpen, setIsCashoutModalOpen] = useState(false);
  const [cashoutRules, setCashoutRules] = useState({
    minCashout: 100,
    maxCashoutPerDay: 5000,
    maxRequestsPerDay: 5,
    guidelines: 'Withdrawals are processed manually by Admin. Maximum cashout is capped at your available balance. Please ensure your payment details are accurate.'
  });
  const [cashoutAmount, setCashoutAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' | 'bank_transfer'
  const [upiId, setUpiId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [cashoutNote, setCashoutNote] = useState('');
  const [submittingCashout, setSubmittingCashout] = useState(false);

  // Cashout Requests List State
  const [cashoutRequests, setCashoutRequests] = useState([]);
  const [loadingCashouts, setLoadingCashouts] = useState(false);

  // Player Self-Cancel Cashout Modal State
  const [cancelModal, setCancelModal] = useState({
    open: false,
    request: null,
    reason: 'Changed mind / want to continue playing',
    customNote: '',
    cancelling: false
  });

  const handleOpenCancelModal = (request) => {
    setCancelModal({
      open: true,
      request,
      reason: 'Changed mind / want to continue playing',
      customNote: '',
      cancelling: false
    });
  };

  const handleConfirmCancelCashout = async () => {
    const { request, reason, customNote } = cancelModal;
    if (!request) return;

    setCancelModal((prev) => ({ ...prev, cancelling: true }));
    try {
      const fullReason = customNote.trim() ? `${reason}: ${customNote.trim()}` : reason;
      const { data } = await api.post(`/cashouts/${request._id}/cancel`, {
        reason: fullReason
      });

      toast.success(
        data.message || `Cashout cancelled and ₹${request.amount} refunded to your wallet immediately!`
      );

      // Instant balance restore in navbar & local wallet
      if (typeof data.newBalance === 'number') {
        setBalance(data.newBalance);
        if (updateBalance) {
          updateBalance(data.newBalance);
        }
      } else {
        const refundedBal = (user?.balance || balance) + request.amount;
        setBalance(refundedBal);
        if (updateBalance) {
          updateBalance(refundedBal);
        }
      }

      // Flip request status to 'cancelled' immediately
      setCashoutRequests((prev) =>
        prev.map((r) =>
          r._id === request._id
            ? { ...r, status: 'cancelled', cancelReason: fullReason }
            : r
        )
      );

      setCancelModal({
        open: false,
        request: null,
        reason: 'Changed mind / want to continue playing',
        customNote: '',
        cancelling: false
      });

      // Refresh wallet statement
      fetchWallet(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel cashout request');
      setCancelModal((prev) => ({ ...prev, cancelling: false }));
    }
  };

  // Transaction history state
  const [transactions, setTransactions] = useState([]);
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'credit' | 'debit'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });

  useEffect(() => {
    if (typeof user?.balance === 'number') {
      setBalance(user.balance);
    }
  }, [user?.balance]);

  const fetchWallet = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const params = { page: targetPage, limit: 20 };
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter;
      if (categoryFilter && categoryFilter !== 'all') params.category = categoryFilter;

      const { data } = await api.get('/wallet', { params });
      if (typeof data.balance === 'number') {
        setBalance(data.balance);
        if (updateBalance) {
          updateBalance(data.balance);
        }
      }
      setTransactions(data.transactions || []);
      if (data.pagination) {
        setPagination(data.pagination);
      } else {
        setPagination({
          total: (data.transactions || []).length,
          page: targetPage,
          pages: Math.max(1, Math.ceil(((data.transactions || []).length) / 20))
        });
      }
    } catch {
      toast.error('Could not load wallet data');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, categoryFilter, page, updateBalance]);

  const fetchCashoutRules = useCallback(async () => {
    try {
      const { data } = await api.get('/cashouts/rules');
      if (data?.rules) {
        setCashoutRules(data.rules);
      }
    } catch (err) {
      console.error('Failed to fetch cashout rules:', err);
    }
  }, []);

  const fetchMyCashouts = useCallback(async () => {
    setLoadingCashouts(true);
    try {
      const { data } = await api.get('/cashouts/my-requests');
      if (data?.requests) {
        setCashoutRequests(data.requests);
      }
    } catch (err) {
      console.error('Failed to load cashout requests:', err);
    } finally {
      setLoadingCashouts(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet(page);
    fetchCashoutRules();
    fetchMyCashouts();
  }, [fetchWallet, fetchCashoutRules, fetchMyCashouts, page]);

  // Real-Time Socket Listener for cashout:updated
  useEffect(() => {
    if (!user) return;
    const currentUserId = user.id || user._id;

    const handleCashoutUpdated = (data) => {
      if (!data) return;
      const match =
        data.userId &&
        (String(data.userId) === String(currentUserId) ||
          data.userId === user.id ||
          data.userId === user._id);

      if (match) {
        if (data.status === 'approved') {
          toast.success(`🎉 Cashout Approved: ₹${data.amount}! ${data.adminNote || ''}`, {
            duration: 6000,
            icon: '🎉'
          });
        } else if (data.status === 'rejected') {
          toast.error(`❌ Cashout Rejected: ${data.adminNote || 'No reason provided'}`, {
            duration: 6000,
            icon: '❌'
          });
        }

        // Update the status, admin note, and cancel reason in the list immediately without page reload
        setCashoutRequests((prev) =>
          prev.map((req) =>
            String(req._id) === String(data.requestId)
              ? {
                  ...req,
                  status: data.status,
                  adminNote: data.adminNote,
                  cancelReason: data.cancelReason || req.cancelReason
                }
              : req
          )
        );

        // Refresh wallet balance and statement
        fetchWallet(1);
      }
    };

    socket.on('cashout:updated', handleCashoutUpdated);

    return () => {
      socket.off('cashout:updated', handleCashoutUpdated);
    };
  }, [user, fetchWallet]);

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return toast.error('Enter a valid coupon code');
    setRedeeming(true);
    try {
      const { data } = await api.post('/wallet/redeem', { code: couponCode.trim() });
      toast.success(data.message || 'Coupon redeemed successfully!');
      setCouponCode('');
      setBalance(data.newBalance);
      if (updateBalance) {
        updateBalance(data.newBalance);
      }
      fetchWallet(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Redemption failed');
    } finally {
      setRedeeming(false);
    }
  };

  const handleCashoutSubmit = async (e) => {
    e.preventDefault();
    const amountNum = Number(cashoutAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      return toast.error('Please enter a valid cashout amount');
    }

    if (amountNum > balance) {
      return toast.error(`Amount exceeds available balance (₹${balance.toFixed(2)})`);
    }

    if (amountNum < (cashoutRules.minCashout || 100)) {
      return toast.error(`Minimum cashout amount is ₹${cashoutRules.minCashout || 100}`);
    }

    if (paymentMethod === 'upi') {
      if (!upiId.trim()) {
        return toast.error('Please enter your UPI ID');
      }
      if (!upiId.includes('@')) {
        return toast.error('Please enter a valid UPI ID (e.g. username@okhdfcbank)');
      }
    } else if (paymentMethod === 'bank_transfer') {
      if (!accountHolder.trim()) {
        return toast.error('Please enter Account Holder Name');
      }
      if (!bankAccount.trim()) {
        return toast.error('Please enter Bank Account Number');
      }
      if (!bankIfsc.trim()) {
        return toast.error('Please enter IFSC Code');
      }
    }

    const payload = {
      amount: amountNum,
      paymentMethod,
      paymentDetails: {
        upiId: paymentMethod === 'upi' ? upiId.trim() : undefined,
        accountNumber: paymentMethod === 'bank_transfer' ? bankAccount.trim() : undefined,
        ifsc: paymentMethod === 'bank_transfer' ? bankIfsc.trim().toUpperCase() : undefined,
        accountHolderName: paymentMethod === 'bank_transfer' ? accountHolder.trim() : undefined,
        notes: cashoutNote.trim() || undefined
      }
    };

    setSubmittingCashout(true);
    try {
      const { data } = await api.post('/cashouts/request', payload);
      toast.success(data.message || 'Cashout request submitted for review!');
      setIsCashoutModalOpen(false);
      setCashoutAmount('');
      setCashoutNote('');

      if (data.request) {
        setCashoutRequests((prev) => [data.request, ...prev]);
      } else {
        fetchMyCashouts();
      }

      // Switch to Cashout Requests tab so user sees their new request
      setActiveTab('cashouts');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit cashout request');
    } finally {
      setSubmittingCashout(false);
    }
  };

  const handleMaxAmount = () => {
    setCashoutAmount(balance.toString());
  };

  // Financial summary metrics
  const totalCredited = transactions
    .filter((tx) => tx.type === 'credit')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const totalDebited = transactions
    .filter((tx) => tx.type === 'debit')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const netFlow = totalCredited - totalDebited;

  const formatDateDisplay = (dateString) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, hh:mm a');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#3B3152] overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 pb-1 flex-nowrap sm:flex-wrap">
        <button
          onClick={() => setActiveTab('wallet')}
          className={`flex items-center gap-2 whitespace-nowrap shrink-0 text-xs sm:text-sm py-2 px-3 sm:px-4 font-semibold transition-all rounded-control ${
            activeTab === 'wallet'
              ? 'bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40 shadow-sm'
              : 'text-[#C4BBD5] hover:text-white hover:bg-[#21183A] border border-transparent'
          }`}
        >
          <WalletIcon size={16} />
          <span>Wallet &amp; Redeem</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 whitespace-nowrap shrink-0 text-xs sm:text-sm py-2 px-3 sm:px-4 font-semibold transition-all rounded-control ${
            activeTab === 'history'
              ? 'bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40 shadow-sm'
              : 'text-[#C4BBD5] hover:text-white hover:bg-[#21183A] border border-transparent'
          }`}
        >
          <Clock size={16} />
          <span>Transaction History</span>
          {transactions.length > 0 && (
            <span className="bg-[#17102D] text-[#C4BBD5] text-xs px-2 py-0.5 rounded-pill ml-1 font-mono">
              {pagination.total || transactions.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('cashouts');
            fetchMyCashouts();
          }}
          className={`flex items-center gap-2 whitespace-nowrap shrink-0 text-xs sm:text-sm py-2 px-3 sm:px-4 font-semibold transition-all rounded-control ${
            activeTab === 'cashouts'
              ? 'bg-[#FFB51B]/15 text-[#FFB51B] border border-[#FFB51B]/40 shadow-sm'
              : 'text-[#C4BBD5] hover:text-white hover:bg-[#21183A] border border-transparent'
          }`}
        >
          <Banknote size={16} />
          <span>Cashout Requests</span>
          {cashoutRequests.length > 0 && (
            <span className="bg-[#17102D] text-[#FFB51B] border border-[#FFB51B]/35 text-xs px-2 py-0.5 rounded-pill ml-1 font-mono">
              {cashoutRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: Wallet & Redeem */}
      {activeTab === 'wallet' && (
        <div className="space-y-5 sm:space-y-6">
          {/* Main Balance Hero Card */}
          <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#21183A] via-[#17102D] to-[#2B1254] border border-[#3B3152] p-4 sm:p-6 shadow-elevated">
            <div className="absolute -right-8 -top-8 w-44 h-44 bg-[#6419D6]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div>
                <div className="flex items-center gap-2 text-[#A78BFA] text-xs sm:text-sm font-medium">
                  <ShieldCheck size={16} className="text-[#A78BFA]" />
                  <span>Available Gaming Balance</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1 sm:mt-2">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#FFB51B] tracking-tight font-mono tabular-nums">
                    ₹{balance.toFixed(2)}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#C4BBD5]">INR</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 sm:mt-4 text-xs text-[#C4BBD5]">
                  <span className="px-2.5 py-0.5 sm:py-1 rounded-pill bg-[#17102D] border border-[#3B3152] font-mono">
                    User: @{user?.username}
                  </span>
                  <span className="px-2.5 py-0.5 sm:py-1 rounded-pill bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/35 font-medium">
                    Verified Wallet
                  </span>
                  <Link to="/privacy" className="text-xs text-[#C4BBD5] hover:text-white flex items-center gap-1">
                    <ShieldCheck size={14} /> Privacy &amp; Terms
                  </Link>
                  <Link to="/change-password" className="text-[#A78BFA] hover:text-white text-xs underline">
                    Change Password
                  </Link>
                </div>
              </div>

              {/* Action Buttons: Cashout (Prominent), Refresh, View Statement */}
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap pt-2 sm:pt-0 border-t sm:border-t-0 border-[#3B3152]">
                <button
                  onClick={() => {
                    fetchCashoutRules();
                    setIsCashoutModalOpen(true);
                  }}
                  className="btn-gold flex items-center justify-center gap-2 text-xs sm:text-sm px-4 sm:px-5 py-2.5 flex-1 sm:flex-initial"
                  title="Withdraw cash balance"
                >
                  <ArrowUpRight size={17} />
                  <span>Cashout</span>
                </button>

                <button
                  onClick={() => fetchWallet(page)}
                  className="btn-secondary flex items-center justify-center gap-2 text-xs sm:text-sm px-3.5 sm:px-4 py-2.5 flex-initial"
                  title="Refresh Balance"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={() => setActiveTab('history')}
                  className="btn-primary flex items-center justify-center gap-2 text-xs sm:text-sm px-4 py-2.5 flex-1 sm:flex-initial"
                >
                  <Clock size={15} />
                  <span>Statement</span>
                </button>
              </div>
            </div>

            {/* Quick Balance Stats inside Tab 1 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-[#3B3152]">
              <div className="p-3 bg-[#17102D] rounded-xl border border-[#3B3152]">
                <span className="text-xs text-[#C4BBD5] flex items-center gap-1.5 mb-1">
                  <Sparkles size={14} className="text-[#FFB51B]" /> Total Credits
                </span>
                <p className="text-base sm:text-lg font-bold font-mono text-emerald-400">
                  +₹{totalCredited.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-[#17102D] rounded-xl border border-[#3B3152]">
                <span className="text-xs text-[#C4BBD5] flex items-center gap-1.5 mb-1">
                  <Layers size={14} className="text-[#FF762B]" /> Total Debits
                </span>
                <p className="text-base sm:text-lg font-bold font-mono text-[#FF762B]">
                  -₹{totalDebited.toFixed(2)}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1 p-3 bg-[#17102D] rounded-xl border border-[#3B3152]">
                <span className="text-xs text-[#C4BBD5] flex items-center gap-1.5 mb-1">
                  <TrendingUp size={14} className="text-[#A78BFA]" /> Net Flow
                </span>
                <p
                  className={`text-base sm:text-lg font-bold font-mono ${
                    netFlow >= 0 ? 'text-emerald-400' : 'text-[#FF762B]'
                  }`}
                >
                  {netFlow >= 0 ? '+' : ''}₹{netFlow.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Cashout Promo Card */}
          <div className="rounded-[18px] border border-[#FFB51B]/30 bg-[#FFB51B]/10 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#FFB51B]/20 text-[#FFB51B] border border-[#FFB51B]/35 flex-shrink-0">
                <Banknote size={22} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#FFB51B]">Need Real Cash Payout?</h3>
                <p className="text-xs text-[#C4BBD5]">
                  Request withdrawal to your verified UPI ID or Bank Account with 0% processing fee.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                fetchCashoutRules();
                setIsCashoutModalOpen(true);
              }}
              className="btn-gold text-xs px-4 py-2.5 flex items-center justify-center gap-1.5 whitespace-nowrap w-full sm:w-auto"
            >
              <ArrowUpRight size={14} />
              <span>Request Cashout</span>
            </button>
          </div>

          {/* Coupon Redemption Form */}
          <div className="card space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                <Tag size={20} className="sm:w-[22px] sm:h-[22px]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-white">Redeem Coupon Voucher</h2>
                <p className="text-xs text-gray-400">
                  Instant balance top-up using official promo coupons or jackpot vouchers
                </p>
              </div>
            </div>

            <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  className="input-field uppercase font-mono tracking-wider text-sm sm:text-base"
                  placeholder="e.g. WELCOME500, BONUS100"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  maxLength={20}
                  disabled={redeeming}
                />
              </div>
              <button
                type="submit"
                className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap w-full sm:w-auto sm:min-w-[140px] text-xs sm:text-sm py-2.5"
                disabled={redeeming}
              >
                {redeeming ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Redeeming...</span>
                  </>
                ) : (
                  <>
                    <Gift size={15} />
                    <span>Claim Voucher</span>
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
              <Sparkles size={14} className="text-blue-400 shrink-0" />
              <span>Coupon credits are credited immediately to your primary gaming balance.</span>
            </div>
          </div>

          {/* Recent Mini Preview */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Clock size={16} className="text-gray-400" />
                <span>Recent Transactions</span>
              </h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                View Full History &rarr;
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="animate-pulse flex items-center justify-between p-3.5 bg-gray-800/40 rounded-xl">
                    <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                    <div className="h-4 bg-gray-700 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No recent transactions found. Redeem a coupon above to start!
              </div>
            ) : (
              <div className="space-y-2.5">
                {transactions.slice(0, 5).map((tx) => (
                  <div
                    key={tx._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-3.5 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-800 rounded-xl transition-colors gap-2.5 sm:gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {tx.type === 'credit' ? (
                        <ArrowUpCircle size={20} className="text-emerald-400 flex-shrink-0 sm:w-[22px] sm:h-[22px]" />
                      ) : (
                        <ArrowDownCircle size={20} className="text-rose-400 flex-shrink-0 sm:w-[22px] sm:h-[22px]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-white break-words line-clamp-2 sm:line-clamp-1">{tx.description}</p>
                        <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">{formatDateDisplay(tx.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 border-gray-800/80 pt-2 sm:pt-0 w-full sm:w-auto shrink-0">
                      <p
                        className={`font-semibold font-mono text-xs sm:text-sm ${
                          tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                      </p>
                      <p className="text-[11px] sm:text-xs text-gray-500 font-mono mt-0.5">
                        Bal: ₹{tx.balanceAfter?.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Transaction History */}
      {activeTab === 'history' && (
        <div className="space-y-5 sm:space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
            <div className="card bg-gray-900/80 border-gray-800 flex items-center justify-between p-4 sm:p-5">
              <div>
                <p className="text-xs font-medium text-gray-400">Total Credited</p>
                <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
                  +₹{totalCredited.toFixed(2)}
                </p>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <TrendingUp size={22} className="sm:w-6 sm:h-6" />
              </div>
            </div>

            <div className="card bg-gray-900/80 border-gray-800 flex items-center justify-between p-4 sm:p-5">
              <div>
                <p className="text-xs font-medium text-gray-400">Total Debited</p>
                <p className="text-xl sm:text-2xl font-bold font-mono text-rose-400 mt-1">
                  -₹{totalDebited.toFixed(2)}
                </p>
              </div>
              <div className="p-2.5 sm:p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <TrendingDown size={22} className="sm:w-6 sm:h-6" />
              </div>
            </div>

            <div className="card bg-gray-900/80 border-gray-800 flex items-center justify-between p-4 sm:p-5">
              <div>
                <p className="text-xs font-medium text-gray-400">Net Flow</p>
                <p
                  className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${
                    netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {netFlow >= 0 ? '+' : ''}₹{netFlow.toFixed(2)}
                </p>
              </div>
              <div
                className={`p-2.5 sm:p-3 rounded-xl border ${
                  netFlow >= 0
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}
              >
                <Layers size={22} className="sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              {/* Type Filter Pills */}
              <div className="flex items-center bg-gray-800 p-1 rounded-lg border border-gray-700/60 overflow-x-auto no-scrollbar w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('all');
                    setPage(1);
                  }}
                  className={`px-3 sm:px-4 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    typeFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('credit');
                    setPage(1);
                  }}
                  className={`px-3 sm:px-4 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    typeFilter === 'credit'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>Credits (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter('debit');
                    setPage(1);
                  }}
                  className={`px-3 sm:px-4 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    typeFilter === 'debit'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span>Debits (-)</span>
                </button>
              </div>

              {/* Category Filter Dropdown & Refresh */}
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-gray-800 border border-gray-700 text-gray-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-initial"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => fetchWallet(page)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg transition-colors shrink-0"
                  title="Refresh Transactions"
                >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Chronological List of Transactions */}
            <div className="pt-2">
              {loading ? (
                /* Loading Skeleton */
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse flex items-center justify-between p-4 bg-gray-800/40 rounded-xl border border-gray-800"
                    >
                      <div className="flex items-center gap-3 w-2/3">
                        <div className="w-8 h-8 rounded-full bg-gray-700" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-gray-700 rounded w-3/4" />
                          <div className="h-3 bg-gray-700/60 rounded w-1/4" />
                        </div>
                      </div>
                      <div className="space-y-2 text-right">
                        <div className="h-4 bg-gray-700 rounded w-16 ml-auto" />
                        <div className="h-3 bg-gray-700/60 rounded w-12 ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                /* Empty State */
                <div className="text-center py-16 px-4 bg-gray-950/40 rounded-2xl border border-dashed border-gray-800">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center text-gray-500 mb-3">
                    <Clock size={24} />
                  </div>
                  <h3 className="text-base font-medium text-gray-300">No transactions recorded</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    {typeFilter !== 'all' || categoryFilter !== 'all'
                      ? 'No transactions match the selected filters. Try changing or resetting the filters.'
                      : 'Your wallet has no transactions yet. Redeem a coupon voucher or participate in rooms to see records.'}
                  </p>
                  {(typeFilter !== 'all' || categoryFilter !== 'all') && (
                    <button
                      onClick={() => {
                        setTypeFilter('all');
                        setCategoryFilter('all');
                        setPage(1);
                      }}
                      className="mt-4 text-xs font-semibold text-blue-400 hover:text-blue-300"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 bg-gray-800/40 hover:bg-gray-800/70 border border-gray-800/80 rounded-xl transition-all gap-3"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <div className="mt-0.5 sm:mt-0 flex-shrink-0">
                          {tx.type === 'credit' ? (
                            <ArrowUpCircle size={24} className="text-emerald-400 sm:w-[26px] sm:h-[26px]" />
                          ) : (
                            <ArrowDownCircle size={24} className="text-rose-400 sm:w-[26px] sm:h-[26px]" />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-white break-words">{tx.description}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md font-medium capitalize ${
                                categoryBadgeStyles[tx.category] ||
                                'bg-gray-700 text-gray-300'
                              }`}
                            >
                              {(tx.category || 'general').replace(/_/g, ' ')}
                            </span>
                            <span className="text-[11px] sm:text-xs text-gray-500">
                              {formatDateDisplay(tx.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left sm:text-right flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 border-gray-800/80 pt-2 sm:pt-0 w-full sm:w-auto shrink-0">
                        <p
                          className={`font-bold font-mono text-sm sm:text-base ${
                            tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'credit' ? '+' : '-'}₹{(tx.amount || 0).toFixed(2)}
                        </p>
                        <p className="text-[11px] sm:text-xs text-gray-500 font-mono mt-0.5">
                          Bal: ₹{(tx.balanceAfter ?? 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-800 text-xs sm:text-sm">
                <span className="text-xs text-gray-400">
                  Page <span className="text-white font-medium">{pagination.page}</span> of{' '}
                  <span className="text-white font-medium">{pagination.pages}</span> (Total{' '}
                  {pagination.total} records)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 text-gray-300"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page >= pagination.pages}
                    className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 text-gray-300"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Cashout Requests */}
      {activeTab === 'cashouts' && (
        <div className="space-y-5 sm:space-y-6">
          {/* Header Action Card */}
          <div className="card bg-gradient-to-r from-gray-900 via-gray-900 to-emerald-950/30 border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Banknote size={20} className="text-emerald-400 sm:w-[22px] sm:h-[22px]" />
                <span>Your Cashout Requests</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Real-time tracking of your payouts. Approved withdrawals are transferred to your selected UPI/Bank account.
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={fetchMyCashouts}
                className="btn-secondary flex items-center justify-center gap-2 text-xs py-2 px-3 flex-1 sm:flex-initial"
                title="Refresh Cashout Status"
              >
                <RefreshCw size={14} className={loadingCashouts ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => {
                  fetchCashoutRules();
                  setIsCashoutModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 text-xs py-2 px-4 rounded-lg shadow-md transition-all flex-1 sm:flex-initial"
              >
                <ArrowUpRight size={16} />
                <span>New Cashout</span>
              </button>
            </div>
          </div>

          {/* Cashout Requests List */}
          {loadingCashouts ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse p-4 sm:p-5 bg-gray-900 rounded-xl border border-gray-800 space-y-3"
                >
                  <div className="flex justify-between">
                    <div className="h-5 bg-gray-800 rounded w-32" />
                    <div className="h-5 bg-gray-800 rounded w-24" />
                  </div>
                  <div className="h-4 bg-gray-800/60 rounded w-48" />
                </div>
              ))}
            </div>
          ) : cashoutRequests.length === 0 ? (
            <div className="text-center py-16 px-4 bg-gray-950/40 rounded-2xl border border-dashed border-gray-800">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center justify-center mb-3">
                <Banknote size={28} />
              </div>
              <h3 className="text-base font-semibold text-gray-200">No Cashout Requests Yet</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                You haven&apos;t submitted any withdrawal requests. When you cash out your gaming balance, your request status and admin notes will appear here.
              </p>
              <button
                onClick={() => {
                  fetchCashoutRules();
                  setIsCashoutModalOpen(true);
                }}
                className="mt-5 btn-primary text-xs flex items-center gap-2 mx-auto"
              >
                <ArrowUpRight size={16} />
                <span>Submit Cashout Request</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {cashoutRequests.map((req) => (
                <div
                  key={req._id}
                  className="card bg-gray-900/90 border-gray-800 hover:border-gray-700 transition-all p-4 sm:p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-800/80">
                    <div className="flex items-center gap-3">
                      <div className="p-2 sm:p-2.5 rounded-xl bg-gray-800 border border-gray-700/60 text-white shrink-0">
                        <Banknote size={20} className="text-emerald-400 sm:w-[22px] sm:h-[22px]" />
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-xl sm:text-2xl font-extrabold font-mono text-white tracking-tight">
                            ₹{req.amount.toFixed(2)}
                          </span>
                          <span className="text-xs text-gray-400 font-semibold uppercase">
                            {req.paymentMethod === 'upi' ? 'UPI Payout' : 'Bank Transfer'}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                          Requested: {formatDateDisplay(req.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge & Cancel Action */}
                    <div className="flex flex-wrap items-center gap-2">
                      {req.status === 'pending' && (
                        <>
                          <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            🟡 In Progress • Awaiting Admin
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenCancelModal(req)}
                            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold border border-orange-500/60 text-orange-400 hover:text-white hover:bg-orange-600/30 transition-all hover:scale-105 active:scale-95 shadow-sm"
                            title="Cancel withdrawal and refund balance"
                          >
                            Cancel Request
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 size={14} className="text-emerald-400" />
                          🟢 Approved &amp; Transferred
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <XCircle size={14} className="text-rose-400" />
                          🔴 Rejected
                        </span>
                      )}
                      {req.status === 'cancelled' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-700">
                          <XCircle size={14} className="text-gray-400" />
                          ⚪ Cancelled
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1 text-xs break-words">
                    <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800/80 space-y-1">
                      <span className="text-gray-400 font-medium block">Destination Details:</span>
                      {req.paymentMethod === 'upi' ? (
                        <div className="flex items-center gap-2 text-gray-200 font-mono break-all">
                          <Smartphone size={14} className="text-blue-400 shrink-0" />
                          <span>UPI ID: <strong>{req.paymentDetails?.upiId || 'N/A'}</strong></span>
                        </div>
                      ) : (
                        <div className="space-y-0.5 text-gray-200">
                          <div className="flex items-center gap-2">
                            <Building size={14} className="text-blue-400 shrink-0" />
                            <span className="break-words">Name: <strong>{req.paymentDetails?.accountHolderName || 'N/A'}</strong></span>
                          </div>
                          <p className="font-mono pl-5 break-all">
                            A/C: {req.paymentDetails?.accountNumber || 'N/A'} • IFSC: {req.paymentDetails?.ifsc || 'N/A'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-gray-950/60 border border-gray-800/80 space-y-1">
                      <span className="text-gray-400 font-medium block">Transaction Info:</span>
                      <p className="text-gray-300 break-all">
                        Request ID: <span className="font-mono text-gray-400">{req._id}</span>
                      </p>
                      {req.paymentDetails?.notes && (
                        <p className="text-gray-400 break-words">
                          Player Note: {req.paymentDetails.notes}
                        </p>
                      )}
                      {req.processedAt && (
                        <p className="text-gray-500 text-[11px]">
                          Processed: {formatDateDisplay(req.processedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Highlighted Admin Note Callout */}
                  {req.adminNote && (
                    <div
                      className={`p-3 rounded-xl text-xs border ${
                        req.status === 'approved'
                          ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                          : req.status === 'rejected'
                          ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                          : 'bg-gray-800/60 border-gray-700 text-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <FileText size={15} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="font-bold uppercase tracking-wider text-[11px] block">
                            Admin Description / Payout Note:
                          </span>
                          <p className="mt-0.5 font-medium break-words">{req.adminNote}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Player Cancel Reason Callout */}
                  {req.cancelReason && (
                    <div className="p-3 rounded-xl text-xs border bg-gray-800/40 border-gray-700/80 text-gray-300">
                      <div className="flex items-start gap-2">
                        <FileText size={15} className="mt-0.5 flex-shrink-0 text-amber-400" />
                        <div>
                          <span className="font-bold uppercase tracking-wider text-[11px] block text-amber-300">
                            Cancellation Reason / Note:
                          </span>
                          <p className="mt-0.5 font-medium text-gray-200 break-words">{req.cancelReason}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CASHOUT MODAL */}
      {isCashoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-h-[90vh] overflow-y-auto w-full max-w-lg mx-3 sm:mx-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl space-y-4 sm:space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Banknote size={20} className="sm:w-[22px] sm:h-[22px]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Request Cashout / Withdrawal</h3>
                  <p className="text-xs text-gray-400">Transfer gaming funds to your bank or UPI account</p>
                </div>
              </div>
              <button
                onClick={() => setIsCashoutModalOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                title="Close"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Available Gaming Balance Banner */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-blue-950/50 to-emerald-950/40 border border-emerald-800/30 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] sm:text-xs text-emerald-300/80 font-medium">Available Gaming Balance (Max Cashout)</span>
                <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-0.5">
                  ₹{balance.toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleMaxAmount}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-mono transition-colors shrink-0"
              >
                USE MAX
              </button>
            </div>

            {/* Hold Notice Banner */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs">
              <AlertCircle size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-amber-200/90 leading-relaxed text-[11px] sm:text-xs">
                <span className="font-semibold text-amber-300">Note: </span>
                Upon submission, <strong className="font-mono text-amber-300 font-bold">₹{cashoutAmount ? Number(cashoutAmount).toFixed(2) : '0.00'}</strong> will be placed <span className="underline font-semibold text-amber-300">ON HOLD</span> and deducted from your available balance so it cannot be bet while pending review.
              </div>
            </div>

            {/* Cashout Form */}
            <form onSubmit={handleCashoutSubmit} className="space-y-4">
              {/* Amount input with quick MAX */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Withdrawal Amount (₹) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min={cashoutRules.minCashout || 1}
                    max={balance}
                    value={cashoutAmount}
                    onChange={(e) => setCashoutAmount(e.target.value)}
                    placeholder={`Min ₹${cashoutRules.minCashout || 100}`}
                    className="input-field pr-20 font-mono text-base sm:text-lg font-semibold py-2.5 sm:py-2"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleMaxAmount}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50 transition-colors"
                  >
                    MAX
                  </button>
                </div>
                {Number(cashoutAmount) > balance && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Exceeds available gaming balance
                  </p>
                )}
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Payment Method *
                </label>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`min-h-[48px] p-2.5 sm:p-3 rounded-xl border flex items-center justify-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-semibold transition-all ${
                      paymentMethod === 'upi'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-gray-800/60 border-gray-700/80 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Smartphone size={18} />
                    <span>UPI Transfer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('bank_transfer')}
                    className={`min-h-[48px] p-2.5 sm:p-3 rounded-xl border flex items-center justify-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-semibold transition-all ${
                      paymentMethod === 'bank_transfer'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-gray-800/60 border-gray-700/80 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Building size={18} />
                    <span>Bank Transfer</span>
                  </button>
                </div>
              </div>

              {/* Method Specific Fields */}
              {paymentMethod === 'upi' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    UPI ID (Virtual Payment Address) *
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. mobile@upi, username@okhdfcbank"
                    className="input-field font-mono text-xs sm:text-sm"
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Funds will be dispatched directly to your VPA upon admin approval.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="input-field text-xs sm:text-sm"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                        Account Number *
                      </label>
                      <input
                        type="text"
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        placeholder="e.g. 5010023456789"
                        className="input-field font-mono text-xs sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                        IFSC Code *
                      </label>
                      <input
                        type="text"
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                        placeholder="e.g. HDFC0001234"
                        className="input-field uppercase font-mono text-xs sm:text-sm"
                        maxLength={11}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Note */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Optional Note / Reference
                </label>
                <input
                  type="text"
                  value={cashoutNote}
                  onChange={(e) => setCashoutNote(e.target.value)}
                  placeholder="Optional note for admin review"
                  className="input-field text-xs sm:text-sm"
                  maxLength={100}
                />
              </div>

              {/* Live Cashout Rules & Policy Card */}
              <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-3 sm:p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-gray-300 font-semibold">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>Cashout Rules &amp; Policy</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-gray-300">
                  <div className="p-2 rounded bg-gray-900 border border-gray-800">
                    <span className="text-[10px] text-gray-500 block uppercase">Min Cashout</span>
                    <span className="font-bold text-white">₹{cashoutRules.minCashout || 100}</span>
                  </div>
                  <div className="p-2 rounded bg-gray-900 border border-gray-800">
                    <span className="text-[10px] text-gray-500 block uppercase">Daily Limit</span>
                    <span className="font-bold text-white">₹{cashoutRules.maxCashoutPerDay || 5000}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-2 rounded bg-gray-900 border border-gray-800">
                    <span className="text-[10px] text-gray-500 block uppercase">Max Per Day</span>
                    <span className="font-bold text-white">{cashoutRules.maxRequestsPerDay || 5} reqs</span>
                  </div>
                </div>
                {cashoutRules.guidelines && (
                  <p className="text-[11px] text-gray-400 pt-1 leading-relaxed border-t border-gray-800/80">
                    {cashoutRules.guidelines}
                  </p>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCashoutModalOpen(false)}
                  className="btn-secondary text-xs sm:text-sm px-4 py-2.5 w-full sm:w-auto"
                  disabled={submittingCashout}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCashout || Number(cashoutAmount) <= 0 || Number(cashoutAmount) > balance}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto"
                >
                  {submittingCashout ? (
                    <>
                      <RefreshCw size={15} className="animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight size={16} />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Cashout Modal */}
      {cancelModal.open && cancelModal.request && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-h-[90vh] overflow-y-auto w-full max-w-md mx-3 sm:mx-auto p-4 sm:p-6 rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">Cancel Cashout Request</h3>
                  <p className="text-xs text-gray-400">
                    Are you sure you want to cancel this cashout? ₹{cancelModal.request.amount.toFixed(2)} will be refunded to your wallet balance immediately.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCancelModal({ ...cancelModal, open: false, request: null })}
                className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                disabled={cancelModal.cancelling}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed">
              <span className="font-semibold text-amber-300 block mb-0.5">Refund Notice:</span>
              Cancelling will instantly credit <strong className="font-mono text-amber-300">₹{cancelModal.request.amount.toFixed(2)}</strong> back to your available gaming wallet.
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Question / Cancellation Reason
                </label>
                <select
                  value={cancelModal.reason}
                  onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
                  className="input-field text-xs text-gray-200 py-2"
                  disabled={cancelModal.cancelling}
                >
                  <option value="Changed mind / want to continue playing">
                    Changed mind / want to continue playing
                  </option>
                  <option value="Entered incorrect UPI ID or bank details">
                    Entered incorrect UPI ID or bank details
                  </option>
                  <option value="Need funds for upcoming Potly rooms">
                    Need funds for upcoming Potly rooms
                  </option>
                  <option value="Other reason">Other reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Optional Note / Reason Details
                </label>
                <input
                  type="text"
                  placeholder="Optional details for reference..."
                  value={cancelModal.customNote}
                  onChange={(e) => setCancelModal({ ...cancelModal, customNote: e.target.value })}
                  className="input-field text-xs text-gray-200 py-2"
                  maxLength={120}
                  disabled={cancelModal.cancelling}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-gray-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setCancelModal({ ...cancelModal, open: false, request: null })}
                className="btn-secondary text-xs py-2.5 px-4 w-full sm:w-auto"
                disabled={cancelModal.cancelling}
              >
                Keep Request
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelCashout}
                disabled={cancelModal.cancelling}
                className="btn-primary text-xs py-2.5 px-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-orange-950/40 w-full sm:w-auto"
              >
                {cancelModal.cancelling && <RefreshCw size={14} className="animate-spin" />}
                <span>Confirm &amp; Return ₹{cancelModal.request.amount.toFixed(2)} to Wallet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
