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
  Truck,
  Eye,
  Scale,
  ShieldCheck,
  Image as ImageIcon,
  Calculator,
  CheckCircle2,
} from 'lucide-react';
import { PurchaseOrder } from '../types';
import { StatusBadge } from './StatusBadge';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { POFinancialsModal } from './POFinancialsModal';
import { ProofViewerModal } from './ProofViewerModal';
import { resolvePhotoUrl, compressImageFile } from '../utils/imageUtils';

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
  const isVendor = user?.role === 'VENDOR';
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showFinancials, setShowFinancials] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showProofViewer, setShowProofViewer] = useState(false);
  const [activeDocPreview, setActiveDocPreview] = useState<{ url: string; title: string } | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editSupplierName, setEditSupplierName] = useState(order.supplierName || '');
  const [editOrderPlace, setEditOrderPlace] = useState(order.orderPersonPlace || '');
  const [editPoDate, setEditPoDate] = useState(order.poDate ? order.poDate.substring(0, 10) : '');
  const [editNotes, setEditNotes] = useState(order.notes || '');
  const [editGrandTotal, setEditGrandTotal] = useState(String(order.grandTotal || ''));
  const [editAdvanceAmount, setEditAdvanceAmount] = useState(String(order.advanceAmount || '0'));
  const [editError, setEditError] = useState('');

  // Editable items state
  const [editItems, setEditItems] = useState<any[]>(() => {
    return (order.items || []).map((it: any) => ({
      ...it,
      quantity: Number(it.quantity) || 0,
      ratePerUnit: Number(it.ratePerUnit) || 0,
      lineTotal: Number(it.lineTotal) || ((Number(it.quantity) || 0) * (Number(it.ratePerUnit) || 0)),
    }));
  });

  useEffect(() => {
    if (order.items) {
      setEditItems(
        order.items.map((it: any) => ({
          ...it,
          quantity: Number(it.quantity) || 0,
          ratePerUnit: Number(it.ratePerUnit) || 0,
          lineTotal: Number(it.lineTotal) || ((Number(it.quantity) || 0) * (Number(it.ratePerUnit) || 0)),
        }))
      );
    }
  }, [order]);

  const handleItemQtyChange = (index: number, newQtyVal: string) => {
    const newQty = Math.max(0, Number(newQtyVal) || 0);
    const updated = [...editItems];
    const item = { ...updated[index] };
    item.quantity = newQty;
    item.lineTotal = newQty * Number(item.ratePerUnit || 0);
    updated[index] = item;
    setEditItems(updated);

    const newGrand = updated.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0);
    setEditGrandTotal(String(newGrand));
    setEditAdvanceAmount(String(Math.round(newGrand * 0.70)));
  };

  // Hub Weighbridge & QC Modal State
  const [showQCModal, setShowQCModal] = useState(false);
  const [qcGrossKg, setQcGrossKg] = useState<string>(order.weighbridgeGrossKg ? String(order.weighbridgeGrossKg) : '');
  const [qcTareKg, setQcTareKg] = useState<string>(order.weighbridgeTareKg ? String(order.weighbridgeTareKg) : '');
  const [qcStatus, setQcStatus] = useState<string>(order.qcInspectionStatus || 'PASSED');
  const [qcGradeA, setQcGradeA] = useState<string>(order.qcGradeARatio ? String(order.qcGradeARatio) : '95');
  const [qcGradeB, setQcGradeB] = useState<string>(order.qcGradeBRatio ? String(order.qcGradeBRatio) : '5');
  const [qcWastage, setQcWastage] = useState<string>(order.qcWastageKg ? String(order.qcWastageKg) : '0');
  const [qcInspector, setQcInspector] = useState<string>(order.qcInspectorName || user?.name || 'Safal QC Lead');
  const [qcRemarks, setQcRemarks] = useState<string>(order.qcInspectionRemarks || '');
  const [qcSlipFile, setQcSlipFile] = useState<File | null>(null);
  const [isSubmittingQC, setIsSubmittingQC] = useState(false);

  const handleSubmitQC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcGrossKg || !qcTareKg) {
      alert('Please enter both Gross Weight and Tare Weight.');
      return;
    }
    const gross = Number(qcGrossKg);
    const tare = Number(qcTareKg);
    if (gross <= tare) {
      alert('Gross Weight must be greater than Tare Weight.');
      return;
    }
    try {
      setIsSubmittingQC(true);
      const fd = new FormData();
      fd.append('weighbridgeGrossKg', qcGrossKg);
      fd.append('weighbridgeTareKg', qcTareKg);
      fd.append('qcInspectionStatus', qcStatus);
      fd.append('qcGradeARatio', qcGradeA);
      fd.append('qcGradeBRatio', qcGradeB);
      fd.append('qcWastageKg', qcWastage);
      fd.append('qcInspectorName', qcInspector);
      fd.append('qcInspectionRemarks', qcRemarks);
      if (qcSlipFile) {
        fd.append('weighbridgeSlip', qcSlipFile);
      }
      await api.submitHubQCInspection(order.id, fd);
      alert('Hub Weighbridge & QC Inspection recorded successfully!');
      setShowQCModal(false);
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to submit QC inspection.');
    } finally {
      setIsSubmittingQC(false);
    }
  };

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
  const isRejected = order.status === 'REJECTED' || Boolean(order.rejectionReason && String(order.rejectionReason).trim() !== '');
  const effectiveStatus = isRejected ? 'REJECTED' : order.status;
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
        items: editItems,
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
                <StatusBadge status={effectiveStatus} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {order.status !== 'CLOSED' && !isRejected && user?.role !== 'VENDOR' && (
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
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div
                onClick={() => setShowProofViewer(true)}
                className="flex items-center gap-3 cursor-pointer group flex-1"
                title="Tap to Inspect Proof Image"
              >
                <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 border border-emerald-200 group-hover:bg-emerald-200 transition">
                  <ImageIcon size={22} />
                </div>
                <div>
                  <span className="font-extrabold text-emerald-950 text-xs block group-hover:text-emerald-700 transition">
                    Verified Payment Proof / Receipt Attached
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowProofViewer(true);
                    }}
                    className="text-emerald-700 hover:text-emerald-900 underline text-[11px] font-bold inline-flex items-center gap-1 mt-0.5 cursor-pointer"
                  >
                    <Eye size={12} /> Tap to Open &amp; Inspect Proof Image
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowProofViewer(true)}
                  className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Eye size={13} /> View Proof
                </button>
                {(isAdmin || isAccountant) && order.status !== 'CLOSED' && !isRejected && isCD && (
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
            </div>
          )}

          {/* Logistics & Dispatch Verification Banner */}
          {(order.dispatchVehicleNumber || order.vehiclePhotoUrl || order.transportBillUrl) && (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <Truck className="text-blue-800" size={18} />
                  <strong className="text-xs font-black text-blue-950 uppercase tracking-wide">
                    Logistics &amp; Dispatch Verification
                  </strong>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {order.dispatchStatus === 'DELIVERED_AT_HUB' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-950 border border-emerald-300 uppercase inline-flex items-center gap-1 shadow-2xs">
                      <MapPin size={11} className="text-emerald-700" /> Vehicle Reached Location · Ready for Sell
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-200 text-blue-900 uppercase">
                      {order.dispatchStatus || 'IN TRANSIT'}
                    </span>
                  )}
                  {isAdmin && (order.dispatchStatus === 'LOADED_AND_DISPATCHED' || order.dispatchStatus === 'IN_TRANSIT' || Boolean(order.dispatchVehicleNumber && order.dispatchVehicleNumber !== '-' && order.vehiclePhotoUrl && order.dispatchStatus !== 'DELIVERED_AT_HUB')) && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setIsProcessing(true);
                          await api.closePurchaseOrder(order.id);
                          onNotify(`Consignment ${order.poNumber} verified! Marked as Vehicle Reached Hub · Ready for Sell.`);
                          onRefresh();
                        } catch (err: any) {
                          onNotify(err.message || 'Failed to update hub arrival');
                        } finally {
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing}
                      className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
                    >
                      <MapPin size={10} className="text-emerald-200" /> Confirm Reached Hub (Ready for Sell)
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                  <span className="text-[10px] text-gray-500 block">Vehicle Registration No.</span>
                  <strong className="text-xs font-black text-blue-900 font-mono block mt-0.5">
                    {order.dispatchVehicleNumber || '-'}
                  </strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                  <span className="text-[10px] text-gray-500 block">Transporter / Agency</span>
                  <strong className="text-xs font-bold text-gray-900 block mt-0.5 truncate">
                    {order.transporterName || 'Direct Vendor Transit'}
                  </strong>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                  <span className="text-[10px] text-gray-500 block">Driver Phone</span>
                  <strong className="text-xs font-bold text-gray-900 block mt-0.5">
                    {order.driverPhone || 'Not Provided'}
                  </strong>
                </div>
              </div>

              {/* Photos & Proofs (In-Place Lightbox Preview) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {order.vehiclePhotoUrl && (
                  <div className="p-2.5 bg-white rounded-xl border border-blue-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-gray-500 block">Truck &amp; Number Plate Photo</span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveDocPreview({
                            url: resolvePhotoUrl(order.vehiclePhotoUrl),
                            title: `Truck & Number Plate Photo - ${order.poNumber}`,
                          })
                        }
                        className="text-[11px] font-extrabold text-blue-700 hover:underline flex items-center gap-1 mt-0.5 truncate cursor-pointer"
                      >
                        <Eye size={12} /> View Number Plate Photo
                      </button>
                    </div>
                    <img
                      src={resolvePhotoUrl(order.vehiclePhotoUrl)}
                      alt="Vehicle"
                      onClick={() =>
                        setActiveDocPreview({
                          url: resolvePhotoUrl(order.vehiclePhotoUrl),
                          title: `Truck & Number Plate Photo - ${order.poNumber}`,
                        })
                      }
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0 cursor-pointer hover:opacity-80 transition"
                      title="Click to view full photo"
                    />
                  </div>
                )}

                {order.transportBillUrl && (
                  <div className="p-2.5 bg-white rounded-xl border border-blue-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-gray-500 block">Transport Bill / Bilty (LR)</span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveDocPreview({
                            url: resolvePhotoUrl(order.transportBillUrl),
                            title: `Transport Bill / Bilty (LR) - ${order.poNumber}`,
                          })
                        }
                        className="text-[11px] font-extrabold text-blue-700 hover:underline flex items-center gap-1 mt-0.5 truncate cursor-pointer"
                      >
                        <FileText size={12} /> View Transport Bill
                      </button>
                    </div>
                    {order.transportBillUrl.endsWith('.pdf') ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveDocPreview({
                            url: resolvePhotoUrl(order.transportBillUrl),
                            title: `Transport Bill / Bilty (LR) - ${order.poNumber}`,
                          })
                        }
                        className="w-12 h-12 rounded-lg bg-blue-100 text-blue-800 grid place-items-center font-bold text-[10px] flex-shrink-0 cursor-pointer hover:bg-blue-200 transition"
                      >
                        PDF
                      </button>
                    ) : (
                      <img
                        src={resolvePhotoUrl(order.transportBillUrl)}
                        alt="Bilty"
                        onClick={() =>
                          setActiveDocPreview({
                            url: resolvePhotoUrl(order.transportBillUrl),
                            title: `Transport Bill / Bilty (LR) - ${order.poNumber}`,
                          })
                        }
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0 cursor-pointer hover:opacity-80 transition"
                        title="Click to view full transport bill"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hub Weighbridge & Quality Control (QC) Inspection Banner */}
          {(order.weighbridgeNetKg || isAdmin || isAccountant) && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <Scale className="text-emerald-800" size={18} />
                  <strong className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                    Hub Weighbridge &amp; Quality Control (QC)
                  </strong>
                </div>
                <div className="flex items-center gap-2">
                  {order.qcInspectionStatus && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900 uppercase">
                      QC: {order.qcInspectionStatus}
                    </span>
                  )}
                  {(isAdmin || isAccountant) && !isRejected && (
                    <button
                      type="button"
                      onClick={() => setShowQCModal(true)}
                      className="px-2.5 py-1 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition shadow-2xs"
                    >
                      <Scale size={11} /> {order.weighbridgeNetKg ? 'Update QC Inspection' : '+ Record Weighbridge & QC'}
                    </button>
                  )}
                </div>
              </div>

              {order.weighbridgeNetKg ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded-xl border border-emerald-200">
                      <span className="text-[9px] text-gray-500 uppercase font-bold block">Gross Truck Wt</span>
                      <strong className="text-xs font-black text-gray-800 block mt-0.5">
                        {Number(order.weighbridgeGrossKg || 0).toLocaleString('en-IN')} KG
                      </strong>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-emerald-200">
                      <span className="text-[9px] text-gray-500 uppercase font-bold block">Empty Tare Wt</span>
                      <strong className="text-xs font-black text-gray-800 block mt-0.5">
                        {Number(order.weighbridgeTareKg || 0).toLocaleString('en-IN')} KG
                      </strong>
                    </div>

                    <div className="bg-white p-2 rounded-xl border-2 border-emerald-500 shadow-2xs">
                      <span className="text-[9px] text-emerald-800 uppercase font-black block">Net Fruit Wt</span>
                      <strong className="text-sm font-black text-emerald-700 block mt-0.5">
                        {Number(order.weighbridgeNetKg || 0).toLocaleString('en-IN')} KG
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                      <span className="text-[10px] font-bold text-gray-500 block">Grading Breakdown</span>
                      <p className="text-[11px] font-semibold text-gray-800 mt-0.5">
                        Grade A: <strong>{Number(order.qcGradeARatio || 95)}%</strong> · Grade B: <strong>{Number(order.qcGradeBRatio || 5)}%</strong>
                      </p>
                      {Number(order.qcWastageKg || 0) > 0 && (
                        <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                          Spoilage Deduction: {Number(order.qcWastageKg)} KG
                        </span>
                      )}
                    </div>

                    {order.weighbridgeSlipUrl && (
                      <div className="bg-white p-2 rounded-xl border border-emerald-200 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-gray-500 block">Digital Weighbridge Slip</span>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveDocPreview({
                                url: resolvePhotoUrl(order.weighbridgeSlipUrl),
                                title: `Digital Weighbridge Slip - ${order.poNumber}`,
                              })
                            }
                            className="text-[11px] font-extrabold text-emerald-700 hover:underline flex items-center gap-1 mt-0.5 truncate cursor-pointer"
                          >
                            <Eye size={12} /> View Scale Receipt
                          </button>
                        </div>
                        <img
                          src={resolvePhotoUrl(order.weighbridgeSlipUrl)}
                          alt="Slip"
                          onClick={() =>
                            setActiveDocPreview({
                              url: resolvePhotoUrl(order.weighbridgeSlipUrl),
                              title: `Digital Weighbridge Slip - ${order.poNumber}`,
                            })
                          }
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0 cursor-pointer hover:opacity-80 transition"
                          title="Click to view full slip"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-emerald-800 italic">
                  Weighbridge scale data and QC grading will be recorded once the truck arrives at the mandi receiving desk.
                </p>
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
              <span className="text-gray-400 font-medium block">Initiate / Order Date</span>
              <strong className="text-gray-800 text-xs block mt-0.5">
                {order.poDate ? new Date(order.poDate).toLocaleDateString('en-GB') : (order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : '-')}
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
                {(() => {
                  const settle = (order as any).settlementDetails;
                  const hasSlip = Boolean(settle?.advanceProofUrl || order.paymentProofUrl);
                  if (!hasSlip) {
                    return '₹0.00 (Pending Slip)';
                  }
                  return `₹${Number(order.advanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                })()}
              </strong>
              {(() => {
                const settle = (order as any).settlementDetails;
                const slip = settle?.advanceProofUrl || order.paymentProofUrl;
                if (!slip) return null;
                return (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveDocPreview({
                        url: resolvePhotoUrl(slip),
                        title: `${order.poNumber} - Advance Payment Receipt`,
                      })
                    }
                    className="mt-1 px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded text-[9px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Eye size={9} /> View Slip ↗
                  </button>
                );
              })()}
            </div>
            <div>
              <span className="text-amber-700 font-medium block">Pending Balance</span>
              <strong className="text-amber-800 text-xs block mt-0.5 font-bold">
                {(() => {
                  if (isRejected) {
                    return '₹0.00 (Order Rejected)';
                  }
                  const settle = (order as any).settlementDetails;
                  const isSettled = Boolean(settle?.settlementCompleted || settle?.hasSettlementEntry || order.status === 'CLOSED');
                  if (!isSettled) {
                    return '₹0.00 (Awaiting Settlement)';
                  }
                  const finalDue = Number(settle?.finalBalanceDue ?? order.pendingAmount ?? 0);
                  return `₹${finalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                })()}
              </strong>
            </div>
          </div>

          {/* Rejection alert if applicable */}
          {(order.rejectionReason || order.status === 'REJECTED') && (
            <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl text-red-900 flex items-start gap-2.5 shadow-xs">
              <XCircle size={18} className="mt-0.5 text-red-600 flex-shrink-0" />
              <div>
                <strong className="text-xs font-black uppercase tracking-wider block text-red-900">
                  Safal Rejected Your Order
                </strong>
                <p className="mt-0.5 text-xs text-red-800 font-semibold">
                  {order.rejectionReason ? `Rejection Reason: ${order.rejectionReason}` : 'This purchase order consignment was rejected by Safal administration.'}
                </p>
              </div>
            </div>
          )}

          {/* Line Items Table with Horizontal Scroll Support */}
          <div className="border border-emerald-700/20 rounded-xl overflow-hidden shadow-sm bg-white">
            <div className="bg-[#064D2B] text-white px-3.5 py-2.5 font-bold flex justify-between items-center text-xs">
              <span>Procured Fruit Items ({isEditing ? editItems.length : (order.items?.length || order.itemsCount)})</span>
              <span>
                Total: ₹{(isEditing ? Number(editGrandTotal || 0) : order.grandTotal).toLocaleString('en-IN')}
                {isEditing && (
                  <span className="ml-2 text-emerald-200 text-[11px] font-normal">
                    (70% Advance: ₹{Number(editAdvanceAmount || 0).toLocaleString('en-IN')})
                  </span>
                )}
              </span>
            </div>
            <div className="table-scroll-wrap overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[720px]">
                <thead className="bg-[#E7F5E9] text-[#064D2B] font-semibold">
                  <tr>
                    <th className="p-2.5 whitespace-nowrap">Fruit / Item</th>
                    <th className="p-2.5 whitespace-nowrap">Category &amp; Grade</th>
                    <th className="p-2.5 text-right whitespace-nowrap">Quantity</th>
                    {!isVendor && <th className="p-2.5 text-right whitespace-nowrap">Rate</th>}
                    {!isVendor && <th className="p-2.5 text-right whitespace-nowrap">Disc / Tax</th>}
                    <th className="p-2.5 text-right whitespace-nowrap pr-4 min-w-[130px]">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isEditing ? (
                    editItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50/40 transition">
                        <td className="p-2.5 font-semibold text-gray-800 whitespace-nowrap">{item.fruitName}</td>
                        <td className="p-2.5 text-gray-600 whitespace-nowrap">
                          {item.varietyGrade} ({item.category})
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap font-medium text-gray-700">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              value={item.quantity === 0 ? '' : item.quantity}
                              onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                              placeholder="0"
                              className="w-24 h-7 px-2 border-2 border-emerald-500 rounded-lg text-xs font-bold text-gray-900 bg-white text-right focus:outline-none focus:ring-2 focus:ring-emerald-400"
                            />
                            <span className="text-[11px] font-bold text-gray-600">{item.unit || 'BOX'}</span>
                          </div>
                        </td>
                        {!isVendor && (
                          <td className="p-2.5 text-right whitespace-nowrap text-gray-700 font-mono font-bold">
                            ₹{Number(item.ratePerUnit || 0).toLocaleString('en-IN')}
                          </td>
                        )}
                        {!isVendor && (
                          <td className="p-2.5 text-right text-gray-500 whitespace-nowrap">
                            -{item.discountPercent || 0}% / +{item.taxPercent || 0}%
                          </td>
                        )}
                        <td className="p-2.5 text-right font-bold text-emerald-900 whitespace-nowrap pr-4 font-mono">
                          ₹{(Number(item.lineTotal) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : order.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50/40 transition">
                        <td className="p-2.5 font-semibold text-gray-800 whitespace-nowrap">{item.fruitName}</td>
                        <td className="p-2.5 text-gray-600 whitespace-nowrap">
                          {item.varietyGrade} ({item.category})
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap font-medium text-gray-700">
                          {item.quantity.toLocaleString('en-IN')} {item.unit}
                        </td>
                        {!isVendor && (
                          <td className="p-2.5 text-right whitespace-nowrap text-gray-700">₹{item.ratePerUnit.toLocaleString('en-IN')}</td>
                        )}
                        {!isVendor && (
                          <td className="p-2.5 text-right text-gray-500 whitespace-nowrap">
                            -{item.discountPercent}% / +{item.taxPercent}%
                          </td>
                        )}
                        <td className="p-2.5 text-right font-bold text-gray-900 whitespace-nowrap pr-4">
                          ₹{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isVendor ? 4 : 6} className="p-4 text-center text-gray-400">
                        Product details available in official record
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Tracking Banner (Only for Procurement POs, strictly for Admin & Accountant, hidden from Vendors) */}
          {!isCD && financial && user?.role !== 'VENDOR' && (user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT') && (
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

          {/* Vendor Mandi Commercial Settlement & Realization Statement (Visible strictly after Admin records settlement) */}
          {!isCD && (() => {
            const settle = (order as any).settlementDetails;
            const hasSettlement = Boolean(
              settle?.hasSettlementEntry ||
              settle?.settlementCompleted ||
              (order.status === 'CLOSED' && Number(order.pendingAmount || 0) === 0)
            );

            if (!hasSettlement) {
              return (
                <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 text-center space-y-1.5 shadow-2xs">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                    <Clock size={16} />
                  </div>
                  <strong className="text-xs font-bold text-gray-800 block font-['Manrope']">
                    Commercial Mandi Settlement &amp; Realization Statement Pending
                  </strong>
                  <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                    Safal operates on a wholesale Mandi sales consignment model. Once this fruit consignment arrives at the regional hub, Safal Accounts will record finalized mandi sale proceeds, 5% admin commission, and 1% APMC cess deductions. The verified settlement statement will appear here upon completion.
                  </p>
                </div>
              );
            }

            return (
              <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50/50 to-white overflow-hidden shadow-xs space-y-3 p-4">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                  <div className="flex items-center gap-2">
                    <Calculator size={16} className="text-[#087A3E]" />
                    <strong className="text-xs font-black uppercase tracking-wider text-emerald-950 font-['Manrope']">
                      Commercial Mandi Settlement &amp; Realization Statement
                    </strong>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    ((order as any).settlementDetails?.settlementCompleted && Number((order as any).settlementDetails?.finalBalanceDue || 0) === 0) || (order.status === 'CLOSED' && Number(order.pendingAmount || 0) === 0)
                      ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                      : (order as any).settlementDetails?.hasSettlementEntry
                      ? 'text-amber-800 bg-amber-100 border-amber-300'
                      : 'text-gray-700 bg-gray-100 border-gray-300'
                  }`}>
                    {(((order as any).settlementDetails?.settlementCompleted && Number((order as any).settlementDetails?.finalBalanceDue || 0) === 0) || (order.status === 'CLOSED' && Number(order.pendingAmount || 0) === 0))
                      ? 'Cleared ✓'
                      : (order as any).settlementDetails?.hasSettlementEntry
                      ? 'OPEN - Due Pending'
                      : 'Awaiting Mandi Realization'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* 1. Gross PO Total */}
                  <div className="flex items-center justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-700 font-bold">1. Gross Consignment PO Value</span>
                    <strong className="font-mono text-gray-900 text-sm font-black">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  {/* 2. Less 5% Safal Platform Admin Share */}
                  <div className="flex items-center justify-between py-1 text-rose-800">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      <span>Less 5% Safal Platform Admin Share / Commission</span>
                    </div>
                    <strong className="font-mono font-bold">
                      -₹{Math.round(grandTotal * 0.05).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  {/* 3. Less 1% APMC Market Cess Fee */}
                  <div className="flex items-center justify-between py-1 text-rose-800 border-b border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                      <span>Less 1% APMC Mandi Market Cess Fee</span>
                    </div>
                    <strong className="font-mono font-bold">
                      -₹{Math.round(grandTotal * 0.01).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  {/* Total Mandi Deductions */}
                  <div className="flex items-center justify-between py-1 bg-rose-50/50 px-2.5 rounded-lg text-rose-900 font-bold">
                    <span>Total Mandi Deductions (6%)</span>
                    <span className="font-mono font-black">
                      -₹{(Math.round(grandTotal * 0.05) + Math.round(grandTotal * 0.01)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Net Vendor Payable */}
                  <div className="flex items-center justify-between py-1.5 bg-emerald-50 px-2.5 rounded-lg text-emerald-950 font-black border border-emerald-200">
                    <span>Net Realized Payable to Vendor</span>
                    <span className="font-mono text-sm">
                      ₹{(grandTotal - (Math.round(grandTotal * 0.05) + Math.round(grandTotal * 0.01))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Advance Disbursed */}
                  <div className="flex items-center justify-between py-1 text-gray-700">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>Advance Disbursed ({order.orderPersonPlace || 'Warangal Hub'})</span>
                      {((order as any).settlementDetails?.advanceProofUrl || order.paymentProofUrl) && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveDocPreview({
                              url: resolvePhotoUrl((order as any).settlementDetails?.advanceProofUrl || order.paymentProofUrl),
                              title: `${order.poNumber} - Advance Bank Transfer Slip`,
                            })
                          }
                          className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={10} /> View Advance Slip ↗
                        </button>
                      )}
                    </div>
                    <strong className="font-mono text-emerald-800 font-bold">
                      ₹{Number(order.advanceAmount || Math.round(grandTotal * 0.70)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>

                  {/* Final Balance Status */}
                  {(() => {
                    const remainingDue = Number(settle?.finalBalanceDue ?? (order.status === 'CLOSED' ? 0 : order.pendingAmount ?? 0));
                    const isFullyCleared = remainingDue === 0 && (Boolean(settle?.settlementCompleted) || (order.status === 'CLOSED' && Number(order.pendingAmount || 0) === 0));

                    return (
                      <div className={`flex items-center justify-between py-2 px-3 rounded-xl border flex-wrap gap-2 ${
                        isFullyCleared ? 'bg-emerald-50 border-emerald-300' : hasSettlement ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <strong className={isFullyCleared ? 'text-emerald-950 font-black' : hasSettlement ? 'text-amber-950 font-black' : 'text-gray-800 font-bold'}>
                            {isFullyCleared ? 'Final Balance Settled & Realized' : hasSettlement ? 'Final Balance Due Pending' : 'Net Balance Due (Awaiting Mandi Realization)'}
                          </strong>
                          {(settle?.finalSettlementProofUrl || (isFullyCleared && order.paymentProofUrl)) && (
                            <button
                              type="button"
                              onClick={() =>
                                setActiveDocPreview({
                                  url: resolvePhotoUrl(settle?.finalSettlementProofUrl || order.paymentProofUrl),
                                  title: `${order.poNumber} - Final Mandi Settlement Slip`,
                                })
                              }
                              className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye size={10} /> View Settlement Slip ↗
                            </button>
                          )}
                        </div>
                        <strong className={`font-mono font-black text-sm ${isFullyCleared ? 'text-emerald-800' : hasSettlement ? 'text-[#C2410C]' : 'text-gray-900'}`}>
                          {isFullyCleared
                            ? `₹0.00 (CLEARED ✓)`
                            : hasSettlement
                            ? `₹${remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (OPEN - Due Pending)`
                            : `₹0.00 (Pending Safal Entry)`}
                        </strong>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

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
            {isAdmin && order.status === 'PENDING_APPROVAL' && !isRejected && (
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
              !isVendor &&
              !isRejected &&
              order.status !== 'CANCELLED' &&
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
                🔒 Safal approval required to close
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

      {/* Fullscreen Document Preview Modal */}
      {activeDocPreview && (
        <div
          className="modal-backdrop fixed inset-0 flex items-center justify-center p-3 sm:p-4 !z-[9999]"
          style={{ zIndex: 9999 }}
          onClick={() => setActiveDocPreview(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full border border-gray-200 shadow-2xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col relative"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-black font-['Manrope'] text-gray-900 flex items-center gap-2">
                <Eye size={18} className="text-[#087A3E]" />
                {activeDocPreview.title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveDocPreview(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 flex items-center justify-center transition cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 flex-1 flex items-center justify-center overflow-auto bg-gray-50 rounded-2xl my-3">
              {activeDocPreview.url.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={resolvePhotoUrl(activeDocPreview.url)}
                  title={activeDocPreview.title}
                  className="w-full h-96 rounded-xl border-0"
                />
              ) : (
                <img
                  src={resolvePhotoUrl(activeDocPreview.url)}
                  alt={activeDocPreview.title}
                  className="max-h-[65vh] object-contain rounded-xl shadow-xs"
                />
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Verified Mandi Commercial Payment Documentation</span>
              <div className="flex items-center gap-2">
                <a
                  href={resolvePhotoUrl(activeDocPreview.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold inline-flex items-center gap-1"
                >
                  <Eye size={13} /> Open Original ↗
                </a>
                <button
                  type="button"
                  onClick={() => setActiveDocPreview(null)}
                  className="px-4 py-1.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Hub Weighbridge & QC Modal */}
      {showQCModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-70 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-gray-200 shadow-2xl p-5 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                  Safal Regional Hub Inspection Desk
                </span>
                <h3 className="text-base font-black text-gray-900 mt-0.5 font-['Manrope']">
                  Record Weighbridge &amp; QC Acceptance
                </h3>
                <p className="text-[11px] text-gray-500">
                  Consignment: <strong>{order.poNumber}</strong> ({order.supplierName})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQCModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitQC} className="overflow-y-auto flex-1 pr-1 py-3 space-y-3.5 text-xs">
              {/* Weighbridge Gross & Tare */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Gross Truck Weight (KG) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={qcGrossKg}
                    onChange={(e) => setQcGrossKg(e.target.value)}
                    placeholder="e.g. 18500"
                    className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Tare (Empty Truck) (KG) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={qcTareKg}
                    onChange={(e) => setQcTareKg(e.target.value)}
                    placeholder="e.g. 6200"
                    className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Computed Net Weight */}
              {Number(qcGrossKg) > Number(qcTareKg) && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-900">Computed Net Fruit Weight:</span>
                  <strong className="text-sm font-black text-emerald-800">
                    {(Number(qcGrossKg) - Number(qcTareKg)).toLocaleString('en-IN')} KG
                  </strong>
                </div>
              )}

              {/* QC Status & Grading */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">QC Status *</label>
                  <select
                    value={qcStatus}
                    onChange={(e) => setQcStatus(e.target.value)}
                    className="w-full h-9 px-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white"
                  >
                    <option value="PASSED">PASSED ✓</option>
                    <option value="GRADE_DOWNGRADED">DOWNGRADED</option>
                    <option value="REJECTED_TRANSIT">REJECTED ✕</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Grade A (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={qcGradeA}
                    onChange={(e) => setQcGradeA(e.target.value)}
                    className="w-full h-9 px-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white text-right"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Grade B (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={qcGradeB}
                    onChange={(e) => setQcGradeB(e.target.value)}
                    className="w-full h-9 px-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white text-right"
                  />
                </div>
              </div>

              {/* Spoilage / Wastage Deduction */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Spoilage / Wastage (KG)</label>
                  <input
                    type="number"
                    min="0"
                    value={qcWastage}
                    onChange={(e) => setQcWastage(e.target.value)}
                    placeholder="0"
                    className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white text-right"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">QC Inspector Name</label>
                  <input
                    type="text"
                    value={qcInspector}
                    onChange={(e) => setQcInspector(e.target.value)}
                    className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white"
                  />
                </div>
              </div>

              {/* Weighbridge Slip Upload */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Upload Weighbridge Digital Slip (Scale Photo)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={async (e) => {
                    const raw = e.target.files?.[0] || null;
                    const compressed = raw ? await compressImageFile(raw) : null;
                    setQcSlipFile(compressed);
                  }}
                  className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#064D2B] file:text-white hover:file:bg-[#087A3E] file:cursor-pointer"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">QC Remarks / Inspection Notes</label>
                <input
                  type="text"
                  value={qcRemarks}
                  onChange={(e) => setQcRemarks(e.target.value)}
                  placeholder="e.g. Apples inspected, optimal firmness, zero transit bruising."
                  className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowQCModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQC}
                  className="px-5 py-2 rounded-xl bg-[#064D2B] hover:bg-[#087A3E] text-white font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Scale size={14} />
                  {isSubmittingQC ? 'Recording QC Slip...' : 'Save Weighbridge & QC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Proof Viewer Modal */}
      {showProofViewer && order.paymentProofUrl && (
        <ProofViewerModal
          proofUrl={order.paymentProofUrl}
          orderNumber={order.poNumber}
          supplierName={order.supplierName || order.supplier?.name}
          amount={order.grandTotal}
          pendingAmount={order.pendingAmount}
          notes={order.paymentProofNotes || ''}
          canApprove={(isAdmin || isAccountant) && order.status !== 'CLOSED'}
          onClose={() => setShowProofViewer(false)}
          onApprove={async () => {
            try {
              setIsProcessing(true);
              await api.closePurchaseOrder(order.id);
              onNotify(`${isCD ? 'Customer Due' : 'Order'} ${order.poNumber} verified and CLOSED!`);
              setShowProofViewer(false);
              onRefresh();
              onClose();
            } catch (err: any) {
              onNotify(err.message || 'Failed to approve proof');
            } finally {
              setIsProcessing(false);
            }
          }}
        />
      )}
    </div>
  );
};

