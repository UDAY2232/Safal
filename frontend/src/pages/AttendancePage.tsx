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
  ArrowUpRight,
  TrendingUp,
  MapPin,
  RefreshCw,
  Camera,
} from 'lucide-react';
import { api } from '../services/api';
import { AttendancePunchWidget } from '../components/AttendancePunchWidget';
import { PhotoLightboxModal } from '../components/PhotoLightboxModal';
import { resolvePhotoUrl } from '../utils/imageUtils';

interface AttendancePageProps {
  user: any;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ user }) => {
  const isAdmin = user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState<'my' | 'roster'>(isAdmin ? 'roster' : 'my');

  // Employee history states
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [lightboxData, setLightboxData] = useState<{
    photoUrl: string;
    time?: string;
    location?: string;
    staffName?: string;
  } | null>(null);

  // Admin roster states
  const [selectedDate, setSelectedDate] = useState<string>(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
  );
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [rosterData, setRosterData] = useState<any>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMyHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.getMyAttendanceHistory();
      setHistoryData(res);
    } catch (err: any) {
      console.error('Failed to load my attendance history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

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

  useEffect(() => {
    fetchMyHistory();
    if (isAdmin) {
      fetchAdminRoster();
    }
  }, [selectedDate, selectedDept]);

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
            Half Day (&lt;4h)
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

  const handleExportCSV = () => {
    if (activeTab === 'roster' && rosterData?.roster) {
      const headers = ['Employee Code', 'Full Name', 'Department', 'Designation', 'Status', 'Office In Time', 'Office Out Time', 'Duration (Mins)', 'Notes'];
      const rows = rosterData.roster.map((r: any) => [
        `"${r.employeeCode}"`,
        `"${r.fullName}"`,
        `"${r.department}"`,
        `"${r.designation}"`,
        `"${r.displayStatus}"`,
        `"${r.attendance?.clockInTime ? formatTime(r.attendance.clockInTime) : 'N/A'}"`,
        `"${r.attendance?.clockOutTime ? formatTime(r.attendance.clockOutTime) : 'N/A'}"`,
        `"${r.attendance?.totalMinutes || 0}"`,
        `"${r.attendance?.notes || ''}"`,
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
    } else if (historyData?.records) {
      const headers = ['Date', 'Office In Time', 'Office Out Time', 'Duration (Mins)', 'Status', 'IP Address', 'Notes'];
      const rows = historyData.records.map((r: any) => [
        `"${formatDate(r.date)}"`,
        `"${formatTime(r.clockInTime)}"`,
        `"${r.clockOutTime ? formatTime(r.clockOutTime) : 'Active'}"`,
        `"${r.totalMinutes || 0}"`,
        `"${r.status}"`,
        `"${r.clockInIp || 'N/A'}"`,
        `"${r.notes || ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map((row: any) => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SAFAL_My_Attendance_${user?.name?.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const filteredRoster = (rosterData?.roster || []).filter((r: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.employeeCode.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.designation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#064D2B] via-[#086333] to-[#0A7B3E] text-white p-6 rounded-2xl shadow-sm border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Safal Workforce Attendance Verification</span>
          </div>
          <h1 className="text-2xl font-extrabold font-['Manrope']">
            Daily Office Attendance System
          </h1>
          <p className="text-xs text-emerald-100 mt-1">
            Office selfie attendance verification · Official Shift: <strong>05:30 – 06:00 AM Arrival to 02:00 PM Office Departure</strong> + <strong>2 Extra Hours for Company Growth &amp; Sales</strong> at Hub 1 Cold Storage, Navi Mumbai.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          {isAdmin && (
            <div className="bg-emerald-900/60 p-1 rounded-xl flex items-center border border-emerald-700">
              <button
                onClick={() => setActiveTab('my')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'my' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-200 hover:text-white'
                }`}
              >
                My Attendance
              </button>
              <button
                onClick={() => setActiveTab('roster')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === 'roster' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-200 hover:text-white'
                }`}
              >
                Company Attendance Roster (Admin)
              </button>
            </div>
          )}

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#064D2B] hover:bg-emerald-50 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Prominent Live Attendance Widget */}
      <AttendancePunchWidget
        onStatusChange={() => {
          fetchMyHistory();
          if (isAdmin) fetchAdminRoster();
        }}
      />

      {/* ----------------- TAB 1: MY ATTENDANCE & HISTORY ----------------- */}
      {activeTab === 'my' && (
        <div className="space-y-6">
          {/* Employee KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Days Present
              </div>
              <div className="text-2xl font-black text-emerald-900">
                {historyData?.stats?.totalDays ?? '--'} <span className="text-xs font-normal text-gray-500">Days</span>
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 size={12} /> Logged this month
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                On-Time Rate
              </div>
              <div className="text-2xl font-black text-emerald-900">
                {historyData?.stats?.onTimePercentage ?? 100}%
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                <TrendingUp size={12} /> Shift punctuality
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Late Arrivals
              </div>
              <div className="text-2xl font-black text-amber-700">
                {historyData?.stats?.lateDays ?? 0} <span className="text-xs font-normal text-gray-500">Days</span>
              </div>
              <div className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                <AlertTriangle size={12} /> Shift starts 05:30 – 06:00 AM
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Total Work Hours
              </div>
              <div className="text-2xl font-black text-blue-900">
                {historyData?.stats?.totalHours ?? '0'} <span className="text-xs font-normal text-gray-500">Hours</span>
              </div>
              <div className="text-[11px] text-blue-700 font-medium mt-1 flex items-center gap-1">
                <Clock size={12} /> Target: 8h / Day (06:00 – 14:00 + 2h Sales)
              </div>
            </div>
          </div>

          {/* Detailed Attendance History Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">My Daily Shift &amp; Attendance Records</h2>
                <p className="text-xs text-gray-500">Chronological list of all verified office arrivals and departures.</p>
              </div>
              <button
                onClick={fetchMyHistory}
                className="text-xs text-gray-500 hover:text-emerald-700 flex items-center gap-1.5 font-medium"
              >
                <RefreshCw size={12} className={historyLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#087A3E] text-white uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Office In (Arrival)</th>
                    <th className="py-3 px-4">Office Out (Departure)</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Shift Status</th>
                    <th className="py-3 px-3 text-center">Office Photo</th>
                    <th className="py-3 px-4">Network / IP</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-400">
                        Loading attendance records...
                      </td>
                    </tr>
                  ) : !historyData?.records || historyData.records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-gray-400">
                        No attendance records found yet. Take an office photo above to mark attendance!
                      </td>
                    </tr>
                  ) : (
                    historyData.records.map((rec: any) => {
                      const h = Math.floor((rec.totalMinutes || 0) / 60);
                      const m = (rec.totalMinutes || 0) % 60;
                      return (
                        <tr key={rec.id} className="hover:bg-emerald-50/40 transition">
                          <td className="py-3 px-4 font-bold text-gray-900">{formatDate(rec.date)}</td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                            {formatTime(rec.clockInTime)}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-gray-800">
                            {rec.clockOutTime ? formatTime(rec.clockOutTime) : (
                              <span className="text-amber-600 font-bold">In Shift Now</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-700">
                            {rec.totalMinutes ? `${h}h ${m}m` : '--'}
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(rec.status)}</td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {rec.photoUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxData({
                                      photoUrl: rec.photoUrl,
                                      title: 'Office Arrival (In) Photo',
                                      time: formatTime(rec.clockInTime),
                                      location: rec.location || 'SAFAL Hub 1 Cold Storage, Navi Mumbai',
                                      staffName: user?.name,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg border border-emerald-300 transition shadow-xs cursor-pointer"
                                  title="View Arrival Photo"
                                >
                                  <img
                                    src={resolvePhotoUrl(rec.photoUrl)}
                                    alt="In"
                                    className="w-6 h-6 rounded object-cover border border-emerald-400"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <span className="text-[10px] font-bold">In</span>
                                </button>
                              )}
                              {rec.clockOutPhotoUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxData({
                                      photoUrl: rec.clockOutPhotoUrl,
                                      title: 'Office Departure (Out) Photo',
                                      time: formatTime(rec.clockOutTime),
                                      location: rec.location || 'SAFAL Hub 1 Cold Storage, Navi Mumbai',
                                      staffName: user?.name,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 p-1 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg border border-blue-300 transition shadow-xs cursor-pointer"
                                  title="View Departure Photo"
                                >
                                  <img
                                    src={resolvePhotoUrl(rec.clockOutPhotoUrl)}
                                    alt="Out"
                                    className="w-6 h-6 rounded object-cover border border-blue-400"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <span className="text-[10px] font-bold">Out</span>
                                </button>
                              )}
                              {!rec.photoUrl && !rec.clockOutPhotoUrl && (
                                <span className="text-gray-400 text-[10px]">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                            {rec.clockInIp || 'Office Network'}
                          </td>
                          <td className="py-3 px-4 text-gray-600 text-[11px] max-w-xs truncate">
                            {rec.notes || 'Normal shift'}
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

      {/* ----------------- TAB 2: COMPANY ROSTER (ADMIN) ----------------- */}
      {activeTab === 'roster' && isAdmin && (
        <div className="space-y-6">
          {/* Admin Filters & Date Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-emerald-700" />
                <span className="text-xs font-bold text-gray-700">Attendance Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={14} className="text-gray-500" />
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-emerald-600"
                >
                  <option value="All">All Departments</option>
                  <option value="Operations">Operations</option>
                  <option value="Procurement">Procurement</option>
                  <option value="Finance">Finance</option>
                  <option value="Logistics">Logistics</option>
                  <option value="Warehouse">Warehouse</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-600"
                />
              </div>
              <button
                onClick={fetchAdminRoster}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                title="Refresh Roster"
              >
                <RefreshCw size={14} className={rosterLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Admin Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm text-center">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Staff</div>
              <div className="text-xl font-black text-gray-900 mt-1">
                {rosterData?.summary?.totalStaff ?? 0}
              </div>
            </div>

            <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 shadow-sm text-center">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Present Today</div>
              <div className="text-xl font-black text-emerald-900 mt-1">
                {rosterData?.summary?.presentCount ?? 0}
              </div>
            </div>

            <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 shadow-sm text-center">
              <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">In Office Now</div>
              <div className="text-xl font-black text-blue-900 mt-1">
                {rosterData?.summary?.currentlyInOffice ?? 0}
              </div>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 shadow-sm text-center">
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Late Arrivals</div>
              <div className="text-xl font-black text-amber-900 mt-1">
                {rosterData?.summary?.lateCount ?? 0}
              </div>
            </div>

            <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 shadow-sm text-center col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Not Arrived</div>
              <div className="text-xl font-black text-rose-900 mt-1">
                {rosterData?.summary?.absentCount ?? 0}
              </div>
            </div>
          </div>

          {/* Admin Staff Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Company Shift Roster · {formatDate(selectedDate)}
                </h2>
                <p className="text-xs text-gray-500">Live attendance status of all registered personnel.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#087A3E] text-white uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Employee ID</th>
                    <th className="py-3 px-4">Department &amp; Role</th>
                    <th className="py-3 px-4">Office In (Arrival)</th>
                    <th className="py-3 px-4">Office Out (Departure)</th>
                    <th className="py-3 px-4">Total Time</th>
                    <th className="py-3 px-4">Attendance Status</th>
                    <th className="py-3 px-3 text-center">Photo Verification</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rosterLoading ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-gray-400">
                        Loading daily attendance roster...
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
                      const h = Math.floor((att?.totalMinutes || 0) / 60);
                      const m = (att?.totalMinutes || 0) % 60;
                      return (
                        <tr key={staff.employeeDbId} className="hover:bg-emerald-50/30 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900">{staff.fullName}</div>
                            <div className="text-[11px] text-gray-500">{staff.email}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                            {staff.employeeCode}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-800">{staff.designation}</div>
                            <div className="text-[11px] text-gray-500">{staff.department}</div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                            {att?.clockInTime ? formatTime(att.clockInTime) : '--:--'}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-gray-800">
                            {att?.clockOutTime ? (
                              formatTime(att.clockOutTime)
                            ) : att?.clockInTime ? (
                              <span className="text-amber-600 font-bold">In Shift Now</span>
                            ) : (
                              '--:--'
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-700">
                            {att?.totalMinutes ? `${h}h ${m}m` : '--'}
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(staff.displayStatus)}</td>
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
                                      location: att.location || 'SAFAL Hub 1 Cold Storage, Navi Mumbai',
                                      staffName: staff.fullName,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg border border-emerald-300 transition shadow-xs cursor-pointer"
                                  title="Click to verify arrival photo"
                                >
                                  <img
                                    src={resolvePhotoUrl(att.photoUrl)}
                                    alt={staff.fullName}
                                    className="w-7 h-7 rounded-lg object-cover border border-emerald-500"
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
                                      location: att.location || 'SAFAL Hub 1 Cold Storage, Navi Mumbai',
                                      staffName: staff.fullName,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 p-1 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg border border-blue-300 transition shadow-xs cursor-pointer"
                                  title="Click to verify departure photo"
                                >
                                  <img
                                    src={resolvePhotoUrl(att.clockOutPhotoUrl)}
                                    alt={staff.fullName}
                                    className="w-7 h-7 rounded-lg object-cover border border-blue-500"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  <span className="text-[10px] font-bold">Out</span>
                                </button>
                              )}
                              {!att?.photoUrl && !att?.clockOutPhotoUrl && (
                                <span className="text-gray-400 text-[10px] italic">Not Uploaded</span>
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

      {/* Photo Lightbox Popup */}
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
