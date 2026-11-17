import React, { useState, useEffect } from 'react';
import {
  CircleDollarSign,
  Clock3,
  WalletCards,
  ReceiptIndianRupee,
  ShoppingCart,
  Users,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  FileText,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onCreatePO: () => void;
}

const DEFAULT_DASHBOARD_DATA = {
  summary: {
    totalPOs: 0,
    openPOs: 0,
    closedPOs: 0,
    totalPOAmount: 0,
    pendingApprovals: 0,
    totalAccountants: 0,
    activeAccountants: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    monthlyWageCommitment: 0,
    totalWagesPayable: 0,
    totalWagesPaid: 0,
    pendingWages: 0,
    totalExpensesSubmitted: 0,
    approvedExpenses: 0,
    expensesPaid: 0,
    pendingReimbursements: 0,
    totalBillsCleared: 0,
    realizedProfit: 0,
    realizedLoss: 0,
    pendingFinancialResults: 0,
  },
  charts: {
    monthlyData: [],
    statusCounts: {},
  },
  recentPOs: [],
  pendingPOApprovals: [],
  recentExpenses: [],
  recentActivityLogs: [],
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onCreatePO }) => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await api.getAdminDashboard();
        if (isMounted) setData(res);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        if (isMounted) setData(DEFAULT_DASHBOARD_DATA);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] p-8 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#087A3E] mb-3" />
        <p className="text-xs text-emerald-800 font-semibold tracking-wide">Loading Dashboard Metrics...</p>
      </div>
    );
  }

  const safeData = data || DEFAULT_DASHBOARD_DATA;
  const summary = safeData.summary || DEFAULT_DASHBOARD_DATA.summary;
  const charts = safeData.charts || DEFAULT_DASHBOARD_DATA.charts;
  const recentPOs = safeData.recentPOs || [];
  const recentExpenses = safeData.recentExpenses || [];
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isEmployee = user?.role === 'EMPLOYEE';

  const formatCurrency = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  // Donut chart colors
  const STATUS_COLORS: Record<string, string> = {
    Open: '#087A3E',
    Closed: '#24A65A',
    PendingApproval: '#F59E0B',
    Draft: '#9CA3AF',
    Rejected: '#EF4444',
  };

  const donutData = Object.entries(charts.statusCounts || {}).map(([key, value]) => ({
    name: key.replace(/([A-Z])/g, ' $1').trim(),
    value: Number(value),
  }));

  // -------------------------------------------------------------
  // 1. ACCOUNTANT DASHBOARD VIEW (Section 7 of Master Prompt)
  // -------------------------------------------------------------
  if (isAccountant) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-[#064D2B] via-[#086333] to-[#0A7B3E] text-white p-6 rounded-2xl shadow-sm border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Finance &amp; Procurement Desk</span>
            </div>
            <h1 className="text-2xl font-extrabold font-['Manrope']">
              Accountant Operations Console
            </h1>
            <p className="text-xs text-emerald-100 mt-1">
              Logged in as <strong>{user?.name}</strong> ({user?.accountantProfile?.accountantId || 'ACC'}) · Maintain fruit POs, review employee expense claims, and track payments.
            </p>
          </div>
          <button
            onClick={onCreatePO}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#064D2B] hover:bg-emerald-50 rounded-xl text-xs font-bold transition shadow-sm self-start md:self-auto"
          >
            <Plus size={16} /> Create New PO
          </button>
        </div>

        {/* Accountant Summary Cards */}
        <section className="stat-grid dashboard-stats">
          <StatCard
            label="My Total PO Amount"
            value={formatCurrency(summary.totalPOAmount)}
            icon={<CircleDollarSign />}
            tone="gold"
            detail="Assigned PO Volume"
          />
          <StatCard
            label="Pending PO Approvals"
            value={summary.pendingApprovals}
            icon={<Clock3 />}
            tone="blue"
            detail="Awaiting Admin Decision"
          />
          <StatCard
            label="Total Employee Expenses"
            value={formatCurrency(summary.totalExpensesSubmitted)}
            icon={<ReceiptIndianRupee />}
            tone="green"
            detail="Submitted Claims"
          />
          <StatCard
            label="Pending Reimbursements"
            value={formatCurrency(summary.pendingReimbursements)}
            icon={<WalletCards />}
            tone="rose"
            detail="Needs Disbursement"
          />
        </section>

        {/* Accountant PO Workload Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase">My Open POs</span>
            <p className="text-2xl font-black text-[#087A3E] mt-1">{summary.openPOs}</p>
            <span className="text-[11px] text-gray-400">Goods in transit / active procurement</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase">My Closed POs</span>
            <p className="text-2xl font-black text-gray-800 mt-1">{summary.closedPOs}</p>
            <span className="text-[11px] text-gray-400">Consignments fully verified and cleared</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase">Expense Claims Reviewed</span>
            <p className="text-2xl font-black text-blue-700 mt-1">
              {recentExpenses.filter((e: any) => e.status !== 'SUBMITTED').length}
            </p>
            <span className="text-[11px] text-gray-400">Audit compliance verified</span>
          </div>
        </div>

        {/* Tables stacked vertically so Expense Claims is down and both tables get full width */}
        <div className="space-y-6">
          <section className="dashboard-panel">
            <div className="panel-heading">
              <h2>My Recent Purchase Orders</h2>
              <button onClick={() => onNavigate('Purchase Order (PO)')}>
                See all <ArrowRight size={14} />
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>PO Number</th>
                    <th>Supplier</th>
                    <th>Order Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPOs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400 text-xs">
                        No purchase orders recorded yet. Click "+ Create New PO" above to begin.
                      </td>
                    </tr>
                  ) : (
                    recentPOs.slice(0, 5).map((po: any) => (
                      <tr key={po.id}>
                        <td className="font-semibold text-emerald-800">{po.number}</td>
                        <td>{po.supplier}</td>
                        <td className="text-gray-600 text-xs">{new Date(po.date).toLocaleDateString('en-GB')}</td>
                        <td className="font-bold">{formatCurrency(po.amount)}</td>
                        <td>
                          <StatusBadge status={po.status} />
                        </td>
                        <td className="text-gray-500 text-xs">{po.createdBy}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="panel-heading">
              <h2>Expense Claims for Verification</h2>
              <button onClick={() => onNavigate('Employee Expenses')}>
                Review expenses <ArrowRight size={14} />
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    <th>Employee</th>
                    <th>Category</th>
                    <th>Expense Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400 text-xs">
                        No expense claims submitted for verification yet.
                      </td>
                    </tr>
                  ) : (
                    recentExpenses.slice(0, 5).map((exp: any) => (
                      <tr key={exp.id}>
                        <td className="font-semibold text-emerald-800">{exp.claim}</td>
                        <td>{exp.employee}</td>
                        <td className="text-gray-600 text-xs">{exp.category}</td>
                        <td className="text-gray-600 text-xs">{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                        <td className="font-bold">{formatCurrency(exp.amount)}</td>
                        <td>
                          <StatusBadge status={exp.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. EMPLOYEE DASHBOARD VIEW (Section 4 & 13)
  // -------------------------------------------------------------
  if (isEmployee) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-[#064D2B] via-[#086333] to-[#0A7B3E] text-white p-6 rounded-2xl shadow-sm border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Employee Portal</span>
            </div>
            <h1 className="text-2xl font-extrabold font-['Manrope']">
              Employee Expense &amp; Reimbursement Portal
            </h1>
            <p className="text-xs text-emerald-100 mt-1">
              Welcome, <strong>{user?.name}</strong> ({user?.employee?.employeeId || 'EMP'}) · {user?.employee?.department || 'Operations'} · Submit verified spending, upload bills, and track claim reimbursements.
            </p>
          </div>
          <button
            onClick={() => onNavigate('Employee Expenses')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#064D2B] hover:bg-emerald-50 rounded-xl text-xs font-bold transition shadow-sm self-start md:self-auto"
          >
            <Plus size={16} /> Submit Expense Claim
          </button>
        </div>

        <section className="stat-grid dashboard-stats">
          <StatCard
            label="Total Submitted"
            value={formatCurrency(summary.totalExpensesSubmitted)}
            icon={<ReceiptIndianRupee />}
            tone="blue"
            detail="All Filed Claims"
          />
          <StatCard
            label="Approved Expenses"
            value={formatCurrency(summary.approvedExpenses)}
            icon={<CheckCircle2 />}
            tone="green"
            detail="Authorized by Admin"
          />
          <StatCard
            label="Reimbursed Amount"
            value={formatCurrency(summary.expensesPaid)}
            icon={<WalletCards />}
            tone="gold"
            detail="Disbursed to Bank"
          />
          <StatCard
            label="Pending Reimbursement"
            value={formatCurrency(summary.pendingReimbursements)}
            icon={<Clock3 />}
            tone="rose"
            detail="Awaiting Payment"
          />
        </section>

        <section className="workspace-card">
          <div className="panel-heading">
            <h2>My Expense Claims &amp; Status</h2>
            <button onClick={() => onNavigate('Employee Expenses')}>
              View full history <ArrowRight size={14} />
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Claimed Amount</th>
                  <th>Approved Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.slice(0, 5).map((exp: any) => (
                  <tr key={exp.id}>
                    <td className="font-semibold text-emerald-800">{exp.claim}</td>
                    <td>{exp.category}</td>
                    <td>{new Date(exp.date).toLocaleDateString('en-GB')}</td>
                    <td className="font-bold">{formatCurrency(exp.amount)}</td>
                    <td className="font-semibold text-gray-700">
                      {exp.approved > 0 ? formatCurrency(exp.approved) : '—'}
                    </td>
                    <td>
                      <StatusBadge status={exp.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. ADMIN DASHBOARD VIEW (Section 6 & 18 of Master Prompt)
  // -------------------------------------------------------------
  return (
    <>
      {/* Executive Command Hero Banner (Clean, Creative, Real-World) */}
      <div className="bg-gradient-to-r from-[#064D2B] via-[#086333] to-[#0A7B3E] text-white p-6 rounded-2xl shadow-sm border border-emerald-800 mb-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>SAFAL Executive Control · FY 2026-27</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold font-['Manrope'] tracking-tight">
              Executive Management &amp; Financial Overview
            </h1>
            <p className="text-xs text-emerald-100 mt-1.5 max-w-2xl leading-relaxed">
              Consolidated fruit procurement pipeline, cold storage warehouse commitments, workforce wage obligations, and realized net performance for <strong>SAFAL EXPORT AND IMPORT PVT LTD</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-emerald-700/60 text-xs">
              <span className="inline-flex items-center gap-1.5 bg-black/15 px-3 py-1 rounded-full text-emerald-100 border border-emerald-500/20">
                <span className="font-semibold text-white">Hub 1:</span> Cold Storage Optimal (-0.5°C)
              </span>
              <span className="inline-flex items-center gap-1.5 bg-black/15 px-3 py-1 rounded-full text-emerald-100 border border-emerald-500/20">
                <span className="font-semibold text-white">Active POs:</span> 12 Orders (₹ 1.23 Cr)
              </span>
              <span className="inline-flex items-center gap-1.5 bg-black/15 px-3 py-1 rounded-full text-emerald-100 border border-emerald-500/20">
                <span className="font-semibold text-white">PostgreSQL:</span> Connected &amp; Synced
              </span>
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-2.5 self-start lg:self-auto flex-shrink-0">
            <button
              onClick={onCreatePO}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-[#064D2B] hover:bg-emerald-50 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus size={16} /> Create PO
            </button>
            <button
              onClick={() => onNavigate('Employee Expenses')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-800/80 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition border border-emerald-600/40"
            >
              Review Expenses
            </button>
            <button
              onClick={() => onNavigate('Reports')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-800/80 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition border border-emerald-600/40"
            >
              Download P&amp;L CSV
            </button>
          </div>
        </div>
      </div>

      {/* 14 Core KPI Stat Cards in Clean Grids */}
      <section className="stat-grid dashboard-stats">
        <StatCard
          label="Total PO Amount"
          value={formatCurrency(summary.totalPOAmount)}
          icon={<CircleDollarSign />}
          tone="gold"
          detail={`${summary.totalPOs} Total POs`}
        />
        <StatCard
          label="Pending Approvals"
          value={String(summary.pendingApprovals)}
          icon={<Clock3 />}
          tone="blue"
          detail="Requires Admin Decision"
        />
        <StatCard
          label="Monthly Wage Commitment"
          value={formatCurrency(summary.monthlyWageCommitment)}
          icon={<WalletCards />}
          tone="green"
          detail={`${summary.activeEmployees} Active Employees`}
        />
        <StatCard
          label="Pending Reimbursements"
          value={formatCurrency(summary.pendingReimbursements)}
          icon={<ReceiptIndianRupee />}
          tone="rose"
          detail="Approved Bills to Clear"
        />
      </section>

      {/* Second Row of Financial & Organizational KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-500 font-bold block uppercase">Realized Profit</span>
            <strong className="text-emerald-700 text-lg font-black block mt-0.5">
              +{formatCurrency(summary.realizedProfit)}
            </strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-500 font-bold block uppercase">Realized Loss</span>
            <strong className="text-red-700 text-lg font-black block mt-0.5">
              -{formatCurrency(summary.realizedLoss)}
            </strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 grid place-items-center">
            <TrendingDown size={20} />
          </div>
        </div>

        <div className="p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-500 font-bold block uppercase">Bills Cleared</span>
            <strong className="text-blue-700 text-lg font-black block mt-0.5">
              {summary.totalBillsCleared} Cleared
            </strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 grid place-items-center">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-gray-500 font-bold block uppercase">Finance Team</span>
            <strong className="text-purple-700 text-lg font-black block mt-0.5">
              {summary.activeAccountants} Accountants
            </strong>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 grid place-items-center">
            <Briefcase size={20} />
          </div>
        </div>
      </div>

      {/* Dynamic Charts Grid */}
      <div className="dashboard-grid">
        <section className="dashboard-panel chart-panel">
          <div className="panel-heading">
            <h2>Monthly Financial Activity (PO Value vs Expenses vs Wages)</h2>
            <button onClick={() => onNavigate('Reports')}>
              View reports <ArrowRight size={14} />
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="poValue" fill="#087A3E" name="PO Procurement Value" radius={[4, 4, 0, 0]} />
                <Bar dataKey="wagesPaid" fill="#24A65A" name="Wages Paid" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#F0BD4C" name="Employee Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="panel-heading">
            <h2>PO Status Distribution</h2>
            <button onClick={() => onNavigate('Purchase Order (PO)')}>
              View POs <ArrowRight size={14} />
            </button>
          </div>
          <div className="h-64 w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.name.replace(/\s/g, '')] || '#087A3E'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} Orders`, 'Count']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 text-xs mt-2">
              {donutData.map((d) => (
                <span key={d.name} className="inline-flex items-center gap-1.5 text-gray-600">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: STATUS_COLORS[d.name.replace(/\s/g, '')] || '#087A3E' }}
                  />
                  {d.name}: <b>{d.value}</b>
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Lower Tables Grid */}
      <div className="dashboard-grid lower-grid">
        <section className="dashboard-panel">
          <div className="panel-heading">
            <h2>Recent Purchase Orders</h2>
            <button onClick={() => onNavigate('Purchase Order (PO)')}>
              See all <ArrowRight size={14} />
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPOs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400 text-xs">
                      No purchase orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentPOs.map((order: any) => (
                    <tr key={order.id}>
                      <td className="font-semibold text-emerald-800">{order.number}</td>
                      <td>{order.supplier}</td>
                      <td className="font-bold">{formatCurrency(order.amount)}</td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="panel-heading">
            <h2>Expense Claims Needing Attention</h2>
            <button onClick={() => onNavigate('Employee Expenses')}>
              Review expenses <ArrowRight size={14} />
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Employee</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400 text-xs">
                      No expense claims pending attention.
                    </td>
                  </tr>
                ) : (
                  recentExpenses.map((expense: any) => (
                    <tr key={expense.id}>
                      <td className="font-semibold text-emerald-800">{expense.claim}</td>
                      <td>{expense.employee}</td>
                      <td className="font-bold">{formatCurrency(expense.amount)}</td>
                      <td>
                        <StatusBadge status={expense.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Quick Actions Bar */}
      <section className="quick-actions">
        <strong>Executive Operations &amp; Quick Actions</strong>
        <div>
          {[
            ['Create PO', 'Purchase Order (PO)'],
            ['Add Employee', 'Employees'],
            ['Review Expenses', 'Employee Expenses'],
            ['Clear Bills', 'Bill Clearance'],
            ['Wages & Salary', 'Wages & Salary'],
            ['Accountant Performance', 'Accountant Performance'],
            ['Download Report', 'Reports'],
          ].map(([label, page]) => (
            <button key={label} onClick={() => onNavigate(page)}>
              <Plus size={15} />
              {label}
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
      </section>
    </>
  );
};

