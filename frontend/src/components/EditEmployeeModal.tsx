import React, { useState } from 'react';
import { X, UserCheck, ArrowRight, Eye, EyeOff, Lock, Building2, Briefcase, Calendar, Phone, Mail, IndianRupee } from 'lucide-react';
import { api } from '../services/api';
import { Employee } from '../types';

interface EditEmployeeModalProps {
  employee: Employee | any;
  onClose: () => void;
  onSuccess: (updatedEmployee: any, msg: string) => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  employee,
  onClose,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState(employee.fullName || '');
  const [email, setEmail] = useState(employee.email || '');
  const [phone, setPhone] = useState(employee.phone || '');
  const [department, setDepartment] = useState(employee.department || 'Procurement');
  const [designation, setDesignation] = useState(employee.designation || '');
  const [wageType, setWageType] = useState<'MONTHLY' | 'DAILY' | 'HOURLY'>(
    employee.wageType || 'MONTHLY'
  );
  const [baseWageRate, setBaseWageRate] = useState(
    employee.baseWageRate !== undefined ? String(employee.baseWageRate) : ''
  );
  const [status, setStatus] = useState<string>(employee.status || 'ACTIVE');
  const [joiningDate, setJoiningDate] = useState<string>(
    employee.joiningDate
      ? new Date(employee.joiningDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || baseWageRate === '') {
      setError('Full name, email, and base wage rate are required');
      return;
    }
    if (password && password.trim().length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const updated = await api.updateEmployee(employee.id, {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        department,
        designation: designation.trim(),
        wageType,
        baseWageRate: Number(baseWageRate),
        status,
        joiningDate: joiningDate ? new Date(joiningDate).toISOString() : undefined,
        password: password.trim() ? password.trim() : undefined,
      });

      onSuccess(updated, `Employee ${employee.employeeId} (${fullName}) updated successfully!`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update employee details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form onSubmit={handleSubmit} className="modal !w-[600px] max-w-[95vw] p-6 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="modal-header pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="eyebrow flex items-center gap-1 text-emerald-800 font-bold">
                <UserCheck size={14} /> EMPLOYEE MANAGEMENT
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-[#087A3E] text-[11px] font-black">
                {employee.employeeId}
              </span>
            </div>
            <h2 className="text-xl font-black text-gray-900 mt-1">
              Edit Employee Details
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="my-2 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex-shrink-0">
            {error}
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto flex-1 py-3 space-y-3.5 text-xs pr-1">
          {/* Full Name */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">
              Full Legal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#087A3E]"
              required
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                <Mail size={12} className="text-gray-400" /> Official Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@safal.com"
                className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#087A3E]"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                <Phone size={12} className="text-gray-400" /> Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#087A3E]"
              />
            </div>
          </div>

          {/* Department & Designation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                <Building2 size={12} className="text-gray-400" /> Department <span className="text-red-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-9 px-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:border-[#087A3E]"
              >
                <option value="Procurement">Procurement</option>
                <option value="Quality Control">Quality Control</option>
                <option value="Logistics">Logistics</option>
                <option value="Operations">Operations</option>
                <option value="Accounts & Finance">Accounts &amp; Finance</option>
                <option value="Cold Storage Facility">Cold Storage Facility</option>
                <option value="Management">Management</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                <Briefcase size={12} className="text-gray-400" /> Designation <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Field Officer, Field Buyer"
                className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#087A3E]"
                required
              />
            </div>
          </div>

          {/* Wage Type & Base Wage Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Wage / Salary Structure <span className="text-red-500">*</span>
              </label>
              <select
                value={wageType}
                onChange={(e) => setWageType(e.target.value as any)}
                className="w-full h-9 px-2.5 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:border-[#087A3E]"
              >
                <option value="MONTHLY">Monthly Salary</option>
                <option value="DAILY">Daily Wages</option>
                <option value="HOURLY">Hourly Wages</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                <IndianRupee size={12} className="text-gray-400" /> Base Wage Rate (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={baseWageRate}
                onChange={(e) => setBaseWageRate(e.target.value)}
                placeholder="25000"
                className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-[#087A3E]"
                required
              />
            </div>
          </div>

          {/* Status & Joining Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1">
                Employment Status <span className="text-red-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={`w-full h-9 px-2.5 border rounded-xl text-xs font-bold bg-white focus:outline-none ${
                  status === 'ACTIVE'
                    ? 'border-emerald-300 text-emerald-800'
                    : 'border-red-300 text-red-800'
                }`}
              >
                <option value="ACTIVE">ACTIVE (Active Employee)</option>
                <option value="INACTIVE">INACTIVE (Inactive / Suspended)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-gray-400" /> Joining Date
              </label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#087A3E]"
              />
            </div>
          </div>

          {/* Reset Login Password (Optional) */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-gray-700 font-bold flex items-center gap-1.5">
                <Lock size={13} className="text-emerald-700" /> Reset Portal Login Password
              </label>
              <span className="text-[10px] text-gray-400">Optional</span>
            </div>
            <p className="text-[11px] text-gray-500">
              Leave this field empty to keep their current password unchanged. Enter a new password (min 6 characters) only if the employee forgot their password.
            </p>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new login password (optional)"
                minLength={6}
                className="w-full h-9 pl-3 pr-8 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
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

        {/* Modal Actions */}
        <div className="modal-actions pt-3 border-t border-gray-100 flex justify-end gap-2.5 flex-shrink-0">
          <button
            type="button"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 transition"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold text-xs shadow-md inline-flex items-center gap-1.5 transition disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving Changes...' : 'Save Changes'} <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};
