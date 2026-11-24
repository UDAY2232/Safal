/**
 * Safal Mandi Consignment Settlement Helper
 *
 * Mandi Commercial Settlement Rules:
 * - 5% Safal Platform Admin Share
 * - 1% APMC Mandi Market Cess Fee
 * Total Deductions = 6%
 *
 * Net Vendor Payable = Gross Consignment Total - (5% Admin Share + 1% APMC Cess)
 * Final Balance Due = Net Vendor Payable - Advance Amount Disbursed
 */

export interface ConsignmentSettlementDetails {
  advanceDisbursed: boolean;
  advanceAmount: number;
  advancePaymentDate?: string;
  advancePaymentMode?: string;
  advancePaymentUtr?: string;
  advancePayingHub?: string;
  advanceProofUrl?: string | null;
  advanceNotes?: string;
  advanceDisbursedAt?: string;
  advanceDisbursedBy?: string;

  settlementCompleted: boolean;
  grossConsignmentTotal: number;
  adminSharePercent: number; // 5%
  adminShareAmount: number;
  apmcSharePercent: number;  // 1%
  apmcShareAmount: number;
  totalMandiDeductions: number; // 6%
  netVendorPayable: number;
  advanceAlreadyPaid: number;
  finalBalanceDue: number;
  finalBalancePaid: number;
  finalPaymentDate?: string;
  finalPaymentMode?: string;
  finalPaymentUtr?: string;
  finalSettlingHub?: string;
  finalSettlementProofUrl?: string | null;
  finalSettlementNotes?: string;
  settledAt?: string;
  settledBy?: string;

  vendorRealizedGain: number;
  platformRevenue: number;
  mandiCessPaid: number;
}

export function enrichPOWithSettlementDetails(po: any): any {
  if (!po) return po;

  const grandTotal = Number(po.grandTotal || 0);
  const autoAdvance = Math.round(grandTotal * 0.55);
  const adminShareAmount = Math.round(grandTotal * 0.05);
  const apmcShareAmount = Math.round(grandTotal * 0.01);
  const totalDeductions = adminShareAmount + apmcShareAmount;
  const netVendorPayable = Math.max(0, grandTotal - totalDeductions);

  let storedAdvance: any = null;
  let storedSettlement: any = null;

  if (po.financialRecord?.costNotes) {
    try {
      if (typeof po.financialRecord.costNotes === 'string' && po.financialRecord.costNotes.startsWith('{')) {
        storedAdvance = JSON.parse(po.financialRecord.costNotes);
      }
    } catch {}
  }

  if (po.financialRecord?.revenueNotes) {
    try {
      if (typeof po.financialRecord.revenueNotes === 'string' && po.financialRecord.revenueNotes.startsWith('{')) {
        storedSettlement = JSON.parse(po.financialRecord.revenueNotes);
      }
    } catch {}
  }

  const advanceAmount = storedAdvance?.advanceAmount !== undefined
    ? Number(storedAdvance.advanceAmount)
    : (Number(po.advanceAmount) > 0 ? Number(po.advanceAmount) : autoAdvance);

  const advanceDisbursed = Boolean(
    storedAdvance?.advanceDisbursed ||
    po.advancePaymentUtr ||
    po.paymentProofUrl ||
    po.dispatchStatus === 'LOADED_AND_DISPATCHED' ||
    po.dispatchStatus === 'DELIVERED_AT_HUB' ||
    po.status === 'CLOSED'
  );

  // Total balance due before final settlement payment:
  const fullBalanceDueBeforeSettlement = Math.max(0, netVendorPayable - advanceAmount);

  // How much was paid during final settlement (if any)
  const finalBalancePaid = storedSettlement?.finalBalancePaid !== undefined
    ? Number(storedSettlement.finalBalancePaid)
    : (po.status === 'CLOSED' && Number(po.pendingAmount || 0) === 0 ? fullBalanceDueBeforeSettlement : 0);

  // Current remaining balance due:
  let remainingDue = Math.max(0, fullBalanceDueBeforeSettlement - finalBalancePaid);
  if (storedSettlement?.finalBalanceDue !== undefined) {
    remainingDue = Number(storedSettlement.finalBalanceDue);
  } else if (po.status === 'CLOSED' && Number(po.pendingAmount || 0) === 0) {
    remainingDue = 0;
  }

  // STRICT RULE: "unna balnce motham ithene vendor dashboard lo clear ani ani vastadhi 1 ruppe unna clear radhu open ane vastadhi"
  // Consignment is ONLY CLEARED if remainingDue === 0 AND (settlementCompleted is true OR (po.status === 'CLOSED' && po.pendingAmount === 0))
  const isFullyCleared = remainingDue === 0 && Boolean(
    storedSettlement?.settlementCompleted ||
    (po.status === 'CLOSED' && Number(po.pendingAmount || 0) === 0)
  );

  const settlementCompleted = isFullyCleared;
  const finalBalanceDue = isFullyCleared ? 0 : remainingDue;

  const settlementDetails: ConsignmentSettlementDetails = {
    advanceDisbursed,
    advanceAmount,
    advancePaymentDate: storedAdvance?.advancePaymentDate || (po.dispatchDate ? new Date(po.dispatchDate).toISOString().split('T')[0] : (po.poDate ? new Date(po.poDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])),
    advancePaymentMode: storedAdvance?.advancePaymentMode || 'Bank Transfer (RTGS / NEFT)',
    advancePaymentUtr: storedAdvance?.advancePaymentUtr || po.paymentProofNotes || 'RTGS-MANDI-ADV',
    advancePayingHub: storedAdvance?.advancePayingHub || po.orderPersonPlace || 'Warangal Hub',
    advanceProofUrl: storedAdvance?.advanceProofUrl || (po.paymentProofUrl || null),
    advanceNotes: storedAdvance?.advanceNotes || '55% Auto-Advance Guarantee cleared for mandi transit',
    advanceDisbursedAt: storedAdvance?.advanceDisbursedAt || (po.dispatchDate ? new Date(po.dispatchDate).toISOString() : new Date().toISOString()),
    advanceDisbursedBy: storedAdvance?.advanceDisbursedBy || 'Safal Regional Hub Accounts',

    settlementCompleted,
    grossConsignmentTotal: grandTotal,
    adminSharePercent: 5,
    adminShareAmount,
    apmcSharePercent: 1,
    apmcShareAmount,
    totalMandiDeductions: totalDeductions,
    netVendorPayable,
    advanceAlreadyPaid: advanceAmount,
    finalBalanceDue: settlementCompleted ? 0 : finalBalanceDue,
    finalBalancePaid,
    finalPaymentDate: storedSettlement?.finalPaymentDate || (settlementCompleted ? new Date().toISOString().split('T')[0] : undefined),
    finalPaymentMode: storedSettlement?.finalPaymentMode || (settlementCompleted ? 'Bank Transfer (RTGS / NEFT)' : undefined),
    finalPaymentUtr: storedSettlement?.finalPaymentUtr || (settlementCompleted ? 'RTGS-MANDI-SETTLE' : undefined),
    finalSettlingHub: storedSettlement?.finalSettlingHub || po.orderPersonPlace || 'Warangal Hub',
    finalSettlementProofUrl: storedSettlement?.finalSettlementProofUrl || (settlementCompleted ? po.paymentProofUrl : null),
    finalSettlementNotes: storedSettlement?.finalSettlementNotes || (settlementCompleted ? 'Cleared after 5% Admin Share & 1% APMC Mandi Cess deductions' : undefined),
    settledAt: storedSettlement?.settledAt || (settlementCompleted ? new Date().toISOString() : undefined),
    settledBy: storedSettlement?.settledBy || (settlementCompleted ? 'Safal Admin' : undefined),

    vendorRealizedGain: netVendorPayable,
    platformRevenue: adminShareAmount,
    mandiCessPaid: apmcShareAmount,
  };

  return {
    ...po,
    settlementDetails,
  };
}
