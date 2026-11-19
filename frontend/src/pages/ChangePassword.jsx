import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { KeyRound, ShieldCheck, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const QUESTION_OPTIONS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "In what city were you born?",
  "What was the name of your first elementary school?",
  "What is your favorite food?",
  "What was the model of your first car?"
];

export default function ChangePassword() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [verifyMode, setVerifyMode] = useState('current_password'); // 'current_password' | 'security_questions'
  const [currentPassword, setCurrentPassword] = useState('');
  const [securityAnswers, setSecurityAnswers] = useState(['', '', '']);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Optional: update 3 security questions
  const [updateQuestions, setUpdateQuestions] = useState(false);
  const [customQuestions, setCustomQuestions] = useState([
    { question: QUESTION_OPTIONS[0], answer: '' },
    { question: QUESTION_OPTIONS[1], answer: '' },
    { question: QUESTION_OPTIONS[2], answer: '' }
  ]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (verifyMode === 'current_password' && !currentPassword) {
      return setError('Please enter your current password.');
    }

    if (verifyMode === 'security_questions' && securityAnswers.some((a) => !a.trim())) {
      return setError('Please answer all 3 security questions.');
    }

    if (newPassword.length < 6) {
      return setError('New password must be at least 6 characters.');
    }

    if (newPassword !== confirmPassword) {
      return setError('New passwords do not match.');
    }

    if (updateQuestions) {
      if (customQuestions.some((q) => !q.answer.trim())) {
        return setError('Please provide answers for all 3 updated security questions.');
      }
    }

    setLoading(true);
    try {
      const payload = {
        newPassword
      };

      if (verifyMode === 'current_password') {
        payload.currentPassword = currentPassword;
      } else {
        payload.answers = customQuestions.map((q, i) => ({
          question: q.question,
          answer: securityAnswers[i]
        }));
      }

      if (updateQuestions) {
        payload.newSecurityQuestions = customQuestions;
      }

      const { data } = await api.post('/auth/change-password', payload);
      toast.success(data.message || 'Password changed successfully! Please sign in again.');
      logout();
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="card w-full max-w-lg mx-auto shadow-elevated">
        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="/potly-logo.png"
            alt="Potly"
            className="h-14 sm:h-16 w-auto mx-auto mb-2.5 object-contain drop-shadow-md"
          />
          <h1 className="text-xl sm:text-2xl font-heading font-black text-white">
            Change Account Password
          </h1>
          <p className="text-xs text-[#C4BBD5] mt-1">
            Update your account credentials and personal security recovery questions
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-control bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Verification Mode Selector */}
        <div className="flex rounded-xl bg-[#17102D] p-1 border border-[#3B3152] mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setVerifyMode('current_password'); setError(''); }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              verifyMode === 'current_password'
                ? 'bg-[#6419D6] text-white shadow-brand'
                : 'text-[#C4BBD5] hover:text-white'
            }`}
          >
            <KeyRound size={14} />
            <span>Use Current Password</span>
          </button>
          <button
            type="button"
            onClick={() => { setVerifyMode('security_questions'); setError(''); }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              verifyMode === 'security_questions'
                ? 'bg-[#6419D6] text-white shadow-brand'
                : 'text-[#C4BBD5] hover:text-white'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Use Security Questions</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Option 1: Current Password */}
          {verifyMode === 'current_password' ? (
            <div>
              <label className="text-xs sm:text-sm font-medium text-[#C4BBD5] mb-1.5 block">
                Current Password *
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Enter current password (e.g. admin123)"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
          ) : (
            /* Option 2: Verify with 3 Security Questions */
            <div className="space-y-3 p-3.5 rounded-xl bg-[#17102D] border border-[#3B3152]">
              <p className="text-xs font-semibold text-[#FFB51B] flex items-center gap-1.5">
                <HelpCircle size={14} />
                <span>Verify Existing Security Answers</span>
              </p>
              {customQuestions.map((q, i) => (
                <div key={i}>
                  <label className="text-[11px] text-[#C4BBD5] mb-1 block">
                    {i + 1}. {q.question}
                  </label>
                  <input
                    type="password"
                    placeholder="Your answer"
                    className="input-field text-sm"
                    value={securityAnswers[i]}
                    onChange={(e) => {
                      const updated = [...securityAnswers];
                      updated[i] = e.target.value;
                      setSecurityAnswers(updated);
                    }}
                    required
                  />
                </div>
              ))}
            </div>
          )}

          {/* New Password & Confirm */}
          <div className="pt-2 border-t border-[#3B3152] space-y-3">
            <div>
              <label className="text-xs sm:text-sm font-medium text-[#C4BBD5] mb-1.5 block">
                New Password *
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="text-xs sm:text-sm font-medium text-[#C4BBD5] mb-1.5 block">
                Confirm New Password *
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          {/* Optional: Update Personal Security Questions */}
          <div className="pt-2 border-t border-[#3B3152]">
            <button
              type="button"
              onClick={() => setUpdateQuestions(!updateQuestions)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-[#17102D] hover:bg-[#21183A] border border-[#3B3152] text-xs font-semibold text-[#FFB51B] transition-colors"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck size={16} />
                <span>{updateQuestions ? 'Updating Security Questions' : 'Also Update My 3 Security Questions'}</span>
              </span>
              {updateQuestions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {updateQuestions && (
              <div className="mt-3 space-y-3 p-3.5 rounded-xl bg-[#17102D]/90 border border-[#3B3152]">
                <p className="text-[11px] text-[#C4BBD5]">
                  Set your own 3 questions and answers. These will be securely hashed with bcrypt for future account recovery.
                </p>

                {customQuestions.map((q, i) => (
                  <div key={i} className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#A78BFA] block">
                      Question {i + 1}
                    </label>
                    <select
                      className="input-field text-xs py-2"
                      value={q.question}
                      onChange={(e) => {
                        const updated = [...customQuestions];
                        updated[i].question = e.target.value;
                        setCustomQuestions(updated);
                      }}
                    >
                      {QUESTION_OPTIONS.map((opt, idx) => (
                        <option key={idx} value={opt} className="bg-[#17102D] text-white">
                          {opt}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Your secret answer (case-insensitive)"
                      className="input-field text-xs"
                      value={q.answer}
                      onChange={(e) => {
                        const updated = [...customQuestions];
                        updated[i].answer = e.target.value;
                        setCustomQuestions(updated);
                      }}
                      required={updateQuestions}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 py-2.5 text-sm font-bold"
            >
              {loading ? 'Updating Password...' : 'Save & Update Password'}
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
