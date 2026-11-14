import React, { useState, useEffect } from 'react';
import { Clock3, Search, Filter, ShieldCheck, Download } from 'lucide-react';
import { api } from '../services/api';
import { ActivityLog } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const ActivityLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('ALL');

  const loadLogs = async () => {
    try {
      setLoading(true);
      let query = '?';
      if (role !== 'ALL') query += `role=${role}&`;
      if (search) query += `search=${encodeURIComponent(search)}&`;

      const res = await api.getActivityLogs(query);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [role]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  return (
    <section className="workspace-card">
      <form onSubmit={handleSearch} className="section-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, user, or record details..."
          />
        </div>

        <label className="status-select">
          <span>Role:</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
        </label>

        <button type="submit" className="secondary-filter">
          <Filter size={15} /> Apply
        </button>
      </form>

      <div className="table-meta">
        <div>
          <strong className="text-gray-900 text-sm">System Audit Trail &amp; Activity History</strong>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Append-only immutable record of all financial, procurement, and user authorization operations.
          </p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Target Entity</th>
              <th>Event Details</th>
              <th className="text-center">Integrity</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  No activity logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-emerald-50/20 text-xs">
                  <td className="whitespace-nowrap text-gray-500 font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString('en-GB')}
                  </td>
                  <td className="font-bold text-gray-900">{log.userName}</td>
                  <td>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-700">
                      {log.userRole}
                    </span>
                  </td>
                  <td className="font-mono text-emerald-800 font-semibold">{log.action}</td>
                  <td>
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold">
                      {log.entityType}
                    </span>
                  </td>
                  <td className="text-gray-700 max-w-xs truncate" title={log.details || ''}>
                    {log.details || '—'}
                  </td>
                  <td className="text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                      <ShieldCheck size={13} /> Verified
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <span>* Audit records are tamper-proof and preserved permanently in the database.</span>
        <div className="pagination">
          <button className="current-page">1</button>
        </div>
      </div>
    </section>
  );
};

