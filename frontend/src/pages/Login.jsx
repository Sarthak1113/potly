import { useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const isConcurrentSession = searchParams.get('reason') === 'concurrent_session';
  const isRegistered = Boolean(location.state?.registered);

  const [form, setForm] = useState({
    email: location.state?.email || '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.username}!`);
      navigate(user.role === 'admin' ? '/admin' : '/wallet');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="card w-full max-w-md mx-auto shadow-elevated">
        {/* Potly Brand Header */}
        <div className="text-center mb-6 sm:mb-8">
          <img
            src="/potly-logo.png"
            alt="Potly"
            className="h-16 sm:h-20 w-auto mx-auto mb-3 object-contain drop-shadow-lg"
          />
          <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight text-white">
            Welcome to Potly
          </h1>
          <p className="text-xs sm:text-sm text-[#FFB51B] font-semibold mt-1 uppercase tracking-wider">
            One Room. One Winner.
          </p>
        </div>

        {isConcurrentSession && (
          <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs sm:text-sm flex items-start gap-2.5 shadow-sm">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <span className="font-semibold">⚠️ Single Session Policy:</span> Your account was logged in from another browser or device. Simultaneous logins are restricted to protect account integrity.
            </p>
          </div>
        )}

        {isRegistered && (
          <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5 shadow-sm">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-snug">
              <span className="font-semibold">✅ Account created successfully!</span> Sign in to enter game rooms and save your credentials.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} method="post" autoComplete="on" className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-[#C4BBD5] mb-1.5" htmlFor="login-email">
              Email Address
            </label>
            <input
              type="email"
              id="login-email"
              name="email"
              autoComplete="email username"
              className="input-field"
              placeholder="player@example.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-[#C4BBD5] mb-1.5" htmlFor="login-password">
              Password
            </label>
            <input
              type="password"
              id="login-password"
              name="password"
              autoComplete="current-password"
              className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
            />
          </div>

          <button
            type="submit"
            id="login-btn"
            className="btn-primary w-full mt-2 py-3 text-base sm:text-sm font-bold flex items-center justify-center tracking-wide"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center mt-3">
            <Link to="/forgot-password" className="text-[#A78BFA] hover:text-white text-xs sm:text-sm font-medium transition-colors">
              Forgot Password?
            </Link>
          </div>

          <p className="text-center text-xs text-[#C4BBD5] mt-2.5">
            By signing in, you agree to our{' '}
            <Link to="/privacy" className="text-[#A78BFA] hover:underline">
              Privacy Policy &amp; Terms
            </Link>
          </p>
        </form>

        <div className="mt-6 pt-5 border-t border-[#3B3152] text-center">
          <p className="text-xs sm:text-sm text-[#C4BBD5]">
            New to Potly?{' '}
            <Link to="/register" className="text-[#FFB51B] hover:text-[#FFA100] font-bold transition-colors">
              Create an Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
