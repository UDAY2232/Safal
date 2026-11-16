import React, { useState, useEffect } from 'react';
import {
  Clock3,
  CircleDollarSign,
  Check,
  WalletCards,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { ClearanceBill } from '../types';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { ClearancePaymentModal } from '../components/ClearancePaymentModal';

interface ClearancePageProps {
  onNotify: (msg: string) => void;
}

export const ClearancePage: React.FC<ClearancePageProps> = ({ onNotify }) => {
  const [bills, setBills] = useState<ClearanceBill[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedBill, setSelectedBill] = useState<ClearanceBill | null>(null);

  const loadClearanceData = async () => {
    try {
      setLoading(true);
      let query = '?';
      if (type !== 'ALL') query += `type=${type}&`;
      if (status !== 'ALL') query += `status=${encodeURIComponent(status)}&`;
      if (search) query += `search=${encodeURIComponent(search)}&`;

      const res = await api.getClearanceBills(query);
      setBills(res.bills || []);
      setSummary(res.summary || {});
    } catch (err: any) {
      onNotify(err.message || 'Failed to fetch clearance bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClearanceData();
  }, [type, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadClearanceData();
  };

  return (
    <>
      {/* 4 Summary Stat Cards */}
      <section className="stat-grid">
        <StatCard
          label="Bills Pending Clearance"
          value={String(summary.pendingBillsCount || 0)}
          icon={<Clock3 />}
          tone="gold"
          detail="Approved claims & salary dues"
        />
        <StatCard
          label="Total Approved Amount"
          value={`₹${Number(summary.totalApproved || 0).toLocaleString('en-IN')}`}
          icon={<CircleDollarSign />}
          tone="blue"
          detail="Total authorized liability"
        />
        <StatCard
          label="Total Amount Paid"
          value={`₹${Number(summary.totalPaid || 0).toLocaleString('en-IN')}`}
          icon={<Check />}
          tone="green"
          detail="Settled via bank & UTR records"
        />
        <StatCard
          label="Outstanding Balance"
          value={`₹${Number(summary.outstanding || 0).toLocaleString('en-IN')}`}
          icon={<WalletCards />}
          tone="rose"
          detail="Remaining to disburse"
        />
      </section>

      {/* Main Clearance Workbench */}
      <section className="workspace-card">
        <form onSubmit={handleSearchSubmit} className="section-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bill ID, employee, or category..."
            />
          </div>

          <label className="status-select">
            <span>Bill Type:</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="ALL">All Types</option>
              <option value="EXPENSE_REIMBURSEMENT">Expense Claims</option>
              <option value="WAGE_PAYMENT">Wages &amp; Salaries</option>
            </select>
          </label>

          <label className="status-select">
            <span>Status:</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="Payment Pending">Payment Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid/Cleared">Paid / Cleared</option>
            </select>
          </label>

          <button type="submit" className="secondary-filter">
            <Filter size={15} /> Apply
          </button>
        </form>

        <div className="table-meta">
          <span>
            Showing <strong>{bills.length}</strong> clearance liability items
          </span>
          <span className="text-[11px] text-gray-500">
            Fully Cleared: <b>{summary.fullyClearedCount || 0}</b> · Partially Paid:{' '}
            <b>{summary.partiallyPaidCount || 0}</b>
          </span>
        </div>

        {/* Master Clearance Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Claim / Bill ID</th>
                <th>Employee Beneficiary</th>
                <th>Bill Category</th>
                <th>Date</th>
                <th>Approved Amount</th>
                <th>Amount Paid</th>
                <th>Remaining Balance</th>
                <th>Disbursement Date</th>
                <th>Payment Method</th>
                <th>Transaction Ref</th>
                <th>Clearance Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-8 text-gray-400">
                    No approved bills currently require settlement.
                  </td>
                </tr>
              ) : (
                bills.map((bill, index) => (
                  <tr key={bill.id} className="hover:bg-emerald-50/20">
                    <td className="serial">{index + 1}</td>
                    <td className="font-semibold text-emerald-800">{bill.billId}</td>
                    <td>
                      <span className="font-bold text-gray-900">{bill.employeeName}</span>
                      <small className="block text-[10px] text-gray-400">{bill.employeeId}</small>
                    </td>
                    <td>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px] text-gray-700">
                        {bill.category}
                      </span>
                    </td>
                    <td>{new Date(bill.billDate).toLocaleDateString('en-GB')}</td>
                    <td className="font-bold">₹{bill.approvedAmount.toLocaleString('en-IN')}</td>
                    <td className="text-gray-600">
                      {bill.amountPaid > 0 ? `₹${bill.amountPaid.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="font-bold text-rose-700">
                      {bill.balanceRemaining > 0
                        ? `₹${bill.balanceRemaining.toLocaleString('en-IN')}`
                        : '₹0'}
                    </td>
                    <td>
                      {bill.latestPaymentDate
                        ? new Date(bill.latestPaymentDate).toLocaleDateString('en-GB')
                        : '—'}
                    </td>
                    <td>{bill.latestPaymentMethod || '—'}</td>
                    <td className="font-mono text-[11px]">{bill.latestTransactionRef || '—'}</td>
                    <td>
                      <StatusBadge status={bill.clearanceStatus} />
                    </td>
                    <td className="text-center">
                      {bill.balanceRemaining > 0 ? (
                        <button
                          onClick={() => setSelectedBill(bill)}
                          className="px-2.5 py-1 bg-[#087A3E] hover:bg-[#064D2B] text-white rounded text-xs font-bold transition inline-flex items-center gap-1"
                        >
                          Clear Bill
                        </button>
                      ) : (
                        <span className="text-[11px] text-green-700 font-bold">✓ Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="table-footer">
          <span>
            * A bill is marked as Cleared only when full approved amount has been paid with confirmed
            reference.
          </span>
          <div className="pagination">
            <button className="current-page">1</button>
          </div>
        </div>
      </section>

      {/* Payment Settlement Modal */}
      {selectedBill && (
        <ClearancePaymentModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          onSuccess={(msg) => {
            onNotify(msg);
            loadClearanceData();
          }}
        />
      )}
    </>
  );
};

