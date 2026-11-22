import React, { useState } from 'react';
import { X, TrendingUp, AlertTriangle } from 'lucide-react';
import { PurchaseOrder } from '../types';
import { api } from '../services/api';

interface POFinancialsModalProps {
  order: PurchaseOrder;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const POFinancialsModal: React.FC<POFinancialsModalProps> = ({ order, onClose, onSuccess }) => {
  const fin = order.financial || (order as any).financialRecord || {};
  const [verifiedCost, setVerifiedCost] = useState<string>(
    fin.verifiedCost !== null && fin.verifiedCost !== undefined ? String(fin.verifiedCost) : ''
  );
  const [transportCost, setTransportCost] = useState<string>(
    String(fin.allocatedTransportCost || 0)
  );
  const [laborCost, setLaborCost] = useState<string>(
    String(fin.allocatedLaborCost || 0)
  );
  const [linkedRevenue, setLinkedRevenue] = useState<string>(
    fin.linkedRevenue !== null && fin.linkedRevenue !== undefined ? String(fin.linkedRevenue) : ''
  );
  const [costNotes, setCostNotes] = useState('');
  const [revenueNotes, setRevenueNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Live calculation
  const vCost = verifiedCost !== '' ? Number(verifiedCost) : null;
  const trans = Number(transportCost) || 0;
  const lab = Number(laborCost) || 0;
  const totalAssociated = vCost !== null ? vCost + trans + lab : null;
  const rev = linkedRevenue !== '' ? Number(linkedRevenue) : null;

  let calculatedResult: number | null = null;
  let statusBadge = 'Pending Data';
  let badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-300';

  if (totalAssociated !== null && rev !== null) {
    calculatedResult = rev - totalAssociated;
    if (calculatedResult > 0) {
      statusBadge = 'REALIZED PROFIT';
      badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    } else if (calculatedResult < 0) {
      statusBadge = 'REALIZED LOSS';
      badgeColor = 'bg-red-100 text-red-800 border-red-300';
    } else {
      statusBadge = 'BREAK EVEN';
      badgeColor = 'bg-gray-100 text-gray-800 border-gray-300';
    }
  } else if (totalAssociated !== null && rev === null) {
    statusBadge = 'PENDING SALES DATA';
    badgeColor = 'bg-orange-100 text-orange-800 border-orange-300';
  } else if (totalAssociated === null && rev !== null) {
    statusBadge = 'PENDING COST DATA';
    badgeColor = 'bg-orange-100 text-orange-800 border-orange-300';
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError('');

      await api.updatePOFinancials(order.id, {
        verifiedCost: verifiedCost !== '' ? Number(verifiedCost) : null,
        costNotes,
        allocatedTransportCost: trans,
        allocatedLaborCost: lab,
        linkedRevenue: rev,
        revenueNotes,
      });

      onSuccess(`Financials for ${order.poNumber} saved successfully`);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save financial records');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form onSubmit={handleSave} className="modal !w-[620px] max-w-[94vw] p-6">
        <div className="modal-header pb-3 border-b border-gray-100">
          <div>
            <span className="eyebrow flex items-center gap-1 text-emerald-700 font-bold">
              <TrendingUp size={14} /> FINANCIAL RESULT TRACKING
            </span>
            <h2 className="text-lg font-bold text-gray-900 mt-1">Verified Cost &amp; Revenue Records</h2>
            <p className="text-xs text-gray-500">
              Formula: Profit/Loss = Verified Recognized Revenue − Actual Associated Costs
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {error && <div className="my-2 p-2 bg-red-50 text-red-700 rounded text-xs">{error}</div>}

        <div className="py-3 space-y-3 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <span className="text-[11px] leading-snug">
              <strong>Compliance Rule:</strong> A Purchase Order amount (₹{order.grandTotal.toLocaleString('en-IN')}) is neither profit nor verified expense. Only enter confirmed invoices and traceable sales lots.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Verified Actual Purchase Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={verifiedCost}
                onChange={(e) => setVerifiedCost(e.target.value)}
                placeholder="Actual invoice amount"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Allocated Transport / Freight (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={transportCost}
                onChange={(e) => setTransportCost(e.target.value)}
                placeholder="Transport share"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Allocated Loading / Labor Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={laborCost}
                onChange={(e) => setLaborCost(e.target.value)}
                placeholder="Labor / cold handling"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Recognized Sales Revenue (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={linkedRevenue}
                onChange={(e) => setLinkedRevenue(e.target.value)}
                placeholder="Linked sale transaction"
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Verification Reference &amp; Notes</label>
            <textarea
              rows={2}
              value={costNotes}
              onChange={(e) => setCostNotes(e.target.value)}
              placeholder="e.g. Weighbridge slip WB-8821; Retail distributor batch contract #402"
              className="w-full p-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          {/* Live Outcome Box */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Calculated Financial Status:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeColor}`}>
                {statusBadge}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold pt-1 border-t border-gray-200">
              <span>Realized Result:</span>
              <span className={calculatedResult !== null && calculatedResult >= 0 ? 'text-green-700' : 'text-red-700'}>
                {calculatedResult !== null
                  ? `₹${Math.abs(calculatedResult).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${calculatedResult >= 0 ? 'Profit' : 'Loss'})`
                  : 'Pending Information'}
              </span>
            </div>
          </div>
        </div>

        <div className="modal-actions pt-3 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" className="secondary-button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            Save Financial Record
          </button>
        </div>
      </form>
    </div>
  );
};

