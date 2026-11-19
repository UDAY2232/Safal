import React from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  IndianRupee,
  Edit,
  UserMinus,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Clock,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface EmployeeProfileModalProps {
  employee: any;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: (employee: any) => void;
  onToggleStatus: (id: string) => void;
  onDelete: (employee: any) => void;
}

export const EmployeeProfileModal: React.FC<EmployeeProfileModalProps> = ({
  employee,
  isAdmin,
  onClose,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  const initials = employee.fullName
    ? employee.fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'EM';

  return (
    <div className="modal-backdrop">
      <div className="modal !w-[740px] max-w-[95vw] p-6 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="modal-header pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#064D2B] to-[#087A3E] text-white flex items-center justify-center font-black text-lg shadow-sm flex-shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-[#087A3E] font-black text-xs">
                  {employee.employeeId}
                </span>
                <StatusBadge status={employee.status} />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 mt-0.5">
                {employee.fullName}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {employee.designation} • {employee.department}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => onEdit(employee)}
                className="px-3 py-1.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition"
              >
                <Edit size={13} /> Edit Profile
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-700 transition p-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Dossier Body */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4 text-xs pr-1">
          {/* Key Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
            <div>
              <span className="text-gray-400 font-semibold block text-[11px]">Official Email</span>
              <strong className="text-gray-900 text-xs block mt-0.5 truncate" title={employee.email}>
                {employee.email || '—'}
              </strong>
            </div>

            <div>
              <span className="text-gray-400 font-semibold block text-[11px]">Contact Phone</span>
              <strong className="text-gray-900 text-xs block mt-0.5">
                {employee.phone || '—'}
              </strong>
            </div>

            <div>
              <span className="text-gray-400 font-semibold block text-[11px]">Base Wage Rate</span>
              <strong className="text-[#087A3E] text-xs font-black block mt-0.5">
                ₹{Number(employee.baseWageRate || 0).toLocaleString('en-IN')}
                <span className="text-[10px] text-gray-500 font-normal ml-1">
                  ({employee.wageType || 'MONTHLY'})
                </span>
              </strong>
            </div>

            <div>
              <span className="text-gray-400 font-semibold block text-[11px]">Joining Date</span>
              <strong className="text-gray-900 text-xs block mt-0.5">
                {employee.joiningDate
                  ? new Date(employee.joiningDate).toLocaleDateString('en-GB')
                  : '—'}
              </strong>
            </div>
          </div>

          {/* Department & Access Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
              <span className="text-gray-400 font-semibold text-[11px] flex items-center gap-1">
                <Building2 size={13} className="text-[#087A3E]" /> Organization &amp; Placement
              </span>
              <div className="font-bold text-gray-900 text-xs">{employee.department}</div>
              <div className="text-gray-600 text-[11px]">{employee.designation}</div>
            </div>

            <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
              <span className="text-gray-400 font-semibold text-[11px] flex items-center gap-1">
                <Clock size={13} className="text-emerald-700" /> Account Status &amp; Controls
              </span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-xs">Portal Access:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${employee.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {employee.status}
                </span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => onToggleStatus(employee.id)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer mt-0.5 block"
                >
                  Switch to {employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'}
                </button>
              )}
            </div>
          </div>

          {/* Wage / Salary History */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                <Receipt size={14} className="text-[#087A3E]" /> Wage &amp; Salary Records ({employee.wageRecords?.length || 0})
              </span>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
              <table className="w-full text-xs">
                <thead className="bg-[#E7F5E9] text-[#064D2B] font-bold">
                  <tr>
                    <th className="p-2 text-left">Pay Period</th>
                    <th className="p-2 text-right">Net Payable</th>
                    <th className="p-2 text-right">Amount Paid</th>
                    <th className="p-2 text-center">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employee.wageRecords && employee.wageRecords.length > 0 ? (
                    employee.wageRecords.map((w: any) => (
                      <tr key={w.id} className="hover:bg-gray-50">
                        <td className="p-2 font-bold text-gray-800">{w.payPeriod}</td>
                        <td className="p-2 text-right font-medium text-gray-900">
                          ₹{Number(w.netPayable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right font-bold text-[#087A3E]">
                          ₹{Number(w.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-center">
                          <StatusBadge status={w.status} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-gray-400">
                        No previous wage periods recorded for this employee.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense Claims History */}
          {employee.expenseClaims && employee.expenseClaims.length > 0 && (
            <div>
              <span className="font-bold text-gray-800 text-xs block mb-1.5">
                Expense Claims ({employee.expenseClaims.length})
              </span>
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-xs">
                  <thead className="bg-[#E7F5E9] text-[#064D2B] font-bold">
                    <tr>
                      <th className="p-2 text-left">Category / Title</th>
                      <th className="p-2 text-right">Claim Amount</th>
                      <th className="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employee.expenseClaims.map((c: any) => (
                      <tr key={c.id}>
                        <td className="p-2 font-medium text-gray-800">{c.category || c.title}</td>
                        <td className="p-2 text-right font-bold text-gray-900">
                          ₹{Number(c.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="p-2 text-center">
                          <StatusBadge status={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions pt-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onDelete(employee)}
                className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <UserMinus size={14} /> Relieve / Remove
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => onEdit(employee)}
                className="px-4 py-2 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold text-xs shadow-xs inline-flex items-center gap-1.5 transition"
              >
                <Edit size={14} /> Edit Details
              </button>
            )}
            <button
              type="button"
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 transition"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
