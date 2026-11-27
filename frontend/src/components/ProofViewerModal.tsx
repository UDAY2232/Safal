import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  CreditCard,
  User,
  Calendar,
  AlertCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Clock,
} from 'lucide-react';
import { resolvePhotoUrl } from '../utils/imageUtils';
import { PaymentProofItem } from '../types';

interface ProofViewerModalProps {
  proofUrl: string | null;
  orderNumber?: string;
  supplierName?: string;
  amount?: number | string;
  pendingAmount?: number | string;
  paymentMode?: string;
  notes?: string;
  onClose: () => void;
  canApprove?: boolean;
  onApprove?: () => void;
  isApproving?: boolean;
  approveLabel?: string;
  proofs?: PaymentProofItem[];
}

export const ProofViewerModal: React.FC<ProofViewerModalProps> = ({
  proofUrl,
  orderNumber = 'Payment Proof',
  supplierName,
  amount,
  pendingAmount,
  paymentMode,
  notes,
  onClose,
  canApprove = false,
  onApprove,
  isApproving = false,
  approveLabel,
  proofs,
}) => {
  const [zoom, setZoom] = useState(1);
  const [loadError, setLoadError] = useState(false);

  // Normalize all available proofs for this order
  const allProofs: PaymentProofItem[] = useMemo(() => {
    if (proofs && proofs.length > 0) return proofs;
    if (proofUrl) {
      return [{
        id: 'prf_single',
        url: proofUrl,
        amount: amount !== undefined && pendingAmount !== undefined ? Math.max(0, Number(amount) - Number(pendingAmount)) : undefined,
        paymentMode: paymentMode || 'PHONEPE_UPI',
        notes: notes,
      }];
    }
    return [];
  }, [proofs, proofUrl, amount, pendingAmount, paymentMode, notes]);

  // Default active proof to the latest submitted installment
  const [activeIndex, setActiveIndex] = useState<number>(() => {
    if (!allProofs.length) return 0;
    if (proofUrl) {
      const idx = allProofs.findIndex(p => p.url === proofUrl);
      return idx >= 0 ? idx : allProofs.length - 1;
    }
    return allProofs.length - 1;
  });

  const activeProof = allProofs[activeIndex] || allProofs[0];
  const activeUrl = activeProof?.url || proofUrl;

  if (!activeUrl) return null;

  const isFullyPaid = pendingAmount !== undefined ? Number(pendingAmount) <= 0 : false;
  const numAmount = amount !== undefined ? Number(amount) : undefined;
  const numPending = pendingAmount !== undefined ? Number(pendingAmount) : undefined;
  const numCleared = numAmount !== undefined && numPending !== undefined ? Math.max(0, numAmount - numPending) : undefined;
  const defaultLabel = isFullyPaid ? 'Verify & Close CD' : 'Approve Payment Proof (Keep Open)';

  const resolvedUrl = resolvePhotoUrl(activeUrl);
  const isPdf =
    activeUrl.toLowerCase().endsWith('.pdf') ||
    activeUrl.toLowerCase().includes('.pdf?') ||
    activeUrl.startsWith('data:application/pdf');

  const handleZoomIn = () => setZoom((z) => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.75, z - 0.25));
  const handleResetZoom = () => setZoom(1);

  const handleSelectProof = (idx: number) => {
    setActiveIndex(idx);
    setZoom(1);
    setLoadError(false);
  };

  const handlePrevProof = () => {
    if (activeIndex > 0) handleSelectProof(activeIndex - 1);
  };

  const handleNextProof = () => {
    if (activeIndex < allProofs.length - 1) handleSelectProof(activeIndex + 1);
  };

  return (
    <div
      className="fixed inset-0 z-70 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-emerald-900 to-[#064D2B] text-white flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/80 grid place-items-center flex-shrink-0 text-emerald-200">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight truncate">
                  {orderNumber}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 shrink-0">
                  Verified Payment Proof
                </span>
              </div>
              <p className="text-[11px] text-emerald-200 truncate mt-0.5">
                {supplierName ? `Buyer / Account: ${supplierName}` : 'Settlement Receipt / Slip'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <a
              href={resolvedUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1 transition shadow-xs"
              title="Download proof file"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Download</span>
            </a>
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold inline-flex items-center gap-1 transition"
              title="Open raw file in new tab"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Open Raw</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-white grid place-items-center transition cursor-pointer"
              title="Close viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Multi-Proof Installments Tab Bar (If multiple partial payments exist) */}
        {allProofs.length > 1 && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-[#04331C] to-[#064D2B] border-b border-emerald-800/80 flex items-center justify-between gap-2 overflow-x-auto flex-shrink-0">
            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto py-0.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 mr-1.5 flex items-center gap-1 shrink-0">
                <Receipt size={13} /> Installments ({allProofs.length}):
              </span>
              {allProofs.map((p, idx) => {
                const isSelected = idx === activeIndex;
                const pAmt = Number(p.amount || 0);
                return (
                  <button
                    key={p.id || idx}
                    type="button"
                    onClick={() => handleSelectProof(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300'
                        : 'bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-700/60'
                    }`}
                  >
                    <span className="text-[10px] font-black opacity-90">#{idx + 1}</span>
                    <span className="font-extrabold font-mono">₹{pAmt.toLocaleString('en-IN')}</span>
                    {p.submittedAt && (
                      <span className="text-[10px] opacity-80 font-normal">
                        ({new Date(p.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})
                      </span>
                    )}
                    {p.verified && (
                      <CheckCircle2 size={12} className="text-emerald-200" title="Admin Verified" />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1 shrink-0 text-emerald-100 text-xs font-semibold pl-2 border-l border-emerald-700/60">
              <button
                type="button"
                disabled={activeIndex === 0}
                onClick={handlePrevProof}
                className="p-1 rounded bg-emerald-800/80 hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition cursor-pointer"
                title="Previous Proof"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-[11px] font-mono px-1">
                {activeIndex + 1} / {allProofs.length}
              </span>
              <button
                type="button"
                disabled={activeIndex === allProofs.length - 1}
                onClick={handleNextProof}
                className="p-1 rounded bg-emerald-800/80 hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed text-white transition cursor-pointer"
                title="Next Proof"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Info Meta Strip */}
        <div className="px-4 py-2 bg-emerald-50/90 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
          <div className="flex flex-wrap items-center gap-3 text-gray-700">
            {numAmount !== undefined && (
              <span className="inline-flex items-center gap-1">
                <CreditCard size={13} className="text-emerald-700" />
                <span className="font-semibold text-gray-500">Total CD Amount:</span>
                <strong className="text-gray-900 font-extrabold">
                  ₹{numAmount.toLocaleString('en-IN')}
                </strong>
              </span>
            )}
            {numCleared !== undefined && numCleared > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="font-semibold text-gray-500">Cleared / Paid:</span>
                <strong className="text-emerald-700 font-extrabold">
                  ₹{numCleared.toLocaleString('en-IN')}
                </strong>
              </span>
            )}
            {numPending !== undefined && (
              <span className="inline-flex items-center gap-1">
                <span className="font-semibold text-gray-500">Remaining Balance:</span>
                <strong
                  className={`font-extrabold ${
                    numPending <= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  ₹{numPending.toLocaleString('en-IN')}
                </strong>
              </span>
            )}
            {activeProof.amount !== undefined && activeProof.amount > 0 && allProofs.length > 1 && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 border border-emerald-300 font-black text-emerald-900 shadow-2xs">
                Installment #{activeIndex + 1}: ₹{Number(activeProof.amount).toLocaleString('en-IN')}
              </span>
            )}
            {(activeProof.paymentMode || paymentMode) && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-white border border-gray-200 font-semibold text-gray-600">
                Mode: {(activeProof.paymentMode || paymentMode || '').replace(/_/g, ' ')}
              </span>
            )}
            {activeProof.reference && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-white border border-gray-200 font-semibold text-gray-600">
                Ref: {activeProof.reference}
              </span>
            )}
            {activeProof.submittedBy && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-white border border-gray-200 font-semibold text-gray-600 inline-flex items-center gap-1">
                <User size={11} className="text-gray-400" /> By: {activeProof.submittedBy}
              </span>
            )}
          </div>

          {/* Zoom controls for images */}
          {!isPdf && (
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.75}
                className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-[10px] font-mono font-bold px-1.5 text-gray-700">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1 rounded text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer border-l border-gray-200"
                title="Reset Zoom"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="relative flex-1 bg-gray-950 overflow-auto flex items-center justify-center p-2 sm:p-4 min-h-[320px] max-h-[65vh]">
          {allProofs.length > 1 && (
            <>
              <button
                type="button"
                disabled={activeIndex === 0}
                onClick={handlePrevProof}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/95 text-white disabled:opacity-0 disabled:pointer-events-none transition shadow-2xl grid place-items-center cursor-pointer z-20 border border-white/20 active:scale-95"
                title="View Previous Installment Proof"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                disabled={activeIndex === allProofs.length - 1}
                onClick={handleNextProof}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 hover:bg-black/95 text-white disabled:opacity-0 disabled:pointer-events-none transition shadow-2xl grid place-items-center cursor-pointer z-20 border border-white/20 active:scale-95"
                title="View Next Installment Proof"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          {isPdf ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <iframe
                src={resolvedUrl}
                title="Payment Proof Document"
                className="w-full h-[55vh] rounded-xl border border-gray-700 bg-white shadow-lg"
              />
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-md transition"
                >
                  <Download size={14} /> Download PDF Receipt
                </a>
              </div>
            </div>
          ) : !loadError ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              <img
                src={resolvedUrl}
                alt={`Proof for ${orderNumber} - Installment ${activeIndex + 1}`}
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-150 select-none"
                onError={() => setLoadError(true)}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-white flex flex-col items-center gap-3 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 grid place-items-center">
                <AlertCircle size={24} />
              </div>
              <strong className="text-sm font-bold text-gray-200">
                Payment Proof Attachment Available
              </strong>
              <p className="text-xs text-gray-400">
                The file was securely uploaded. You can view or download it directly using the link
                below.
              </p>
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition shadow-sm mt-1"
              >
                <ExternalLink size={14} /> Open Attachment in New Tab
              </a>
            </div>
          )}
        </div>

        {/* Notes if present */}
        {(activeProof.notes || notes) && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 flex items-center gap-2">
            <span className="font-bold text-gray-700 shrink-0">
              {allProofs.length > 1 ? `Installment #${activeIndex + 1} Remarks:` : 'Notes:'}
            </span>
            <span className="truncate">{activeProof.notes || notes}</span>
          </div>
        )}

        {/* Modal Bottom Actions */}
        <div className="px-4 sm:px-6 py-3 bg-white border-t border-gray-200 flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <a
              href={resolvedUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download size={14} /> Download Proof
            </a>
          </div>

          <div className="flex items-center gap-2">
            {canApprove && onApprove && (
              <button
                type="button"
                onClick={onApprove}
                disabled={isApproving}
                className="px-4 py-2 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 size={16} />
                {isApproving ? 'Approving...' : (approveLabel || defaultLabel)}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
