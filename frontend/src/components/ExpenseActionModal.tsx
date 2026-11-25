import React, { useState, useRef } from 'react';
import {
  X,
  ReceiptIndianRupee,
  Check,
  XCircle,
  FileText,
  ExternalLink,
  Bell,
  Camera,
  Upload,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Eye,
  Download,
} from 'lucide-react';
import { ExpenseClaim } from '../types';
import { StatusBadge } from './StatusBadge';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { resolvePhotoUrl } from '../utils/imageUtils';

interface ExpenseActionModalProps {
  claim: ExpenseClaim;
  onClose: () => void;
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}

export const ExpenseActionModal: React.FC<ExpenseActionModalProps> = ({
  claim,
  onClose,
  onRefresh,
  onNotify,
}) => {
  const { user } = useAuth();
  const [approvedAmount, setApprovedAmount] = useState(
    String(claim.approvedAmount > 0 ? claim.approvedAmount : claim.amountSpent)
  );
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentReceiptUrl, setCurrentReceiptUrl] = useState<string | null>(claim.receiptUrl || null);
  const [showAttachmentViewer, setShowAttachmentViewer] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  const receiptFileInputRef = useRef<HTMLInputElement | null>(null);
  const receiptCameraInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isClaimant = user?.employee?.id === (claim as any).employeeId || user?.name === claim.employeeName;

  const handleSendReminder = async () => {
    try {
      setIsSendingReminder(true);
      await api.requestExpenseReceipt(claim.id);
      onNotify(`Notification sent to ${claim.employeeName} to upload mandatory bill/receipt image.`);
    } catch (err: any) {
      onNotify(err.message || 'Failed to send reminder notification');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const handleUploadReceiptFile = async (file: File) => {
    try {
      setIsUploadingReceipt(true);
      const fd = new FormData();
      fd.append('receipt', file);
      const res = await api.uploadExpenseReceipt(claim.id, fd);
      if (res?.claim?.receiptUrl) {
        setCurrentReceiptUrl(res.claim.receiptUrl);
      }
      onNotify(`Bill image uploaded successfully for ${claim.claimNumber}!`);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to upload bill receipt');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleReview = async () => {
    try {
      setIsProcessing(true);
      await api.reviewExpense(claim.id, 'Verified attached receipts and operational necessity');
      onNotify(`Claim ${claim.claimNumber} marked as Under Review`);
      onRefresh();
      onClose();
    } catch (err: any) {
      onNotify(err.message || 'Failed to review claim');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      await api.approveExpense(claim.id, {
        approvedAmount: Number(approvedAmount),
        reason: approvalNote,
      });
      onNotify(`Claim ${claim.claimNumber} approved for ₹${Number(approvedAmount).toLocaleString('en-IN')}`);
      onRefresh();
      onClose();
    } catch (err: any) {
      onNotify(err.message || 'Failed to approve claim');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      onNotify('Please enter a rejection reason');
      return;
    }
    try {
      setIsProcessing(true);
      await api.rejectExpense(claim.id, rejectReason.trim());
      onNotify(`Claim ${claim.claimNumber} rejected`);
      onRefresh();
      onClose();
    } catch (err: any) {
      onNotify(err.message || 'Failed to reject claim');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal !w-[620px] max-w-[94vw] p-6">
        <div className="modal-header pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#087A3E] grid place-items-center">
              <ReceiptIndianRupee size={22} />
            </div>
            <div>
              <span className="eyebrow text-emerald-800 font-bold">EXPENSE REIMBURSEMENT CLAIM</span>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-xl font-bold text-gray-900">{claim.claimNumber}</h2>
                <StatusBadge status={claim.status} />
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="py-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
            <div>
              <span className="text-gray-400">Employee</span>
              <p className="font-bold text-gray-800 mt-0.5">
                {claim.employeeName} ({claim.employeeId})
              </p>
            </div>
            <div>
              <span className="text-gray-400">Department &amp; Date</span>
              <p className="font-semibold text-gray-800 mt-0.5">
                {claim.department} · {new Date(claim.expenseDate).toLocaleDateString('en-GB')}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Expense Category</span>
              <p className="font-semibold text-gray-800 mt-0.5">{claim.category}</p>
            </div>
            <div>
              <span className="text-gray-400">Claimed Amount</span>
              <p className="font-bold text-gray-900 text-sm mt-0.5">
                ₹{claim.amountSpent.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {(claim.travelFrom || claim.travelTo) && (
            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
              <span className="text-gray-400">Travel Route:</span>
              <p className="font-semibold text-gray-700 mt-0.5">
                {claim.travelFrom || 'Origin'} ➔ {claim.travelTo || 'Destination'}
              </p>
            </div>
          )}

          <div>
            <span className="text-gray-400 font-medium">Business Purpose &amp; Description</span>
            <p className="text-gray-800 mt-1 bg-white p-2.5 rounded-lg border border-gray-200 leading-relaxed">
              {claim.businessPurpose}
            </p>
          </div>

          {/* Hidden inputs for bill image upload */}
          <input
            type="file"
            ref={receiptCameraInputRef}
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleUploadReceiptFile(e.target.files[0]);
            }}
          />
          <input
            type="file"
            ref={receiptFileInputRef}
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleUploadReceiptFile(e.target.files[0]);
            }}
          />

          {/* Receipt attachment section (With mandatory check & reminder dispatch) */}
          {currentReceiptUrl ? (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  Attached Bill / Receipt Proof
                </div>
                <button
                  type="button"
                  onClick={() => setShowAttachmentViewer(true)}
                  className="text-xs text-[#087A3E] font-bold hover:underline inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs cursor-pointer hover:bg-emerald-50 transition"
                  title="View full attachment image"
                >
                  <Eye size={13} /> View Full Attachment
                </button>
              </div>

              {/* Clean inline preview thumbnail */}
              <div className="pt-1">
                <div
                  onClick={() => setShowAttachmentViewer(true)}
                  className="block max-w-xs group cursor-pointer"
                  title="Click image to inspect full proof"
                >
                  <img
                    src={resolvePhotoUrl(currentReceiptUrl)}
                    alt="Receipt Document"
                    className="max-h-48 rounded-lg border border-emerald-300 shadow-2xs group-hover:opacity-90 transition object-contain bg-white"
                  />
                  <span className="text-[10px] text-emerald-700 font-semibold block mt-1 flex items-center gap-1">
                    <Eye size={11} /> Click image to inspect full-screen proof ↗
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-300 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-rose-900 font-bold text-xs">
                  <AlertCircle size={15} className="text-rose-700" />
                  Missing Bill / Receipt Image
                </div>
                <span className="text-[10px] font-black uppercase text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                  Mandatory Required
                </span>
              </div>
              <p className="text-[11px] text-rose-800">
                This claim has no receipt or tax bill attached. Claims cannot be cleared without mandatory bill proof.
              </p>

              <div className="flex items-center gap-2 flex-wrap pt-1">
                {(isAdmin || isAccountant) && (
                  <button
                    type="button"
                    onClick={handleSendReminder}
                    disabled={isSendingReminder}
                    className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition"
                  >
                    <Bell size={13} />
                    {isSendingReminder ? 'Sending Notification...' : 'Send Notification (Image Required)'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => receiptCameraInputRef.current?.click()}
                  disabled={isUploadingReceipt}
                  className="px-3 py-1.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition"
                >
                  <Camera size={13} />
                  {isUploadingReceipt ? 'Uploading...' : 'Snap Bill Photo'}
                </button>

                <button
                  type="button"
                  onClick={() => receiptFileInputRef.current?.click()}
                  disabled={isUploadingReceipt}
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 transition"
                >
                  <Upload size={13} />
                  Choose File
                </button>
              </div>
            </div>
          )}

          {claim.rejectionReason && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs">
              <strong>Rejection Reason:</strong> {claim.rejectionReason}
            </div>
          )}

          {/* Admin Approval controls */}
          {isAdmin && ['SUBMITTED', 'UNDER_REVIEW'].includes(claim.status) && !showRejectForm && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-gray-800">Approved Reimbursement Amount (₹):</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  className="w-32 h-8 px-2 border border-gray-300 rounded font-bold text-right text-xs"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Optional approval notes / explanation for any amount adjustments..."
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded text-xs bg-white"
                />
              </div>
            </div>
          )}

          {/* Reject reason input */}
          {showRejectForm && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <label className="block font-bold text-red-900">Specify Rejection Reason *</label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Attached bill does not have tax registration; personal meal expenses not eligible."
                className="w-full p-2 border border-red-300 rounded text-xs focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-2.5 py-1 bg-white border border-gray-300 text-gray-700 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-3 py-1 bg-red-600 text-white rounded font-bold text-xs hover:bg-red-700"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions pt-3 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" className="secondary-button" onClick={onClose} disabled={isProcessing}>
            Close
          </button>

          {isAccountant && claim.status === 'SUBMITTED' && (
            <button
              type="button"
              onClick={handleReview}
              disabled={isProcessing}
              className="primary-button !bg-emerald-800"
            >
              Mark Under Review
            </button>
          )}

          {isAdmin && ['SUBMITTED', 'UNDER_REVIEW'].includes(claim.status) && !showRejectForm && (
            <>
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                disabled={isProcessing}
                className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg font-bold text-xs hover:bg-red-100"
              >
                Reject Claim
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isProcessing}
                className="primary-button inline-flex items-center gap-1"
              >
                <Check size={14} /> Approve Claim
              </button>
            </>
          )}
        </div>
      </div>

      {/* Full-Screen Attachment Viewer Modal (Opens right in place without redirecting to dashboard) */}
      {showAttachmentViewer && currentReceiptUrl && (
        <div className="modal-backdrop !z-[9999]" onClick={() => setShowAttachmentViewer(false)}>
          <div
            className="modal !w-[820px] max-w-[96vw] max-h-[92vh] p-4 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ReceiptIndianRupee size={20} className="text-emerald-700" />
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    Expense Receipt Proof - {claim.claimNumber}
                  </h3>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {claim.employeeName} ({claim.employeeCode || 'Staff'}) · ₹{claim.amountSpent.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={resolvePhotoUrl(currentReceiptUrl)}
                  download={`receipt-${claim.claimNumber}.jpg`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs inline-flex items-center gap-1 transition"
                  title="Download receipt"
                >
                  <Download size={13} /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setShowAttachmentViewer(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  title="Close viewer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-2 bg-gray-900 rounded-xl flex items-center justify-center my-3 min-h-[300px]">
              {currentReceiptUrl.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={resolvePhotoUrl(currentReceiptUrl)}
                  title="Receipt PDF"
                  className="w-full h-[70vh] rounded-lg border-0 bg-white"
                />
              ) : (
                <img
                  src={resolvePhotoUrl(currentReceiptUrl)}
                  alt={`Receipt for ${claim.claimNumber}`}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs flex-shrink-0">
              <span className="text-[11px] text-gray-500 font-semibold">
                Category: {claim.category}
              </span>
              <button
                type="button"
                onClick={() => setShowAttachmentViewer(false)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-bold text-xs transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

