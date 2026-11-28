import React, { useState, useEffect } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
  Search,
  Download,
  Filter,
  TrendingUp,
  MapPin,
  RefreshCw,
  Camera,
  ShieldCheck,
  Settings,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Check,
  X,
  AlertCircle,
  Compass,
  DollarSign,
  HelpCircle,
  Sliders,
} from 'lucide-react';
import { api } from '../services/api';
import { AttendancePunchWidget } from '../components/AttendancePunchWidget';
import { PhotoLightboxModal } from '../components/PhotoLightboxModal';
import { resolvePhotoUrl } from '../utils/imageUtils';

interface AttendancePageProps {
  user: any;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ user }) => {
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT';
  const isStrictAdmin = user?.role === 'ADMIN';

  // Navigation tab for Employee vs Admin
  const [activeTab, setActiveTab] = useState<'my' | 'admin'>(isAdmin ? 'admin' : 'my');
  // Admin sub-tabs: 'roster' | 'deductions' | 'geofences' | 'policy'
  const [adminSubTab, setAdminSubTab] = useState<'roster' | 'deductions' | 'geofences' | 'policy'>('roster');

  // Month selector for Employee Summary & Admin Penalty Reports
  const now = new Date();
  const currentMonthDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthDefault);

  // Employee history & summary state
  const [employeeSummary, setEmployeeSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Dispute / Correction Modal state
  const [disputeModalRecord, setDisputeModalRecord] = useState<any | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeRequestedTime, setDisputeRequestedTime] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeMessage, setDisputeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin Roster state
  const [selectedDate, setSelectedDate] = useState<string>(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
  );
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [rosterData, setRosterData] = useState<any>(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Admin Penalty Reports & Management state
  const [penaltyReport, setPenaltyReport] = useState<any>(null);
  const [penaltyLoading, setPenaltyLoading] = useState(false);
  const [pendingCorrections, setPendingCorrections] = useState<any[]>([]);
  const [pendingDeductions, setPendingDeductions] = useState<any[]>([]);

  // Workplace Geofences state
  const [workplaces, setWorkplaces] = useState<any[]>([]);
  const [workplaceLoading, setWorkplaceLoading] = useState(false);
  const [showAddWorkplaceModal, setShowAddWorkplaceModal] = useState(false);
  const [editingWorkplace, setEditingWorkplace] = useState<any | null>(null);
  const [wpForm, setWpForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    allowedRadiusMeters: '100',
  });

  // Attendance Policy state
  const [policyData, setPolicyData] = useState<any>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [policyFeedback, setPolicyFeedback] = useState<string | null>(null);

  // Lightbox modal for photo preview
  const [lightboxData, setLightboxData] = useState<{
    photoUrl: string;
    title?: string;
    time?: string;
    location?: string;
    staffName?: string;
  } | null>(null);

  // Fetch Employee Attendance & Deductions Summary
  const fetchEmployeeSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await api.getEmployeeAttendanceSummary(selectedMonth);
      setEmployeeSummary(res);
    } catch (err: any) {
      console.error('Failed to load employee attendance summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Fetch Admin Roster
  const fetchAdminRoster = async () => {
    if (!isAdmin) return;
    try {
      setRosterLoading(true);
      const params = `?date=${selectedDate}&department=${selectedDept}`;
      const res = await api.getAllAttendance(params);
      setRosterData(res);
    } catch (err: any) {
      console.error('Failed to load admin roster:', err);
    } finally {
      setRosterLoading(false);
    }
  };

  // Fetch Admin Penalties & Pending Approvals
  const fetchPenaltyReportsAndManagement = async () => {
    if (!isAdmin) return;
    try {
      setPenaltyLoading(true);
      const [penaltiesRes, mgmtRes] = await Promise.all([
        api.getAdminPenaltyReports(selectedMonth),
        api.getAdminAttendanceManagement(`?month=${selectedMonth}`),
      ]);
      setPenaltyReport(penaltiesRes);
      setPendingCorrections(mgmtRes?.pendingCorrections || []);
      setPendingDeductions(mgmtRes?.pendingDeductions || []);
    } catch (err: any) {
      console.error('Failed to load penalty reports:', err);
    } finally {
      setPenaltyLoading(false);
    }
  };

  // Fetch Workplace Geofences
  const fetchWorkplaces = async () => {
    try {
      setWorkplaceLoading(true);
      const res = await api.getWorkplaces();
      if (res?.workplaces) setWorkplaces(res.workplaces);
    } catch (err: any) {
      console.error('Failed to load workplaces:', err);
    } finally {
      setWorkplaceLoading(false);
    }
  };

  // Fetch Attendance Policy
  const fetchPolicy = async () => {
    if (!isAdmin) return;
    try {
      setPolicyLoading(true);
      const res = await api.getAttendancePolicy();
      if (res?.policy) setPolicyData(res.policy);
    } catch (err: any) {
      console.error('Failed to load policy:', err);
    } finally {
      setPolicyLoading(false);
    }
  };

  // Initial and reactive effects
  useEffect(() => {
    fetchEmployeeSummary();
  }, [selectedMonth]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminRoster();
      fetchPenaltyReportsAndManagement();
      fetchWorkplaces();
      fetchPolicy();
    }
  }, [selectedDate, selectedDept, selectedMonth]);

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '--:--';
    return new Date(timeStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 size={12} className="text-emerald-600" /> On Time
          </span>
        );
      case 'LATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle size={12} className="text-amber-600" /> Late Arrival
          </span>
        );
      case 'HALF_DAY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            Half Day
          </span>
        );
      case 'ABSENT':
      case 'NOT_YET_CLOCKED_IN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-300">
            Not Arrived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const getLocationBadge = (locationStatus?: string, distance?: number | null) => {
    if (locationStatus === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <ShieldCheck size={11} className="text-emerald-600" /> Geofence Verified
          {distance !== null && distance !== undefined ? ` (${distance}m)` : ''}
        </span>
      );
    }
    if (locationStatus === 'OUT_OF_BOUNDS') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertCircle size={11} className="text-rose-600" /> Out of Geofence ({distance}m)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
        <MapPin size={11} /> Standard Location
      </span>
    );
  };

  // Submit dispute / correction request
  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeModalRecord || !disputeReason.trim()) return;

    try {
      setDisputeSubmitting(true);
      setDisputeMessage(null);
      await api.submitAttendanceCorrection({
        attendanceRecordId: disputeModalRecord.id,
        requestedTime: disputeRequestedTime || undefined,
        reason: disputeReason.trim(),
      });
      setDisputeMessage({ type: 'success', text: 'Dispute submitted successfully! HR will review your request.' });
      setDisputeReason('');
      setDisputeRequestedTime('');
      setTimeout(() => {
        setDisputeModalRecord(null);
        setDisputeMessage(null);
        fetchEmployeeSummary();
      }, 1500);
    } catch (err: any) {
      setDisputeMessage({ type: 'error', text: err.message || 'Failed to submit dispute.' });
    } finally {
      setDisputeSubmitting(false);
    }
  };

  // Admin reviews dispute
  const handleReviewDispute = async (correctionId: string, status: 'APPROVED' | 'REJECTED') => {
    const comments = prompt(`Enter remarks for ${status.toLowerCase()} of this dispute request:`, '');
    if (comments === null) return;

    try {
      await api.reviewAttendanceCorrection(correctionId, {
        status,
        adminComments: comments,
        waivePenalty: status === 'APPROVED',
      });
      fetchPenaltyReportsAndManagement();
      fetchAdminRoster();
    } catch (err: any) {
      alert(`Error reviewing dispute: ${err.message}`);
    }
  };

  // Admin reviews salary deduction
  const handleReviewDeduction = async (deductionId: string, status: 'APPROVED' | 'WAIVED') => {
    const reason = prompt(`Enter reason for ${status.toLowerCase()} deduction:`, status === 'WAIVED' ? 'Authorized late arrival exception' : 'Approved for monthly payroll deduction');
    if (reason === null) return;

    try {
      await api.reviewSalaryDeduction(deductionId, {
        status,
        waiverReason: reason,
      });
      fetchPenaltyReportsAndManagement();
    } catch (err: any) {
      alert(`Error reviewing deduction: ${err.message}`);
    }
  };

  // Workplace Geofence CRUD
  const handleSaveWorkplace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingWorkplace) {
        await api.updateWorkplace(editingWorkplace.id, {
          name: wpForm.name,
          address: wpForm.address,
          latitude: parseFloat(wpForm.latitude),
          longitude: parseFloat(wpForm.longitude),
          allowedRadiusMeters: parseInt(wpForm.allowedRadiusMeters, 10),
        });
      } else {
        await api.createWorkplace({
          name: wpForm.name,
          address: wpForm.address,
          latitude: parseFloat(wpForm.latitude),
          longitude: parseFloat(wpForm.longitude),
          allowedRadiusMeters: parseInt(wpForm.allowedRadiusMeters, 10),
        });
      }
      setShowAddWorkplaceModal(false);
      setEditingWorkplace(null);
      setWpForm({ name: '', address: '', latitude: '', longitude: '', allowedRadiusMeters: '100' });
      fetchWorkplaces();
    } catch (err: any) {
      alert(`Failed to save workplace: ${err.message}`);
    }
  };

  const handleDeleteWorkplace = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove workplace "${name}"?`)) return;
    try {
      await api.deleteWorkplace(id);
      fetchWorkplaces();
    } catch (err: any) {
      alert(`Failed to delete workplace: ${err.message}`);
    }
  };

  // Attendance Policy Save
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setPolicySaving(true);
      setPolicyFeedback(null);
      await api.updateAttendancePolicy({
        gracePeriodMinutes: policyData.gracePeriodMinutes,
        penaltyPerHourAmount: policyData.penaltyPerHourAmount,
        maxDailyPenalty: policyData.maxDailyPenalty,
        requireGps: policyData.requireGps,
        maxAllowedAccuracyMeters: policyData.maxAllowedAccuracyMeters,
      });
      setPolicyFeedback('Attendance penalty policy updated successfully!');
      setTimeout(() => setPolicyFeedback(null), 3000);
    } catch (err: any) {
      setPolicyFeedback(`Error updating policy: ${err.message}`);
    } finally {
      setPolicySaving(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (activeTab === 'admin' && rosterData?.roster) {
      const headers = ['Employee Code', 'Full Name', 'Department', 'Designation', 'Status', 'In Time', 'Out Time', 'Duration (Mins)', 'Workplace', 'GPS Lat', 'GPS Lng', 'Late Mins', 'Penalty (₹)'];
      const rows = rosterData.roster.map((r: any) => [
        `"${r.employeeCode}"`,
        `"${r.fullName}"`,
        `"${r.department}"`,
        `"${r.designation}"`,
        `"${r.displayStatus}"`,
        `"${r.attendance?.clockInTime ? formatTime(r.attendance.clockInTime) : 'N/A'}"`,
        `"${r.attendance?.clockOutTime ? formatTime(r.attendance.clockOutTime) : 'N/A'}"`,
        `"${r.attendance?.totalMinutes || 0}"`,
        `"${r.attendance?.workplaceName || 'N/A'}"`,
        `"${r.attendance?.latitude || ''}"`,
        `"${r.attendance?.longitude || ''}"`,
        `"${r.attendance?.lateMinutes || 0}"`,
        `"${r.attendance?.penaltyAmount || 0}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SAFAL_Staff_Attendance_${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (employeeSummary?.records) {
      const headers = ['Date', 'In Time', 'Out Time', 'Shift', 'Workplace', 'Distance', 'Late Mins', 'Penalty (₹)', 'Deduction Status', 'Notes'];
      const rows = employeeSummary.records.map((r: any) => [
        `"${formatDate(r.date)}"`,
        `"${formatTime(r.clockInTime)}"`,
        `"${r.clockOutTime ? formatTime(r.clockOutTime) : 'In Shift'}"`,
        `"${r.assignedShiftName || 'Standard'}"`,
        `"${r.workplaceName || 'Head Office'}"`,
        `"${r.distanceMeters ?? 'N/A'}"`,
        `"${r.lateMinutes || 0}"`,
        `"${r.penaltyAmount || 0}"`,
        `"${r.penaltyWaived ? 'Waived' : r.payrollDeduction?.status || 'None'}"`,
        `"${r.notes || ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SAFAL_Attendance_Summary_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredRoster = (rosterData?.roster || []).filter((r: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.fullName?.toLowerCase().includes(q) ||
      r.employeeCode?.toLowerCase().includes(q) ||
      r.department?.toLowerCase().includes(q) ||
      r.designation?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#064D2B] via-[#086333] to-[#0A7B3E] text-white p-6 rounded-2xl shadow-sm border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SAFAL Workforce Attendance &amp; Geofencing System</span>
          </div>
          <h1 className="text-2xl font-extrabold font-['Manrope']">
            GPS-Verified Attendance &amp; Salary Deductions
          </h1>
          <p className="text-xs text-emerald-100 mt-1 max-w-2xl">
            Live photo verification, GPS workplace geofencing, automatic late arrival penalty calculation, and transparent salary deduction tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {isAdmin && (
            <div className="bg-emerald-900/60 p-1 rounded-xl flex items-center border border-emerald-700">
              <button
                onClick={() => setActiveTab('my')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'my' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-200 hover:text-white'
                }`}
              >
                My Attendance &amp; Deductions
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'admin' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-200 hover:text-white'
                }`}
              >
                Admin &amp; Penalty Management
              </button>
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#064D2B] hover:bg-emerald-50 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Prominent Live Punch Widget */}
      <AttendancePunchWidget
        onStatusChange={() => {
          fetchEmployeeSummary();
          if (isAdmin) {
            fetchAdminRoster();
            fetchPenaltyReportsAndManagement();
          }
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: EMPLOYEE VIEW - ATTENDANCE & SALARY DEDUCTIONS SUMMARY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'my' && (
        <div className="space-y-6">
          {/* Month Bar & Shift Badge */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-emerald-700" />
              <div>
                <span className="text-xs font-bold text-gray-700 block">Select Pay Period / Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="mt-0.5 px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-200 text-xs">
              <Clock size={16} className="text-emerald-700 shrink-0" />
              <div>
                <div className="text-emerald-950 font-bold">
                  Assigned Shift: {employeeSummary?.shift?.displayTiming || 'Standard'}
                </div>
                <div className="text-[11px] text-emerald-700">
                  {employeeSummary?.shift?.shiftName} · Grace Period: &lt;60 mins (₹0 penalty)
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Attendance Summary Cards */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" /> Attendance Performance Summary ({selectedMonth})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Working Days</div>
                <div className="text-2xl font-black text-gray-900 mt-1">
                  {employeeSummary?.attendanceSummary?.totalWorkingDaysInMonth ?? '--'}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">Excludes Sundays</div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
                <div className="text-[10px] font-bold text-emerald-800 uppercase">Days Present</div>
                <div className="text-2xl font-black text-emerald-900 mt-1">
                  {employeeSummary?.attendanceSummary?.presentDays ?? 0}
                </div>
                <div className="text-[10px] text-emerald-700 mt-0.5">Verified Check-Ins</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-[10px] font-bold text-gray-500 uppercase">On-Time Arrivals</div>
                <div className="text-2xl font-black text-emerald-800 mt-1">
                  {employeeSummary?.attendanceSummary?.onTimeArrivals ?? 0}
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">₹0 Penalty</div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
                <div className="text-[10px] font-bold text-amber-800 uppercase">Late Arrivals</div>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  {employeeSummary?.attendanceSummary?.lateArrivals ?? 0}
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5">
                  Total Late: {employeeSummary?.attendanceSummary?.totalLateHours ?? 0} hrs
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Half Days (&lt;4h)</div>
                <div className="text-2xl font-black text-blue-900 mt-1">
                  {employeeSummary?.attendanceSummary?.halfDays ?? 0}
                </div>
                <div className="text-[10px] text-blue-600 mt-0.5">Short Duration</div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Total Late Duration</div>
                <div className="text-2xl font-black text-gray-900 mt-1">
                  {employeeSummary?.attendanceSummary?.totalLateMinutes ?? 0} <span className="text-xs font-normal">m</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  ({employeeSummary?.attendanceSummary?.totalLateHours ?? 0} Hours)
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Salary Deduction & Payroll Ledger Cards */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
              <DollarSign size={14} className="text-emerald-600" /> Salary Deductions &amp; Penalty Ledger ({selectedMonth})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Base Monthly Wage</div>
                <div className="text-2xl font-black text-gray-900 mt-1">
                  ₹{Number(employeeSummary?.deductionSummary?.baseWageRate || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Designated monthly salary rate</div>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
                <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total Penalties Accrued</div>
                <div className="text-2xl font-black text-amber-900 mt-1">
                  ₹{Number(employeeSummary?.deductionSummary?.totalPenaltyAccrued || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-amber-700 mt-1">
                  Late arrivals: ₹100 / completed hour (&gt;59m grace)
                </div>
              </div>

              <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm">
                <div className="text-xs font-bold text-rose-800 uppercase tracking-wider">Approved Salary Deductions</div>
                <div className="text-2xl font-black text-rose-900 mt-1">
                  - ₹{Number(employeeSummary?.deductionSummary?.approvedDeductions || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-rose-700 mt-1 flex items-center justify-between">
                  <span>To be deducted from payroll</span>
                  {Number(employeeSummary?.deductionSummary?.waivedDeductions || 0) > 0 && (
                    <span className="text-emerald-700 font-bold">
                      (₹{employeeSummary.deductionSummary.waivedDeductions} Waived)
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-300 shadow-sm">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Estimated Net Salary</div>
                <div className="text-2xl font-black text-emerald-950 mt-1">
                  ₹{Number(employeeSummary?.deductionSummary?.estimatedNetSalary || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1 font-semibold">
                  After approved attendance deductions
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Detailed Monthly Attendance Table with GPS, Photo & Dispute */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Attendance Records &amp; Penalty Log · {selectedMonth}
                </h3>
                <p className="text-xs text-gray-500">
                  Full GPS verification, late minutes, photo audit, and dispute correction request access.
                </p>
              </div>
              <button
                onClick={fetchEmployeeSummary}
                className="text-xs text-gray-500 hover:text-emerald-700 flex items-center gap-1.5 font-medium cursor-pointer"
              >
                <RefreshCw size={12} className={summaryLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#087A3E] text-white uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Arrival (In)</th>
                    <th className="py-3 px-3">Departure (Out)</th>
                    <th className="py-3 px-3">Workplace Geofence</th>
                    <th className="py-3 px-3">Arrival Status</th>
                    <th className="py-3 px-3">Late Penalty</th>
                    <th className="py-3 px-3">Deduction Status</th>
                    <th className="py-3 px-3 text-center">Photo</th>
                    <th className="py-3 px-4 text-center">Dispute / Correction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summaryLoading ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-gray-400">
                        Loading attendance records...
                      </td>
                    </tr>
                  ) : !employeeSummary?.records || employeeSummary.records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-gray-400">
                        No attendance records found for {selectedMonth}.
                      </td>
                    </tr>
                  ) : (
                    employeeSummary.records.map((rec: any) => {
                      const penalty = Number(rec.penaltyAmount || 0);
                      const pendingDispute = rec.correctionRequests?.find((c: any) => c.status === 'PENDING');
                      const reviewedDispute = rec.correctionRequests?.[0];

                      return (
                        <tr key={rec.id} className="hover:bg-emerald-50/40 transition">
                          <td className="py-3 px-4 font-bold text-gray-900 whitespace-nowrap">
                            {formatDate(rec.date)}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                            {formatTime(rec.clockInTime)}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-gray-700 whitespace-nowrap">
                            {rec.clockOutTime ? formatTime(rec.clockOutTime) : <span className="text-amber-600 font-bold">In Office</span>}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-gray-800 text-[11px] truncate max-w-[160px]">
                              {rec.workplaceName || 'SAFAL Raipura Hanamkonda'}
                            </div>
                            <div className="mt-0.5">
                              {getLocationBadge(rec.locationStatus, rec.distanceMeters)}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div>{getStatusBadge(rec.status)}</div>
                            {rec.lateMinutes > 0 && (
                              <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                                {rec.lateMinutes} mins late
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono font-bold whitespace-nowrap">
                            {penalty > 0 ? (
                              <span className={rec.penaltyWaived ? 'text-gray-400 line-through' : 'text-rose-700'}>
                                ₹{penalty}
                              </span>
                            ) : (
                              <span className="text-emerald-700">₹0</span>
                            )}
                            {rec.penaltyWaived && (
                              <span className="text-[10px] text-emerald-600 font-bold block">
                                Waived by HR
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {rec.payrollDeduction ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                                  rec.payrollDeduction.status === 'APPROVED' || rec.payrollDeduction.status === 'APPLIED_TO_PAYROLL'
                                    ? 'bg-rose-100 text-rose-800'
                                    : rec.payrollDeduction.status === 'WAIVED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {rec.payrollDeduction.status}
                              </span>
                            ) : penalty > 0 ? (
                              <span className="text-[10px] text-amber-700 font-medium">Penalty Logged</span>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-medium">On-Time / OK</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {rec.photoUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setLightboxData({
                                    photoUrl: rec.photoUrl,
                                    title: 'Office Arrival (In) Photo',
                                    time: formatTime(rec.clockInTime),
                                    location: rec.location || rec.workplaceName,
                                    staffName: user?.name,
                                  })
                                }
                                className="inline-flex items-center gap-1 p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg border border-emerald-300 transition cursor-pointer"
                                title="View Arrival Photo"
                              >
                                <img
                                  src={resolvePhotoUrl(rec.photoUrl)}
                                  alt="Photo"
                                  className="w-7 h-7 rounded object-cover border border-emerald-400"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                                <span className="text-[10px] font-bold">In</span>
                              </button>
                            ) : (
                              <span className="text-gray-400 text-[10px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {pendingDispute ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                <Clock size={11} /> Dispute Pending
                              </span>
                            ) : reviewedDispute && reviewedDispute.status === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Check size={11} /> Dispute Approved
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setDisputeModalRecord(rec);
                                  setDisputeReason('');
                                  setDisputeRequestedTime('');
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 hover:border-emerald-300 transition cursor-pointer"
                              >
                                Dispute / Correction
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: ADMIN VIEW - ATTENDANCE & PENALTY MANAGEMENT */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'admin' && isAdmin && (
        <div className="space-y-6">
          {/* Admin Navigation Pills */}
          <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setAdminSubTab('roster')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminSubTab === 'roster'
                    ? 'bg-[#087A3E] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Users size={14} /> Daily Attendance Roster
              </button>

              <button
                onClick={() => setAdminSubTab('deductions')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminSubTab === 'deductions'
                    ? 'bg-[#087A3E] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <DollarSign size={14} /> Penalty &amp; Deduction Review
                {(pendingCorrections.length > 0 || pendingDeductions.length > 0) && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {pendingCorrections.length + pendingDeductions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setAdminSubTab('geofences')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminSubTab === 'geofences'
                    ? 'bg-[#087A3E] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Compass size={14} /> Workplace Geofences ({workplaces.length})
              </button>

              <button
                onClick={() => setAdminSubTab('policy')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  adminSubTab === 'policy'
                    ? 'bg-[#087A3E] text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Sliders size={14} /> Late Penalty Policy
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-lg text-emerald-900 text-xs font-bold border border-emerald-200">
              <ShieldCheck size={14} className="text-emerald-700" />
              <span>Full HR &amp; Fiscal Admin Control</span>
            </div>
          </div>

          {/* SUBTAB 1: DAILY ATTENDANCE ROSTER */}
          {adminSubTab === 'roster' && (
            <div className="space-y-4">
              {/* Filter Controls */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-700" />
                    <span className="text-xs font-bold text-gray-700">Date:</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-500" />
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value="All">All Departments</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Sales">Sales</option>
                      <option value="Operations">Operations</option>
                      <option value="Procurement">Procurement</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search employee name or code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <button
                    onClick={fetchAdminRoster}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 cursor-pointer"
                    title="Refresh"
                  >
                    <RefreshCw size={14} className={rosterLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm text-center">
                  <div className="text-[10px] font-bold text-gray-500 uppercase">Total Personnel</div>
                  <div className="text-xl font-black text-gray-900 mt-1">{rosterData?.summary?.totalStaff ?? 0}</div>
                </div>
                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 shadow-sm text-center">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase">Present Today</div>
                  <div className="text-xl font-black text-emerald-900 mt-1">{rosterData?.summary?.presentCount ?? 0}</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm text-center">
                  <div className="text-[10px] font-bold text-gray-500 uppercase">On-Time Arrivals</div>
                  <div className="text-xl font-black text-emerald-700 mt-1">{rosterData?.summary?.onTimeCount ?? 0}</div>
                </div>
                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 shadow-sm text-center">
                  <div className="text-[10px] font-bold text-amber-800 uppercase">Late Arrivals</div>
                  <div className="text-xl font-black text-amber-900 mt-1">{rosterData?.summary?.lateCount ?? 0}</div>
                </div>
                <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 shadow-sm text-center col-span-2 sm:col-span-1">
                  <div className="text-[10px] font-bold text-rose-800 uppercase">Late Penalties Today</div>
                  <div className="text-xl font-black text-rose-900 mt-1">₹{rosterData?.summary?.totalLatePenalties ?? 0}</div>
                </div>
              </div>

              {/* Roster Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Company Shift Roster · {formatDate(selectedDate)}
                    </h3>
                    <p className="text-xs text-gray-500">Live attendance status of all registered personnel.</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#087A3E] text-white uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-3">Assigned Shift</th>
                        <th className="py-3 px-3">Arrival (In)</th>
                        <th className="py-3 px-3">Departure (Out)</th>
                        <th className="py-3 px-3">Workplace Geofence</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Late Penalty</th>
                        <th className="py-3 px-3 text-center">Photo Verification</th>
                        <th className="py-3 px-4">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rosterLoading ? (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-gray-400">
                            Loading attendance roster...
                          </td>
                        </tr>
                      ) : filteredRoster.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-10 text-center text-gray-400">
                            No staff records matched your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredRoster.map((staff: any) => {
                          const att = staff.attendance;
                          const penalty = Number(att?.penaltyAmount || 0);

                          return (
                            <tr key={staff.employeeId} className="hover:bg-emerald-50/30 transition">
                              <td className="py-3 px-4">
                                <div className="font-bold text-gray-900">{staff.fullName}</div>
                                <div className="text-[11px] text-gray-500 font-mono">
                                  {staff.employeeCode} · {staff.department}
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-mono text-xs font-bold text-emerald-900">
                                  {staff.shiftConfig?.startTimeFormatted} – {staff.shiftConfig?.endTimeFormatted}
                                </div>
                                <div className="text-[10px] text-gray-500">{staff.shiftConfig?.shiftName}</div>
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                                {att?.clockInTime ? formatTime(att.clockInTime) : '--:--'}
                              </td>
                              <td className="py-3 px-3 font-mono font-semibold text-gray-700">
                                {att?.clockOutTime ? (
                                  formatTime(att.clockOutTime)
                                ) : att?.clockInTime ? (
                                  <span className="text-amber-600 font-bold">In Shift Now</span>
                                ) : (
                                  '--:--'
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {att ? (
                                  <>
                                    <div className="font-semibold text-gray-800 text-[11px] truncate max-w-[150px]">
                                      {att.workplaceName || 'SAFAL Raipura Hanamkonda'}
                                    </div>
                                    <div className="mt-0.5">
                                      {getLocationBadge(att.locationStatus, att.distanceMeters)}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-gray-400 text-[10px]">—</span>
                                )}
                              </td>
                              <td className="py-3 px-3">{getStatusBadge(staff.displayStatus)}</td>
                              <td className="py-3 px-3 font-mono font-bold">
                                {penalty > 0 ? (
                                  <span className={att.penaltyWaived ? 'text-gray-400 line-through' : 'text-rose-700'}>
                                    ₹{penalty}
                                    {att.lateMinutes > 0 ? ` (${att.lateMinutes}m)` : ''}
                                  </span>
                                ) : (
                                  <span className="text-emerald-700">₹0</span>
                                )}
                                {att?.penaltyWaived && (
                                  <span className="text-[10px] text-emerald-600 font-bold block">Waived</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  {att?.photoUrl && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setLightboxData({
                                          photoUrl: att.photoUrl,
                                          title: 'Office Arrival (In) Photo',
                                          time: formatTime(att.clockInTime),
                                          location: att.location || att.workplaceName,
                                          staffName: staff.fullName,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg border border-emerald-300 transition cursor-pointer"
                                      title="View arrival photo"
                                    >
                                      <img
                                        src={resolvePhotoUrl(att.photoUrl)}
                                        alt={staff.fullName}
                                        className="w-7 h-7 rounded object-cover border border-emerald-500"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                      <span className="text-[10px] font-bold">In</span>
                                    </button>
                                  )}
                                  {att?.clockOutPhotoUrl && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setLightboxData({
                                          photoUrl: att.clockOutPhotoUrl,
                                          title: 'Office Departure (Out) Photo',
                                          time: formatTime(att.clockOutTime),
                                          location: att.location || att.workplaceName,
                                          staffName: staff.fullName,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 p-1 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg border border-blue-300 transition cursor-pointer"
                                      title="View departure photo"
                                    >
                                      <img
                                        src={resolvePhotoUrl(att.clockOutPhotoUrl)}
                                        alt={staff.fullName}
                                        className="w-7 h-7 rounded object-cover border border-blue-500"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                      <span className="text-[10px] font-bold">Out</span>
                                    </button>
                                  )}
                                  {!att?.photoUrl && !att?.clockOutPhotoUrl && (
                                    <span className="text-gray-400 text-[10px]">—</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-600 text-[11px] max-w-xs truncate">
                                {att?.notes || (staff.displayStatus === 'ABSENT' ? 'Not clocked in yet' : '')}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 2: PENALTY & SALARY DEDUCTION REVIEW CONSOLE */}
          {adminSubTab === 'deductions' && (
            <div className="space-y-6">
              {/* Month Selector for Reports */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calendar size={18} className="text-emerald-700" />
                  <span className="text-xs font-bold text-gray-700">Audit Month:</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
                <button
                  onClick={fetchPenaltyReportsAndManagement}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw size={12} className={penaltyLoading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>

              {/* 1. Pending Attendance Correction Disputes */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span>Pending Attendance Correction Requests</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        {pendingCorrections.length} Pending
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      Disputes submitted by employees requesting penalty waivers or arrival time corrections.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#087A3E] text-white uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Punch In</th>
                        <th className="py-3 px-3">Requested Time</th>
                        <th className="py-3 px-4">Employee Reason</th>
                        <th className="py-3 px-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pendingCorrections.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400">
                            🎉 No pending correction requests!
                          </td>
                        </tr>
                      ) : (
                        pendingCorrections.map((corr: any) => (
                          <tr key={corr.id} className="hover:bg-amber-50/40 transition">
                            <td className="py-3 px-4 font-bold text-gray-900">
                              {corr.employee?.fullName} ({corr.employee?.employeeId})
                            </td>
                            <td className="py-3 px-3 font-semibold text-gray-800">
                              {formatDate(corr.attendanceRecord?.date)}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                              {formatTime(corr.attendanceRecord?.clockInTime)}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-blue-800">
                              {corr.requestedTime ? formatTime(corr.requestedTime) : 'N/A'}
                            </td>
                            <td className="py-3 px-4 text-gray-700 italic max-w-sm">
                              "{corr.reason}"
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleReviewDispute(corr.id, 'APPROVED')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                                >
                                  Approve &amp; Waive
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewDispute(corr.id, 'REJECTED')}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Pending Salary Deductions for Monthly Payroll */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span>Pending Salary Deductions (Payroll Approval)</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        {pendingDeductions.length} To Review
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      Late arrival penalties waiting for HR approval before being deducted from monthly wages.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#087A3E] text-white uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Late Duration</th>
                        <th className="py-3 px-3">Penalty Amount</th>
                        <th className="py-3 px-4">System Notes</th>
                        <th className="py-3 px-4 text-center">Decision</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pendingDeductions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-400">
                            No pending salary deductions awaiting approval.
                          </td>
                        </tr>
                      ) : (
                        pendingDeductions.map((ded: any) => (
                          <tr key={ded.id} className="hover:bg-amber-50/40 transition">
                            <td className="py-3 px-4 font-bold text-gray-900">
                              {ded.employee?.fullName} ({ded.employee?.employeeId})
                            </td>
                            <td className="py-3 px-3 font-semibold text-gray-800">
                              {formatDate(ded.date)}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-amber-800">
                              {ded.lateDurationMinutes} mins ({Math.floor(ded.lateDurationMinutes / 60)}h)
                            </td>
                            <td className="py-3 px-3 font-mono font-black text-rose-800 text-sm">
                              ₹{ded.penaltyAmount}
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-[11px] max-w-sm">
                              {ded.notes}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleReviewDeduction(ded.id, 'APPROVED')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                                >
                                  Approve for Payroll
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReviewDeduction(ded.id, 'WAIVED')}
                                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                                >
                                  Waive Penalty
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Monthly Employee Penalty Breakdown Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      Monthly Staff Penalty &amp; Deduction Summary · {selectedMonth}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Aggregated monthly late hours, penalties generated, waived amounts, and net payroll deduction.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#087A3E] text-white uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-3">Base Wage (₹)</th>
                        <th className="py-3 px-3">Late Days</th>
                        <th className="py-3 px-3">Total Late Hours</th>
                        <th className="py-3 px-3">Total Generated (₹)</th>
                        <th className="py-3 px-3">Waived (₹)</th>
                        <th className="py-3 px-3">Approved Net Deduction (₹)</th>
                        <th className="py-3 px-4">Estimated Pay (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {penaltyReport?.employeeBreakdown?.map((emp: any) => {
                        const estPay = Math.max(0, emp.baseWageRate - emp.approvedAmount);
                        return (
                          <tr key={emp.id} className="hover:bg-emerald-50/30 transition">
                            <td className="py-3 px-4 font-bold text-gray-900">
                              {emp.fullName}
                              <div className="text-[11px] font-normal text-gray-500">
                                {emp.employeeId} · {emp.designation}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-gray-900">
                              ₹{emp.baseWageRate.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 font-semibold text-gray-800">
                              {emp.lateCount} days
                            </td>
                            <td className="py-3 px-3 font-mono font-semibold text-gray-800">
                              {emp.totalLateHours}h ({emp.totalLateMinutes}m)
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-amber-800">
                              ₹{emp.totalAmount}
                            </td>
                            <td className="py-3 px-3 font-mono font-semibold text-emerald-700">
                              ₹{emp.waivedAmount}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-rose-800">
                              ₹{emp.approvedAmount}
                            </td>
                            <td className="py-3 px-4 font-mono font-black text-emerald-950">
                              ₹{estPay.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 3: WORKPLACE GEOFENCES */}
          {adminSubTab === 'geofences' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-gray-900">Authorized Workplace Geofences</h3>
                  <p className="text-xs text-gray-500">
                    Employees can only clock in within the configured radius of these authorized locations.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingWorkplace(null);
                    setWpForm({ name: '', address: '', latitude: '', longitude: '', allowedRadiusMeters: '100' });
                    setShowAddWorkplaceModal(true);
                  }}
                  className="px-4 py-2 bg-[#087A3E] hover:bg-[#066533] text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={15} /> Add Workplace Geofence
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workplaces.map((wp: any) => (
                  <div key={wp.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm relative flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Compass size={12} className="text-emerald-700" />
                          <span>{wp.allowedRadiusMeters}m Allowed Radius</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingWorkplace(wp);
                              setWpForm({
                                name: wp.name,
                                address: wp.address,
                                latitude: String(wp.latitude),
                                longitude: String(wp.longitude),
                                allowedRadiusMeters: String(wp.allowedRadiusMeters || 100),
                              });
                              setShowAddWorkplaceModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-emerald-700 rounded transition"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteWorkplace(wp.id, wp.name)}
                            className="p-1 text-gray-400 hover:text-rose-700 rounded transition"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-sm text-gray-900 mb-1">{wp.name}</h4>
                      <p className="text-xs text-gray-600 flex items-start gap-1.5 mb-3">
                        <MapPin size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                        <span>{wp.address}</span>
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-100 text-[11px] font-mono text-gray-500 flex justify-between items-center">
                      <span>Lat: {Number(wp.latitude).toFixed(6)}</span>
                      <span>Lng: {Number(wp.longitude).toFixed(6)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUBTAB 4: ATTENDANCE & PENALTY POLICY CONFIGURATION */}
          {adminSubTab === 'policy' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm max-w-3xl space-y-6">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                  <Sliders size={18} className="text-emerald-700" />
                  <span>Late Arrival Penalty &amp; Geofence Rules</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Configure corporate late arrival deductions, grace periods, and GPS accuracy requirements.
                </p>
              </div>

              {policyFeedback && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold">
                  {policyFeedback}
                </div>
              )}

              {policyLoading || !policyData ? (
                <div className="py-10 text-center text-gray-400">Loading policy rules...</div>
              ) : (
                <form onSubmit={handleSavePolicy} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        Arrival Grace Period (Minutes)
                      </label>
                      <input
                        type="number"
                        value={policyData.gracePeriodMinutes}
                        onChange={(e) => setPolicyData({ ...policyData, gracePeriodMinutes: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold"
                        required
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        Default: 59 min. Lateness ≤ 59 minutes incurs ₹0 penalty.
                      </p>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        Penalty Per Completed Hour (₹)
                      </label>
                      <input
                        type="number"
                        value={policyData.penaltyPerHourAmount}
                        onChange={(e) => setPolicyData({ ...policyData, penaltyPerHourAmount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold"
                        required
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        Default: ₹100. Formula: ₹100 × Floor(Late Minutes / 60).
                      </p>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        Max Allowed GPS Accuracy (Meters)
                      </label>
                      <input
                        type="number"
                        value={policyData.maxAllowedAccuracyMeters}
                        onChange={(e) => setPolicyData({ ...policyData, maxAllowedAccuracyMeters: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold"
                        required
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        Default: 150m. Rejects spoofed or imprecise cell tower signals.
                      </p>
                    </div>

                    <div>
                      <label className="font-bold text-gray-700 block mb-1">
                        Max Daily Penalty Cap (Optional ₹)
                      </label>
                      <input
                        type="number"
                        value={policyData.maxDailyPenalty || ''}
                        onChange={(e) => setPolicyData({ ...policyData, maxDailyPenalty: e.target.value })}
                        placeholder="e.g. 500"
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">
                        Leave blank for uncapped proportional hourly penalties.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="requireGps"
                        checked={policyData.requireGps}
                        onChange={(e) => setPolicyData({ ...policyData, requireGps: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <label htmlFor="requireGps" className="font-bold text-gray-800 text-xs cursor-pointer">
                        Enforce Strict GPS Geofence Verification for all attendance check-ins
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={policySaving}
                      className="px-5 py-2.5 bg-[#087A3E] hover:bg-[#066533] text-white rounded-xl font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {policySaving ? 'Saving...' : 'Save Policy Changes'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DISPUTE / CORRECTION REQUEST MODAL */}
      {/* ------------------------------------------------------------- */}
      {disputeModalRecord && (
        <div className="modal-backdrop">
          <div className="modal !w-[520px] max-w-[96vw] p-5">
            <div className="modal-header pb-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-emerald-700" />
                <h3 className="font-extrabold text-base text-gray-900">
                  Dispute Attendance / Request Correction
                </h3>
              </div>
              <button
                onClick={() => setDisputeModalRecord(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitDispute} className="py-4 space-y-3.5 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="font-bold text-gray-800">
                  Record Date: {formatDate(disputeModalRecord.date)}
                </div>
                <div className="text-gray-600 mt-1">
                  Punch-In: <strong>{formatTime(disputeModalRecord.clockInTime)}</strong> · Status: {disputeModalRecord.status} · Late Penalty: ₹{Number(disputeModalRecord.penaltyAmount || 0)}
                </div>
              </div>

              {disputeMessage && (
                <div
                  className={`p-3 rounded-xl font-bold ${
                    disputeMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-50 text-rose-900 border border-rose-300'
                  }`}
                >
                  {disputeMessage.text}
                </div>
              )}

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Actual Arrival Time (Optional If Disputing Timing):
                </label>
                <input
                  type="time"
                  value={disputeRequestedTime}
                  onChange={(e) => setDisputeRequestedTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">
                  Reason for Dispute / Correction Request <span className="text-rose-600">*</span>:
                </label>
                <textarea
                  rows={4}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Explain why the arrival was delayed or why penalty should be waived (e.g. Authorized client visit, traffic incident, GPS glitch)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl"
                  required
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDisputeModalRecord(null)}
                  className="secondary-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disputeSubmitting || !disputeReason.trim()}
                  className="primary-button cursor-pointer disabled:opacity-50"
                >
                  {disputeSubmitting ? 'Submitting Dispute...' : 'Submit Dispute to HR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADD / EDIT WORKPLACE GEOFENCE MODAL */}
      {/* ------------------------------------------------------------- */}
      {showAddWorkplaceModal && (
        <div className="modal-backdrop">
          <div className="modal !w-[540px] max-w-[96vw] p-5">
            <div className="modal-header pb-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass size={18} className="text-emerald-700" />
                <h3 className="font-extrabold text-base text-gray-900">
                  {editingWorkplace ? 'Edit Workplace Geofence' : 'Add Authorized Workplace'}
                </h3>
              </div>
              <button
                onClick={() => setShowAddWorkplaceModal(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWorkplace} className="py-4 space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Workplace Name *</label>
                <input
                  type="text"
                  value={wpForm.name}
                  onChange={(e) => setWpForm({ ...wpForm, name: e.target.value })}
                  placeholder="e.g. Warangal Regional Hub & Cold Storage"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-medium"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Address *</label>
                <input
                  type="text"
                  value={wpForm.address}
                  onChange={(e) => setWpForm({ ...wpForm, address: e.target.value })}
                  placeholder="Full street address and landmark"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Latitude *</label>
                  <input
                    type="number"
                    step="0.0000001"
                    value={wpForm.latitude}
                    onChange={(e) => setWpForm({ ...wpForm, latitude: e.target.value })}
                    placeholder="e.g. 18.0065"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Longitude *</label>
                  <input
                    type="number"
                    step="0.0000001"
                    value={wpForm.longitude}
                    onChange={(e) => setWpForm({ ...wpForm, longitude: e.target.value })}
                    placeholder="e.g. 79.5584"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Allowed Radius (Meters) *</label>
                <input
                  type="number"
                  value={wpForm.allowedRadiusMeters}
                  onChange={(e) => setWpForm({ ...wpForm, allowedRadiusMeters: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl font-medium"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Default: 100 meters. Attendance outside this perimeter will be flagged or rejected.
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddWorkplaceModal(false)}
                  className="secondary-button"
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button cursor-pointer">
                  {editingWorkplace ? 'Update Workplace' : 'Save Workplace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <PhotoLightboxModal
        photoUrl={lightboxData?.photoUrl || null}
        onClose={() => setLightboxData(null)}
        time={lightboxData?.time}
        location={lightboxData?.location}
        staffName={lightboxData?.staffName}
      />
    </div>
  );
};
