import React, { useState, useEffect } from 'react';
import { Send, X, AlertCircle, CheckCircle2, Users, User, Megaphone } from 'lucide-react';
import { api } from '../services/api';

interface SendNoticeModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const SendNoticeModal: React.FC<SendNoticeModalProps> = ({ onClose, onSuccess }) => {
  const [target, setTarget] = useState<'EMPLOYEES' | 'ALL' | 'USER'>('EMPLOYEES');
  const [targetUserId, setTargetUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'INFO' | 'ACTION_REQUIRED' | 'WARNING' | 'SUCCESS'>('INFO');
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Fetch employees for direct targeting
    api.getEmployees()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.employees || [];
        setEmployees(list.filter((e: any) => e.userId));
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide a notice subject or title');
      return;
    }
    if (!message.trim()) {
      setError('Please write your notice message');
      return;
    }
    if (target === 'USER' && !targetUserId) {
      setError('Please select an employee recipient');
      return;
    }

    try {
      setLoading(true);
      await api.sendNotice({
        target,
        targetUserId: target === 'USER' ? targetUserId : undefined,
        title: title.trim(),
        message: message.trim(),
        type,
      });

      setSuccess('Notice dispatched successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to dispatch notice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#064D2B] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10">
              <Megaphone size={18} className="text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">Send Official Notice / Announcement</h2>
              <p className="text-xs text-emerald-100">Dispatches instantly to employee notification bells</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Target Audience
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTarget('EMPLOYEES')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  target === 'EMPLOYEES'
                    ? 'bg-emerald-50 text-[#064D2B] border-emerald-500 shadow-xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Users size={14} /> All Employees
              </button>
              <button
                type="button"
                onClick={() => setTarget('ALL')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  target === 'ALL'
                    ? 'bg-emerald-50 text-[#064D2B] border-emerald-500 shadow-xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Megaphone size={14} /> Everyone
              </button>
              <button
                type="button"
                onClick={() => setTarget('USER')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  target === 'USER'
                    ? 'bg-emerald-50 text-[#064D2B] border-emerald-500 shadow-xs'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <User size={14} /> Specific Person
              </button>
            </div>
          </div>

          {/* Individual Recipient Dropdown (if target === 'USER') */}
          {target === 'USER' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Select Employee *
              </label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
                required
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.userId}>
                    {emp.fullName} ({emp.employeeId} · {emp.department} - {emp.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Type / Severity */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Notice Type / Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'INFO', label: 'Info' },
                { value: 'ACTION_REQUIRED', label: 'Action Req.' },
                { value: 'WARNING', label: 'Alert' },
                { value: 'SUCCESS', label: 'Success' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.value}
                  onClick={() => setType(item.value as any)}
                  className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold text-center transition ${
                    type === item.value
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject / Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Notice Subject / Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Office shift schedule reminder or PO notes required"
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              maxLength={120}
              required
            />
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Notice Message *
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your official announcement or directive here..."
              rows={4}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
              maxLength={500}
              required
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className="px-5 py-2 text-xs font-bold text-white bg-[#087A3E] hover:bg-[#066131] rounded-xl transition shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Send size={13} />
              <span>{loading ? 'Sending...' : 'Dispatch Notice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
