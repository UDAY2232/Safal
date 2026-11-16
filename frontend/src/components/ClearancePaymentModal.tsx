import React, { useState } from 'react';
import { X, CheckCircle2, DollarSign, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface ClearancePaymentModalProps {
  bill: {
    id: string;
    billId: string;
    type: 'EXPENSE_REIMBURSEMENT' | 'WAGE_PAYMENT';
    employeeName: string;
    category: string;
    approvedAmount: number;
    amountPaid: number;
    balanceRemaining: number;
  };
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const PAYMENT_METHODS = [
  'Bank Transfer (NEFT)',
  'Bank Transfer (IMPS)',
  'Bank Transfer (RTGS)',
  'UPI Direct',
  'Company Cheque',
  'Cash Voucher',
];

export const ClearancePaymentModal: React.FC<ClearancePaymentModalProps> = ({
  bill,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>(String(bill.balanceRemaining));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parsedAmount = Number(amount) || 0;
  const newRemaining = Math.max(0, bill.balanceRemaining - parsedAmount);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!parsedAmount || parsedAmount <= 0) {
      setError('Please enter a positive payment amount');
      return;
    }

    if (parsedAmount > bill.balanceRemaining + 0.01) {
      setError(`Payment amount cannot exceed remaining balance (₹${bill.balanceRemaining})`);
      return;
    }

    if (!transactionRef.trim()) {
      setError('Verifiable transaction reference number is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await api.clearBillPayment({
        billType: bill.type,
        recordId: bill.id,
        amount: parsedAmount,
        paymentDate,
        paymentMethod,
        transactionRef: transactionRef.trim(),
        notes,
      });

      onSuccess(
        `Payment of ₹${parsedAmount.toLocaleString('en-IN')} recorded for ${bill.billId}`
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form onSubmit={handlePay} className="modal !w-[540px] max-w-[94vw] p-6">
        <div className="modal-header pb-3 border-b border-gray-100">
          <div>
            <span className="eyebrow flex items-center gap-1 text-emerald-700 font-bold">
              <ShieldCheck size={14} /> BILL CLEARANCE &amp; DISBURSEMENT
            </span>
            <h2 className="text-lg font-bold text-gray-900 mt-1">Record Settlement Payment</h2>
            <p className="text-xs text-gray-500">
              Clear approved claims or wage balances with a verifiable audit transaction.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {error && <div className="my-2 p-2 bg-red-50 text-red-700 rounded text-xs">{error}</div>}

        <div className="py-3 space-y-3 text-xs">
          {/* Bill summary card */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Bill / Claim ID</span>
              <p className="font-bold text-gray-800">{bill.billId}</p>
            </div>
            <div>
              <span className="text-gray-400">Beneficiary</span>
              <p className="font-bold text-gray-800">{bill.employeeName}</p>
            </div>
            <div>
              <span className="text-gray-400">Approved Amount</span>
              <p className="font-semibold text-gray-700">
                ₹{bill.approvedAmount.toLocaleString('en-IN')}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Outstanding Balance</span>
              <p className="font-bold text-emerald-700 text-sm">
                ₹{bill.balanceRemaining.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                min="1"
                step="any"
                max={bill.balanceRemaining}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-900"
                required
              />
              <span className="text-[10px] text-gray-400">Supports full or partial payment</span>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Disbursement Date *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full h-9 px-2 border border-gray-300 rounded-lg text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-9 px-2 border border-gray-300 rounded-lg text-xs"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Transaction Reference # *
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="UTR / Bank Ref / Cheque #"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Payment Remarks</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared via HDFC Corporate Netbanking batch #491"
              className="w-full p-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between items-center text-xs">
            <span className="text-emerald-800 font-medium">Post-Payment Remaining Balance:</span>
            <strong className="text-emerald-900 font-bold text-sm">
              ₹{newRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
              {newRemaining <= 0.01 && '· (Bill Fully Cleared)'}
            </strong>
          </div>
        </div>

        <div className="modal-actions pt-3 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" className="secondary-button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            Confirm Payment <ArrowRight size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};

