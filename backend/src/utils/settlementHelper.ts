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

  hasSettlementEntry: boolean; // True once Safal Admin records Mandi sales realization settlement
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
  calculatedPotentialDue: number; // Theoretical balance before admin records realization
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

  const isCD = String(po.poNumber || '').startsWith('CD/');
  const grandTotal = Number(po.grandTotal || 0);
  const autoAdvance = Math.round(grandTotal * 0.70); // 70% advance policy
  const adminShareAmount = isCD ? 0 : Math.round(grandTotal * 0.05);
  const apmcShareAmount = isCD ? 0 : Math.round(grandTotal * 0.01);
  const totalDeductions = adminShareAmount + apmcShareAmount;
  const netVendorPayable = isCD ? grandTotal : Math.max(0, grandTotal - totalDeductions);

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

  // If advance was set at 55% previously, upgrade to 70% as requested by user
  const rawAdv = storedAdvance?.advanceAmount !== undefined ? Number(storedAdvance.advanceAmount) : Number(po.advanceAmount || 0);
  const isOld55Percent = rawAdv > 0 && Math.abs(rawAdv - Math.round(grandTotal * 0.55)) <= 5;
  const advanceAmount = rawAdv > 0 && !isOld55Percent ? rawAdv : autoAdvance;

  const hasAdvanceSlip = Boolean(
    storedAdvance?.advanceProofUrl ||
    po.paymentProofUrl
  );

  // Strict Rule: Advance is ONLY considered disbursed/PAID when an official payment slip/receipt is actually uploaded
  const advanceDisbursed = Boolean(
    hasAdvanceSlip && (storedAdvance?.advanceDisbursed || po.paymentProofUrl || po.advancePaymentUtr)
  );

  // Theoretical balance due: Total minus Paid
  const calculatedPotentialDue = Math.max(0, grandTotal - advanceAmount);

  // Check if Safal Admin has explicitly recorded Mandi Sales Realization settlement
  const hasSettlementEntry = Boolean(
    storedSettlement && (
      storedSettlement.settlementCompleted !== undefined ||
      storedSettlement.finalBalancePaid !== undefined ||
      storedSettlement.finalBalanceDue !== undefined
    )
  );

  let finalBalancePaid = 0;
  let remainingDue = 0;
  let settlementCompleted = false;

  if (hasSettlementEntry) {
    finalBalancePaid = Number(storedSettlement.finalBalancePaid || 0);
    remainingDue = Number(storedSettlement.finalBalanceDue ?? 0);
    // STRICT RULE: Consignment is ONLY CLEARED if remainingDue === 0 AND (settlementCompleted is true OR (po.status === 'CLOSED' && Number(po.pendingAmount || 0) === 0 && finalBalancePaid > 0))
    settlementCompleted = remainingDue === 0 && Boolean(
      storedSettlement.settlementCompleted ||
      (po.status === 'CLOSED' && Number(po.pendingAmount || 0) === 0 && finalBalancePaid > 0)
    );
  } else if (po.status === 'CLOSED' && Number(po.pendingAmount || 0) === 0 && Boolean(po.paymentProofUrl) && !po.poNumber?.startsWith('PO/SF/')) {
    finalBalancePaid = calculatedPotentialDue;
    remainingDue = 0;
    settlementCompleted = true;
  } else {
    // Safal Admin has NOT recorded Mandi Sales Realization yet!
    // As per user specification: Vendor's Net Balance Due must remain 0 until Safal enters the realized settlement.
    finalBalancePaid = 0;
    remainingDue = 0;
    settlementCompleted = false;
  }

  const finalBalanceDue = settlementCompleted ? 0 : remainingDue;

  const settlementDetails: ConsignmentSettlementDetails = {
    advanceDisbursed,
    advanceAmount,
    advancePaymentDate: storedAdvance?.advancePaymentDate || (po.dispatchDate ? new Date(po.dispatchDate).toISOString().split('T')[0] : (po.poDate ? new Date(po.poDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])),
    advancePaymentMode: storedAdvance?.advancePaymentMode || 'Bank Transfer (RTGS / NEFT)',
    advancePaymentUtr: storedAdvance?.advancePaymentUtr || po.paymentProofNotes || 'RTGS-MANDI-ADV',
    advancePayingHub: storedAdvance?.advancePayingHub || po.orderPersonPlace || 'Warangal Hub',
    advanceProofUrl: storedAdvance?.advanceProofUrl || null,
    advanceNotes: storedAdvance?.advanceNotes || 'Consignment advance payment cleared for mandi transit',
    advanceDisbursedAt: storedAdvance?.advanceDisbursedAt || (po.dispatchDate ? new Date(po.dispatchDate).toISOString() : new Date().toISOString()),
    advanceDisbursedBy: storedAdvance?.advanceDisbursedBy || 'Safal Regional Hub Accounts',

    hasSettlementEntry,
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
    calculatedPotentialDue,
    finalPaymentDate: storedSettlement?.finalPaymentDate || (settlementCompleted ? new Date().toISOString().split('T')[0] : undefined),
    finalPaymentMode: storedSettlement?.finalPaymentMode || (settlementCompleted ? 'Bank Transfer (RTGS / NEFT)' : undefined),
    finalPaymentUtr: storedSettlement?.finalPaymentUtr || (settlementCompleted ? 'RTGS-MANDI-SETTLE' : undefined),
    finalSettlingHub: storedSettlement?.finalSettlingHub || po.orderPersonPlace || 'Warangal Hub',
    finalSettlementProofUrl: storedSettlement?.finalSettlementProofUrl || null,
    finalSettlementNotes: storedSettlement?.finalSettlementNotes || (settlementCompleted ? 'Cleared after Safal Mandi Sales Realization & Settlements' : undefined),
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
