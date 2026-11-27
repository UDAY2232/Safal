import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  Users,
  Search,
  Copy,
  Check,
  RefreshCw,
  Lock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AdminPasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (msg: string) => void;
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string | null;
  designation?: string | null;
  phone?: string | null;
  isActive: boolean;
  employee?: {
    employeeId: string;
    fullName: string;
    designation: string;
    department: string;
  } | null;
  accountantProfile?: {
    accountantId: string;
  } | null;
}

export const AdminPasswordResetModal: React.FC<AdminPasswordResetModalProps> = ({
  isOpen,
  onClose,
  onNotify,
}) => {
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'SELF' | 'STAFF'>('SELF');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    targetName: string;
    targetEmail: string;
    targetRole: string;
    generatedPass: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Load all users when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessInfo(null);
      setNewPassword('');
      setConfirmPassword('');
      setSearchQuery('');
      setCopied(false);

      if (currentUser?.id) {
        setSelectedUserId(currentUser.id);
      }

      setLoadingUsers(true);
      api
        .getAdminUsers()
        .then((data) => {
          if (Array.isArray(data)) {
            setUsers(data);
          }
        })
        .catch((err) => {
          console.error('Failed to load users for password reset:', err);
          // Fallback to employees if getAdminUsers encounters issue
          api
            .getEmployees()
            .then((empData) => {
              if (Array.isArray(empData)) {
                const mapped: UserItem[] = empData
                  .filter((e) => e.userId || e.user?.id)
                  .map((e) => ({
                    id: e.userId || e.user?.id,
                    name: e.fullName || e.user?.name,
                    email: e.email || e.user?.email,
                    role: e.user?.role || 'EMPLOYEE',
                    department: e.department,
                    designation: e.designation,
                    isActive: e.status === 'ACTIVE',
                    employee: {
                      employeeId: e.employeeId,
                      fullName: e.fullName,
                      designation: e.designation,
                      department: e.department,
                    },
                  }));
                setUsers(mapped);
              }
            })
            .catch(() => {});
        })
        .finally(() => {
          setLoadingUsers(false);
        });
    }
  }, [isOpen, currentUser?.id]);

  // When switching tabs, update selectedUserId
  const handleTabChange = (tab: 'SELF' | 'STAFF') => {
    setActiveTab(tab);
    setErrorMsg(null);
    setSuccessInfo(null);
    if (tab === 'SELF' && currentUser?.id) {
      setSelectedUserId(currentUser.id);
    } else if (tab === 'STAFF') {
      // Pick first non-admin or first staff if available
      const firstStaff = users.find((u) => u.id !== currentUser?.id) || users[0];
      if (firstStaff) {
        setSelectedUserId(firstStaff.id);
      }
    }
  };

  // Filtered staff list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      const empId = (u.employee?.employeeId || u.accountantProfile?.accountantId || '').toLowerCase();
      const desig = (u.designation || u.employee?.designation || '').toLowerCase();
      return (
        name.includes(q) ||
        email.includes(q) ||
        role.includes(q) ||
        empId.includes(q) ||
        desig.includes(q)
      );
    });
  }, [users, searchQuery]);

  // Get currently selected user details
  const targetUser = useMemo(() => {
    if (activeTab === 'SELF') {
      return (
        users.find((u) => u.id === currentUser?.id) || {
          id: currentUser?.id || '',
          name: currentUser?.name || 'Administrator',
          email: currentUser?.email || 'admin@safalexports.com',
          role: 'ADMIN',
          department: 'Executive Management',
          designation: 'Full Administrator',
          isActive: true,
        }
      );
    }
    return users.find((u) => u.id === selectedUserId) || null;
  }, [activeTab, users, currentUser, selectedUserId]);

  // Helper to generate a random strong password
  const generateRandomPassword = () => {
    const prefixes = ['Safal', 'Fruit', 'Admin', 'Kashmir', 'Trade', 'Super'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const symbols = ['@', '#', '$', '!', '&'];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const generated = `${prefix}${symbol}${num}`;

    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNewPassword(true);
    setShowConfirmPassword(true);
    setErrorMsg(null);
  };

  // Copy password to clipboard
  const handleCopyPassword = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessInfo(null);

    const targetId = activeTab === 'SELF' ? currentUser?.id : selectedUserId;
    if (!targetId) {
      setErrorMsg('Please select a user account to reset password.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify both fields.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.resetPassword({
        userId: targetId,
        newPassword: newPassword.trim(),
      });

      const doneName = targetUser?.name || 'User';
      const doneEmail = targetUser?.email || '';
      const doneRole = targetUser?.role || 'STAFF';

      setSuccessInfo({
        targetName: doneName,
        targetEmail: doneEmail,
        targetRole: doneRole,
        generatedPass: newPassword,
      });

      const notifyText = `Password successfully reset for ${doneName} (${doneEmail})`;
      if (onNotify) {
        onNotify(notifyText);
      }

      // Reset form fields
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password reset failed:', err);
      setErrorMsg(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064D2B] via-[#086333] to-[#0A7B3E] text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <KeyRound size={20} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">Admin Password Management</h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black px-2 py-0.5 rounded-full">
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Reset system passwords directly for Administrator or any staff member.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-black/15 hover:bg-black/30 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-5 pt-4 pb-2 bg-gray-50/70 border-b border-gray-100 flex-shrink-0">
          <div className="flex p-1 bg-gray-200/80 rounded-xl max-w-md">
            <button
              type="button"
              onClick={() => handleTabChange('SELF')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'SELF'
                  ? 'bg-white text-[#064D2B] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User size={14} /> My Password (Admin)
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('STAFF')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'STAFF'
                  ? 'bg-white text-[#064D2B] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users size={14} /> Staff / Employee Password
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Success Banner */}
          {successInfo && (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-extrabold text-emerald-900">
                  Password Updated Successfully!
                </h4>
                <p className="text-xs text-emerald-800 mt-1">
                  New password has been set for{' '}
                  <strong className="font-bold text-gray-900">{successInfo.targetName}</strong> (
                  <span className="font-mono text-xs">{successInfo.targetEmail}</span>).
                </p>
                <div className="mt-2.5 flex items-center gap-2 p-2 bg-white rounded-lg border border-emerald-200">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">New Password:</span>
                  <span className="font-mono font-bold text-emerald-800 text-sm tracking-wider select-all">
                    {successInfo.generatedPass}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyPassword(successInfo.generatedPass)}
                    className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded text-xs font-bold transition"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* User Selection Section (Only if STAFF tab) */}
          {activeTab === 'STAFF' && (
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                Select Staff / Employee to Reset
              </label>

              {/* Search Box */}
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search staff by name, email, employee ID or role..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#064D2B] focus:ring-1 focus:ring-[#064D2B] transition outline-hidden"
                />
              </div>

              {/* Staff List Dropdown / Scroll Area */}
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100 bg-white">
                {loadingUsers ? (
                  <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-emerald-700" />
                    <span>Loading users directory...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400">
                    No staff found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUserId === u.id;
                    const roleBadgeColor =
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : u.role === 'ACCOUNTANT'
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200';

                    return (
                      <div
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        className={`p-2.5 flex items-center justify-between cursor-pointer transition text-xs ${
                          isSelected
                            ? 'bg-emerald-50/80 border-l-4 border-l-[#064D2B]'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg font-black text-[11px] flex items-center justify-center uppercase ${
                              isSelected
                                ? 'bg-[#064D2B] text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {(u.name || 'U').charAt(0)}
                          </div>
                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-gray-900 truncate">
                                {u.name}
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${roleBadgeColor}`}
                              >
                                {u.role}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-500 font-mono block truncate">
                              {u.email}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                            <Check size={12} />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Active Target Summary Card */}
          {targetUser && (
            <div className="p-3 bg-gray-50/90 border border-gray-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#064D2B] text-white flex items-center justify-center font-extrabold text-base flex-shrink-0">
                  {(targetUser.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-xs text-gray-900 truncate">
                      {targetUser.name}
                    </h3>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {targetUser.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-mono mt-0.5 truncate">
                    {targetUser.email}
                  </p>
                  {(targetUser.department || targetUser.designation) && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {targetUser.designation || targetUser.department}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                  Verified Identity
                </span>
              </div>
            </div>
          )}

          {/* Password Inputs Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* New Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">
                  New Password <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition cursor-pointer"
                >
                  <Sparkles size={12} className="text-amber-500" /> Generate Secure Password
                </button>
              </div>

              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:border-[#064D2B] focus:ring-1 focus:ring-[#064D2B] transition outline-hidden"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Must be at least 6 characters. Admin authorization overrides current password requirements.
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-1">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <ShieldCheck
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password to confirm"
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-white border border-gray-300 rounded-xl focus:border-[#064D2B] focus:ring-1 focus:ring-[#064D2B] transition outline-hidden"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {newPassword && confirmPassword && (
                <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                  {newPassword === confirmPassword ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <Check size={12} /> Passwords match
                    </span>
                  ) : (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      <X size={12} /> Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={submitting || !newPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#064D2B] hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Updating Password...
                  </>
                ) : (
                  <>
                    <KeyRound size={14} className="text-amber-300" /> Set New Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
