import React, { useState, useEffect } from 'react';
import { X, Upload, ReceiptIndianRupee, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Employee } from '../types';

interface SubmitExpenseModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const CATEGORIES = [
  'Official Travel',
  'Fuel & Transportation',
  'Food during official travel',
  'Accommodation',
  'Client Meetings',
  'Loading / Unloading Labor',
  'Office Supplies',
  'Packaging Material',
  'Other Approved Expenses',
];

export const SubmitExpenseModal: React.FC<SubmitExpenseModalProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [businessPurpose, setBusinessPurpose] = useState('');
  const [travelFrom, setTravelFrom] = useState('');
  const [travelTo, setTravelTo] = useState('');
  const [amountSpent, setAmountSpent] = useState('');
  const [paymentMethodUsed, setPaymentMethodUsed] = useState('Personal Account / UPI');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEmployee = user?.role === 'EMPLOYEE';

  useEffect(() => {
    async function loadEmployees() {
      if (!isEmployee) {
        try {
          const res = await api.getEmployees();
          setEmployees(res.employees || []);
          if (res.employees?.length > 0) {
            setSelectedEmployeeId(res.employees[0].id);
          }
        } catch {}
      } else if (user?.employee) {
        setSelectedEmployeeId(user.employee.id);
      }
    }
    loadEmployees();
  }, [isEmployee, user]);

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean) => {
    e.preventDefault();
    if (!amountSpent || Number(amountSpent) <= 0) {
      setError('Please enter a valid spending amount');
      return;
    }
    if (!businessPurpose) {
      setError('Business purpose is required for company spending compliance');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const formData = new FormData();
      if (!isEmployee && selectedEmployeeId) {
        formData.append('employeeId', selectedEmployeeId);
      }
      formData.append('expenseDate', expenseDate);
      formData.append('category', category);
      formData.append('description', description || category);
      formData.append('businessPurpose', businessPurpose);
      formData.append('travelFrom', travelFrom);
      formData.append('travelTo', travelTo);
      formData.append('amountSpent', amountSpent);
      formData.append('paymentMethodUsed', paymentMethodUsed);
      formData.append('status', isDraft ? 'DRAFT' : 'SUBMITTED');

      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      await api.submitExpense(formData);
      onSuccess(isDraft ? 'Expense claim saved as draft' : 'Expense claim submitted for review');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit expense claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal !w-[680px] max-w-[96vw] max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <div className="modal-header pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <span className="eyebrow flex items-center gap-1 text-emerald-700 font-bold">
              <ReceiptIndianRupee size={14} /> REIMBURSEMENT CLAIM
            </span>
            <h2 className="text-xl font-bold text-gray-900 mt-1">Submit Employee Expense</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {error && <div className="my-2 p-2 bg-red-50 text-red-700 rounded text-xs">{error}</div>}

        <div className="overflow-y-auto flex-1 py-3 pr-1 space-y-3 text-xs">
          {!isEmployee && (
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Claimant Employee *</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full h-9 px-2 border border-gray-300 rounded-lg text-xs"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName} ({e.employeeId} - {e.department})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Expense Date *</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full h-9 px-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Expense Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-9 px-2 border border-gray-300 rounded-lg text-xs"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Amount Spent (₹) *</label>
              <input
                type="number"
                min="1"
                step="any"
                value={amountSpent}
                onChange={(e) => setAmountSpent(e.target.value)}
                placeholder="0.00"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Travel From (Optional)</label>
              <input
                type="text"
                value={travelFrom}
                onChange={(e) => setTravelFrom(e.target.value)}
                placeholder="Origin location"
                className="w-full h-9 px-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Travel To (Optional)</label>
              <input
                type="text"
                value={travelTo}
                onChange={(e) => setTravelTo(e.target.value)}
                placeholder="Destination location"
                className="w-full h-9 px-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Business Purpose &amp; Justification *</label>
            <textarea
              rows={2}
              value={businessPurpose}
              onChange={(e) => setBusinessPurpose(e.target.value)}
              placeholder="Why was this expense necessary for SAFAL operations?"
              className="w-full p-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Upload Bill or Receipt Attachment</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
              <span className="text-[11px] text-gray-400">PDF, JPG, PNG up to 10MB</span>
            </div>
          </div>
        </div>

        <div className="modal-actions pt-3 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
          <button type="button" className="secondary-button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            type="button"
            className="secondary-button !border-emerald-700 !text-emerald-800"
            onClick={(e) => handleSubmit(e, true)}
            disabled={isSubmitting}
          >
            Save Draft
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={(e) => handleSubmit(e, false)}
            disabled={isSubmitting}
          >
            Submit Claim <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

