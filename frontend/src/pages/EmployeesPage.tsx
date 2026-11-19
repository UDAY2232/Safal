import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, ArrowRight, Check, UserMinus, Edit } from 'lucide-react';
import { api } from '../services/api';
import { Employee } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import { EditEmployeeModal } from '../components/EditEmployeeModal';
import { EmployeeProfileModal } from '../components/EmployeeProfileModal';
import { useAuth } from '../context/AuthContext';

interface EmployeesPageProps {
  onNotify: (msg: string) => void;
}

export const EmployeesPage: React.FC<EmployeesPageProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);

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
      if (selectedEmployee?.id === id) {
        setSelectedEmployee((prev: any) =>
          prev ? { ...prev, status: prev.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } : null
        );
      }
      loadEmployees();
    } catch {
      onNotify('Failed to update status');
    }
  };

  const handleDeleteEmployee = async (emp: any) => {
    const confirmed = window.confirm(
      `Are you sure you want to relieve and remove employee ${emp.fullName} (${emp.employeeId})?\n\nThis will permanently delete their login credentials and employee profile. They will not be able to log in again unless re-added by an Admin.`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const res = await api.deleteEmployee(emp.id);
      onNotify(res.message || `Employee ${emp.fullName} relieved and credentials removed.`);
      if (selectedEmployee?.id === emp.id) {
        setSelectedEmployee(null);
      }
      await loadEmployees();
    } catch (err: any) {
      onNotify(err.message || 'Failed to relieve employee');
    } finally {
      setLoading(false);
    }
  };

  const openProfile = async (id: string) => {
    const local = employees.find((e) => e.id === id);
    if (local) {
      setSelectedEmployee(local);
    }
    try {
      const details = await api.getEmployeeById(id);
      setSelectedEmployee(details);
    } catch (err) {
      if (!local) onNotify('Failed to load employee details');
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
              onKeyDown={(e) => e.key === 'Enter' && loadEmployees()}
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

        <div className="table-wrap table-scroll-wrap">
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
                  <tr
                    key={e.id}
                    onClick={() => openProfile(e.id)}
                    className="hover:bg-emerald-50/25 transition cursor-pointer"
                    title="Click row to view profile"
                  >
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
                      ₹{Number(e.baseWageRate).toLocaleString('en-IN')}
                    </td>
                    <td>{new Date(e.joiningDate).toLocaleDateString('en-GB')}</td>
                    <td>
                      <button
                        type="button"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          toggleStatus(e.id);
                        }}
                        title="Click to toggle active/inactive status"
                        className="cursor-pointer"
                      >
                        <StatusBadge status={e.status} />
                      </button>
                    </td>
                    <td className="text-center">
                      <div
                        className="flex items-center justify-center gap-1.5"
                        onClick={(evt) => evt.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="view-button"
                          onClick={() => openProfile(e.id)}
                          title="View Employee Profile"
                        >
                          Profile <ArrowRight size={13} />
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setEditingEmployee(e)}
                            className="p-1.5 rounded-lg text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 transition cursor-pointer"
                            title={`Edit details for ${e.fullName}`}
                          >
                            <Edit size={14} />
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteEmployee(e)}
                            className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition cursor-pointer"
                            title={`Relieve / Remove ${e.fullName} and delete login credentials`}
                          >
                            <UserMinus size={14} />
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

      {/* Add Employee Modal */}
      {showAddModal && (
        <AddEmployeeModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(msg) => {
            onNotify(msg);
            loadEmployees();
          }}
        />
      )}

      {/* View Employee Profile Modal */}
      {selectedEmployee && (
        <EmployeeProfileModal
          employee={selectedEmployee}
          isAdmin={isAdmin}
          onClose={() => setSelectedEmployee(null)}
          onEdit={(emp) => {
            setEditingEmployee(emp);
            setSelectedEmployee(null);
          }}
          onToggleStatus={(id) => toggleStatus(id)}
          onDelete={(emp) => {
            handleDeleteEmployee(emp);
          }}
        />
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSuccess={(updated, msg) => {
            onNotify(msg);
            loadEmployees();
          }}
        />
      )}
    </>
  );
};
