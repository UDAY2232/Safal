import React from 'react';
import {
  X,
  WalletCards,
  CheckCircle2,
  Clock,
  Building2,
  User,
  Receipt,
  Download,
  Printer,
  AlertCircle,
} from 'lucide-react';
import { MySalaryData } from '../types';

interface MySalaryModalProps {
  salaryData: MySalaryData | null;
  onClose: () => void;
}

export const MySalaryModal: React.FC<MySalaryModalProps> = ({ salaryData, onClose }) => {
  if (!salaryData) return null;

  const formatCurrency = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const handlePrint = () => {
    window.print();
  };

  const records = salaryData.records || [];
  const hasRecords = records.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#064D2B] via-[#086333] to-[#0A7B3E] text-white p-5 sm:p-6 flex items-start justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <WalletCards className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-200 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                  Confidential Employee Payroll
                </span>
                <span className="text-xs font-semibold text-emerald-100">
                  {salaryData.employeeId}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold font-['Manrope'] mt-0.5">
                {salaryData.fullName}&apos;s Salary &amp; Wage Statement
              </h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                {salaryData.designation} · {salaryData.department} Department · Status: {salaryData.status}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-xl transition cursor-pointer flex-shrink-0"
            title="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Key Financial Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide block">
                Base Salary Rate
              </span>
              <p className="text-xl sm:text-2xl font-black text-[#087A3E] mt-1">
                {formatCurrency(salaryData.baseWageRate)}
              </p>
              <span className="text-[11px] text-emerald-700 font-medium">
                {salaryData.wageType === 'DAILY' ? 'Daily Wage Rate' : 'Fixed Monthly Compensation'}
              </span>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide block">
                Total Net Payable
              </span>
              <p className="text-xl sm:text-2xl font-black text-blue-900 mt-1">
                {formatCurrency(salaryData.totalNetPayable > 0 ? salaryData.totalNetPayable : salaryData.baseWageRate)}
              </p>
              <span className="text-[11px] text-blue-700 font-medium">
                {hasRecords ? 'Calculated Pay Periods' : 'Active Wage Base'}
              </span>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide block">
                Total Paid / Cleared
              </span>
              <p className="text-xl sm:text-2xl font-black text-emerald-800 mt-1">
                {formatCurrency(salaryData.totalPaid)}
              </p>
              <span className="text-[11px] text-emerald-700 font-medium">
                Direct Bank Disbursements
              </span>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide block">
                Pending Balance Due
              </span>
              <p className="text-xl sm:text-2xl font-black text-amber-900 mt-1">
                {formatCurrency(salaryData.balanceRemaining)}
              </p>
              <span className="text-[11px] text-amber-700 font-medium">
                {salaryData.balanceRemaining === 0 ? 'Fully Settled / No Dues' : 'Awaiting Settlement'}
              </span>
            </div>
          </div>

          {/* Employee & Account Identification Banner */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-200/80 flex items-center justify-center text-gray-700 font-bold">
                <User size={18} />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">
                  {salaryData.fullName} ({salaryData.employeeId})
                </p>
                <p className="text-gray-500">
                  Role: {salaryData.designation} · Dept: {salaryData.department}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg border border-emerald-200 text-xs">
                <CheckCircle2 size={13} /> Active Payroll Verified
              </span>
            </div>
          </div>

          {/* Salary Slips & Payment History */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Receipt size={16} className="text-emerald-700" />
                <span>Salary Slips &amp; Wage Disbursement Records</span>
              </h3>
              <span className="text-xs text-gray-500">
                {records.length} {records.length === 1 ? 'record' : 'records'} found
              </span>
            </div>

            {hasRecords ? (
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100/80 text-gray-700 uppercase font-bold text-[10px] tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-3">Pay Period</th>
                        <th className="py-3 px-3">Wage Type</th>
                        <th className="py-3 px-3 text-right">Gross Amount</th>
                        <th className="py-3 px-3 text-right">Deductions</th>
                        <th className="py-3 px-3 text-right">Net Payable</th>
                        <th className="py-3 px-3 text-right">Amount Paid</th>
                        <th className="py-3 px-3 text-right">Balance Due</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3">Payment Info</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-800">
                      {records.map((r) => {
                        const latestPayment = r.payments && r.payments[0];
                        return (
                          <tr key={r.id} className="hover:bg-gray-50/70 transition">
                            <td className="py-3 px-3 font-bold text-gray-900 whitespace-nowrap">
                              {r.payPeriod}
                            </td>
                            <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                              {r.wageType}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold">
                              {formatCurrency(r.grossAmount)}
                            </td>
                            <td className="py-3 px-3 text-right text-rose-600 font-semibold">
                              {r.deductions > 0 ? `-${formatCurrency(r.deductions)}` : '₹0'}
                            </td>
                            <td className="py-3 px-3 text-right font-black text-[#087A3E]">
                              {formatCurrency(r.netPayable)}
                            </td>
                            <td className="py-3 px-3 text-right font-black text-emerald-800">
                              {formatCurrency(r.amountPaid)}
                            </td>
                            <td className="py-3 px-3 text-right font-black text-amber-700">
                              {formatCurrency(r.balanceRemaining)}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  r.status === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : r.status === 'PARTIALLY_PAID'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {r.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[11px] text-gray-600">
                              {latestPayment ? (
                                <div>
                                  <span className="font-bold text-gray-800 block">
                                    Ref: {latestPayment.transactionRef || 'NEFT/RTGS'}
                                  </span>
                                  <span className="text-gray-400 text-[10px] block">
                                    {new Date(latestPayment.paymentDate).toLocaleDateString('en-IN')}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">Pending Bank Transfer</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-3">
                  <WalletCards size={24} />
                </div>
                <h4 className="text-sm font-bold text-gray-800">
                  Active Base Salary: {formatCurrency(salaryData.baseWageRate)} / month
                </h4>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                  Your monthly salary commitment of {formatCurrency(salaryData.baseWageRate)} is registered and active in the company payroll. Individual monthly wage slips and bank transfer receipts will appear here automatically upon monthly payroll generation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition shadow-sm cursor-pointer"
          >
            <Printer size={14} /> Print Statement
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#087A3E] hover:bg-[#064D2B] text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
