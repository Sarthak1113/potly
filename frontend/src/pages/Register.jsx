import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the name of the city where you were born?"
];

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [secAnswers, setSecAnswers] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (secAnswers.some((a) => !a.trim())) return toast.error('Please answer all security questions');
    setLoading(true);
    try {
      const securityQuestions = SECURITY_QUESTIONS.map((q, i) => ({ question: q, answer: secAnswers[i] }));
      await register(form.username, form.email, form.password, securityQuestions);
      toast.success('🎉 Account created successfully! Please sign in with your password.');
      navigate('/login', { state: { email: form.email, registered: true } });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
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
            Create Your Account
          </h1>
          <p className="text-xs sm:text-sm text-[#FFB51B] font-semibold mt-1 uppercase tracking-wider">
            Create. Join. Experience.
          </p>
        </div>

        <form onSubmit={handleSubmit} method="post" autoComplete="on" className="space-y-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-[#C4BBD5] mb-1.5" htmlFor="username">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              autoComplete="username"
              className="input-field"
              placeholder="potly_player"
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-[#C4BBD5] mb-1.5" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              autoComplete="email"
              className="input-field"
              placeholder="player@example.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-[#C4BBD5] mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              autoComplete="new-password"
              className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-[#C4BBD5] mb-1.5" htmlFor="confirm-password">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirm-password"
              name="confirm-password"
              autoComplete="new-password"
              className="input-field"
              placeholder="••••••••"
              value={form.confirm}
              onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
              required
              minLength={6}
            />
          </div>

          {/* Security Questions section */}
          <div className="pt-2 border-t border-[#3B3152]">
            <h3 className="text-white font-heading font-bold text-base mt-2 mb-1">
              Account Security Questions
            </h3>
            <p className="text-[#C4BBD5] text-xs mb-3">
              These 3 questions will verify your identity if you ever forget your password.
            </p>

            <div className="space-y-3">
              {SECURITY_QUESTIONS.map((question, i) => (
                <div key={i}>
                  <label className="block text-[#C4BBD5] text-xs font-medium mb-1">
                    {i + 1}. {question}
                  </label>
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder="Your answer (case-insensitive)"
                    className="input-field text-sm"
                    value={secAnswers[i]}
                    onChange={(e) => {
                      const updated = [...secAnswers];
                      updated[i] = e.target.value;
                      setSecAnswers(updated);
                    }}
                    required
                  />
                </div>
              ))}
            </div>

            <p className="text-[#FFB51B] text-[11px] mt-2 font-medium">
              🔒 Answers are securely encrypted with bcrypt.
            </p>
          </div>

          <button
            type="submit"
            id="register-btn"
            className="btn-primary w-full mt-4 py-3 text-base sm:text-sm font-bold flex items-center justify-center tracking-wide"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-xs text-[#C4BBD5] mt-2.5">
            By creating an account, you agree to our{' '}
            <Link to="/privacy" className="text-[#A78BFA] hover:underline">
              Privacy Policy &amp; Terms
            </Link>
          </p>
        </form>

        <div className="mt-6 pt-5 border-t border-[#3B3152] text-center">
          <p className="text-xs sm:text-sm text-[#C4BBD5]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#FFB51B] hover:text-[#FFA100] font-bold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
