import React, { useState } from 'react';
import {
  X,
  PlusCircle,
  Receipt,
  User,
  MapPin,
  Calendar,
  IndianRupee,
  Building2,
  Phone,
  FileText,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AddDuePOModalProps {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  mode?: 'PO' | 'CD';
}

export const AddDuePOModal: React.FC<AddDuePOModalProps> = ({ onClose, onSuccess, mode }) => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE';
  const isCD = mode === 'CD' || isEmployee;

  const [supplierName, setSupplierName] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [customPONumber, setCustomPONumber] = useState('');
  const [orderDate, setOrderDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [orderPersonName, setOrderPersonName] = useState<string>(user?.name || '');
  const [orderPersonPlace, setOrderPersonPlace] = useState('');

  const [grandTotal, setGrandTotal] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [pendingAmount, setPendingAmount] = useState('');
  const [manualPendingOverride, setManualPendingOverride] = useState(false);

  const [fruitName, setFruitName] = useState('Assorted Fruits Consignment');
  const [varietyGrade, setVarietyGrade] = useState('Grade A');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('LOT');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Live calculation of due balance
  const numTotal = Number(grandTotal) || 0;
  const numAdvance = Number(advanceAmount) || 0;
  const computedPending = Math.max(0, numTotal - numAdvance);
  const currentPending = manualPendingOverride && pendingAmount !== '' ? Number(pendingAmount) : computedPending;
  const completionPct = numTotal > 0 ? Math.min(100, Math.round((numAdvance / numTotal) * 100)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) {
      setError('Supplier name is required');
      return;
    }
    if (numTotal <= 0) {
      setError('Total PO amount must be greater than zero');
      return;
    }
    if (numAdvance > numTotal) {
      setError('Completed advance amount cannot exceed total PO value');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const res = await api.createDuePurchaseOrder({
        poNumber: customPONumber.trim() || undefined,
        poDate: orderDate ? new Date(orderDate).toISOString() : new Date().toISOString(),
        supplierName: supplierName.trim(),
        supplierContact: supplierContact.trim() || undefined,
        orderPersonName: orderPersonName.trim() || user?.name || 'Staff',
        orderPersonPlace: orderPersonPlace.trim(),
        grandTotal: numTotal,
        advanceAmount: numAdvance,
        pendingAmount: currentPending,
        fruitName: fruitName.trim() || 'Assorted Fruits Consignment',
        varietyGrade: varietyGrade.trim() || 'Grade A',
        quantity: Number(quantity) || 1,
        unit: unit || 'LOT',
        notes: notes.trim() || undefined,
        isCD: isCD,
        type: isCD ? 'CD' : 'PO',
      });

      onSuccess(
        `Pre-existing Due ${isCD ? 'CD' : 'PO'} ${res.poNumber} (${supplierName}) added successfully! Outstanding Due: ₹${currentPending.toLocaleString('en-IN')}`
      );
      onClose();
    } catch (err: any) {
      setError(err.message || (isCD ? 'Failed to record due CD' : 'Failed to record due purchase order'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form
        onSubmit={handleSubmit}
        className="modal !w-[680px] max-w-[96vw] max-h-[92vh] flex flex-col p-6 overflow-hidden"
      >
        {/* Header */}
        <div className="modal-header pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 grid place-items-center flex-shrink-0">
              <PlusCircle size={22} />
            </div>
            <div>
              <span className="eyebrow text-rose-800 font-bold flex items-center gap-1">
                <Sparkles size={13} /> {isCD ? 'PRE-EXISTING CUSTOMER DUE (CD) ONBOARDING' : 'PRE-EXISTING DUE PO ONBOARDING'}
              </span>
              <h2 className="text-xl font-black text-gray-900 mt-0.5">
                {isCD ? 'Record Pre-Existing Customer Due (CD)' : 'Record Pre-Existing / Due Purchase Order'}
              </h2>
            </div>
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
          <div className="my-2 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2 flex-shrink-0">
            <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto flex-1 py-3 space-y-4 text-xs pr-1">
          {/* Section 1: Customer / Supplier Details */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
            <h3 className="font-bold text-gray-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <User size={14} className="text-[#087A3E]" /> {isCD ? 'Customer & Shop Details' : 'Supplier & Procurement Details'}
            </h3>

            {/* Manual Supplier / Customer Entry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  {isCD ? 'Customer / Shop Name' : 'Supplier Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder={isCD ? 'e.g. Balaji Fruit Shop / Retailer' : 'e.g. Kashmir Apple Farms, Safal'}
                  className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#087A3E]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                  <Phone size={11} className="text-gray-400" /> {isCD ? 'Customer Phone / Contact' : 'Supplier Phone / Contact'}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={supplierContact}
                  onChange={(e) => setSupplierContact(e.target.value)}
                  placeholder="+91 98..."
                  className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#087A3E]"
                />
              </div>
            </div>

            {/* Order Person & Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Order Person (Staff) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={orderPersonName}
                  onChange={(e) => setOrderPersonName(e.target.value)}
                  placeholder="e.g. Shanker, Naveen, Uday"
                  className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#087A3E]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                  <MapPin size={11} className="text-emerald-700" /> {isCD ? 'Customer Area / City' : 'Order Person Place / Area'}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={orderPersonPlace}
                  onChange={(e) => setOrderPersonPlace(e.target.value)}
                  placeholder="e.g. Hyderabad, Warangal, Vijayawada"
                  className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#087A3E]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Order Reference & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-white border border-gray-200 rounded-2xl">
            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                <span>{isCD ? 'CD / Receipt Slip Number' : 'PO / Bill Slip Number'}</span>
                <span className="text-[10px] text-gray-400">Leave blank for auto-number</span>
              </label>
              <input
                type="text"
                autoComplete="off"
                value={customPONumber}
                onChange={(e) => setCustomPONumber(e.target.value)}
                placeholder={isCD ? 'Auto (or enter e.g. CD/SF/2026/001)' : 'Auto (or enter e.g. PO/SF/2026/001)'}
                className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#087A3E]"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                <Calendar size={12} className="text-gray-400" /> Original Order Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#087A3E]"
                required
              />
            </div>
          </div>

          {/* Section 3: Financials (Total, Advance Paid, Pending Due) */}
          <div className="p-4 bg-gradient-to-br from-rose-50/60 to-amber-50/40 border border-rose-200 rounded-2xl space-y-3">
            <h3 className="font-bold text-rose-950 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <IndianRupee size={14} className="text-rose-700" /> Financial Settlement Breakdown
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-800 font-bold mb-1">
                  {isCD ? 'Total CD Value (₹)' : 'Total PO Value (₹)'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={grandTotal}
                    onChange={(e) => setGrandTotal(e.target.value)}
                    placeholder="e.g. 500000"
                    className="w-full h-9 pl-7 pr-3 border border-gray-300 rounded-xl text-xs font-black text-gray-900 focus:outline-none focus:border-[#087A3E]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-800 font-bold mb-1 flex items-center justify-between">
                  <span>{isCD ? 'Payed Amount (₹)' : 'Advance Paid / Cleared Amount (₹)'}</span>
                  <span className="text-[10px] text-emerald-700 font-bold">Paid upfront</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    placeholder="e.g. 300000 (0 if none)"
                    className="w-full h-9 pl-7 pr-3 border border-gray-300 rounded-xl text-xs font-black text-[#087A3E] focus:outline-none focus:border-[#087A3E]"
                  />
                </div>
              </div>
            </div>

            {/* Due Preview Box */}
            <div className="p-3 bg-white border border-rose-200 rounded-xl flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase block">Settled / Cleared</span>
                <span className="text-xs font-bold text-emerald-800">
                  ₹{numAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({completionPct}%)
                </span>
              </div>
              <ArrowRight size={16} className="text-gray-400" />
              <div className="text-right">
                <span className="text-[10px] font-bold text-rose-800 uppercase block">
                  Pending Due Balance
                </span>
                <strong className="text-sm font-black text-rose-700 block">
                  ₹{currentPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-300"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Fruit & Notes */}
          <div className="p-3.5 bg-white border border-gray-200 rounded-2xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Fruit / Consignment Name</label>
                <input
                  type="text"
                  value={fruitName}
                  onChange={(e) => setFruitName(e.target.value)}
                  placeholder="e.g. Kashmir Apples"
                  className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#087A3E]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Variety / Grade</label>
                <input
                  type="text"
                  value={varietyGrade}
                  onChange={(e) => setVarietyGrade(e.target.value)}
                  placeholder="Grade A, Export Quality"
                  className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#087A3E]"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Quantity &amp; Unit</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-20 h-9 px-2 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#087A3E]"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="flex-1 h-9 px-2 border border-gray-300 rounded-xl text-xs text-gray-800 bg-white focus:outline-none"
                  >
                    <option value="LOT">LOT / Consignment</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="BOX">BOX / Crates</option>
                    <option value="TON">TONS (Metric Ton)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Legacy Order Notes / Remarks</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Pre-existing balance with supplier Naveen from offline paper slips. Pending settlement."
                className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#087A3E]"
              />
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
            className="px-5 py-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold text-xs shadow-md inline-flex items-center gap-2 transition disabled:opacity-50"
            disabled={isSubmitting}
          >
            <PlusCircle size={15} />
            {isSubmitting ? (isCD ? 'Recording Due CD...' : 'Recording Due PO...') : (isCD ? 'Record & Add Due CD' : 'Record & Add Due PO')}
          </button>
        </div>
      </form>
    </div>
  );
};
