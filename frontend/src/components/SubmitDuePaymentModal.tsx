import React, { useState } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Receipt,
  User,
  MapPin,
  Calendar,
} from 'lucide-react';
import { PurchaseOrder } from '../types';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';

interface SubmitDuePaymentModalProps {
  order: PurchaseOrder;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const SubmitDuePaymentModal: React.FC<SubmitDuePaymentModalProps> = ({
  order,
  onClose,
  onSuccess,
}) => {
  const grandTotal = Number(order.grandTotal);
  const currentAdvance = Number(order.advanceAmount || 0);
  const currentPending = Number(
    order.pendingAmount ?? Math.max(0, grandTotal - currentAdvance)
  );

  const [paymentAmount, setPaymentAmount] = useState<string>(
    currentPending > 0 ? String(currentPending) : ''
  );
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const numPayment = Number(paymentAmount) || 0;
  const newAdvance = currentAdvance + numPayment;
  const newPending = Math.max(0, grandTotal - newAdvance);
  const completionPercent = grandTotal > 0 ? Math.min(100, Math.round((newAdvance / grandTotal) * 100)) : 100;
  const currentPercent = grandTotal > 0 ? Math.min(100, Math.round((currentAdvance / grandTotal) * 100)) : 100;

  const handlePresetClick = (amount: number) => {
    setPaymentAmount(String(Math.min(currentPending, amount)));
    setError('');
  };

  const handleFullDueClick = () => {
    setPaymentAmount(String(currentPending));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numPayment <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (numPayment > currentPending && currentPending > 0) {
      const confirmOverpay = window.confirm(
        `Entered payment (₹${numPayment.toLocaleString('en-IN')}) exceeds current pending due (₹${currentPending.toLocaleString('en-IN')}). Do you wish to proceed?`
      );
      if (!confirmOverpay) return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // Strict Rule: Closed ONLY when newPending === 0 (₹0 remaining due).
      await api.recordDuePayment(order.id, {
        amount: numPayment,
        paymentMode,
        reference: reference.trim(),
        notes: notes.trim(),
        markClosed: newPending === 0,
      });

      onSuccess(
        `Payment of ₹${numPayment.toLocaleString('en-IN')} submitted successfully for ${order.poNumber}! Remaining Due: ₹${newPending.toLocaleString('en-IN')}`
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit due payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal !w-[680px] max-w-[96vw] max-h-[92vh] flex flex-col p-6 overflow-hidden">
        {/* Modal Header */}
        <div className="modal-header pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#087A3E] grid place-items-center">
              <CreditCard size={22} />
            </div>
            <div>
              <span className="eyebrow text-emerald-800 font-bold">
                SUBMIT DUE PAYMENT / SETTLEMENT
              </span>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h2 className="text-xl font-black text-gray-900">{order.poNumber}</h2>
                <StatusBadge status={order.status} />
              </div>
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 py-4 space-y-4 text-xs pr-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2 text-xs">
              <AlertCircle size={16} className="flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* PO Context Card: Supplier & Staff, Advance Paid, Pending Due */}
          <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200/80 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#064D2B] flex items-center gap-1.5 uppercase tracking-wide">
                <Receipt size={14} /> Order Due Summary
              </span>
              <span className="text-gray-500 font-medium">
                Created: {new Date(order.poDate).toLocaleDateString('en-GB')}
              </span>
            </div>

            {/* Supplier & Staff Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-800 rounded-lg mt-0.5">
                  <User size={14} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-semibold block">Supplier Name</span>
                  <strong className="text-gray-900 font-bold text-xs">{order.supplierName}</strong>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-teal-50 text-teal-800 rounded-lg mt-0.5">
                  <MapPin size={14} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-semibold block">Order Person &amp; Area</span>
                  <strong className="text-gray-900 font-bold text-xs">
                    {order.createdByName}
                    <span className="ml-1 text-emerald-700">({order.orderPersonPlace || 'Hyderabad'})</span>
                  </strong>
                </div>
              </div>
            </div>

            {/* 3 Metrics: Grand Total | Advance Paid | Pending Due */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-xl border border-gray-100 shadow-xs">
                <span className="text-[10px] font-bold text-gray-500 uppercase block">Total PO Value</span>
                <strong className="text-gray-900 font-black text-sm block mt-0.5">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>

              <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Advance Paid</span>
                <strong className="text-[#087A3E] font-black text-sm block mt-0.5">
                  ₹{currentAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
                <span className="text-[9px] font-bold text-emerald-600 block mt-0.5">
                  {currentPercent}% cleared
                </span>
              </div>

              <div className="bg-rose-50/90 p-2.5 rounded-xl border border-rose-200 shadow-xs">
                <span className="text-[10px] font-bold text-rose-800 uppercase block">Pending Due</span>
                <strong className="text-rose-700 font-black text-sm block mt-0.5">
                  ₹{currentPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
                <span className="text-[9px] font-bold text-rose-600 block mt-0.5">
                  Pending Balance
                </span>
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-gray-600">
                <span>Settlement Progress</span>
                <span className="text-emerald-800">{completionPercent}%</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Payment Form Fields */}
          <div className="space-y-3.5 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <h3 className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
              <CreditCard size={15} className="text-[#087A3E]" /> Record Settlement Details
            </h3>

            {/* Payment Amount */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-gray-700 block">
                  Payment Amount to Submit (₹) <span className="text-red-500">*</span>
                </label>
                {currentPending > 0 && (
                  <button
                    type="button"
                    onClick={handleFullDueClick}
                    className="text-[11px] font-bold text-[#087A3E] hover:underline cursor-pointer"
                  >
                    Pay Full Due (₹{currentPending.toLocaleString('en-IN')})
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={paymentAmount}
                  onChange={(e) => {
                    setPaymentAmount(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter payment amount"
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-[#087A3E] focus:ring-2 focus:ring-emerald-100 transition"
                  required
                />
              </div>

              {/* Quick Preset Buttons */}
              {currentPending > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[11px] text-gray-400 font-semibold">Quick Amounts:</span>
                  {[25000, 50000, 100000]
                    .filter((amt) => amt < currentPending)
                    .map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handlePresetClick(amt)}
                        className="px-2.5 py-1 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 text-gray-700 hover:text-emerald-800 rounded-lg text-[11px] font-bold transition"
                      >
                        + ₹{amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                  <button
                    type="button"
                    onClick={handleFullDueClick}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-[11px] font-bold transition"
                  >
                    Clear Full Due (₹{currentPending.toLocaleString('en-IN')})
                  </button>
                </div>
              )}
            </div>

            {/* Live Calculation Preview Banner */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-500 block">After Submitting:</span>
                <span className="font-bold text-emerald-800">
                  Total Paid: ₹{newAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <ArrowRight size={16} className="text-gray-400" />
              <div className="text-right">
                <span className="text-gray-500 block">Remaining Due:</span>
                <strong
                  className={`font-black text-sm ${
                    newPending === 0 ? 'text-green-700' : 'text-amber-800'
                  }`}
                >
                  ₹{newPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  {newPending === 0 && ' (Settled ✓)'}
                </strong>
              </div>
            </div>

            {/* Payment Mode & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:border-[#087A3E]"
                >
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash Payment</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Transaction Ref. / UTR / Cheque No.
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. UTR / Receipt / Txn ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#087A3E]"
                />
              </div>
            </div>

            {/* Payment Date & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#087A3E]"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Notes / Payment Remarks
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Cleared via cold storage receiving desk"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#087A3E]"
                />
              </div>
            </div>

            {/* Status Preview: Strict rule (₹0 Due = Closed, >0 Due = Open) */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-xs font-semibold text-gray-700">Status After Payment:</span>
                {newPending <= 0 ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#D8F6D4] text-[#1E7438] border border-[#BCECC5] shadow-xs">
                    ✓ Closed (₹0 Due Remaining)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#FFE0DF] text-[#C53030] border border-[#FDC4C4] shadow-xs">
                    ● Open (₹{newPending.toLocaleString('en-IN')} Due Pending)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="modal-actions pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold text-xs shadow-md inline-flex items-center gap-2 transition disabled:opacity-50"
            >
              <CheckCircle2 size={16} />
              {isSubmitting ? 'Submitting Due Payment...' : 'Submit Due Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
