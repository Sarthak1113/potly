import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import socket from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const s = localStorage.getItem('user');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const updateBalance = useCallback((newBalance) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, balance: Number(newBalance) };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setUserBalance = useCallback((val) => {
    updateBalance(val);
  }, [updateBalance]);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      if (data?.user) {
        setUser((prev) => {
          const updated = { ...prev, ...data.user };
          localStorage.setItem('user', JSON.stringify(updated));
          return updated;
        });
        return data.user;
      }
    } catch (e) {
      console.error('Failed to refresh user', e);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    try {
      sessionStorage.removeItem('potly_active_login_id');
      sessionStorage.removeItem('potly_dismissed_login_token');
      sessionStorage.removeItem('potly_notice_dismissed');
      // Clear any legacy dismissed flags
      const keysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('potly_notice_dismissed') || key.startsWith('potly_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      // ignore storage access errors
    }
    setUser(null);
  }, []);

  // Listen to real-time wallet updates and concurrent session logout via socket
  useEffect(() => {
    if (!user) return;

    const handleWalletUpdate = (data) => {
      if (!data) return;
      const currentId = user.id || user._id;
      const match =
        data.userId &&
        (String(data.userId) === String(currentId) ||
         data.userId === user.id ||
         data.userId === user._id);

      if (match) {
        updateBalance(data.newBalance);
        const creditedAmount = data.credited !== undefined ? data.credited : '';
        const msg = creditedAmount !== ''
          ? `🎉 Prize Credited: ₹${creditedAmount}! Your balance is now ₹${data.newBalance}!`
          : `Wallet updated! Your balance is now ₹${data.newBalance}`;
        toast.success(msg, {
          duration: 6000,
          icon: '🎉'
        });
      }
    };

    const handleForceLogout = (data) => {
      if (!data) return;
      const currentId = user?.id || user?._id;
      if (data.userId && String(data.userId) === String(currentId)) {
        logout();
        toast.error('⚠️ Your account was logged in from another browser or device. You have been logged out.', { duration: 8000, id: 'force-logout' });
        window.location.href = '/login?reason=concurrent_session';
      }
    };

    socket.on('wallet:update', handleWalletUpdate);
    socket.on('auth:force_logout', handleForceLogout);

    return () => {
      socket.off('wallet:update', handleWalletUpdate);
      socket.off('auth:force_logout', handleForceLogout);
    };
  }, [user, updateBalance, logout]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // Clear any prior notice dismissal so player receives the immediate notice on every login
    const currentLoginId = `login_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    try {
      sessionStorage.removeItem('potly_dismissed_login_token');
      sessionStorage.setItem('potly_active_login_id', currentLoginId);
      // Remove any lingering dismissal markers
      const toRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('potly_notice_dismissed')) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch {
      // ignore storage access errors
    }

    setUser(data.user);

    // Notify listeners immediately that a player logged in
    if (typeof window !== 'undefined' && data.user?.role !== 'admin') {
      window.dispatchEvent(
        new CustomEvent('potly:player_logged_in', {
          detail: { user: data.user, loginId: currentLoginId }
        })
      );
    }

    return data.user;
  };

  const register = async (username, email, password, securityQuestions = []) => {
    const { data } = await api.post('/auth/register', { username, email, password, securityQuestions });
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        register,
        logout,
        updateBalance,
        setUserBalance,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
