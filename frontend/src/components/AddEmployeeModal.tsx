import React, { useState } from 'react';
import { X, Users, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';
import { api } from '../services/api';

interface AddEmployeeModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ onClose, onSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Procurement');
  const [designation, setDesignation] = useState('Field Officer');
  const [wageType, setWageType] = useState<'MONTHLY' | 'DAILY' | 'HOURLY'>('MONTHLY');
  const [baseWageRate, setBaseWageRate] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !baseWageRate) {
      setError('Full name, email, and wage rate are required');
      return;
    }
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await api.createEmployee({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        department,
        designation,
        wageType,
        baseWageRate: Number(baseWageRate),
        password: password.trim() || undefined,
      });

      onSuccess(`Employee "${fullName}" added successfully with portal credentials`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form onSubmit={handleSubmit} className="modal !w-[540px] max-w-[94vw] p-6">
        <div className="modal-header pb-3 border-b border-gray-100">
          <div>
            <span className="eyebrow flex items-center gap-1 text-emerald-700 font-bold">
              <Users size={14} /> EMPLOYEE ONBOARDING
            </span>
            <h2 className="text-lg font-bold text-gray-900 mt-1">Add Company Employee</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {error && <div className="my-2 p-2 bg-red-50 text-red-700 rounded text-xs">{error}</div>}

        <div className="py-3 space-y-3 text-xs">
          <div>
            <label className="block text-gray-700 font-semibold mb-1">Full Legal Name *</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Official Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@safal.com"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1 flex items-center justify-between">
                <span>Login Password *</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Min 6 chars</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="e.g. Safal@2026"
                  className="w-full h-9 pl-2.5 pr-8 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-950 focus:border-emerald-600 focus:outline-none bg-emerald-50/20"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Contact Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98..."
              className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Department *</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-9 px-2 border border-gray-300 rounded-lg text-xs"
              >
                <option value="Procurement">Procurement</option>
                <option value="Finance & Accounts">Finance &amp; Accounts</option>
                <option value="Logistics">Logistics</option>
                <option value="Operations">Operations</option>
                <option value="Quality Control">Quality Control</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Designation *</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Field Buyer, QC Lead"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Wage / Salary Type *</label>
              <select
                value={wageType}
                onChange={(e) => setWageType(e.target.value as any)}
                className="w-full h-9 px-2 border border-gray-300 rounded-lg text-xs"
              >
                <option value="MONTHLY">Monthly Salary</option>
                <option value="DAILY">Daily Wages</option>
                <option value="HOURLY">Hourly Wages</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Base Wage / Salary Rate (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={baseWageRate}
                onChange={(e) => setBaseWageRate(e.target.value)}
                placeholder="45000"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-900"
                required
              />
            </div>
          </div>
        </div>

        <div className="modal-actions pt-3 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" className="secondary-button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            Create Employee <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};

