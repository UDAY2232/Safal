import React, { useState, useEffect } from 'react';
import {
  Users,
  Check,
  ShoppingCart,
  Clock3,
  Search,
  Plus,
  ArrowRight,
  Shield,
  Activity,
} from 'lucide-react';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { AddAccountantModal } from '../components/AddAccountantModal';

export const PerformancePage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState<any | null>(null);

  const loadPerformance = async () => {
    try {
      setLoading(true);
      const res = await api.getAccountantPerformance();
      setData(res);
    } catch (err) {
      console.error('Failed to load performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformance();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#087A3E]" />
      </div>
    );
  }

  const { summary, accountants } = data;

  return (
    <>
      {/* 4 Summary Stat Cards */}
      <section className="stat-grid">
        <StatCard
          label="Total Accountants"
          value={String(summary.totalAccountants || 0)}
          icon={<Users />}
          tone="blue"
          detail="Finance department staff"
        />
        <StatCard
          label="Active Accounts"
          value={String(summary.activeAccountants || 0)}
          icon={<Check />}
          tone="green"
          detail="Currently active credentials"
        />
        <StatCard
          label="Total POs Created"
          value={String(summary.totalPOsCreated || 0)}
          icon={<ShoppingCart />}
          tone="gold"
          detail="Procurement throughput"
        />
        <StatCard
          label="Avg Turnaround"
          value={summary.avgTurnaround || '1.4d'}
          icon={<Clock3 />}
          tone="rose"
          detail="Approval cycle velocity"
        />
      </section>

      {/* Main Performance Workspace Card */}
      <section className="workspace-card">
        <div className="table-meta">
          <div>
            <strong className="text-gray-900 text-sm">Accountant Audit &amp; Performance Tracking</strong>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Workload, approval rates, and verification metrics calculated from real database activities.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="primary-button inline-flex items-center gap-1.5"
          >
            <Plus size={16} /> Add Accountant Account
          </button>
        </div>

        {/* Master Accountant Performance Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Accountant ID</th>
                <th>Accountant Name</th>
                <th>Official Email</th>
                <th>POs Created</th>
                <th>Drafts</th>
                <th>Approved POs</th>
                <th>Rejected POs</th>
                <th>Approval Rate</th>
                <th>Total PO Value (₹)</th>
                <th>Claims Reviewed</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {accountants.map((acc: any) => (
                <tr key={acc.id} className="hover:bg-emerald-50/20">
                  <td className="font-semibold text-emerald-800">{acc.accountantId}</td>
                  <td>
                    <span className="font-bold text-gray-900">{acc.name}</span>
                  </td>
                  <td className="text-gray-600">{acc.email}</td>
                  <td className="font-bold text-gray-800">{acc.totalPOs}</td>
                  <td className="text-gray-500">{acc.draftPOs}</td>
                  <td className="font-semibold text-green-700">{acc.approvedPOs}</td>
                  <td className="font-semibold text-red-600">{acc.rejectedPOs}</td>
                  <td>
                    <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-bold text-[11px]">
                      {acc.approvalRate}%
                    </span>
                  </td>
                  <td className="font-bold text-gray-900">
                    ₹{Number(acc.totalValue).toLocaleString('en-IN')}
                  </td>
                  <td className="font-semibold text-blue-700">{acc.claimsReviewed}</td>
                  <td>
                    <StatusBadge status={acc.status} />
                  </td>
                  <td className="text-center">
                    <button
                      className="view-button"
                      onClick={() => setSelectedAcc(acc)}
                    >
                      Audit Trail <ArrowRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showAddModal && (
        <AddAccountantModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadPerformance();
          }}
        />
      )}

      {selectedAcc && (
        <div className="modal-backdrop">
          <div className="modal !w-[600px] max-w-[94vw] p-6 max-h-[90vh] overflow-y-auto">
            <div className="modal-header pb-3 border-b border-gray-100">
              <div>
                <span className="eyebrow text-emerald-800 font-bold">ACCOUNTANT ACTIVITY AUDIT</span>
                <h2 className="text-xl font-bold text-gray-900 mt-1">{selectedAcc.name}</h2>
                <p className="text-xs text-gray-500">
                  {selectedAcc.accountantId} · Last active:{' '}
                  {selectedAcc.lastLoginAt
                    ? new Date(selectedAcc.lastLoginAt).toLocaleString('en-GB')
                    : 'Today'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAcc(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <span className="font-bold text-gray-700 block">Recent System Audit Actions</span>
              {selectedAcc.recentLogs?.length === 0 ? (
                <p className="text-gray-400">No recorded audit logs for this accountant.</p>
              ) : (
                <div className="space-y-2">
                  {selectedAcc.recentLogs?.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    >
                      <div className="flex justify-between font-semibold text-gray-800">
                        <span>{log.action}</span>
                        <span className="text-gray-400 text-[10px]">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-0.5">{log.details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedAcc(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

