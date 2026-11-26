import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  ReceiptIndianRupee,
  ArrowRight,
  Camera,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Employee } from '../types';
import { compressImageFile } from '../utils/imageUtils';

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
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (rawFile: File | null) => {
    if (!rawFile) {
      setReceiptFile(null);
      setReceiptPreview(null);
      return;
    }
    const file = await compressImageFile(rawFile);
    setReceiptFile(file);
    setError('');
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setReceiptPreview(url);
    } else {
      setReceiptPreview(null);
    }
  };

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
    // STRICT MANDATORY RECEIPT VALIDATION:
    if (!isDraft && !receiptFile) {
      setError('Receipt / Bill image is strictly mandatory! Please take a photo or upload your bill/receipt before submitting.');
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

          {/* Mandatory Bill/Receipt Image Upload Section */}
          <div className="p-3.5 bg-emerald-50/40 border-2 border-dashed border-emerald-300 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-gray-800 font-extrabold flex items-center gap-1.5 text-xs">
                <FileText size={14} className="text-emerald-700" />
                Upload Bill or Receipt Attachment *
              </label>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300 flex items-center gap-1">
                <AlertCircle size={10} /> Mandatory
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Clear photo or PDF receipt of original tax invoice, toll/fuel bill, or travel ticket. Claims without proof cannot be approved.
            </p>

            {/* Hidden inputs */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            />

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-3 py-2 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition"
              >
                <Camera size={14} /> Open Camera (Live Photo)
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition"
              >
                <Upload size={14} /> Choose File (Image or PDF)
              </button>
              <span className="text-[10px] text-gray-400">JPG, PNG, PDF up to 10MB</span>
            </div>

            {/* Selected File Preview */}
            {receiptFile && (
              <div className="p-2.5 bg-white border border-emerald-300 rounded-xl flex items-center justify-between gap-3 shadow-2xs mt-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {receiptPreview ? (
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 font-bold">
                      PDF
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-900 block truncate flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-600 flex-shrink-0" />
                      {receiptFile.name}
                    </span>
                    <span className="text-[10px] text-gray-400 block">
                      {(receiptFile.size / 1024).toFixed(1)} KB · Bill image attached ✓
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleFileChange(null)}
                  className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer flex-shrink-0"
                  title="Remove attached receipt"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
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

