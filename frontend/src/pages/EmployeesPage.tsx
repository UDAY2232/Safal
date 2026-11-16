import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, ArrowRight, Check } from 'lucide-react';
import { api } from '../services/api';
import { Employee } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { AddEmployeeModal } from '../components/AddEmployeeModal';

interface EmployeesPageProps {
  onNotify: (msg: string) => void;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ onNotify }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.getEmployees(search ? `?search=${encodeURIComponent(search)}` : '');
      setEmployees(res.employees || []);
    } catch (err: any) {
      onNotify(err.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  const toggleStatus = async (id: string) => {
    try {
      await api.toggleEmployeeStatus(id);
      onNotify('Employee status updated');
      loadEmployees();
    } catch {
      onNotify('Failed to update status');
    }
  };

  const openProfile = async (id: string) => {
    try {
      const details = await api.getEmployeeById(id);
      setSelectedEmployee(details);
    } catch {
      onNotify('Failed to load employee details');
    }
  };

  return (
    <>
      <section className="workspace-card">
        <div className="section-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee ID, name, designation..."
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="primary-button inline-flex items-center gap-1.5"
          >
            <Plus size={16} /> Add Employee
          </button>
        </div>

        <div className="table-meta">
          <span>
            Showing <strong>{employees.length}</strong> employees
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Full Name</th>
                <th>Department</th>
                <th>Designation</th>
                <th>Wage Type</th>
                <th>Base Wage (₹)</th>
                <th>Joining Date</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">
                    No employees found.
                  </td>
                </tr>
              ) : (
                employees.map((e) => (
                  <tr key={e.id} className="hover:bg-emerald-50/20">
                    <td className="font-semibold text-emerald-800">{e.employeeId}</td>
                    <td>
                      <span className="font-bold text-gray-900">{e.fullName}</span>
                      <small className="block text-[10px] text-gray-400">{e.email}</small>
                    </td>
                    <td>{e.department}</td>
                    <td>{e.designation}</td>
                    <td>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px] text-gray-700">
                        {e.wageType}
                      </span>
                    </td>
                    <td className="font-bold text-gray-900">
                      ₹{e.baseWageRate.toLocaleString('en-IN')}
                    </td>
                    <td>{new Date(e.joiningDate).toLocaleDateString('en-GB')}</td>
                    <td>
                      <button
                        onClick={() => toggleStatus(e.id)}
                        title="Click to toggle active/inactive status"
                        className="cursor-pointer"
                      >
                        <StatusBadge status={e.status} />
                      </button>
                    </td>
                    <td className="text-center">
                      <button
                        className="view-button"
                        onClick={() => openProfile(e.id)}
                      >
                        Profile <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(msg) => {
            onNotify(msg);
            loadEmployees();
          }}
        />
      )}

      {selectedEmployee && (
        <div className="modal-backdrop">
          <div className="modal !w-[680px] max-w-[94vw] p-6 max-h-[90vh] overflow-y-auto">
            <div className="modal-header pb-3 border-b border-gray-100">
              <div>
                <span className="eyebrow text-emerald-800 font-bold">EMPLOYEE DOSSIER</span>
                <h2 className="text-xl font-bold text-gray-900 mt-1">{selectedEmployee.fullName}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-400">Employee ID</span>
                  <p className="font-bold text-gray-800">{selectedEmployee.employeeId}</p>
                </div>
                <div>
                  <span className="text-gray-400">Department</span>
                  <p className="font-bold text-gray-800">{selectedEmployee.department}</p>
                </div>
                <div>
                  <span className="text-gray-400">Designation</span>
                  <p className="font-bold text-gray-800">{selectedEmployee.designation}</p>
                </div>
                <div>
                  <span className="text-gray-400">Base Wage Rate</span>
                  <p className="font-bold text-emerald-800">
                    ₹{Number(selectedEmployee.baseWageRate).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div>
                <span className="font-bold text-gray-700 block mb-1">
                  Salary History ({selectedEmployee.wageRecords?.length || 0})
                </span>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[#E7F5E9] text-[#064D2B] font-bold">
                      <tr>
                        <th className="p-2">Period</th>
                        <th className="p-2">Net Payable</th>
                        <th className="p-2">Paid</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedEmployee.wageRecords?.map((w: any) => (
                        <tr key={w.id}>
                          <td className="p-2 font-bold">{w.payPeriod}</td>
                          <td className="p-2">₹{Number(w.netPayable).toLocaleString('en-IN')}</td>
                          <td className="p-2 text-emerald-700">
                            ₹{Number(w.amountPaid).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2">
                            <StatusBadge status={w.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-actions pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedEmployee(null)}
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

