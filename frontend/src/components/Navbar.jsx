import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Wallet,
  LayoutDashboard,
  LogOut,
  Ticket,
  Receipt,
  Dice5,
  Flame,
  Banknote,
  ShieldCheck,
  Menu,
  X,
  Users,
  Coins,
  Bell,
  QrCode
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    setMobileOpen(false);
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/lobby';
    }
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    if (path === '/privacy') {
      return location.pathname === '/privacy' || location.pathname === '/terms';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bg-[#17102D]/95 backdrop-blur-md sticky top-0 z-40 border-b border-[#3B3152] px-3.5 sm:px-6 py-2.5 sm:py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Logo & Name */}
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 group focus:outline-none"
        >
          <img
            src="/potly-logo.png"
            alt="Potly Logo"
            className="h-8 sm:h-9 w-auto object-contain rounded-lg shadow-sm transition-transform duration-200 group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="font-heading font-black text-xl sm:text-2xl text-white tracking-tight leading-none">
              Potly
            </span>
            <span className="text-[10px] font-semibold text-[#FFB51B] tracking-wider uppercase leading-none mt-0.5 hidden xs:inline-block">
              One Room. One Winner.
            </span>
          </div>
        </Link>

        {user ? (
          <>
            {/* Desktop Navigation (>=md) */}
            <div className="hidden md:flex items-center gap-3.5 lg:gap-5">
              {/* Lobby Link */}
              <Link
                to="/"
                className={`flex items-center gap-1.5 text-sm font-medium transition-all px-3 py-1.5 rounded-control ${
                  isActive('/')
                    ? 'text-[#FFB51B] font-semibold bg-[#FFB51B]/10 border border-[#FFB51B]/30'
                    : 'text-[#C4BBD5] hover:text-white hover:bg-[#21183A]'
                }`}
              >
                <Flame size={17} className={isActive('/') ? 'text-[#FFB51B]' : 'text-[#FF762B]'} />
                <span>Rooms</span>
              </Link>

              {/* User Wallet Link */}
              <Link
                to="/wallet"
                className={`flex items-center gap-2 text-sm font-medium transition-all px-3 py-1.5 rounded-control ${
                  isActive('/wallet')
                    ? 'text-[#A78BFA] font-semibold bg-[#6419D6]/20 border border-[#6419D6]/40'
                    : 'text-[#C4BBD5] hover:text-white hover:bg-[#21183A]'
                }`}
              >
                <Wallet size={17} className={isActive('/wallet') ? 'text-[#A78BFA]' : 'text-gray-400'} />
                <span>Wallet</span>
                <span className="bg-[#21183A] text-[#FFB51B] border border-[#FFB51B]/35 text-xs px-2.5 py-0.5 rounded-pill font-mono font-bold flex items-center gap-1 shadow-sm">
                  <Coins size={12} className="text-[#FFB51B]" />
                  ₹{user.balance?.toFixed(2) ?? '0.00'}
                </span>
              </Link>

              {/* Admin Links */}
              {user.role === 'admin' && (
                <div className="flex items-center gap-2 lg:gap-3 pl-3 border-l border-[#3B3152]">
                  <Link
                    to="/admin/deposits"
                    className={`flex items-center gap-1.5 text-xs lg:text-sm font-medium transition-colors px-2.5 py-1.5 rounded-control ${
                      isActive('/admin/deposits')
                        ? 'text-[#FFB51B] font-semibold bg-[#FFB51B]/15 border border-[#FFB51B]/40'
                        : 'text-[#C4BBD5] hover:text-white hover:bg-[#21183A]'
                    }`}
                    title="Player Deposit & Payment Requests"
                  >
                    <QrCode size={16} />
                    <span>Deposits</span>
                  </Link>

                  <Link
                    to="/admin/cashouts"
                    className={`flex items-center gap-1.5 text-xs lg:text-sm font-medium transition-colors px-2.5 py-1.5 rounded-control ${
                      isActive('/admin/cashouts')
                        ? 'text-[#A78BFA] font-semibold bg-[#6419D6]/25 border border-[#6419D6]/40'
                        : 'text-[#C4BBD5] hover:text-white hover:bg-[#21183A]'
                    }`}
                    title="Cashout & Withdrawal Management"
                  >
                    <Banknote size={16} />
                    <span>Cashouts</span>
                  </Link>

                  <Link
                    to="/admin/users"
                    className={`flex items-center gap-1.5 text-xs lg:text-sm font-medium transition-colors px-2.5 py-1.5 rounded-control ${
                      isActive('/admin/users')
                        ? 'text-[#A78BFA] font-semibold bg-[#6419D6]/25 border border-[#6419D6]/40'
                        : 'text-[#C4BBD5] hover:text-white hover:bg-[#21183A]'
                    }`}
                    title="User Directory & Management"
                  >
                    <Users size={16} />
                    <span>Users</span>
                  </Link>

                  <Link
                    to="/admin/rooms"
                    className={`flex items-center gap-1.5 text-xs lg:text-sm font-medium transition-colors px-2.5 py-1.5 rounded-control ${
                      isActive('/admin/rooms')
                        ? 'text-[#A78BFA] font-semibold bg-[#6419D6]/25 border border-[#6419D6]/40'
                        : 'text-[#C4BBD5] hover:text-white hover:bg-[#21183A]'
                    }`}
                    title="Potly Room Management"
                  >
                    <Dice5 size={16} />
                    <span>Rooms</span>
                  </Link>

                  <Link
                    to="/admin/ledger"
                    className={`flex items-center gap-1.5 text-xs lg:text-sm font-medium transition-colors px-2.5 py-1.5 rounded-control ${
                      isActive('/admin/ledger')
                        ? 'text-[#A78BFA] font-semibold bg-[#6419D6]/25 border border-[#6419D6]/40'
                        : 'text-[#C4BBD5] hover:text-white hover:bg-[#21183A]'
                    }`}
                    title="Master Financial Ledger"
                  >
                    <Receipt size={16} />
                    <span>Ledger</span>
                  </Link>

                  <Link
                    to="/admin/notice"
                    className={`flex items-center gap-1.5 text-xs lg:text-sm font-medium transition-colors px-2.5 py-1.5 rounded-control ${
                      isActive('/admin/notice')
                        ? 'text-[#A78BFA] font-semibold bg-[#6419D6]/25 border border-[#6419D6]/40'
                        : 'text-[#C4BBD5] hover:text-white hover:bg-[#21183A]'
                    }`}
                    title="Player Notice System"
                  >
                    <Bell size={16} />
                    <span>Notice</span>
                  </Link>

                  <Link
                    to="/admin/coupons"
                    className={`flex items-center gap-1.5 text-xs lg:text-sm font-medium transition-colors px-2.5 py-1.5 rounded-control ${
                      isActive('/admin/coupons')
                        ? 'text-[#A78BFA] font-semibold bg-[#6419D6]/25 border border-[#6419D6]/40'
                        : 'text-[#C4BBD5] hover:text-white hover:bg-[#21183A]'
                    }`}
                    title="Coupon Generator"
                  >
                    <Ticket size={16} />
                    <span>Coupons</span>
                  </Link>

                  <Link
                    to="/admin"
                    className={`flex items-center gap-1.5 text-xs lg:text-sm font-medium transition-colors px-2.5 py-1.5 rounded-control ${
                      location.pathname === '/admin'
                        ? 'text-[#A78BFA] font-semibold bg-[#6419D6]/25 border border-[#6419D6]/40'
                        : 'text-[#C4BBD5] hover:text-white hover:bg-[#21183A]'
                    }`}
                    title="Admin Dashboard"
                  >
                    <LayoutDashboard size={16} />
                    <span>Dashboard</span>
                  </Link>
                </div>
              )}

              {/* User Identity & Logout */}
              <div className="flex items-center gap-2.5 pl-3 border-l border-[#3B3152]">
                <div className="flex items-center text-xs">
                  <span className="text-gray-200 font-medium max-w-[110px] truncate" title={`@${user.username}`}>
                    @{user.username}
                  </span>
                  {user.role === 'admin' && (
                    <span className="ml-1.5 bg-[#6419D6]/30 text-[#A78BFA] border border-[#6419D6]/50 text-[10px] px-1.5 py-0.5 rounded-pill font-mono font-bold uppercase tracking-wider">
                      admin
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-rose-400 p-1.5 rounded-control hover:bg-[#21183A] transition-colors"
                  title="Log Out"
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>

            {/* Mobile Top Bar Controls (<md) */}
            <div className="flex md:hidden items-center gap-2.5">
              {/* Balance Badge on mobile top bar */}
              <Link
                to="/wallet"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-1.5 bg-[#21183A] hover:bg-[#2A1F49] text-[#FFB51B] border border-[#FFB51B]/40 text-xs px-2.5 py-1 rounded-pill font-mono font-bold transition-colors shadow-sm"
                title="Wallet Balance"
              >
                <Coins size={13} className="text-[#FFB51B]" />
                <span>₹{user.balance?.toFixed(2) ?? '0.00'}</span>
              </Link>

              {/* Mobile Hamburger Menu Toggle */}
              <button
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                className="p-2 text-[#C4BBD5] hover:text-white bg-[#21183A] hover:bg-[#2C214C] border border-[#3B3152] rounded-control transition-colors focus:outline-none"
                aria-label="Toggle navigation menu"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </>
        ) : (
          /* Unauthenticated navigation */
          <div className="flex items-center gap-3">
            <Link
              to="/privacy"
              className="text-xs sm:text-sm text-[#C4BBD5] hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded-control hover:bg-[#21183A] transition-colors"
            >
              <ShieldCheck size={16} />
              <span>Privacy &amp; Terms</span>
            </Link>
          </div>
        )}
      </div>

      {/* Collapsible Mobile Drawer / Menu (<md) */}
      {user && mobileOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-[#3B3152] space-y-3 animate-fade-in transition-all">
          {/* Main User Links */}
          <div className="space-y-1">
            {/* Rooms */}
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'bg-[#FFB51B]/15 text-[#FFB51B] border border-[#FFB51B]/35 font-semibold'
                  : 'text-[#C4BBD5] hover:bg-[#21183A] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Flame size={18} className={isActive('/') ? 'text-[#FFB51B]' : 'text-[#FF762B]'} />
                <span>🔥 Game Rooms</span>
              </div>
              {isActive('/') && <span className="w-2 h-2 rounded-full bg-[#FFB51B]" />}
            </Link>

            {/* Wallet */}
            <Link
              to="/wallet"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive('/wallet')
                  ? 'bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40 font-semibold'
                  : 'text-[#C4BBD5] hover:bg-[#21183A] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wallet size={18} className="text-[#A78BFA]" />
                <span>💼 Wallet</span>
              </div>
              <span className="bg-[#21183A] text-[#FFB51B] border border-[#FFB51B]/35 text-xs px-2.5 py-0.5 rounded-pill font-mono font-bold flex items-center gap-1">
                <Coins size={12} className="text-[#FFB51B]" />
                ₹{user.balance?.toFixed(2) ?? '0.00'}
              </span>
            </Link>
          </div>

          {/* Admin Control Section */}
          {user.role === 'admin' && (
            <div className="pt-2 border-t border-[#3B3152]">
              <div className="px-3.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#A78BFA]">
                Admin Control
              </div>
              <div className="space-y-1">
                <Link
                  to="/admin/deposits"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/admin/deposits')
                      ? 'bg-[#FFB51B]/15 text-[#FFB51B] border border-[#FFB51B]/40 font-semibold'
                      : 'text-[#C4BBD5] hover:bg-[#21183A] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <QrCode size={18} className="text-[#FFB51B]" />
                    <span>📥 Deposit Requests</span>
                  </div>
                  {isActive('/admin/deposits') && <span className="w-2 h-2 rounded-full bg-[#FFB51B]" />}
                </Link>

                <Link
                  to="/admin/cashouts"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/admin/cashouts')
                      ? 'bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40 font-semibold'
                      : 'text-[#C4BBD5] hover:bg-[#21183A] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Banknote size={18} className="text-[#FFB51B]" />
                    <span>💸 Cashouts</span>
                  </div>
                  {isActive('/admin/cashouts') && <span className="w-2 h-2 rounded-full bg-[#A78BFA]" />}
                </Link>

                <Link
                  to="/admin/users"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/admin/users')
                      ? 'bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40 font-semibold'
                      : 'text-[#C4BBD5] hover:bg-[#21183A] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users size={18} className="text-[#A78BFA]" />
                    <span>👥 Users Directory</span>
                  </div>
                  {isActive('/admin/users') && <span className="w-2 h-2 rounded-full bg-[#A78BFA]" />}
                </Link>

                <Link
                  to="/admin/rooms"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/admin/rooms')
                      ? 'bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40 font-semibold'
                      : 'text-[#C4BBD5] hover:bg-[#21183A] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Dice5 size={18} className="text-[#FF762B]" />
                    <span>🎲 Rooms</span>
                  </div>
                  {isActive('/admin/rooms') && <span className="w-2 h-2 rounded-full bg-[#A78BFA]" />}
                </Link>

                <Link
                  to="/admin/notice"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/admin/notice')
                      ? 'bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40 font-semibold'
                      : 'text-[#C4BBD5] hover:bg-[#21183A] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell size={18} className="text-[#A78BFA]" />
                    <span>📢 Player Notice</span>
                  </div>
                  {isActive('/admin/notice') && <span className="w-2 h-2 rounded-full bg-[#A78BFA]" />}
                </Link>

                <Link
                  to="/admin/coupons"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/admin/coupons')
                      ? 'bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40 font-semibold'
                      : 'text-[#C4BBD5] hover:bg-[#21183A] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Ticket size={18} className="text-[#FFB51B]" />
                    <span>🎟️ Coupons</span>
                  </div>
                  {isActive('/admin/coupons') && <span className="w-2 h-2 rounded-full bg-[#A78BFA]" />}
                </Link>

                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    location.pathname === '/admin'
                      ? 'bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40 font-semibold'
                      : 'text-[#C4BBD5] hover:bg-[#21183A] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard size={18} className="text-emerald-400" />
                    <span>📊 Admin Dashboard</span>
                  </div>
                  {location.pathname === '/admin' && <span className="w-2 h-2 rounded-full bg-[#A78BFA]" />}
                </Link>

                <Link
                  to="/admin/ledger"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive('/admin/ledger')
                      ? 'bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40 font-semibold'
                      : 'text-[#C4BBD5] hover:bg-[#21183A] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Receipt size={18} className="text-[#FF762B]" />
                    <span>🧾 Master Ledger</span>
                  </div>
                  {isActive('/admin/ledger') && <span className="w-2 h-2 rounded-full bg-[#A78BFA]" />}
                </Link>
              </div>
            </div>
          )}

          {/* Privacy Policy & Terms */}
          <div className="pt-2 border-t border-[#3B3152]">
            <Link
              to="/privacy"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive('/privacy')
                  ? 'bg-[#6419D6]/20 text-[#A78BFA] border border-[#6419D6]/40 font-semibold'
                  : 'text-[#C4BBD5] hover:bg-[#21183A] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={18} className="text-[#A78BFA]" />
                <span>🛡️ Privacy Policy &amp; Terms</span>
              </div>
              {isActive('/privacy') && <span className="w-2 h-2 rounded-full bg-[#A78BFA]" />}
            </Link>
          </div>

          {/* User Info & Logout Button */}
          <div className="pt-3 border-t border-[#3B3152] flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#6419D6]/30 border border-[#6419D6]/50 flex items-center justify-center text-xs font-bold text-[#A78BFA]">
                {user.username?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div className="text-xs">
                <div className="text-gray-200 font-medium truncate max-w-[150px]">
                  @{user.username}
                </div>
                <div className="text-[10px] text-[#A78BFA] font-mono capitalize">
                  {user.role === 'admin' ? '⭐ Admin' : 'Player'}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-control text-rose-300 hover:text-rose-200 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-medium transition-colors"
            >
              <LogOut size={15} />
              <span>🚪 Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
