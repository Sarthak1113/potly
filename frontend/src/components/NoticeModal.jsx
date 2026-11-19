import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import socket from '../services/socket';
import {
  Bell,
  X,
  AlertTriangle,
  Wrench,
  Gift,
  Info,
  Calendar,
  Check
} from 'lucide-react';
import { format } from 'date-fns';

export default function NoticeModal() {
  const { user } = useAuth();
  const [notice, setNotice] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  // Helper to format date safely
  const formatDateSafe = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      return format(d, 'dd MMM yyyy, hh:mm a');
    } catch {
      return '';
    }
  };

  // Get or initialize active login session ID
  const getActiveLoginId = () => {
    try {
      let id = sessionStorage.getItem('potly_active_login_id');
      if (!id) {
        id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        sessionStorage.setItem('potly_active_login_id', id);
      }
      return id;
    } catch {
      return 'active_session';
    }
  };

  // Check if player has already dismissed the notice in THIS current login session
  const isDismissed = (noticeData) => {
    if (!noticeData) return true;
    try {
      const activeLoginId = getActiveLoginId();
      const dismissedLoginId = sessionStorage.getItem('potly_dismissed_login_token');
      // Only considered dismissed if explicitly dismissed during this exact login session
      return dismissedLoginId === activeLoginId;
    } catch {
      return false;
    }
  };

  // Mark dismissed only for the current login session
  const markDismissed = () => {
    try {
      const activeLoginId = getActiveLoginId();
      sessionStorage.setItem('potly_dismissed_login_token', activeLoginId);
    } catch {
      // ignore
    }
  };

  // Fetch active notice from backend (forceShow = true when triggered by a new login event)
  const fetchActiveNotice = useCallback(async (forceShow = false) => {
    // Only show to logged in players (not admins)
    if (!user || user.role === 'admin') return;

    try {
      const { data } = await api.get('/notice/active');
      if (data?.success && data.isActive && data.notice) {
        setNotice(data.notice);
        if (forceShow || !isDismissed(data.notice)) {
          setIsOpen(true);
        }
      } else {
        setNotice(null);
        setIsOpen(false);
      }
    } catch (err) {
      console.warn('Could not load active notice:', err.message);
    }
  }, [user]);

  // Trigger immediate popup every time a player logs in
  useEffect(() => {
    const handlePlayerLoggedIn = (e) => {
      const loggedUser = e?.detail?.user || user;
      if (loggedUser && loggedUser.role !== 'admin') {
        // Immediate notice popup on every login
        fetchActiveNotice(true);
      }
    };

    window.addEventListener('potly:player_logged_in', handlePlayerLoggedIn);
    return () => {
      window.removeEventListener('potly:player_logged_in', handlePlayerLoggedIn);
    };
  }, [user, fetchActiveNotice]);

  // Check active notice when user mounts or changes
  useEffect(() => {
    if (user && user.role !== 'admin') {
      fetchActiveNotice();
    } else {
      setIsOpen(false);
      setNotice(null);
    }
  }, [user, fetchActiveNotice]);

  // Listen to real-time notice updates from admin
  useEffect(() => {
    const handleNoticeUpdated = (updatedNotice) => {
      if (!user || user.role === 'admin') return;
      if (!updatedNotice) return;
      if (updatedNotice.isActive) {
        setNotice(updatedNotice);
        // If notice was enabled/updated by admin, show immediately
        setIsOpen(true);
      } else {
        setIsOpen(false);
        setNotice(null);
      }
    };

    socket.on('notice:updated', handleNoticeUpdated);
    return () => {
      socket.off('notice:updated', handleNoticeUpdated);
    };
  }, [user]);

  const handleClose = () => {
    markDismissed();
    setIsOpen(false);
  };

  if (!isOpen || !notice) return null;

  // Render icon and badge style based on notice type
  const getTypeBadge = (type) => {
    switch (type) {
      case 'maintenance':
        return {
          label: 'Scheduled Maintenance',
          icon: <Wrench size={14} className="text-[#FF762B]" />,
          style: 'bg-[#FF762B]/15 text-[#FF762B] border-[#FF762B]/35'
        };
      case 'offer':
        return {
          label: 'Special Promotion',
          icon: <Gift size={14} className="text-[#FFB51B]" />,
          style: 'bg-[#FFB51B]/15 text-[#FFB51B] border-[#FFB51B]/35'
        };
      case 'warning':
        return {
          label: 'Security Notice',
          icon: <AlertTriangle size={14} className="text-rose-400" />,
          style: 'bg-rose-500/15 text-rose-300 border-rose-500/35'
        };
      case 'info':
        return {
          label: 'Information',
          icon: <Info size={14} className="text-[#A78BFA]" />,
          style: 'bg-[#6419D6]/20 text-[#A78BFA] border-[#6419D6]/40'
        };
      case 'announcement':
      default:
        return {
          label: 'Official Announcement',
          icon: <Bell size={14} className="text-[#FFB51B]" />,
          style: 'bg-[#FFB51B]/15 text-[#FFB51B] border-[#FFB51B]/35'
        };
    }
  };

  const badgeInfo = getTypeBadge(notice.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg mx-auto bg-gradient-to-b from-[#21183A] via-[#17102D] to-[#251347] border-2 border-[#6419D6]/60 rounded-[22px] p-5 sm:p-7 text-left shadow-2xl shadow-[#6419D6]/25 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Top Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-[#C4BBD5] hover:text-white p-1.5 rounded-full bg-[#17102D] hover:bg-[#2C214C] border border-[#3B3152] transition-colors focus:outline-none"
          title="Close notice"
          aria-label="Close notice"
        >
          <X size={18} />
        </button>

        {/* Brand & Badge Header */}
        <div className="flex items-center gap-3">
          <img
            src="/potly-logo.png"
            alt="Potly"
            className="h-10 sm:h-12 w-auto object-contain drop-shadow-md"
          />
          <div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-[11px] font-bold uppercase tracking-wider font-mono border ${badgeInfo.style}`}
            >
              {badgeInfo.icon}
              <span>{badgeInfo.label}</span>
            </span>
            {notice.updatedAt && (
              <p className="text-[11px] text-[#C4BBD5] flex items-center gap-1 mt-1 font-mono">
                <Calendar size={12} className="text-[#A78BFA]" />
                <span>{formatDateSafe(notice.updatedAt)}</span>
              </p>
            )}
          </div>
        </div>

        {/* Notice Title */}
        <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight leading-snug pt-1">
          {notice.title}
        </h2>

        {/* Notice Content / Details */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#17102D]/90 border border-[#3B3152] text-[#F7F5FC] text-xs sm:text-sm leading-relaxed max-h-64 overflow-y-auto whitespace-pre-line selection:bg-[#6419D6] selection:text-white">
          {notice.content}
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleClose}
            className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2 shadow-brand"
          >
            <Check size={16} />
            <span>Got it, Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}
