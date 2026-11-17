import React, { useState } from 'react';
import {
  X,
  ShoppingCart,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Check,
  TrendingUp,
  FileText,
  DollarSign,
} from 'lucide-react';
import { PurchaseOrder } from '../types';
import { StatusBadge } from './StatusBadge';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { POFinancialsModal } from './POFinancialsModal';

interface PODetailModalProps {
  order: PurchaseOrder;
  onClose: () => void;
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}

export const PODetailModal: React.FC<PODetailModalProps> = ({
  order,
  onClose,
  onRefresh,
  onNotify,
}) => {
  const { user } = useAuth();
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showFinancials, setShowFinancials] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      await api.approvePurchaseOrder(order.id);
      onNotify(`Purchase Order ${order.poNumber} approved`);
      onRefresh();
      onClose();
    } catch (err: any) {
      onNotify(err.message || 'Failed to approve PO');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) {
      onNotify('Please provide a rejection reason');
      return;
    }
    try {
      setIsProcessing(true);
      await api.rejectPurchaseOrder(order.id, rejectReason);
      onNotify(`Purchase Order ${order.poNumber} rejected`);
      onRefresh();
      onClose();
    } catch (err: any) {
      onNotify(err.message || 'Failed to reject PO');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClosePO = async () => {
    try {
      setIsProcessing(true);
      await api.closePurchaseOrder(order.id);
      onNotify(`Purchase Order ${order.poNumber} marked as Closed`);
      onRefresh();
      onClose();
    } catch (err: any) {
      onNotify(err.message || 'Failed to close PO');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadPDF = () => {
    window.open(api.downloadPOPDFUrl(order.id), '_blank');
  };

  return (
    <div className="modal-backdrop">
      <div className="modal !w-[840px] max-w-[96vw] max-h-[92vh] flex flex-col p-6 overflow-hidden">
        {/* Header */}
        <div className="modal-header pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#087A3E] grid place-items-center">
              <ShoppingCart size={22} />
            </div>
            <div>
              <span className="eyebrow text-emerald-800 font-bold">PURCHASE ORDER DETAILS</span>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">{order.poNumber}</h2>
                <StatusBadge status={order.status} />
              </div>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 py-4 pr-1 space-y-4 text-xs">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div>
              <span className="text-gray-400 font-medium block">Supplier</span>
              <strong className="text-gray-800 text-xs block mt-0.5 truncate">{order.supplierName}</strong>
            </div>
            <div>
              <span className="text-gray-400 font-medium block">Order Date</span>
              <strong className="text-gray-800 text-xs block mt-0.5">
                {new Date(order.poDate).toLocaleDateString('en-GB')}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 font-medium block">Created By</span>
              <strong className="text-gray-800 text-xs block mt-0.5 truncate">{order.createdByName}</strong>
            </div>
            <div>
              <span className="text-gray-400 font-medium block">Grand Total</span>
              <strong className="text-[#087A3E] text-xs block mt-0.5 font-bold">
                ₹{order.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span className="text-emerald-700 font-medium block">Advance Paid</span>
              <strong className="text-emerald-800 text-xs block mt-0.5 font-bold">
                ₹{Number(order.advanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </div>
            <div>
              <span className="text-amber-700 font-medium block">Pending Balance</span>
              <strong className="text-amber-800 text-xs block mt-0.5 font-bold">
                ₹{Number(order.pendingAmount ?? Math.max(0, order.grandTotal - (order.advanceAmount || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
            </div>
          </div>

          {/* Rejection alert if applicable */}
          {order.rejectionReason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-start gap-2">
              <XCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <strong>Rejection Reason:</strong>
                <p className="mt-0.5">{order.rejectionReason}</p>
              </div>
            </div>
          )}

          {/* Line Items Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-[#064D2B] text-white px-3 py-2 font-bold flex justify-between items-center text-xs">
              <span>Procured Fruit Items ({order.items?.length || order.itemsCount})</span>
              <span>Total: ₹{order.grandTotal.toLocaleString('en-IN')}</span>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#E7F5E9] text-[#064D2B] font-semibold">
                <tr>
                  <th className="p-2.5">Fruit / Item</th>
                  <th className="p-2.5">Category &amp; Grade</th>
                  <th className="p-2.5 text-right">Quantity</th>
                  <th className="p-2.5 text-right">Rate</th>
                  <th className="p-2.5 text-right">Disc / Tax</th>
                  <th className="p-2.5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="p-2.5 font-semibold text-gray-800">{item.fruitName}</td>
                      <td className="p-2.5 text-gray-600">
                        {item.varietyGrade} ({item.category})
                      </td>
                      <td className="p-2.5 text-right">
                        {item.quantity.toLocaleString('en-IN')} {item.unit}
                      </td>
                      <td className="p-2.5 text-right">₹{item.ratePerUnit.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right text-gray-500">
                        -{item.discountPercent}% / +{item.taxPercent}%
                      </td>
                      <td className="p-2.5 text-right font-bold text-gray-900">
                        ₹{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-gray-400">
                      Product details available in official record
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Tracking Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-800">Financial Profit / Loss Analysis:</span>
                <StatusBadge status={order.financial.financialStatus} />
              </div>
              <p className="text-[11px] text-gray-600 mt-1">
                {order.financial.realizedProfitLoss !== null ? (
                  <span>
                    Verified Result:{' '}
                    <strong
                      className={
                        order.financial.realizedProfitLoss >= 0 ? 'text-green-700' : 'text-red-700'
                      }
                    >
                      ₹
                      {Math.abs(order.financial.realizedProfitLoss).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                      })}{' '}
                      ({order.financial.realizedProfitLoss >= 0 ? 'Net Profit' : 'Net Loss'})
                    </strong>
                  </span>
                ) : (
                  <span>Awaiting verified associated costs &amp; linked recognized sales revenue.</span>
                )}
              </p>
            </div>
            <button
              onClick={() => setShowFinancials(true)}
              className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg font-semibold inline-flex items-center gap-1.5 transition flex-shrink-0"
            >
              <TrendingUp size={14} /> Update P&amp;L Records
            </button>
          </div>

          {/* Reject Reason input box */}
          {showRejectInput && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <label className="block text-red-900 font-bold">Specify Reason for Rejection *</label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Rate exceeds seasonal procurement ceiling; fruit variety grade not specified."
                className="w-full p-2 border border-red-300 rounded text-xs focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectInput(false)}
                  className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded text-xs"
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

        {/* Footer Actions */}
        <div className="modal-actions pt-3 border-t border-gray-100 flex items-center justify-between gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={downloadPDF}
            className="secondary-button !border-emerald-700 !text-emerald-800 inline-flex items-center gap-1.5"
          >
            <Download size={14} /> Download PDF
          </button>

          <div className="flex items-center gap-2">
            {isAdmin && order.status === 'PENDING_APPROVAL' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectInput(true)}
                  disabled={isProcessing}
                  className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-lg font-bold text-xs transition"
                >
                  Reject PO
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="primary-button inline-flex items-center gap-1.5"
                >
                  <Check size={15} /> Approve PO
                </button>
              </>
            )}

            {order.status === 'OPEN' && (
              <button
                type="button"
                onClick={handleClosePO}
                disabled={isProcessing}
                className="primary-button inline-flex items-center gap-1.5 !bg-gray-800"
              >
                <CheckCircle size={14} /> Mark as Closed
              </button>
            )}

            <button type="button" className="secondary-button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      {showFinancials && (
        <POFinancialsModal
          order={order}
          onClose={() => setShowFinancials(false)}
          onSuccess={(msg) => {
            onNotify(msg);
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

