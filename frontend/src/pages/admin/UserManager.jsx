import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../api/axios';
import {
  Users,
  Search,
  RefreshCw,
  Receipt,
  Eye,
  X,
  Wallet,
  Ticket,
  Trophy,
  Banknote,
  Gamepad2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Calendar,
  XCircle
} from 'lucide-react';

const TX_CATEGORY_BADGES = {
  coupon_redemption: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  room_entry: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  prize_won: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  admin_credit: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  refund: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  cashout: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  cashout_hold: 'bg-amber-500/10 text-amber-300 border border-amber-500/20',
  cashout_received: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  cashout_refund: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
};

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalPlayers: 0, totalAdmins: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1, limit: 20 });

  // User Transactions Modal State
  const [selectedUserForTx, setSelectedUserForTx] = useState(null);
  const [userTxLoading, setUserTxLoading] = useState(false);
  const [userTxData, setUserTxData] = useState(null);
  const [txCategoryFilter, setTxCategoryFilter] = useState('all');

  // Fetch Admin Stats (Summary Cards)
  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get('/admin/stats');
      if (data.success && data.stats) {
        const totalU = data.stats.totalUsers ?? 0;
        const totalP = data.stats.totalPlayers ?? 0;
        setStats({
          totalUsers: totalU,
          totalPlayers: totalP,
          totalAdmins: Math.max(0, totalU - totalP)
        });
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Users List
  const fetchUsers = useCallback(async (targetPage = page, searchTerm = appliedSearch, role = roleFilter) => {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        limit: 20
      };
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      if (role && role !== 'all') {
        params.role = role;
      }

      const { data } = await api.get('/admin/users', { params });
      if (data.success) {
        setUsers(data.users || []);
        if (data.pagination) {
          setPagination(data.pagination);
        } else {
          setPagination({
            total: (data.users || []).length,
            page: targetPage,
            pages: 1,
            limit: 20
          });
        }
      } else {
        toast.error(data.message || 'Failed to fetch users');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching users list');
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch, roleFilter]);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch users when page, appliedSearch, or roleFilter changes
  useEffect(() => {
    fetchUsers(page, appliedSearch, roleFilter);
  }, [fetchUsers, page, appliedSearch, roleFilter]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search);
  };

  const handleClearSearch = () => {
    setSearch('');
    setAppliedSearch('');
    setPage(1);
  };

  const handleRoleChange = (newRole) => {
    setRoleFilter(newRole);
    setPage(1);
  };

  const handleRefresh = () => {
    fetchStats();
    fetchUsers(page, appliedSearch, roleFilter);
  };

  // Open User Transactions Modal
  const handleOpenUserTransactions = async (u) => {
    setSelectedUserForTx(u);
    setUserTxLoading(true);
    setUserTxData(null);
    setTxCategoryFilter('all');
    try {
      const { data } = await api.get(`/admin/users/${u._id}/transactions`);
      if (data.success) {
        setUserTxData(data);
      } else {
        toast.error(data.message || 'Failed to load user transactions');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load user transactions');
    } finally {
      setUserTxLoading(false);
    }
  };

  const closeUserTransactionsModal = () => {
    setSelectedUserForTx(null);
    setUserTxData(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-black flex items-center gap-2.5 text-white">
            <Users size={28} className="text-[#A78BFA] flex-shrink-0" />
            <span>Potly User Directory &amp; Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#C4BBD5] mt-0.5">
            Browse, search, and audit all registered Potly players and administrators
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="btn-secondary self-start sm:self-auto flex items-center gap-2 text-xs sm:text-sm py-2 px-3 sm:px-4"
          title="Refresh User Data"
        >
          <RefreshCw size={16} className={loading || statsLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        {/* Total Users */}
        <div className="card bg-[#21183A] border-[#3B3152] p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#A78BFA] truncate">
              Total Users
            </span>
            <div className="p-1.5 sm:p-2 bg-[#6419D6]/20 text-[#A78BFA] rounded-xl flex-shrink-0">
              <Users size={16} className="sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="min-w-0">
            {statsLoading ? (
              <div className="h-7 sm:h-9 bg-[#17102D] rounded animate-pulse w-24"></div>
            ) : (
              <p className="text-xl sm:text-3xl font-extrabold text-[#A78BFA] font-mono tracking-tight truncate">
                {(stats.totalUsers ?? 0).toLocaleString('en-IN')}
              </p>
            )}
            <p className="text-[11px] sm:text-xs text-[#C4BBD5] mt-0.5 sm:mt-1 truncate">Platform registrations</p>
          </div>
        </div>

        {/* Total Players */}
        <div className="card bg-[#21183A] border-[#3B3152] p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#FFB51B] truncate">
              Total Players
            </span>
            <div className="p-1.5 sm:p-2 bg-[#FFB51B]/15 text-[#FFB51B] rounded-xl flex-shrink-0">
              <UserCheck size={16} className="sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="min-w-0">
            {statsLoading ? (
              <div className="h-7 sm:h-9 bg-[#17102D] rounded animate-pulse w-24"></div>
            ) : (
              <p className="text-xl sm:text-3xl font-extrabold text-[#FFB51B] font-mono tracking-tight truncate">
                {(stats.totalPlayers ?? 0).toLocaleString('en-IN')}
              </p>
            )}
            <p className="text-[11px] sm:text-xs text-[#C4BBD5] mt-0.5 sm:mt-1 truncate">Standard gaming accounts</p>
          </div>
        </div>

        {/* Total Admins */}
        <div className="card col-span-2 sm:col-span-1 bg-[#21183A] border-[#3B3152] p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#FF762B] truncate">
              Total Admins
            </span>
            <div className="p-1.5 sm:p-2 bg-[#FF762B]/15 text-[#FF762B] rounded-xl flex-shrink-0">
              <ShieldCheck size={16} className="sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="min-w-0">
            {statsLoading ? (
              <div className="h-7 sm:h-9 bg-[#17102D] rounded animate-pulse w-24"></div>
            ) : (
              <p className="text-xl sm:text-3xl font-extrabold text-[#FF762B] font-mono tracking-tight truncate">
                {(stats.totalAdmins ?? 0).toLocaleString('en-IN')}
              </p>
            )}
            <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 truncate">Platform controllers</p>
          </div>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="card p-3.5 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              className="input-field pl-10 pr-9 text-xs sm:text-sm py-2 sm:py-2.5"
              placeholder="Search by username or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                title="Clear search"
              >
                <XCircle size={16} />
              </button>
            )}
          </form>

          {/* Role Filter Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0">
            {[
              { id: 'all', label: 'All Roles' },
              { id: 'player', label: 'Players Only' },
              { id: 'admin', label: 'Admins Only' }
            ].map((roleTab) => (
              <button
                key={roleTab.id}
                type="button"
                onClick={() => handleRoleChange(roleTab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  roleFilter === roleTab.id
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700/80 border border-gray-700/50'
                }`}
              >
                {roleTab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Applied filter badge banner if filtering */}
        {(appliedSearch || roleFilter !== 'all') && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-800 text-xs text-gray-400">
            <span>Active filters:</span>
            {appliedSearch && (
              <span className="inline-flex items-center gap-1 bg-gray-800 text-blue-300 border border-gray-700 px-2 py-0.5 rounded-md font-mono text-[11px]">
                Search: "{appliedSearch}"
                <button onClick={handleClearSearch} className="hover:text-white">
                  <X size={12} />
                </button>
              </span>
            )}
            {roleFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-gray-800 text-purple-300 border border-gray-700 px-2 py-0.5 rounded-md text-[11px]">
                Role: {roleFilter}
                <button onClick={() => handleRoleChange('all')} className="hover:text-white">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <table className="w-full text-xs sm:text-sm min-w-[620px]">
            <thead className="bg-gray-900/90 text-gray-400 border-b border-gray-800 text-[11px] sm:text-xs uppercase tracking-wider">
              <tr className="text-left">
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Wallet Balance</th>
                <th className="py-3.5 px-4">Joined Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gray-800"></div>
                          <div className="h-4 bg-gray-800 rounded w-28"></div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-3.5 bg-gray-800 rounded w-36"></div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 bg-gray-800 rounded-full w-14"></div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 bg-gray-800 rounded w-20"></div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-3.5 bg-gray-800 rounded w-24"></div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="h-7 bg-gray-800 rounded-lg w-28 ml-auto"></div>
                      </td>
                    </tr>
                  ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 sm:py-16 text-center text-gray-500">
                    <Users size={32} className="mx-auto mb-2 text-gray-600" />
                    <p className="text-sm font-medium">No users found</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {appliedSearch || roleFilter !== 'all'
                        ? 'Try clearing your search query or role filter.'
                        : 'No registered accounts on the platform yet.'}
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const initial = u.username ? u.username.slice(0, 2).toUpperCase() : 'US';
                  return (
                    <tr key={u._id} className="hover:bg-gray-800/40 transition-colors">
                      {/* Avatar & Username */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono border ${
                              u.role === 'admin'
                                ? 'bg-purple-900/30 text-purple-300 border-purple-700/50'
                                : 'bg-blue-900/30 text-blue-300 border-blue-700/50'
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <span className="font-medium text-white block">@{u.username}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-gray-400 font-mono text-xs">
                        <span className="truncate max-w-[200px] block" title={u.email}>
                          {u.email}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${
                            u.role === 'admin'
                              ? 'bg-purple-900/60 text-purple-300 border border-purple-700/40'
                              : 'bg-gray-800 text-gray-300 border border-gray-700'
                          }`}
                        >
                          {u.role === 'admin' && <ShieldCheck size={11} />}
                          {u.role}
                        </span>
                      </td>

                      {/* Wallet Balance */}
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        ₹{(u.balance ?? 0).toFixed(2)}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-gray-400 text-xs whitespace-nowrap">
                        {u.createdAt ? format(new Date(u.createdAt), 'dd MMM yyyy') : 'N/A'}
                      </td>

                      {/* Action: View Transactions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenUserTransactions(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 hover:text-blue-300 border border-blue-500/30 transition-all hover:scale-105 active:scale-95 shadow-sm"
                          title={`View transactions for @${u.username}`}
                        >
                          <Receipt size={14} />
                          <span>View Transactions</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-gray-900 border-t border-gray-800 text-xs gap-3">
          <span className="text-gray-400">
            Showing Page <span className="text-white font-medium">{pagination.page}</span> of{' '}
            <span className="text-white font-medium">{pagination.pages || 1}</span> (Total{' '}
            <span className="text-white font-medium">{pagination.total}</span> users)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 text-gray-300 flex items-center gap-1 font-medium transition-colors"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="px-2 font-mono text-gray-400">
              {page} / {pagination.pages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages || 1, p + 1))}
              disabled={page >= (pagination.pages || 1) || loading}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 text-gray-300 flex items-center gap-1 font-medium transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* User Transactions Modal / Popup */}
      {selectedUserForTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-4xl bg-gray-900 border border-gray-700 shadow-2xl relative max-h-[90vh] overflow-y-auto mx-3 sm:mx-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col space-y-4 sm:space-y-5">
            {/* User Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-gray-800">
              <div className="flex items-center gap-3 sm:gap-3.5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base sm:text-lg font-mono flex-shrink-0">
                  {selectedUserForTx.username?.slice(0, 2).toUpperCase() || 'US'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-white">
                      @{selectedUserForTx.username}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold ${
                        selectedUserForTx.role === 'admin'
                          ? 'bg-purple-900/60 text-purple-300 border border-purple-700/40'
                          : 'bg-gray-800 text-gray-300 border border-gray-700'
                      }`}
                    >
                      {selectedUserForTx.role}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-400 mt-1 font-mono">
                    <span className="truncate max-w-[180px] sm:max-w-none">{selectedUserForTx.email}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold whitespace-nowrap">
                      <Wallet size={12} />
                      Balance: ₹{((userTxData?.user?.balance ?? selectedUserForTx.balance) || 0).toFixed(2)}
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">
                      Joined:{' '}
                      {selectedUserForTx.createdAt
                        ? format(new Date(selectedUserForTx.createdAt), 'dd MMM yyyy')
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={closeUserTransactionsModal}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-gray-800 transition-colors self-end sm:self-auto"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            {userTxLoading ? (
              <div className="py-16 sm:py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
                <Loader2 size={28} className="animate-spin text-blue-500" />
                <span className="text-sm">Fetching user transaction audits...</span>
              </div>
            ) : !userTxData ? (
              <div className="py-12 sm:py-16 text-center text-gray-500 text-sm">
                Could not load transactions for this user.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-5 pr-1">
                {/* 4 Summary KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-950/20 border border-emerald-500/20">
                    <div className="flex items-center justify-between text-xs text-emerald-400 mb-1">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Coupons Added</span>
                      <Ticket size={16} />
                    </div>
                    <p className="text-base sm:text-lg font-black font-mono text-emerald-300 truncate">
                      ₹{(userTxData.summary?.couponsAdded ?? 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-950/20 border border-amber-500/20">
                    <div className="flex items-center justify-between text-xs text-amber-400 mb-1">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Total Winnings</span>
                      <Trophy size={16} />
                    </div>
                    <p className="text-base sm:text-lg font-black font-mono text-amber-300 truncate">
                      ₹{(userTxData.summary?.winnings ?? 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-rose-950/20 border border-rose-500/20">
                    <div className="flex items-center justify-between text-xs text-rose-400 mb-1">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Total Cashouts</span>
                      <Banknote size={16} />
                    </div>
                    <p className="text-base sm:text-lg font-black font-mono text-rose-300 truncate">
                      ₹{(userTxData.summary?.cashouts ?? 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-blue-950/20 border border-blue-500/20">
                    <div className="flex items-center justify-between text-xs text-blue-400 mb-1">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Room Entries</span>
                      <Gamepad2 size={16} />
                    </div>
                    <p className="text-base sm:text-lg font-black font-mono text-blue-300 truncate">
                      ₹{(userTxData.summary?.roomEntries ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 border-b border-gray-800 pb-3 overflow-x-auto no-scrollbar flex-nowrap">
                  {[
                    { id: 'all', label: 'All Transactions' },
                    { id: 'coupons', label: 'Coupons Added' },
                    { id: 'cashouts', label: 'Cashouts' },
                    { id: 'winnings', label: 'Winnings' },
                    { id: 'room_entries', label: 'Room Entries' },
                    { id: 'refunds', label: 'Refunds' }
                  ].map((filterTab) => (
                    <button
                      key={filterTab.id}
                      onClick={() => setTxCategoryFilter(filterTab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                        txCategoryFilter === filterTab.id
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'bg-gray-800/80 text-gray-400 hover:text-white hover:bg-gray-700/80'
                      }`}
                    >
                      {filterTab.label}
                    </button>
                  ))}
                </div>

                {/* Full chronological transactions table */}
                <div className="card bg-gray-950/40 border-gray-800/80 overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[640px]">
                      <thead className="bg-gray-800/60 text-gray-400 uppercase tracking-wider">
                        <tr className="text-left border-b border-gray-800">
                          <th className="p-3">Date</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Description</th>
                          <th className="p-3 text-right">Amount</th>
                          <th className="p-3 text-right">Balance Audit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {(() => {
                          const list = (userTxData.transactions || []).filter((t) => {
                            if (txCategoryFilter === 'all') return true;
                            if (txCategoryFilter === 'coupons') return t.category === 'coupon_redemption';
                            if (txCategoryFilter === 'cashouts') return t.category === 'cashout' || t.category === 'cashout_hold';
                            if (txCategoryFilter === 'winnings') return t.category === 'prize_won';
                            if (txCategoryFilter === 'room_entries') return t.category === 'room_entry';
                            if (txCategoryFilter === 'refunds') return t.category === 'refund' || t.category === 'cashout_refund';
                            return true;
                          });

                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                  No transactions found for category "{txCategoryFilter}".
                                </td>
                              </tr>
                            );
                          }

                          return list.map((t) => {
                            const isCredit = t.type === 'credit';
                            return (
                              <tr key={t._id} className="hover:bg-gray-800/30 transition-colors">
                                <td className="p-3 text-gray-400 whitespace-nowrap font-mono text-[11px]">
                                  {t.createdAt ? format(new Date(t.createdAt), 'dd MMM yyyy, HH:mm') : 'N/A'}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`inline-flex items-center gap-1 font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                                      isCredit
                                        ? 'text-emerald-400 bg-emerald-500/10'
                                        : 'text-rose-400 bg-rose-500/10'
                                    }`}
                                  >
                                    {isCredit ? '+' : '-'} {t.type}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                      TX_CATEGORY_BADGES[t.category] || 'bg-gray-800 text-gray-400'
                                    }`}
                                  >
                                    {(t.category || 'general').replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td className="p-3 text-gray-300 max-w-xs truncate" title={t.description}>
                                  {t.description}
                                </td>
                                <td
                                  className={`p-3 text-right font-mono font-bold whitespace-nowrap text-sm ${
                                    isCredit ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {isCredit ? '+' : '-'}₹{(t.amount || 0).toFixed(2)}
                                </td>
                                <td className="p-3 text-right font-mono text-gray-400 whitespace-nowrap text-[11px]">
                                  <span>₹{(t.balanceBefore ?? 0).toFixed(2)}</span>
                                  <span className="text-gray-600 mx-1">&rarr;</span>
                                  <span className="text-white font-semibold">₹{(t.balanceAfter ?? 0).toFixed(2)}</span>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-gray-800 flex justify-end">
              <button
                type="button"
                onClick={closeUserTransactionsModal}
                className="btn-secondary text-xs py-2 px-5"
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
