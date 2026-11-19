import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What was the name of the city where you were born?"
];

export default function ChangePassword() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [answers, setAnswers] = useState(['', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (answers.some((a) => !a.trim())) return setError('Please answer all security questions');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    if (newPassword.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        answers: SECURITY_QUESTIONS.map((q, i) => ({ question: q, answer: answers[i] })),
        newPassword
      });
      toast.success('Password changed successfully! Please sign in again.');
      logout();
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
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
            Change Password
          </h1>
          <p className="text-xs text-[#C4BBD5] mt-1">
            Verify your security questions to set a new password
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-control bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
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

          <div className="pt-2 border-t border-[#3B3152]">
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
              {loading ? 'Updating...' : 'Update Password'}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
