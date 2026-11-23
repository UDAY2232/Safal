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
  CreditCard,
  Trash2,
  Edit3,
  Lock,
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
  onOpenDuePayment?: (order: PurchaseOrder) => void;
}

export const PODetailModal: React.FC<PODetailModalProps> = ({
  order,
  onClose,
  onRefresh,
  onNotify,
  onOpenDuePayment,
}) => {
  const { user } = useAuth();
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showFinancials, setShowFinancials] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editSupplierName, setEditSupplierName] = useState(order.supplierName || '');
  const [editOrderPlace, setEditOrderPlace] = useState(order.orderPersonPlace || '');
  const [editPoDate, setEditPoDate] = useState(order.poDate ? order.poDate.substring(0, 10) : '');
  const [editNotes, setEditNotes] = useState(order.notes || '');
  const [editGrandTotal, setEditGrandTotal] = useState(String(order.grandTotal || ''));
  const [editAdvanceAmount, setEditAdvanceAmount] = useState(String(order.advanceAmount || '0'));
  const [editError, setEditError] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isEmployee = user?.role === 'EMPLOYEE';
  const isCD = String(order.poNumber || '').startsWith('CD/') || order.supplierCategory === 'Customer Due';
  // Strict Role Check: ONLY ADMIN can delete records. Employees cannot delete.
  const canDelete = isAdmin;

  const grandTotal = Number(order.grandTotal || 0);
  const adv = Number(order.advanceAmount || 0);
  const pendingDue = Number(order.pendingAmount ?? Math.max(0, grandTotal - adv));

  const supplierDisplayName = order.supplierName || (order as any).supplier?.name || (isCD ? 'Retail Customer' : 'Party / Supplier');
  const createdByDisplayName = order.createdByName || (order as any).createdBy?.name || 'Staff';
  const financial = order.financial || (order as any).financialRecord || {
    financialStatus: 'NOT_RECORDED',
    realizedProfitLoss: null,
  };

  const handleSaveEdit = async () => {
    try {
      setIsProcessing(true);
      setEditError('');
      const payload: any = {
        supplierName: editSupplierName,
        orderPersonPlace: editOrderPlace,
        poDate: editPoDate,
        notes: editNotes,
      };
      if (!isEmployee) {
        payload.grandTotal = Number(editGrandTotal);
        payload.advanceAmount = Number(editAdvanceAmount);
      }
      await api.updatePurchaseOrder(order.id, payload);
      onNotify(`${isCD ? 'Customer Due' : 'Purchase Order'} ${order.poNumber} updated successfully!`);
      setIsEditing(false);
      onRefresh();
      onClose();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update order');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsProcessing(true);
      await api.approvePurchaseOrder(order.id);
      onNotify(`${isCD ? 'Customer Due' : 'Purchase Order'} ${order.poNumber} approved`);
      onRefresh();
      onClose();
    } catch (err: any) {
      onNotify(err.message || `Failed to approve ${isCD ? 'CD' : 'PO'}`);
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
      onNotify(`${isCD ? 'Customer Due' : 'Purchase Order'} ${order.poNumber} rejected`);
      onRefresh();
      onClose();
    } catch (err: any) {
      onNotify(err.message || 'Failed to reject PO');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClosePO = async () => {
    if (pendingDue > 0) {
      onNotify(`Cannot close PO: Due of ₹${pendingDue.toLocaleString('en-IN')} is still pending. Status must remain Open until Due is ₹0.`);
      return;
    }
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

  const handleDeletePO = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete Purchase Order "${order.poNumber}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setIsProcessing(true);
      await api.deletePurchaseOrder(order.id);
      onNotify(`Purchase Order ${order.poNumber} deleted successfully`);
      onRefresh();
      onClose();
    } catch (err: any) {
      onNotify(err.message || 'Failed to delete Purchase Order');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);
      onNotify(`Preparing PDF for ${order.poNumber}...`);
      await api.downloadPurchaseOrderPDF(order.id, order.poNumber);
      onNotify(`Purchase Order ${order.poNumber} PDF downloaded successfully!`);
    } catch (err: any) {
      console.error('PDF download error:', err);
      try {
        window.open(api.downloadPOPDFUrl(order.id), '_blank');
      } catch {
        onNotify(err.message || 'Failed to download PO PDF');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal !w-[940px] max-w-[96vw] max-h-[92vh] flex flex-col p-3.5 sm:p-5 md:p-6 overflow-hidden">
        {/* Header */}
        <div className="modal-header pb-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#087A3E] grid place-items-center">
              <ShoppingCart size={22} />
            </div>
            <div>
              <span className="eyebrow text-emerald-800 font-bold">
                {isEmployee ? 'CUSTOMER DUE (CD) DETAILS' : 'PURCHASE ORDER DETAILS'}
              </span>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">{order.poNumber}</h2>
                <StatusBadge status={order.status} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {order.status !== 'CLOSED' && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  isEditing
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 shadow-2xs'
                }`}
              >
                <Edit3 size={13} /> {isEditing ? 'Cancel Edit' : 'Edit Details'}
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 py-4 pr-1 space-y-4 text-xs">
          {/* Payment Proof Review Banner */}
          {order.paymentProofUrl && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <span className="font-bold text-emerald-950 text-xs block">Submitted Payment Proof / Settlement Receipt</span>
                  <a
                    href={order.paymentProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:text-emerald-900 underline text-[11px] font-semibold"
                  >
                    Click to Open Full Uploaded Receipt / Proof Image ↗
                  </a>
                </div>
              </div>
              {(isAdmin || isAccountant) && order.status !== 'CLOSED' && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setIsProcessing(true);
                      await api.closePurchaseOrder(order.id);
                      onNotify(`${isCD ? 'Customer Due' : 'Order'} ${order.poNumber} verified and CLOSED!`);
                      onRefresh();
                      onClose();
                    } catch (err: any) {
                      onNotify(err.message || 'Failed to approve proof');
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <CheckCircle size={15} /> Approve Proof &amp; Close CD
                </button>
              )}
            </div>
          )}

          {/* Edit Form */}
          {isEditing && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 size={16} className="text-amber-800" />
                  <span className="font-extrabold text-amber-950 text-xs uppercase tracking-wide">
                    Edit {isCD ? 'Customer Due (CD)' : 'Purchase Order'}
                  </span>
                </div>
                {isEmployee && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                    <Lock size={11} /> Amount fields locked (Admin/Accountant authorized)
                  </span>
                )}
              </div>

              {editError && (
                <div className="p-2 bg-red-100 border border-red-300 text-red-800 rounded-lg text-xs font-semibold">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-gray-700 font-bold mb-1">
                    {isCD ? 'Buyer / Customer Name *' : 'Supplier Name *'}
                  </label>
                  <input
                    type="text"
                    value={editSupplierName}
                    onChange={(e) => setEditSupplierName(e.target.value)}
                    className="w-full h-9 px-3 border border-amber-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    {isCD ? 'Buyer Area / Place' : 'Area / Place'}
                  </label>
                  <input
                    type="text"
                    value={editOrderPlace}
                    onChange={(e) => setEditOrderPlace(e.target.value)}
                    className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Order Date</label>
                  <input
                    type="date"
                    value={editPoDate}
                    onChange={(e) => setEditPoDate(e.target.value)}
                    className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                    <span>Total Amount (₹)</span>
                    {isEmployee && <span className="text-[10px] text-gray-400 font-normal">Read-only for staff</span>}
                  </label>
                  <input
                    type="number"
                    value={editGrandTotal}
                    onChange={(e) => setEditGrandTotal(e.target.value)}
                    disabled={isEmployee}
                    className={`w-full h-9 px-3 border rounded-xl text-xs font-bold ${
                      isEmployee
                        ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                        : 'bg-white text-gray-900 border-amber-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                    <span>{isCD ? 'Initial Paid Amount (₹)' : 'Advance Paid (₹)'}</span>
                    {isEmployee && <span className="text-[10px] text-gray-400 font-normal">Read-only for staff</span>}
                  </label>
                  <input
                    type="number"
                    value={editAdvanceAmount}
                    onChange={(e) => setEditAdvanceAmount(e.target.value)}
                    disabled={isEmployee}
                    className={`w-full h-9 px-3 border rounded-xl text-xs font-bold ${
                      isEmployee
                        ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                        : 'bg-white text-gray-900 border-amber-300'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Additional order or delivery remarks..."
                  className="w-full p-2 border border-gray-300 rounded-xl text-xs bg-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isProcessing}
                  className="px-4 py-1.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Check size={14} /> Save Changes
                </button>
              </div>
            </div>
          )}
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
            <div>
              <span className="text-gray-400 font-medium block">{isCD ? 'Buyer / Customer' : 'Supplier'}</span>
              <strong className="text-gray-800 text-xs block mt-0.5 truncate">{supplierDisplayName}</strong>
            </div>
            <div>
              <span className="text-gray-400 font-medium block">Order Date</span>
              <strong className="text-gray-800 text-xs block mt-0.5">
                {new Date(order.poDate).toLocaleDateString('en-GB')}
              </strong>
            </div>
            <div>
              <span className="text-gray-400 font-medium block">Order Person</span>
              <strong className="text-gray-800 text-xs block mt-0.5 truncate">{createdByDisplayName}</strong>
            </div>
            <div>
              <span className="text-emerald-700 font-semibold block">Order Area</span>
              <strong className="text-emerald-800 text-xs block mt-0.5 font-bold truncate">
                {order.orderPersonPlace || 'Hyderabad'}
              </strong>
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

          {/* Line Items Table with Horizontal Scroll Support */}
          <div className="border border-emerald-700/20 rounded-xl overflow-hidden shadow-sm bg-white">
            <div className="bg-[#064D2B] text-white px-3.5 py-2.5 font-bold flex justify-between items-center text-xs">
              <span>Procured Fruit Items ({order.items?.length || order.itemsCount})</span>
              <span>Total: ₹{order.grandTotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="table-scroll-wrap overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[720px]">
                <thead className="bg-[#E7F5E9] text-[#064D2B] font-semibold">
                  <tr>
                    <th className="p-2.5 whitespace-nowrap">Fruit / Item</th>
                    <th className="p-2.5 whitespace-nowrap">Category &amp; Grade</th>
                    <th className="p-2.5 text-right whitespace-nowrap">Quantity</th>
                    <th className="p-2.5 text-right whitespace-nowrap">Rate</th>
                    <th className="p-2.5 text-right whitespace-nowrap">Disc / Tax</th>
                    <th className="p-2.5 text-right whitespace-nowrap pr-4 min-w-[130px]">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50/40 transition">
                        <td className="p-2.5 font-semibold text-gray-800 whitespace-nowrap">{item.fruitName}</td>
                        <td className="p-2.5 text-gray-600 whitespace-nowrap">
                          {item.varietyGrade} ({item.category})
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap font-medium text-gray-700">
                          {item.quantity.toLocaleString('en-IN')} {item.unit}
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap text-gray-700">₹{item.ratePerUnit.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 text-right text-gray-500 whitespace-nowrap">
                          -{item.discountPercent}% / +{item.taxPercent}%
                        </td>
                        <td className="p-2.5 text-right font-bold text-gray-900 whitespace-nowrap pr-4">
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
          </div>

          {/* Financial Tracking Banner (Only for Procurement POs, not Customer Dues) */}
          {!isCD && financial && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-800">Financial Profit / Loss Analysis:</span>
                  <StatusBadge status={financial.financialStatus || 'PENDING'} />
                </div>
                <p className="text-[11px] text-gray-600 mt-1">
                  {financial.realizedProfitLoss !== null && financial.realizedProfitLoss !== undefined ? (
                    <span>
                      Verified Result:{' '}
                      <strong
                        className={
                          financial.realizedProfitLoss >= 0 ? 'text-green-700' : 'text-red-700'
                        }
                      >
                        ₹
                        {Math.abs(financial.realizedProfitLoss).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        ({financial.realizedProfitLoss >= 0 ? 'Net Profit' : 'Net Loss'})
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
          )}

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

        {/* Footer Actions - Responsive Wrap for Mobile & Desktop */}
        <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="secondary-button !border-emerald-700 !text-emerald-800 hover:!bg-emerald-50 inline-flex items-center justify-center gap-1.5 transition disabled:opacity-50 w-full sm:w-auto"
          >
            <Download size={14} className={isDownloading ? 'animate-bounce' : ''} />
            {isDownloading ? 'Downloading...' : 'Download PDF'}
          </button>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            {isAdmin && order.status === 'PENDING_APPROVAL' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectInput(true)}
                  disabled={isProcessing}
                  className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-xl font-bold text-xs transition flex-1 sm:flex-none text-center cursor-pointer"
                >
                  Reject {isCD ? 'CD' : 'PO'}
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="primary-button inline-flex items-center justify-center gap-1.5 flex-1 sm:flex-none cursor-pointer"
                >
                  <Check size={15} /> Approve {isCD ? 'CD' : 'PO'}
                </button>
              </>
            )}

            {onOpenDuePayment &&
              Number(
                order.pendingAmount ??
                  Math.max(0, order.grandTotal - (order.advanceAmount || 0))
              ) > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDuePayment(order);
                  }}
                  className="secondary-button !border-rose-400 !text-rose-800 hover:!bg-rose-50 inline-flex items-center justify-center gap-1.5 transition flex-1 sm:flex-none cursor-pointer"
                >
                  <CreditCard size={14} /> Submit Due Payment
                </button>
              )}

            {order.status === 'OPEN' && isAdmin && (
              <button
                type="button"
                onClick={handleClosePO}
                disabled={isProcessing || pendingDue > 0}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition flex-1 sm:flex-none ${
                  pendingDue > 0
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                    : 'primary-button !bg-gray-800 cursor-pointer'
                }`}
                title={
                  pendingDue > 0
                    ? `Cannot close: Due of ₹${pendingDue.toLocaleString('en-IN')} is still pending. Settle full due to close.`
                    : 'Mark as Closed'
                }
              >
                <CheckCircle size={14} /> {isEmployee ? 'Mark CD as Closed' : 'Mark as Closed'}
              </button>
            )}

            {order.status === 'OPEN' && !isAdmin && (
              <span className="text-[11px] text-gray-600 font-medium px-2.5 py-1.5 bg-gray-50 rounded-lg border border-gray-200 inline-flex items-center gap-1">
                🔒 Admin approval required to close
              </span>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={handleDeletePO}
                disabled={isProcessing}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl font-bold text-xs transition disabled:opacity-50 cursor-pointer flex-1 sm:flex-none"
                title="Permanently delete this record"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}

            <button type="button" className="secondary-button flex-1 sm:flex-none" onClick={onClose}>
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

