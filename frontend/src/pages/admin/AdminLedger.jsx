import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Receipt,
  Search,
  RefreshCw,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Activity,
  Filter,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Layers,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'coupon_redemption', label: 'Coupon Redemption' },
  { value: 'room_entry', label: 'Room Entry' },
  { value: 'prize_won', label: 'Prize Won' },
  { value: 'admin_credit', label: 'Admin Credit' },
  { value: 'refund', label: 'Refund' }
];

const categoryBadgeStyles = {
  coupon_redemption: 'bg-green-500/15 text-green-400 border border-green-500/30',
  room_entry: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  prize_won: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  admin_credit: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  refund: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
};

export default function AdminLedger() {
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    totalFloatingCurrency: 0,
    totalCredits: 0,
    totalDebits: 0
  });
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchLedger = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const params = {
        page: targetPage,
        limit: 20
      };
      if (search.trim()) params.search = search.trim();
      if (userIdFilter.trim()) params.userId = userIdFilter.trim();
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter;
      if (categoryFilter && categoryFilter !== 'all') params.category = categoryFilter;

      const { data } = await api.get('/admin/transactions', { params });
      setTransactions(data.transactions || []);
      if (data.stats) {
        setStats(data.stats);
      }
      if (data.pagination) {
        setPagination(data.pagination);
      } else {
        setPagination({
          total: (data.transactions || []).length,
          page: targetPage,
          pages: 1
        });
      }
    } catch (err) {
      toast.error('Failed to load transaction ledger');
    } finally {
      setLoading(false);
    }
  }, [search, userIdFilter, typeFilter, categoryFilter, page]);

  useEffect(() => {
    fetchLedger(page);
  }, [fetchLedger, page]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLedger(1);
  };

  const resetFilters = () => {
    setSearch('');
    setUserIdFilter('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setPage(1);
  };

  const formatDateDisplay = (dateString) => {
    try {
      return format(new Date(dateString), 'dd MMM yyyy, HH:mm:ss');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#6419D6]/20 border border-[#6419D6]/35 text-[#A78BFA] rounded-xl flex-shrink-0">
              <Receipt size={28} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">Potly Master Financial Ledger</h1>
              <p className="text-xs sm:text-sm text-[#C4BBD5]">
                System-wide transaction audit &amp; virtual currency circulation
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchLedger(page)}
          className="btn-secondary self-start sm:self-auto flex items-center gap-2 text-xs sm:text-sm py-2 px-3 sm:px-4"
          title="Refresh Ledger"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Key Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Floating Currency */}
        <div className="card bg-gradient-to-br from-indigo-950/40 via-gray-900 to-gray-900 border-indigo-900/40 relative overflow-hidden p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-300 truncate">
              Floating Currency
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex-shrink-0">
              Active Float
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xl sm:text-3xl font-extrabold text-white font-mono tracking-tight truncate">
                ₹{(stats.totalFloatingCurrency ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">Total user balances</p>
            </div>
            <div className="p-2 sm:p-3 bg-indigo-500/10 text-indigo-400 rounded-xl flex-shrink-0">
              <Coins size={22} className="sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Total System Inflow */}
        <div className="card bg-gradient-to-br from-emerald-950/40 via-gray-900 to-gray-900 border-emerald-900/40 p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-400 truncate">
              Total Inflow
            </span>
            <span className="text-[11px] text-emerald-400 flex items-center gap-0.5 flex-shrink-0">
              Credits <ArrowUpRight size={13} />
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight truncate">
                +₹{(stats.totalCredits ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">Coupons, prizes &amp; credits</p>
            </div>
            <div className="p-2 sm:p-3 bg-emerald-500/10 text-emerald-400 rounded-xl flex-shrink-0">
              <ArrowUpRight size={22} className="sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Total System Outflow */}
        <div className="card bg-gradient-to-br from-rose-950/40 via-gray-900 to-gray-900 border-rose-900/40 p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-rose-400 truncate">
              Total Outflow
            </span>
            <span className="text-[11px] text-rose-400 flex items-center gap-0.5 flex-shrink-0">
              Debits <ArrowDownLeft size={13} />
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xl sm:text-3xl font-extrabold text-rose-400 font-mono tracking-tight truncate">
                -₹{(stats.totalDebits ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">Room bets &amp; deductions</p>
            </div>
            <div className="p-2 sm:p-3 bg-rose-500/10 text-rose-400 rounded-xl flex-shrink-0">
              <ArrowDownLeft size={22} className="sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="card bg-gray-900 border-gray-800 p-3.5 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400 truncate">
              Transactions
            </span>
            <span className="p-1 rounded-md bg-gray-800 text-gray-400 flex-shrink-0">
              <Activity size={13} />
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xl sm:text-3xl font-extrabold text-white font-mono tracking-tight truncate">
                {(pagination.total ?? 0).toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 truncate">Recorded ledger events</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-500/10 text-blue-400 rounded-xl flex-shrink-0">
              <Layers size={22} className="sm:w-6 sm:h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="card space-y-4 p-4 sm:p-6">
        <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3">
          {/* Search description */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              className="input-field pl-9 text-xs"
              placeholder="Search description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* User ID / User filter */}
          <div className="relative flex-1 min-w-[150px]">
            <UserIcon size={16} className="absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              className="input-field pl-9 text-xs font-mono"
              placeholder="Filter User ID..."
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
            />
          </div>

          {/* Type filter */}
          <div className="min-w-[140px] flex-1 sm:flex-none">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="input-field text-xs"
            >
              <option value="all">All Types</option>
              <option value="credit">Credit (+)</option>
              <option value="debit">Debit (-)</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="min-w-[160px] flex-1 sm:flex-none">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="input-field text-xs"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              className="btn-primary flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs py-2 px-4"
            >
              <Filter size={14} />
              <span>Apply</span>
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="btn-secondary text-xs py-2 px-3 flex-1 sm:flex-none"
              title="Reset Filters"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Master Ledger Table */}
      <div className="card overflow-hidden p-0 border border-gray-800">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-gray-800/70 border-b border-gray-800 text-gray-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Description & Metadata</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-right">Balance Trail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80">
              {loading ? (
                Array(6)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4"><div className="h-4 bg-gray-700/60 rounded w-24"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-gray-700/60 rounded w-28"></div></td>
                      <td className="py-4 px-4"><div className="h-5 bg-gray-700/60 rounded w-16"></div></td>
                      <td className="py-4 px-4"><div className="h-5 bg-gray-700/60 rounded w-20"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-gray-700/60 rounded w-48"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-gray-700/60 rounded w-16 ml-auto"></div></td>
                      <td className="py-4 px-4"><div className="h-4 bg-gray-700/60 rounded w-24 ml-auto"></div></td>
                    </tr>
                  ))
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <Receipt size={32} className="mx-auto mb-2 text-gray-600 opacity-60" />
                    <p className="font-medium text-gray-400 text-sm">No ledger transactions found</p>
                    <p className="text-xs text-gray-600 mt-1">Try relaxing the search filters</p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const userObj = tx.userId && typeof tx.userId === 'object' ? tx.userId : null;
                  const isCredit = tx.type === 'credit';

                  return (
                    <tr key={tx._id} className="hover:bg-gray-800/40 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 font-mono text-gray-400 whitespace-nowrap">
                        {formatDateDisplay(tx.createdAt)}
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4">
                        {userObj ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white">@{userObj.username}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
                                ₹{(userObj.balance ?? 0).toFixed(2)}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 font-mono">{userObj.email}</p>
                          </div>
                        ) : (
                          <span className="font-mono text-gray-500">
                            {typeof tx.userId === 'string' ? tx.userId.substring(0, 10) + '...' : 'System'}
                          </span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                            isCredit
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {isCredit ? (
                            <>
                              <ArrowUpRight size={12} /> CREDIT
                            </>
                          ) : (
                            <>
                              <ArrowDownLeft size={12} /> DEBIT
                            </>
                          )}
                        </span>
                      </td>

                      {/* Category Tag */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize whitespace-nowrap ${
                            categoryBadgeStyles[tx.category] || 'bg-gray-800 text-gray-300 border border-gray-700'
                          }`}
                        >
                          {(tx.category || 'general').replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Description & Metadata */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-medium text-gray-200 line-clamp-1">{tx.description}</p>
                        {tx.metadata && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 font-mono text-[10px]">
                            {tx.metadata.couponCode && (
                              <span className="bg-green-950/60 text-green-300 border border-green-800/40 px-1.5 py-0.2 rounded">
                                Coupon: {tx.metadata.couponCode}
                              </span>
                            )}
                            {tx.metadata.roomId && (
                              <span className="bg-amber-950/60 text-amber-300 border border-amber-800/40 px-1.5 py-0.2 rounded">
                                Room: {String(tx.metadata.roomId).substring(0, 10)}
                              </span>
                            )}
                            {tx.metadata.adminNote && (
                              <span className="bg-blue-950/60 text-blue-300 border border-blue-800/40 px-1.5 py-0.2 rounded">
                                Note: {tx.metadata.adminNote}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                        <span className={isCredit ? 'text-emerald-400' : 'text-rose-400'}>
                          {isCredit ? '+' : '-'}₹{(tx.amount || 0).toFixed(2)}
                        </span>
                      </td>

                      {/* Balance Trail (Before -> After) */}
                      <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 text-gray-400">
                          <span className="text-gray-500">₹{(tx.balanceBefore ?? 0).toFixed(2)}</span>
                          <ArrowRight size={12} className="text-gray-600" />
                          <span className="text-white font-medium">₹{(tx.balanceAfter ?? 0).toFixed(2)}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-gray-900 border-t border-gray-800 text-xs gap-3">
          <span className="text-gray-400">
            Showing Page <span className="text-white font-medium">{pagination.page}</span> of{' '}
            <span className="text-white font-medium">{pagination.pages || 1}</span> (Total{' '}
            <span className="text-white font-medium">{pagination.total}</span> records)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 text-gray-300 flex items-center gap-1 font-medium transition-colors"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="px-2 font-mono text-gray-400">
              {page} / {pagination.pages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages || 1, p + 1))}
              disabled={page >= (pagination.pages || 1)}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 text-gray-300 flex items-center gap-1 font-medium transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
