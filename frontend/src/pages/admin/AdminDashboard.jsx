import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import {
  Users,
  Ticket,
  ArrowUpCircle,
  Coins,
  Dice5,
  Receipt,
  ArrowRight,
  RefreshCw,
  Banknote,
  Crown,
  Bell,
  QrCode
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingCashoutsCount, setPendingCashoutsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/cashouts/admin/all?status=pending&limit=1').catch(() => ({ data: { pagination: { total: 0 } } }))
      ]);
      setStats(s.data.stats);
      setPendingCashoutsCount(c.data?.pagination?.total ?? (c.data?.requests?.length || 0));
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const statCards = stats
    ? [
        {
          label: 'Total Users',
          value: (stats.totalUsers ?? 0).toLocaleString('en-IN'),
          icon: Users,
          color: 'text-[#A78BFA]',
          bg: 'bg-[#6419D6]/15',
          link: '/admin/users'
        },
        {
          label: 'Floating Currency',
          value: `₹${(stats.floatingCurrency ?? 0).toLocaleString('en-IN')}`,
          icon: Coins,
          color: 'text-[#FFB51B]',
          bg: 'bg-[#FFB51B]/15'
        },
        {
          label: 'Active Rooms',
          value: stats.activeRoomsCount ?? 0,
          icon: Dice5,
          color: 'text-[#FF762B]',
          bg: 'bg-[#FF762B]/15',
          link: '/admin/rooms'
        },
        {
          label: 'Transactions',
          value: (stats.totalTransactions ?? 0).toLocaleString('en-IN'),
          icon: ArrowUpCircle,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/15',
          link: '/admin/ledger'
        },
        {
          label: 'Total Redeemed (₹)',
          value: `₹${(stats.totalCouponsRedeemed ?? 0).toLocaleString('en-IN')}`,
          icon: Ticket,
          color: 'text-[#FFB51B]',
          bg: 'bg-[#FFB51B]/15',
          link: '/admin/coupons'
        },
        {
          label: 'Total Players',
          value: (stats.totalPlayers ?? 0).toLocaleString('en-IN'),
          icon: Users,
          color: 'text-[#A78BFA]',
          bg: 'bg-[#6419D6]/15',
          link: '/admin/users'
        },
        {
          label: 'Cashout Requests',
          value: pendingCashoutsCount !== null ? `${pendingCashoutsCount} Pending` : '0',
          icon: Banknote,
          color: 'text-[#FF762B]',
          bg: 'bg-[#FF762B]/15',
          link: '/admin/cashouts'
        }
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header with Potly Brand Styling */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-[22px] bg-gradient-to-br from-[#21183A] via-[#17102D] to-[#2B1254] border border-[#3B3152] shadow-elevated">
        <div className="flex items-center gap-3.5">
          <img
            src="/potly-logo.png"
            alt="Potly"
            className="h-12 sm:h-14 w-auto object-contain drop-shadow-md"
          />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-[10px] font-bold bg-[#FFB51B]/15 text-[#FFB51B] border border-[#FFB51B]/35 uppercase tracking-wider mb-1 font-mono">
              <Crown size={12} /> Potly Control Center
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-[#C4BBD5] mt-0.5">
              Live room metrics, player accounts, financial ledgers, and cashout approvals
            </p>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="btn-secondary self-start sm:self-auto flex items-center gap-2 text-xs sm:text-sm py-2 px-3.5"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Quick Action Navigation Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Deposit & Coupon Requests Card */}
        <Link
          to="/admin/deposits"
          className="card group hover:border-[#FFB51B]/60 bg-[#21183A] border-[#3B3152] transition-all p-4 sm:p-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2">
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#FFB51B]/15 text-[#FFB51B] border border-[#FFB51B]/35 group-hover:scale-105 transition-transform flex-shrink-0">
              <QrCode size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-[#FFB51B] transition-colors">
                Deposit Requests
              </h3>
              <p className="text-xs text-[#C4BBD5] mt-0.5 line-clamp-2">Verify UPI screenshots, issue coupons &amp; manage QR</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-[#C4BBD5] group-hover:text-[#FFB51B] group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>

        {/* User Management Card */}
        <Link
          to="/admin/users"
          className="card group hover:border-[#6419D6]/60 bg-[#21183A] border-[#3B3152] transition-all p-4 sm:p-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2">
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/35 group-hover:scale-105 transition-transform flex-shrink-0">
              <Users size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-[#A78BFA] transition-colors">
                  User Directory
                </h3>
                {stats?.totalUsers !== undefined && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-pill bg-[#6419D6]/25 text-[#A78BFA] border border-[#6419D6]/40 font-semibold whitespace-nowrap">
                    {stats.totalUsers}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#C4BBD5] mt-0.5 line-clamp-2">
                Browse players, inspect transaction ledgers, and manage roles
              </p>
            </div>
          </div>
          <ArrowRight size={18} className="text-[#C4BBD5] group-hover:text-[#A78BFA] group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>

        {/* Cashout Requests Card */}
        <Link
          to="/admin/cashouts"
          className="card group hover:border-[#FFB51B]/60 bg-[#21183A] border-[#3B3152] transition-all p-4 sm:p-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2">
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#FFB51B]/15 text-[#FFB51B] border border-[#FFB51B]/35 group-hover:scale-105 transition-transform flex-shrink-0">
              <Banknote size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-[#FFB51B] transition-colors">
                Cashout Requests
              </h3>
              <p className="text-xs text-[#C4BBD5] mt-0.5 line-clamp-2">Review withdrawals and process payouts</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-[#C4BBD5] group-hover:text-[#FFB51B] group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>

        {/* Room Management Card */}
        <Link
          to="/admin/rooms"
          className="card group hover:border-[#FF762B]/60 bg-[#21183A] border-[#3B3152] transition-all p-4 sm:p-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2">
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#FF762B]/15 text-[#FF762B] border border-[#FF762B]/35 group-hover:scale-105 transition-transform flex-shrink-0">
              <Dice5 size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-[#FF762B] transition-colors">
                Room Management
              </h3>
              <p className="text-xs text-[#C4BBD5] mt-0.5 line-clamp-2">Create and manage live Potly game rooms</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-[#C4BBD5] group-hover:text-[#FF762B] group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>

        {/* Master Ledger Card */}
        <Link
          to="/admin/ledger"
          className="card group hover:border-emerald-500/60 bg-[#21183A] border-[#3B3152] transition-all p-4 sm:p-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2">
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 group-hover:scale-105 transition-transform flex-shrink-0">
              <Receipt size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-emerald-400 transition-colors">
                Master Ledger
              </h3>
              <p className="text-xs text-[#C4BBD5] mt-0.5 line-clamp-2">Audit all virtual currency debits and credits</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-[#C4BBD5] group-hover:text-emerald-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>

        {/* Coupon Generator Card */}
        <Link
          to="/admin/coupons"
          className="card group hover:border-[#6419D6]/60 bg-[#21183A] border-[#3B3152] transition-all p-4 sm:p-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2">
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/35 group-hover:scale-105 transition-transform flex-shrink-0">
              <Ticket size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-[#A78BFA] transition-colors">
                Coupon Generator
              </h3>
              <p className="text-xs text-[#C4BBD5] mt-0.5 line-clamp-2">Generate promotional balance vouchers</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-[#C4BBD5] group-hover:text-[#A78BFA] group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>

        {/* Notice Broadcast Card */}
        <Link
          to="/admin/notice"
          className="card group hover:border-[#FFB51B]/60 bg-[#21183A] border-[#3B3152] transition-all p-4 sm:p-5 flex items-center justify-between"
        >
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 pr-2">
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#FFB51B]/15 text-[#FFB51B] border border-[#FFB51B]/35 group-hover:scale-105 transition-transform flex-shrink-0">
              <Bell size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white group-hover:text-[#FFB51B] transition-colors">
                Notice Broadcast
              </h3>
              <p className="text-xs text-[#C4BBD5] mt-0.5 line-clamp-2">Configure player login popup announcements</p>
            </div>
          </div>
          <ArrowRight size={18} className="text-[#C4BBD5] group-hover:text-[#FFB51B] group-hover:translate-x-1 transition-all flex-shrink-0" />
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {loading
          ? Array(7)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="card animate-pulse p-3 sm:p-5">
                  <div className="h-3 sm:h-4 bg-[#17102D] rounded w-20 sm:w-24 mb-2 sm:mb-3"></div>
                  <div className="h-6 sm:h-8 bg-[#17102D] rounded w-24 sm:w-28"></div>
                </div>
              ))
          : statCards.map((s) => {
              const inner = (
                <>
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-[#C4BBD5] truncate pr-1">
                      {s.label}
                    </p>
                    <s.icon size={18} className={`${s.color} flex-shrink-0`} />
                  </div>
                  <div className="flex items-baseline justify-between gap-1">
                    <p className={`text-xl sm:text-3xl font-bold font-mono tracking-tight truncate ${s.color}`}>
                      {s.value}
                    </p>
                    {s.link && (
                      <span className="text-[10px] sm:text-[11px] text-[#A78BFA] font-semibold group-hover:underline flex-shrink-0">
                        Review &rarr;
                      </span>
                    )}
                  </div>
                </>
              );

              return s.link ? (
                <Link
                  key={s.label}
                  to={s.link}
                  className={`card group ${s.bg} border-[#3B3152] hover:border-[#6419D6]/60 transition-all cursor-pointer p-3 sm:p-5`}
                >
                  {inner}
                </Link>
              ) : (
                <div
                  key={s.label}
                  className={`card ${s.bg} border-[#3B3152] transition-all p-3 sm:p-5`}
                >
                  {inner}
                </div>
              );
            })}
      </div>
    </div>
  );
}
