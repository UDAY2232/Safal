import React, { useState } from 'react';
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
} from 'lucide-react';
import { resolvePhotoUrl } from '../utils/imageUtils';

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
}) => {
  const [zoom, setZoom] = useState(1);
  const [loadError, setLoadError] = useState(false);

  if (!proofUrl) return null;

  const isFullyPaid = pendingAmount !== undefined ? Number(pendingAmount) <= 0 : false;
  const numAmount = amount !== undefined ? Number(amount) : undefined;
  const numPending = pendingAmount !== undefined ? Number(pendingAmount) : undefined;
  const numCleared = numAmount !== undefined && numPending !== undefined ? Math.max(0, numAmount - numPending) : undefined;
  const defaultLabel = isFullyPaid ? 'Verify & Close CD' : 'Approve Payment Proof (Keep Open)';

  const resolvedUrl = resolvePhotoUrl(proofUrl);
  const isPdf =
    proofUrl.toLowerCase().endsWith('.pdf') ||
    proofUrl.toLowerCase().includes('.pdf?') ||
    proofUrl.startsWith('data:application/pdf');

  const handleZoomIn = () => setZoom((z) => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.75, z - 0.25));
  const handleResetZoom = () => setZoom(1);

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
            {paymentMode && (
              <span className="text-[11px] px-2 py-0.5 rounded bg-white border border-gray-200 font-semibold text-gray-600">
                Mode: {paymentMode.replace(/_/g, ' ')}
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
        <div className="flex-1 bg-gray-950 overflow-auto flex items-center justify-center p-2 sm:p-4 min-h-[320px] max-h-[65vh]">
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
                alt={`Proof for ${orderNumber}`}
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
        {notes && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600 flex items-center gap-2">
            <span className="font-bold text-gray-700 shrink-0">Notes:</span>
            <span className="truncate">{notes}</span>
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
