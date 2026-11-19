import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the name of the city where you were born?"
];

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [answers, setAnswers] = useState(['', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', {
        email,
        answers: SECURITY_QUESTIONS.map((q, i) => ({ question: q, answer: answers[i] }))
      });
      setResetToken(data.resetToken);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Check your email and answers.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { resetToken, newPassword });
      setSuccess(data.message || 'Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="card w-full max-w-md mx-auto shadow-elevated">
        <div className="text-center mb-6">
          <img
            src="/potly-logo.png"
            alt="Potly"
            className="h-14 sm:h-16 w-auto mx-auto mb-2.5 object-contain drop-shadow-md"
          />
          <h1 className="text-xl sm:text-2xl font-heading font-black text-white">
            {step === 1 ? 'Account Recovery' : 'Create New Password'}
          </h1>
          <p className="text-xs text-[#C4BBD5] mt-1">
            {step === 1
              ? 'Answer your 3 security questions to reset your password'
              : 'Enter and confirm your new secure password'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-control bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-control bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm">
            {success}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleVerify} className="space-y-3.5">
            <div>
              <label className="text-xs sm:text-sm font-medium text-[#C4BBD5] mb-1 block">Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="player@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {SECURITY_QUESTIONS.map((question, i) => (
              <div key={i}>
                <label className="text-xs text-[#C4BBD5] mb-1 block">
                  {i + 1}. {question}
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  placeholder="Your answer (case-insensitive)"
                  className="input-field text-sm"
                  value={answers[i]}
                  onChange={(e) => {
                    const updated = [...answers];
                    updated[i] = e.target.value;
                    setAnswers(updated);
                  }}
                  required
                />
              </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-3">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 py-2.5 text-sm font-bold"
              >
                {loading ? 'Verifying...' : 'Verify Identity'}
              </button>
              <Link
                to="/login"
                className="btn-secondary text-center py-2.5 text-sm font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-3.5">
            <div>
              <label className="text-xs sm:text-sm font-medium text-[#C4BBD5] mb-1 block">New Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="text-xs sm:text-sm font-medium text-[#C4BBD5] mb-1 block">Confirm New Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-3">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 py-2.5 text-sm font-bold"
              >
                {loading ? 'Updating...' : 'Set New Password'}
              </button>
              <Link
                to="/login"
                className="btn-secondary text-center py-2.5 text-sm font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
