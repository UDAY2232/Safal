import React, { useState, useRef } from 'react';
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
  Upload,
  FileText,
  ExternalLink,
  Image as ImageIcon,
  Trash2,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { PurchaseOrder } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import { ProofViewerModal } from './ProofViewerModal';
import { compressImageFile } from '../utils/imageUtils';

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
  const { user } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE';
  const isAdmin = user?.role === 'ADMIN';
  const isVendor = user?.role === 'VENDOR';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const grandTotal = Number(order.grandTotal);
  const currentAdvance = Number(order.advanceAmount || 0);
  const currentPending = Number(
    order.pendingAmount ?? Math.max(0, grandTotal - currentAdvance)
  );

  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosingDirectly, setIsClosingDirectly] = useState(false);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const rawFile = e.target.files[0];
      const file = await compressImageFile(rawFile);
      setProofFile(file);
      setError('');
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setProofPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setProofPreview(null);
      }
    }
  };

  const handleRemoveFile = () => {
    setProofFile(null);
    setProofPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

    // Mandatory Payment Proof for all Customer Due (CD) settlements:
    // Any employee or user submitting payment on a CD record MUST provide an image proof.
    const isCD = order.poNumber.startsWith('CD/') || isEmployee;
    if (isCD && !proofFile && !order.paymentProofUrl) {
      setError('Buyer Payment Proof image (UPI screenshot, bank slip, or receipt) is strictly mandatory to submit CD payment.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const formData = new FormData();
      formData.append('amount', String(numPayment));
      formData.append('paymentMode', paymentMode);
      formData.append('reference', reference.trim());
      formData.append('notes', notes.trim());
      formData.append('markClosed', String(newPending === 0 && isAdmin));
      if (proofFile) {
        formData.append('proof', proofFile);
      }

      await api.recordDuePayment(order.id, formData);

      if (isEmployee) {
        onSuccess(
          `Due payment of ₹${numPayment.toLocaleString('en-IN')} and proof submitted successfully for ${order.poNumber}! Sent for Admin verification & closure.`
        );
      } else {
        onSuccess(
          `Payment of ₹${numPayment.toLocaleString('en-IN')} submitted successfully for ${order.poNumber}! Remaining Due: ₹${newPending.toLocaleString('en-IN')}`
        );
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit due payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Direct Admin Action: Approve proof and close CD immediately if due is 0
  const handleAdminApproveAndClose = async () => {
    if (!isAdmin) return;
    if (currentPending > 0) {
      setError(`Cannot close CD: Remaining due of ₹${currentPending.toLocaleString('en-IN')} must be cleared first.`);
      return;
    }
    try {
      setIsClosingDirectly(true);
      setError('');
      await api.closePurchaseOrder(order.id);
      onSuccess(`Customer Due ${order.poNumber} verified and formally CLOSED by Admin!`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to close customer due');
    } finally {
      setIsClosingDirectly(false);
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

        {isVendor ? (
          <div className="py-8 px-4 text-center space-y-4 my-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 grid place-items-center mx-auto shadow-inner">
              <ShieldCheck size={36} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Direct Payout by Safal Accounts</h3>
              <p className="text-xs text-gray-600 max-w-md mx-auto mt-2 leading-relaxed">
                As an Authorized Wholesale Vendor Partner, you do not make payments to SAFAL for supply purchase orders.
                Upon completion of Mandi sales realization, SAFAL Finance &amp; Accounts disburses the net balance directly to your registered bank account.
              </p>
            </div>
            <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 max-w-sm mx-auto text-left text-xs space-y-2 shadow-xs">
              <div className="flex justify-between text-gray-600">
                <span>Consignment Commitment:</span>
                <strong className="text-gray-900 font-mono">₹{grandTotal.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>Advance Disbursed:</span>
                <strong className="font-mono">₹{currentAdvance.toLocaleString('en-IN')}</strong>
              </div>
              <div className="flex justify-between text-amber-900 pt-1.5 border-t border-emerald-200 font-bold">
                <span>Awaiting Mandi Realization:</span>
                <strong className="font-mono">₹{currentPending.toLocaleString('en-IN')}</strong>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          /* Scrollable Form Body */
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
                  <span className="text-[11px] text-gray-400 font-semibold block">Buyer / Customer</span>
                  <strong className="text-gray-900 font-bold text-xs">{order.supplierName}</strong>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="p-1.5 bg-teal-50 text-teal-800 rounded-lg mt-0.5">
                  <MapPin size={14} />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-semibold block">Created By (Employee &amp; Area)</span>
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
                <span className="text-[10px] font-bold text-gray-500 uppercase block">Total Due Amount</span>
                <strong className="text-gray-900 font-black text-sm block mt-0.5">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>

              <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 shadow-xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">Amount Cleared</span>
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

          {/* Existing Attached Proof (if any) */}
          {order.paymentProofUrl && (
            <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-300/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-200 text-emerald-900 grid place-items-center">
                  <FileText size={18} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-900 block">
                    Existing Payment Proof Attached
                  </span>
                  <span className="text-[10px] text-emerald-700">
                    Uploaded by employee during settlement
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProofModal(true)}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
              >
                <ImageIcon size={13} /> View Proof
              </button>
            </div>
          )}

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
                  autoFocus
                  value={paymentAmount}
                  onChange={(e) => {
                    setPaymentAmount(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter amount to pay (e.g. 50000)"
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

            {/* FILE UPLOAD SECTION: Payment Proof / Buyer Receipt (Mandatory for all CDs / Employees) */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-gray-800 block text-xs flex items-center gap-1.5">
                  <Upload size={14} className="text-[#087A3E]" />
                  Upload Buyer Payment Proof / Receipt
                  <span className="text-red-600 font-black">*(Mandatory)</span>
                </label>
                <span className="text-[10px] text-gray-400">JPG, PNG, PDF (Max: 10MB)</span>
              </div>

              {!proofFile && !order.paymentProofUrl && (
                <div className="mb-2 p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-600 shrink-0" />
                  <span className="font-semibold text-[11px]">
                    Buyer payment proof (UPI screenshot / receipt) is strictly mandatory to submit payment.
                  </span>
                </div>
              )}

              {!proofFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer bg-gray-50/70 hover:bg-emerald-50/40 transition group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 group-hover:border-emerald-300 text-gray-500 group-hover:text-emerald-600 grid place-items-center shadow-2xs transition">
                      <Upload size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-700 group-hover:text-emerald-800 block">
                        Tap or Click to Upload Payment Proof
                      </span>
                      <span className="text-[11px] text-gray-400 block mt-0.5">
                        Screenshot of UPI, bank transfer slip, or signed receipt
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div
                    onClick={() => setShowProofModal(true)}
                    className="flex items-center gap-2.5 overflow-hidden cursor-pointer group flex-1"
                    title="Click to preview image full screen"
                  >
                    {proofPreview ? (
                      <img
                        src={proofPreview}
                        alt="Proof preview"
                        className="w-12 h-12 object-cover rounded-lg border border-emerald-300 flex-shrink-0 group-hover:opacity-85 transition"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 grid place-items-center flex-shrink-0">
                        <FileText size={18} />
                      </div>
                    )}
                    <div className="truncate">
                      <strong className="text-xs font-bold text-gray-900 block truncate group-hover:text-emerald-800">
                        {proofFile.name}
                      </strong>
                      <span className="text-[10px] text-emerald-700 font-semibold block">
                        {(proofFile.size / 1024).toFixed(1)} KB • Tap to preview image
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => setShowProofModal(true)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={13} /> View
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white transition cursor-pointer"
                      title="Remove File"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Status Preview */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 gap-1.5">
                <span className="text-xs font-semibold text-gray-700">Status After Payment:</span>
                {newPending <= 0 ? (
                  isEmployee ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD] shadow-xs">
                      ● Pending Admin Verification (Proof Attached)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#D8F6D4] text-[#1E7438] border border-[#BCECC5] shadow-xs">
                      ✓ Closed (₹0 Due Remaining)
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#FFE0DF] text-[#C53030] border border-[#FDC4C4] shadow-xs">
                    ● Open (₹{newPending.toLocaleString('en-IN')} Due Pending)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="modal-actions pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
            {/* Direct Admin Action: Approve proof & close if due is 0, or verify partial proof */}
            {isAdmin && order.paymentProofUrl && !order.paymentProofNotes?.includes('[ADMIN_VERIFIED]') && order.status !== 'CLOSED' ? (
              <button
                type="button"
                onClick={async () => {
                  try {
                    setIsClosingDirectly(true);
                    if (currentPending <= 0) {
                      await api.closePurchaseOrder(order.id);
                      onSuccess(`Customer Due ${order.poNumber} verified and formally CLOSED!`);
                    } else {
                      await api.verifyDuePaymentProof(order.id);
                      onSuccess(`Payment proof on ${order.poNumber} verified & approved! Remaining Due: ₹${currentPending.toLocaleString('en-IN')}`);
                    }
                    onClose();
                  } catch (err: any) {
                    setError(err.message || 'Failed to verify payment proof');
                  } finally {
                    setIsClosingDirectly(false);
                  }
                }}
                disabled={isClosingDirectly}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-xs inline-flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck size={16} />
                {isClosingDirectly ? 'Verifying...' : currentPending <= 0 ? 'Approve & Close CD' : 'Approve Payment Proof'}
              </button>
            ) : isAdmin && currentPending === 0 && order.status === 'OPEN' ? (
              <button
                type="button"
                onClick={handleAdminApproveAndClose}
                disabled={isClosingDirectly}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs inline-flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                <ShieldCheck size={16} />
                {isClosingDirectly ? 'Closing CD...' : 'Approve Proof & Close CD'}
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isClosingDirectly}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isClosingDirectly}
                className="px-5 py-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold text-xs shadow-md inline-flex items-center gap-2 transition disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {isSubmitting
                  ? 'Submitting...'
                  : isEmployee
                  ? 'Submit Settlement & Proof'
                  : newPending === 0
                  ? 'Submit Payment & Settle'
                  : 'Submit Due Payment'}
              </button>
            </div>
          </div>
        </form>
        )}
      </div>

      {/* Proof Preview Lightbox */}
      {showProofModal && (proofPreview || order.paymentProofUrl) && (
        <ProofViewerModal
          proofUrl={proofPreview || order.paymentProofUrl || null}
          orderNumber={order.poNumber}
          supplierName={order.supplier?.name}
          amount={order.grandTotal}
          pendingAmount={newPending}
          notes={notes || order.paymentProofNotes || ''}
          onClose={() => setShowProofModal(false)}
        />
      )}
    </div>
  );
};
