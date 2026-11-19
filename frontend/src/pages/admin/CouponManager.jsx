import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Plus, Trash2, ToggleLeft, ToggleRight, Ticket, Search, User, Globe } from 'lucide-react';
import { format } from 'date-fns';

const DEFAULT_FORM = {
  code: '',
  value: '',
  description: '',
  totalUsesAllowed: '',
  maxUsesPerUser: '1',
  expiryDate: '',
  targetUser: ''
};

export default function CouponManager() {
  const [coupons, setCoupons] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  const fetchCoupons = async () => {
    try {
      const { data } = await api.get(`/coupons?search=${search}`);
      setCoupons(data.coupons || []);
    } catch {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/admin/users?limit=200');
      if (data?.users) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error('Failed to load users list for coupon targeting:', err);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        value: Number(form.value),
        totalUsesAllowed: Number(form.totalUsesAllowed),
        maxUsesPerUser: Number(form.maxUsesPerUser),
        targetUser: form.targetUser ? form.targetUser : null
      };

      const { data } = await api.post('/coupons', payload);
      toast.success(`Coupon ${data.coupon.code} created!`);
      setCoupons((prev) => [data.coupon, ...prev]);
      setForm(DEFAULT_FORM);
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const { data } = await api.patch(`/coupons/${id}/toggle`);
      setCoupons((prev) => prev.map((c) => (c._id === id ? data.coupon : c)));
      toast.success(data.message);
    } catch {
      toast.error('Failed to toggle coupon');
    }
  };

  const handleDelete = async (id, code) => {
    if (!window.confirm(`Delete coupon ${code}? This cannot be undone.`)) return;
    try {
      await api.delete(`/coupons/${id}`);
      setCoupons((prev) => prev.filter((c) => c._id !== id));
      toast.success('Coupon deleted');
    } catch {
      toast.error('Failed to delete coupon');
    }
  };

  const isExpired = (date) => new Date() > new Date(date);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-heading font-black flex items-center gap-2.5 text-white">
          <Ticket size={28} className="text-[#A78BFA] flex-shrink-0" />
          <span>Potly Coupon Manager</span>
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary self-start sm:self-auto flex items-center gap-2 text-xs sm:text-sm py-2 px-3.5 sm:px-4"
        >
          <Plus size={18} />
          <span>{showForm ? 'Cancel' : 'New Coupon'}</span>
        </button>
      </div>

      {showForm && (
        <div className="card border-[#3B3152] bg-[#21183A] shadow-elevated p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-heading font-bold text-white mb-4 sm:mb-6">Create New Coupon</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Code Name *
              </label>
              <input
                className="input-field uppercase font-mono tracking-wider text-sm"
                placeholder="WELCOME500"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                maxLength={20}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Value (₹) *
              </label>
              <input
                type="number"
                className="input-field font-mono text-sm"
                placeholder="500"
                value={form.value}
                onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                min={1}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Expiry Date *
              </label>
              <input
                type="datetime-local"
                className="input-field text-xs text-gray-200"
                value={form.expiryDate}
                onChange={(e) => setForm((p) => ({ ...p, expiryDate: e.target.value }))}
                min={new Date().toISOString().slice(0, 16)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Total Uses Allowed *
              </label>
              <input
                type="number"
                className="input-field font-mono text-sm"
                placeholder="100"
                value={form.totalUsesAllowed}
                onChange={(e) => setForm((p) => ({ ...p, totalUsesAllowed: e.target.value }))}
                min={1}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Max Uses Per User
              </label>
              <input
                type="number"
                className="input-field font-mono text-sm"
                placeholder="1"
                value={form.maxUsesPerUser}
                onChange={(e) => setForm((p) => ({ ...p, maxUsesPerUser: e.target.value }))}
                min={1}
              />
            </div>

            {/* Target User Dropdown */}
            <div className="sm:col-span-2 md:col-span-1">
              <label className="block text-xs font-medium text-gray-300 mb-1 flex items-center justify-between">
                <span>Target User (Optional)</span>
                <span className="text-[10px] text-gray-400 font-normal">
                  Public for all
                </span>
              </label>
              <select
                className="input-field text-xs sm:text-sm"
                value={form.targetUser}
                onChange={(e) => setForm((p) => ({ ...p, targetUser: e.target.value }))}
              >
                <option value="">All Users (Public)</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    @{u.username} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 md:col-span-2">
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Description
              </label>
              <input
                className="input-field text-sm"
                placeholder="Welcome bonus for new users"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                maxLength={200}
              />
            </div>

            <div className="flex items-end sm:col-span-2 md:col-span-1">
              <button
                type="submit"
                className="btn-primary w-full text-xs sm:text-sm py-2.5 sm:py-2"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create Coupon'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="input-field pl-10 text-xs sm:text-sm"
          placeholder="Search by coupon code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden p-0 border border-gray-800">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <table className="w-full text-xs sm:text-sm min-w-[760px]">
            <thead className="bg-gray-800">
              <tr className="text-left text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-3 sm:p-4">Code</th>
                <th className="p-3 sm:p-4">Value</th>
                <th className="p-3 sm:p-4">Target User</th>
                <th className="p-3 sm:p-4">Description</th>
                <th className="p-3 sm:p-4">Usage</th>
                <th className="p-3 sm:p-4">Per User</th>
                <th className="p-3 sm:p-4">Expiry</th>
                <th className="p-3 sm:p-4">Status</th>
                <th className="p-3 sm:p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    Loading coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500">
                    No coupons found. Create one above!
                  </td>
                </tr>
              ) : (
                coupons.map((c) => {
                  const expired = isExpired(c.expiryDate);
                  const exhausted = c.timesUsed >= c.totalUsesAllowed;
                  const statusLabel = !c.isActive
                    ? 'Inactive'
                    : expired
                    ? 'Expired'
                    : exhausted
                    ? 'Exhausted'
                    : 'Active';
                  const statusColor = !c.isActive
                    ? 'bg-gray-700 text-gray-300'
                    : expired || exhausted
                    ? 'bg-red-900 text-red-300'
                    : 'bg-green-900 text-green-300';

                  const targetUsername =
                    c.targetUser && typeof c.targetUser === 'object'
                      ? c.targetUser.username
                      : null;

                  return (
                    <tr key={c._id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="p-3 sm:p-4 font-mono font-bold text-blue-300">{c.code}</td>
                      <td className="p-3 sm:p-4 text-green-400 font-semibold font-mono">₹{c.value}</td>
                      <td className="p-3 sm:p-4">
                        {targetUsername ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-900/60 text-purple-300 border border-purple-700/40">
                            <User size={11} />
                            <span>@{targetUsername}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700/60">
                            <Globe size={11} />
                            <span>All Users</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 sm:p-4 text-gray-400 max-w-xs truncate">{c.description || '—'}</td>
                      <td className="p-3 sm:p-4">
                        <span className="font-mono">
                          {c.timesUsed}/{c.totalUsesAllowed}
                        </span>
                        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(100, (c.timesUsed / c.totalUsesAllowed) * 100)}%`
                            }}
                          />
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-center font-mono">{c.maxUsesPerUser}</td>
                      <td className="p-3 sm:p-4 text-gray-400 whitespace-nowrap">
                        {format(new Date(c.expiryDate), 'dd MMM yy')}
                        {expired && <span className="ml-1 text-red-400 text-xs">(expired)</span>}
                      </td>
                      <td className="p-3 sm:p-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggle(c._id)}
                            className={`hover:scale-110 transition-transform ${
                              c.isActive ? 'text-green-400' : 'text-gray-500'
                            }`}
                            title={c.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {c.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                          </button>
                          <button
                            onClick={() => handleDelete(c._id, c.code)}
                            className="text-gray-500 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
