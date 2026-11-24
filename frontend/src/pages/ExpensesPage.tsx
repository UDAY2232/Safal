import React, { useState, useEffect } from 'react';
import {
  ReceiptIndianRupee,
  Clock3,
  Check,
  CircleDollarSign,
  Search,
  Filter,
  Plus,
  ArrowDownToLine,
  FileText,
  ExternalLink,
  Bell,
} from 'lucide-react';
import { api } from '../services/api';
import { ExpenseClaim } from '../types';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { SubmitExpenseModal } from '../components/SubmitExpenseModal';
import { ExpenseActionModal } from '../components/ExpenseActionModal';
import { ClearancePaymentModal } from '../components/ClearancePaymentModal';
import { useAuth } from '../context/AuthContext';

interface ExpensesPageProps {
  onNotify: (msg: string) => void;
  initialExpenseId?: string;
  initialClaimNumber?: string;
  onClearNavParams?: () => void;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({
  onNotify,
  initialExpenseId,
  initialClaimNumber,
  onClearNavParams,
}) => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [category, setCategory] = useState('All');

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ExpenseClaim | null>(null);
  const [payingClaim, setPayingClaim] = useState<ExpenseClaim | null>(null);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      let query = '?';
      if (status !== 'All') query += `status=${status}&`;
      if (category !== 'All') query += `category=${encodeURIComponent(category)}&`;
      if (search) query += `search=${encodeURIComponent(search)}&`;

      const res = await api.getExpenses(query);
      setClaims(res.expenses || []);
      setSummary(res.summary || {});
    } catch (err: any) {
      onNotify(err.message || 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [status, category]);

  // Deep linking: Auto-open expense modal when initialExpenseId or initialClaimNumber is passed
  useEffect(() => {
    if ((initialExpenseId || initialClaimNumber) && claims.length > 0) {
      const match = claims.find(
        (c) =>
          (initialExpenseId && c.id === initialExpenseId) ||
          (initialClaimNumber && c.claimNumber?.toLowerCase() === initialClaimNumber.toLowerCase())
      );
      if (match) {
        setSelectedClaim(match);
        if (onClearNavParams) onClearNavParams();
      }
    }
  }, [initialExpenseId, initialClaimNumber, claims]);

  useEffect(() => {
    if (initialExpenseId && !claims.some((c) => c.id === initialExpenseId)) {
      api
        .getExpenseById(initialExpenseId)
        .then((res) => {
          if (res?.expense) {
            setSelectedClaim(res.expense);
            if (onClearNavParams) onClearNavParams();
          }
        })
        .catch(() => {});
    }
  }, [initialExpenseId]);

  const handleExportCSV = async () => {
    try {
      await api.downloadReportCSV('expenses');
      onNotify('Expenses report downloaded as CSV');
    } catch {
      onNotify('Failed to download report');
    }
  };

  const isAdminOrAccountant = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';

  return (
    <>
      {/* 4 Summary Stat Cards */}
      <section className="stat-grid">
        <StatCard
          label="Total Claims"
          value={String(summary.totalClaims || claims.length)}
          icon={<ReceiptIndianRupee />}
          tone="blue"
          detail="Filed reimbursement claims"
        />
        <StatCard
          label="Pending Review"
          value={String(summary.pendingReview || 0)}
          icon={<Clock3 />}
          tone="gold"
          detail="Awaiting audit verification"
        />
        <StatCard
          label="Approved Expenses"
          value={`₹${Number(summary.approvedExpenses || 0).toLocaleString('en-IN')}`}
          icon={<Check />}
          tone="green"
          detail="Authorized for payment"
        />
        <StatCard
          label="Outstanding Balance"
          value={`₹${Number(summary.outstandingBalance || 0).toLocaleString('en-IN')}`}
          icon={<CircleDollarSign />}
          tone="rose"
          detail="Pending reimbursement payout"
        />
      </section>

      {/* Main Expense Workspace Card */}
      <section className="workspace-card">
        <div className="section-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search claim ID, employee, or purpose..."
            />
          </div>

          <label className="status-select">
            <span>Status:</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="APPROVED">Approved</option>
              <option value="PAYMENT_PENDING">Payment Pending</option>
              <option value="PARTIALLY_REIMBURSED">Partially Reimbursed</option>
              <option value="PAID_CLEARED">Paid / Cleared</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="primary-button inline-flex items-center gap-1.5"
          >
            <Plus size={16} /> Submit Expense
          </button>

          {isAdminOrAccountant && (
            <button
              onClick={async () => {
                try {
                  const res = await api.notifyAllMissingReceipts();
                  onNotify(res.message || 'Notifications sent to employees missing receipts');
                } catch (err: any) {
                  onNotify(err.message || 'Failed to notify employees');
                }
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
              title="Notify all employees with active claims missing receipts"
            >
              <Bell size={14} /> Notify Missing Receipts
            </button>
          )}
        </div>

        <div className="table-meta">
          <span>
            Showing <strong>{claims.length}</strong> claims
          </span>
          <button className="export-button" onClick={handleExportCSV}>
            <ArrowDownToLine size={15} /> Export CSV
          </button>
        </div>

        {/* Master Expenses Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Employee</th>
                <th>Department</th>
                <th>Expense Date</th>
                <th>Category</th>
                <th>Business Purpose</th>
                <th>Claimed</th>
                <th>Approved</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Receipt</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {claims.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-gray-400">
                    No expense claims found.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-emerald-50/20">
                    <td className="font-semibold text-emerald-800">{claim.claimNumber}</td>
                    <td>
                      <span className="font-bold text-gray-900">{claim.employeeName}</span>
                      <small className="block text-[10px] text-gray-400">{claim.employeeId}</small>
                    </td>
                    <td>{claim.department}</td>
                    <td>{new Date(claim.expenseDate).toLocaleDateString('en-GB')}</td>
                    <td>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px] text-gray-700 font-medium">
                        {claim.category}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate" title={claim.businessPurpose}>
                      {claim.businessPurpose}
                    </td>
                    <td className="font-bold">₹{claim.amountSpent.toLocaleString('en-IN')}</td>
                    <td className="font-semibold text-emerald-800">
                      {claim.approvedAmount > 0
                        ? `₹${claim.approvedAmount.toLocaleString('en-IN')}`
                        : '—'}
                    </td>
                    <td className="text-gray-600">
                      {claim.amountPaid > 0 ? `₹${claim.amountPaid.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="font-bold text-rose-700">
                      {claim.balanceRemaining > 0
                        ? `₹${claim.balanceRemaining.toLocaleString('en-IN')}`
                        : '₹0'}
                    </td>
                    <td>
                      {claim.receiptUrl ? (
                        <a
                          href={claim.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#087A3E] font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <FileText size={13} /> View
                        </a>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold inline-flex items-center gap-0.5">
                            ⚠️ Missing Bill
                          </span>
                          {isAdminOrAccountant && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await api.requestExpenseReceipt(claim.id);
                                  onNotify(`Notification sent to ${claim.employeeName} to upload receipt.`);
                                } catch (err: any) {
                                  onNotify(err.message || 'Failed to send receipt reminder');
                                }
                              }}
                              className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                              title="Send reminder notification to employee to upload bill receipt"
                            >
                              🔔 Remind
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={claim.status} />
                    </td>
                    <td className="text-center">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          className="view-button"
                          onClick={() => setSelectedClaim(claim)}
                        >
                          View
                        </button>
                        {isAdminOrAccountant &&
                          ['APPROVED', 'PAYMENT_PENDING', 'PARTIALLY_REIMBURSED'].includes(
                            claim.status
                          ) && (
                            <button
                              onClick={() => setPayingClaim(claim)}
                              className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                            >
                              Pay
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modals */}
      {showSubmitModal && (
        <SubmitExpenseModal
          onClose={() => setShowSubmitModal(false)}
          onSuccess={(msg) => {
            onNotify(msg);
            loadExpenses();
          }}
        />
      )}

      {selectedClaim && (
        <ExpenseActionModal
          claim={selectedClaim}
          onClose={() => setSelectedClaim(null)}
          onRefresh={loadExpenses}
          onNotify={onNotify}
        />
      )}

      {payingClaim && (
        <ClearancePaymentModal
          bill={{
            id: payingClaim.id,
            billId: payingClaim.claimNumber,
            type: 'EXPENSE_REIMBURSEMENT',
            employeeName: payingClaim.employeeName,
            category: payingClaim.category,
            approvedAmount: payingClaim.approvedAmount,
            amountPaid: payingClaim.amountPaid,
            balanceRemaining: payingClaim.balanceRemaining,
          }}
          onClose={() => setPayingClaim(null)}
          onSuccess={(msg) => {
            onNotify(msg);
            loadExpenses();
          }}
        />
      )}
    </>
  );
};

