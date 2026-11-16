import React, { useState } from 'react';
import { X, BriefcaseBusiness, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface AddAccountantModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const AddAccountantModal: React.FC<AddAccountantModalProps> = ({ onClose, onSuccess }) => {
  const [accountantId, setAccountantId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Finance & Accounts');
  const [designation, setDesignation] = useState('Accountant');

  // Granular Permissions
  const [canCreatePO, setCanCreatePO] = useState(true);
  const [canSubmitPO, setCanSubmitPO] = useState(true);
  const [canReviewExpenses, setCanReviewExpenses] = useState(true);
  const [canViewWages, setCanViewWages] = useState(false);
  const [canRecordPayments, setCanRecordPayments] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !accountantId.trim()) {
      setError('Name, official email, password, and Accountant ID are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await api.createAccountant({
        accountantId: accountantId.trim().toUpperCase(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || null,
        department,
        designation,
        canCreatePO,
        canSubmitPO,
        canReviewExpenses,
        canViewWages,
        canRecordPayments,
      });

      onSuccess(`Accountant account for "${name}" created successfully`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create accountant');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form onSubmit={handleSubmit} className="modal !w-[580px] max-w-[94vw] p-6">
        <div className="modal-header pb-3 border-b border-gray-100">
          <div>
            <span className="eyebrow flex items-center gap-1 text-emerald-700 font-bold">
              <BriefcaseBusiness size={14} /> ACCOUNTANT ACCESS PROVISIONING
            </span>
            <h2 className="text-lg font-bold text-gray-900 mt-1">Create Accountant Account</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {error && <div className="my-2 p-2 bg-red-50 text-red-700 rounded text-xs">{error}</div>}

        <div className="py-3 space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Accountant ID *</label>
              <input
                type="text"
                value={accountantId}
                onChange={(e) => setAccountantId(e.target.value)}
                placeholder="e.g. ACC-003"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-mono uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Accountant full name"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Official Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="accountant@safal.com"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Initial Password *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Secure temporary password"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91..."
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Granular Permissions Section */}
          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
            <span className="font-bold text-gray-800 block mb-2 text-xs flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-700" /> Assigned Permissions
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canCreatePO}
                  onChange={(e) => setCanCreatePO(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Create Purchase Orders</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canSubmitPO}
                  onChange={(e) => setCanSubmitPO(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Submit PO for Approval</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canReviewExpenses}
                  onChange={(e) => setCanReviewExpenses(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Review Expense Claims</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canViewWages}
                  onChange={(e) => setCanViewWages(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>View Confidential Wages</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={canRecordPayments}
                  onChange={(e) => setCanRecordPayments(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Record Bill Payments</span>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-actions pt-3 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" className="secondary-button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            Provision Accountant <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};

