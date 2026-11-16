import React, { useState, useEffect } from 'react';
import {
  Users,
  WalletCards,
  Check,
  Clock3,
  Search,
  Filter,
  Plus,
  ArrowDownToLine,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import { WageRecord } from '../types';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { ClearancePaymentModal } from '../components/ClearancePaymentModal';
import { useAuth } from '../context/AuthContext';

interface WagesPageProps {
  onNotify: (msg: string) => void;
}

export const WagesPage: React.FC<WagesPageProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const [wages, setWages] = useState<WageRecord[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [payPeriod, setPayPeriod] = useState('All');
  const [status, setStatus] = useState('All');

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('December 2026');
  const [selectedWage, setSelectedWage] = useState<WageRecord | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const loadWages = async () => {
    try {
      setLoading(true);
      let query = '?';
      if (payPeriod !== 'All') query += `payPeriod=${encodeURIComponent(payPeriod)}&`;
      if (status !== 'All') query += `status=${status}&`;
      if (search) query += `search=${encodeURIComponent(search)}&`;

      const res = await api.getWages(query);
      setWages(res.wages || []);
      setSummary(res.summary || {});
    } catch (err: any) {
      onNotify(err.message || 'Failed to fetch wage records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWages();
  }, [payPeriod, status]);

  const handleGeneratePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.generateWagePeriod(newPeriodName);
      onNotify(res.message || 'Wage period generated');
      setShowGenerateModal(false);
      loadWages();
    } catch (err: any) {
      onNotify(err.message || 'Failed to generate wage period');
    }
  };

  const handleExportCSV = async () => {
    try {
      await api.downloadReportCSV('wages');
      onNotify('Wages report downloaded as CSV');
    } catch {
      onNotify('Failed to download report');
    }
  };

  return (
    <>
      {/* 4 Summary Stat Cards */}
      <section className="stat-grid">
        <StatCard
          label="Active Employees"
          value={String(summary.activeEmployees || 0)}
          icon={<Users />}
          tone="blue"
          detail="On company payroll"
        />
        <StatCard
          label="Monthly Commitment"
          value={`₹${Number(summary.monthlyCommitment || 0).toLocaleString('en-IN')}`}
          icon={<WalletCards />}
          tone="green"
          detail="Configured monthly payroll"
        />
        <StatCard
          label="Salary Paid"
          value={`₹${Number(summary.salaryPaid || 0).toLocaleString('en-IN')}`}
          icon={<Check />}
          tone="gold"
          detail="Disbursed with bank UTRs"
        />
        <StatCard
          label="Pending Salary"
          value={`₹${Number(summary.pendingSalary || 0).toLocaleString('en-IN')}`}
          icon={<Clock3 />}
          tone="rose"
          detail="Outstanding wages payable"
        />
      </section>

      {/* Main Wage Workspace Card */}
      <section className="workspace-card">
        <div className="section-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee ID, name, or department..."
            />
          </div>

          <label className="status-select">
            <span>Status:</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PARTIALLY_PAID">Partially Paid</option>
              <option value="PAID">Paid</option>
            </select>
          </label>

          {isAdmin && (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="primary-button inline-flex items-center gap-1.5"
            >
              <Plus size={16} /> Create Wage Period
            </button>
          )}
        </div>

        <div className="table-meta">
          <span>
            Showing <strong>{wages.length}</strong> wage records
          </span>
          <button className="export-button" onClick={handleExportCSV}>
            <ArrowDownToLine size={15} /> Export CSV
          </button>
        </div>

        {/* Master Wages Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Employee ID</th>
                <th>Employee Name</th>
                <th>Department</th>
                <th>Wage Type</th>
                <th>Wage Rate</th>
                <th>Pay Period</th>
                <th>Gross Amount</th>
                <th>Deductions</th>
                <th>Net Payable</th>
                <th>Amount Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {wages.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-8 text-gray-400">
                    No wage records found for selected period.
                  </td>
                </tr>
              ) : (
                wages.map((w, index) => (
                  <tr key={w.id} className="hover:bg-emerald-50/20">
                    <td className="serial">{index + 1}</td>
                    <td className="font-semibold text-emerald-800">{w.employeeId}</td>
                    <td>
                      <span className="font-bold text-gray-900">{w.employeeName}</span>
                      <small className="block text-[10px] text-gray-400">{w.designation}</small>
                    </td>
                    <td>{w.department}</td>
                    <td>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px] text-gray-700">
                        {w.wageType}
                      </span>
                    </td>
                    <td>₹{w.wageRate.toLocaleString('en-IN')}</td>
                    <td className="font-semibold text-gray-800">{w.payPeriod}</td>
                    <td className="text-gray-700">₹{w.grossAmount.toLocaleString('en-IN')}</td>
                    <td className="text-gray-500">₹{w.deductions.toLocaleString('en-IN')}</td>
                    <td className="font-bold text-gray-900">
                      ₹{w.netPayable.toLocaleString('en-IN')}
                    </td>
                    <td className="text-emerald-700 font-semibold">
                      ₹{w.amountPaid.toLocaleString('en-IN')}
                    </td>
                    <td className="font-bold text-rose-700">
                      {w.balanceRemaining > 0
                        ? `₹${w.balanceRemaining.toLocaleString('en-IN')}`
                        : '₹0'}
                    </td>
                    <td>
                      <StatusBadge status={w.status} />
                    </td>
                    <td className="text-center">
                      {w.balanceRemaining > 0 ? (
                        <button
                          onClick={() => setSelectedWage(w)}
                          className="px-2.5 py-1 bg-[#087A3E] text-white rounded text-xs font-bold hover:bg-[#064D2B] transition"
                        >
                          Record Payment
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
            * Never mark wages as paid before recording confirmed transaction references. Completed
            payments are immutable.
          </span>
          <div className="pagination">
            <button className="current-page">1</button>
          </div>
        </div>
      </section>

      {/* Generate Wage Period Modal */}
      {showGenerateModal && (
        <div className="modal-backdrop">
          <form onSubmit={handleGeneratePeriod} className="modal !w-[420px] p-6">
            <div className="modal-header pb-3 border-b border-gray-100">
              <div>
                <span className="eyebrow text-emerald-800 font-bold">PAYROLL GENERATION</span>
                <h2 className="text-lg font-bold text-gray-900 mt-1">Generate Wage Period</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <p className="text-gray-600">
                This will create salary dues for all currently active employees based on their
                configured base wage rate.
              </p>
              <div>
                <label className="block text-gray-700 font-semibold mb-1">
                  Pay Period Label *
                </label>
                <input
                  type="text"
                  value={newPeriodName}
                  onChange={(e) => setNewPeriodName(e.target.value)}
                  placeholder="e.g. December 2026"
                  className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
                  required
                />
              </div>
            </div>
            <div className="modal-actions pt-3 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowGenerateModal(false)}
              >
                Cancel
              </button>
              <button type="submit" className="primary-button">
                Generate Pay Period
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Salary Payment Modal */}
      {selectedWage && (
        <ClearancePaymentModal
          bill={{
            id: selectedWage.id,
            billId: `WAG/${selectedWage.employeeId}/${selectedWage.payPeriod.replace(/\s+/g, '-')}`,
            type: 'WAGE_PAYMENT',
            employeeName: selectedWage.employeeName,
            category: `Salary (${selectedWage.payPeriod})`,
            approvedAmount: selectedWage.netPayable,
            amountPaid: selectedWage.amountPaid,
            balanceRemaining: selectedWage.balanceRemaining,
          }}
          onClose={() => setSelectedWage(null)}
          onSuccess={(msg) => {
            onNotify(msg);
            loadWages();
          }}
        />
      )}
    </>
  );
};

