import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Bell,
  Power,
  Save,
  RefreshCw,
  Eye,
  AlertTriangle,
  Wrench,
  Gift,
  Info,
  CheckCircle2,
  Calendar,
  X,
  Sliders,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

const NOTICE_TYPES = [
  { value: 'announcement', label: 'Announcement', icon: Bell, color: 'text-[#FFB51B]' },
  { value: 'maintenance', label: 'Maintenance Alert', icon: Wrench, color: 'text-[#FF762B]' },
  { value: 'offer', label: 'Special Offer', icon: Gift, color: 'text-[#FFB51B]' },
  { value: 'info', label: 'System Update', icon: Info, color: 'text-[#A78BFA]' },
  { value: 'warning', label: 'Security Warning', icon: AlertTriangle, color: 'text-rose-400' }
];

export default function NoticeManager() {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isActive: false,
    type: 'announcement',
    updatedAt: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch current notice configuration from backend
  const fetchNotice = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/notice/admin');
      if (data?.success && data.notice) {
        setFormData({
          title: data.notice.title || '',
          content: data.notice.content || '',
          isActive: Boolean(data.notice.isActive),
          type: data.notice.type || 'announcement',
          updatedAt: data.notice.updatedAt || null
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load notice configuration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotice();
  }, []);

  // Save notice settings
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!formData.title.trim()) return toast.error('Notice title is required');
    if (!formData.content.trim()) return toast.error('Notice content details are required');

    setSaving(true);
    try {
      const { data } = await api.put('/notice/admin', {
        title: formData.title,
        content: formData.content,
        isActive: formData.isActive,
        type: formData.type
      });

      if (data?.success) {
        toast.success(data.message || 'Notice settings saved successfully!');
        if (data.notice) {
          setFormData((prev) => ({
            ...prev,
            updatedAt: data.notice.updatedAt
          }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update notice settings');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status directly
  const handleToggleActive = () => {
    setFormData((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const selectedTypeObj = NOTICE_TYPES.find((t) => t.value === formData.type) || NOTICE_TYPES[0];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 rounded-[22px] bg-gradient-to-br from-[#21183A] via-[#17102D] to-[#2B1254] border border-[#3B3152] shadow-elevated">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 sm:p-3 bg-[#6419D6]/20 border border-[#6419D6]/35 text-[#A78BFA] rounded-xl flex-shrink-0">
            <Bell size={28} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-[10px] font-bold bg-[#FFB51B]/15 text-[#FFB51B] border border-[#FFB51B]/35 uppercase tracking-wider mb-1 font-mono">
              <Sparkles size={12} /> Broadcast Control
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
              Player Notice System
            </h1>
            <p className="text-xs sm:text-sm text-[#C4BBD5] mt-0.5">
              Configure announcements and alerts that automatically display as a popup to players when they login
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchNotice}
            className="btn-secondary text-xs sm:text-sm py-2 px-3 sm:px-4 flex items-center gap-2"
            title="Reload settings"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setPreviewOpen(true)}
            className="btn-secondary text-xs sm:text-sm py-2 px-3 sm:px-4 flex items-center gap-2 text-[#A78BFA]"
            title="Preview Player Modal"
          >
            <Eye size={15} />
            <span>Test Popup</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-12 text-center animate-pulse text-[#C4BBD5] text-sm">
          Loading notice settings...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Left Column: Form & Switch Controls */}
          <div className="lg:col-span-7 space-y-5">
            {/* Setting: Turn ON / Turn OFF Toggle Card */}
            <div className={`card transition-all border-2 ${
              formData.isActive
                ? 'bg-gradient-to-r from-[#21183A] to-[#1F1940] border-[#6419D6]/60 shadow-brand'
                : 'bg-[#21183A] border-[#3B3152]'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-xl border flex-shrink-0 mt-0.5 ${
                    formData.isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/35'
                      : 'bg-[#17102D] text-[#C4BBD5] border-[#3B3152]'
                  }`}>
                    <Power size={22} className={formData.isActive ? 'text-emerald-400' : 'text-gray-500'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-heading font-bold text-white">
                        Notice Display Status
                      </h3>
                      <span className={`px-2.5 py-0.5 rounded-pill text-[11px] font-bold font-mono uppercase tracking-wider border ${
                        formData.isActive
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}>
                        {formData.isActive ? '● ACTIVE (ON)' : '○ INACTIVE (OFF)'}
                      </span>
                    </div>
                    <p className="text-xs text-[#C4BBD5] mt-1 leading-relaxed">
                      {formData.isActive
                        ? 'Broadcasting: When players log in or enter the app, the popup modal will automatically appear.'
                        : 'Disabled: Notice is turned off. No popup will appear for players upon login.'}
                    </p>
                  </div>
                </div>

                {/* Big Interactive Toggle Switch */}
                <button
                  type="button"
                  onClick={handleToggleActive}
                  className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none self-start sm:self-center ${
                    formData.isActive ? 'bg-[#6419D6]' : 'bg-[#17102D] border-[#3B3152]'
                  }`}
                  role="switch"
                  aria-checked={formData.isActive}
                  aria-label="Toggle notice active status"
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      formData.isActive ? 'translate-x-8' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Form Details Card */}
            <form onSubmit={handleSave} className="card space-y-4">
              <div className="flex items-center justify-between border-b border-[#3B3152] pb-3">
                <div className="flex items-center gap-2">
                  <Sliders size={18} className="text-[#A78BFA]" />
                  <h3 className="text-base font-heading font-bold text-white">
                    Notice Content Details
                  </h3>
                </div>
                {formData.updatedAt && (
                  <span className="text-[11px] text-[#C4BBD5] font-mono">
                    Last updated: {format(new Date(formData.updatedAt), 'dd MMM, HH:mm')}
                  </span>
                )}
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#C4BBD5] mb-1.5">
                  Notice Title *
                </label>
                <input
                  type="text"
                  className="input-field text-sm font-semibold"
                  placeholder="e.g. Scheduled System Maintenance"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={100}
                  required
                />
              </div>

              {/* Notice Type Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#C4BBD5] mb-1.5">
                  Category / Badge Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {NOTICE_TYPES.map((type) => {
                    const IconComp = type.icon;
                    const isSelected = formData.type === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: type.value })}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-[#6419D6]/20 border-brand-purple text-white shadow-sm font-bold'
                            : 'bg-[#17102D] border-[#3B3152] text-[#C4BBD5] hover:text-white hover:bg-[#2C214C]'
                        }`}
                      >
                        <IconComp size={15} className={type.color} />
                        <span className="truncate">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Multi-line Message Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#C4BBD5]">
                    Notice Message / Explanation *
                  </label>
                  <span className="text-[11px] text-[#C4BBD5] font-mono">
                    {formData.content.length} characters
                  </span>
                </div>
                <textarea
                  rows={6}
                  className="input-field text-xs sm:text-sm leading-relaxed resize-y"
                  placeholder="Enter detailed notice message for players (multi-line supported)..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                />
                <p className="text-[11px] text-[#C4BBD5] mt-1">
                  Line breaks and paragraphs will be preserved and displayed clearly inside the player popup.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[#3B3152] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-[#C4BBD5]">
                  Status will be saved as: <strong className={formData.isActive ? 'text-emerald-400 font-bold' : 'text-gray-400 font-bold'}>{formData.isActive ? 'TURNED ON' : 'TURNED OFF'}</strong>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary w-full sm:w-auto py-2.5 px-6 text-sm font-bold flex items-center justify-center gap-2 shadow-brand"
                  >
                    {saving ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    <span>{saving ? 'Saving...' : 'Save & Broadcast'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Right Column: Live Player Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="card space-y-3">
              <div className="flex items-center justify-between border-b border-[#3B3152] pb-3">
                <div className="flex items-center gap-2">
                  <Eye size={17} className="text-[#FFB51B]" />
                  <h3 className="text-sm font-heading font-bold text-white">
                    Live Player Popup Preview
                  </h3>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-pill bg-[#17102D] text-[#C4BBD5] border border-[#3B3152] font-mono">
                  Real-time
                </span>
              </div>

              <p className="text-xs text-[#C4BBD5]">
                Here is exactly what players will see on their screen when logging in:
              </p>

              {/* Simulated Popup Card */}
              <div className="relative rounded-[20px] bg-gradient-to-b from-[#21183A] via-[#17102D] to-[#251347] border-2 border-[#6419D6]/60 p-5 shadow-elevated space-y-3.5">
                {/* Simulated Close Button */}
                <div className="absolute top-3.5 right-3.5 p-1 rounded-full bg-[#17102D] border border-[#3B3152] text-[#C4BBD5]">
                  <X size={14} />
                </div>

                {/* Header */}
                <div className="flex items-center gap-2.5">
                  <img
                    src="/potly-logo.png"
                    alt="Potly"
                    className="h-8 w-auto object-contain"
                  />
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-wider font-mono border bg-[#FFB51B]/15 text-[#FFB51B] border-[#FFB51B]/35">
                      <Bell size={11} />
                      <span>{selectedTypeObj.label}</span>
                    </span>
                    <p className="text-[10px] text-[#C4BBD5] font-mono mt-0.5">
                      Just now • Potly Official
                    </p>
                  </div>
                </div>

                {/* Title */}
                <h4 className="text-base sm:text-lg font-heading font-black text-white tracking-tight leading-snug">
                  {formData.title || 'Notice Title Will Appear Here'}
                </h4>

                {/* Content Box */}
                <div className="p-3.5 rounded-xl bg-[#17102D]/90 border border-[#3B3152] text-[#F7F5FC] text-xs leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
                  {formData.content || 'Your detailed notice message for players will be displayed here...'}
                </div>

                {/* Action button */}
                <button
                  type="button"
                  onClick={() => toast('This is a preview of the close button.', { icon: 'ℹ️' })}
                  className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Got it, Close</span>
                </button>
              </div>

              {/* Status Note */}
              <div className="p-3 rounded-xl bg-[#17102D] border border-[#3B3152] flex items-center gap-2 text-xs text-[#C4BBD5]">
                <Info size={16} className="text-[#A78BFA] shrink-0" />
                <span>
                  Setting is currently <strong>{formData.isActive ? 'ON' : 'OFF'}</strong>. Click "Save & Broadcast" to apply changes.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actual Modal Preview if Admin clicks Test Popup */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg mx-auto bg-gradient-to-b from-[#21183A] via-[#17102D] to-[#251347] border-2 border-[#6419D6]/60 rounded-[22px] p-5 sm:p-7 text-left shadow-2xl shadow-[#6419D6]/25 space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setPreviewOpen(false)}
              className="absolute top-4 right-4 text-[#C4BBD5] hover:text-white p-1.5 rounded-full bg-[#17102D] hover:bg-[#2C214C] border border-[#3B3152] transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <img
                src="/potly-logo.png"
                alt="Potly"
                className="h-10 sm:h-12 w-auto object-contain drop-shadow-md"
              />
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-[11px] font-bold uppercase tracking-wider font-mono border bg-[#FFB51B]/15 text-[#FFB51B] border-[#FFB51B]/35">
                  <Bell size={13} />
                  <span>{selectedTypeObj.label}</span>
                </span>
                <p className="text-[11px] text-[#C4BBD5] flex items-center gap-1 mt-1 font-mono">
                  <Calendar size={12} className="text-[#A78BFA]" />
                  <span>Live Preview Mode</span>
                </p>
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight leading-snug pt-1">
              {formData.title || 'Notice Title'}
            </h2>

            <div className="p-4 sm:p-5 rounded-xl bg-[#17102D]/90 border border-[#3B3152] text-[#F7F5FC] text-xs sm:text-sm leading-relaxed max-h-64 overflow-y-auto whitespace-pre-line">
              {formData.content || 'Notice message body...'}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setPreviewOpen(false)}
                className="btn-primary w-full py-3 text-sm font-bold flex items-center justify-center gap-2"
              >
                <span>Got it, Close (Test)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
