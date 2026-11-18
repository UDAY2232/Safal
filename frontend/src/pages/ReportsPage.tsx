import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  ArrowDownToLine,
  ShoppingCart,
  WalletCards,
  ReceiptIndianRupee,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock3,
  Database,
  BarChart3,
  PieChart as PieIcon,
  ShieldCheck,
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
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';

interface ReportsPageProps {
  onNotify: (msg: string) => void;
}

const DEFAULT_METRICS = {
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
    monthlyData: [] as any[],
    statusCounts: {} as Record<string, number>,
  },
};

const STATUS_COLORS: Record<string, string> = {
  Open: '#087A3E',
  Closed: '#24A65A',
  PendingApproval: '#F59E0B',
  Draft: '#9CA3AF',
  Rejected: '#EF4444',
  Approved: '#3B82F6',
};

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadReportsData() {
      try {
        setLoading(true);
        const [dashboardRes, statusRes] = await Promise.all([
          api.getAdminDashboard().catch(() => DEFAULT_METRICS),
          api.getSystemStatus().catch(() => null),
        ]);
        if (isMounted) {
          setData(dashboardRes || DEFAULT_METRICS);
          setSystemStatus(statusRes);
        }
      } catch (err) {
        console.error('Failed to load reports data:', err);
        if (isMounted) setData(DEFAULT_METRICS);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadReportsData();
    return () => {
      isMounted = false;
    };
  }, []);

  const downloadReport = async (type: string, title: string) => {
    try {
      await api.downloadReportCSV(type);
      onNotify(`${title} downloaded successfully as CSV`);
    } catch {
      onNotify(`Failed to download ${title}`);
    }
  };

  const safeData = data || DEFAULT_METRICS;
  const summary = safeData.summary || DEFAULT_METRICS.summary;
  const charts = safeData.charts || DEFAULT_METRICS.charts;

  const formatCurrency = (val: number) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  const donutData = Object.entries(charts.statusCounts || {}).map(([key, value]) => ({
    name: key.replace(/([A-Z])/g, ' $1').trim(),
    value: Number(value),
  }));

  const reportItems = [
    {
      title: 'Purchase Orders Report',
      type: 'purchase-orders',
      desc: 'Complete fruit procurement orders, suppliers, quantities, advance, pending due, and GST totals.',
      icon: <ShoppingCart size={22} />,
      metric: `${summary.totalPOs} Total Orders · ${formatCurrency(summary.totalPOAmount)}`,
      updated: 'Neon PostgreSQL Synced',
    },
    ...(isAdmin
      ? [
          {
            title: 'Employee Wages & Salary Report',
            type: 'wages',
            desc: 'Workforce salary disbursements, authorized deductions, net payables, and historical pay run records.',
            icon: <WalletCards size={22} />,
            metric: `${summary.activeEmployees} Active Staff · ${formatCurrency(summary.monthlyWageCommitment)}/mo`,
            updated: 'Live Payroll Sync',
          },
        ]
      : []),
    {
      title: 'Employee Expenses & Reimbursements',
      type: 'expenses',
      desc: 'Itemized travel, fuel, cold-storage logistics spending claims with verified audit trails.',
      icon: <ReceiptIndianRupee size={22} />,
      metric: `${formatCurrency(summary.totalExpensesSubmitted)} Filed · ${formatCurrency(summary.expensesPaid)} Cleared`,
      updated: 'Expense Ledger Sync',
    },
    {
      title: 'Verified Profit & Loss Statement',
      type: 'profit-loss',
      desc: 'Traceable consignment P&L derived from procurement purchase orders and recognized sales revenues.',
      icon: <TrendingUp size={22} />,
      metric: `Profit: +${formatCurrency(summary.realizedProfit)} | Loss: -${formatCurrency(summary.realizedLoss)}`,
      updated: 'P&L Verified Sync',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 size={15} />
            <span>Centralized Financial &amp; Operations Intelligence</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#064D2B] font-['Manrope']">
            SAFAL Analytical Reports &amp; Statements
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Live metrics aggregated directly from PostgreSQL database. Export certified CSV datasets compatible with Tally, Excel, and corporate auditors.
          </p>
        </div>

        {systemStatus && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs">
            <Database size={18} className="text-emerald-700" />
            <div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{systemStatus.database || 'neondb'} (Cloud)</span>
              </div>
              <span className="text-[10px] text-emerald-700">
                {systemStatus.records?.purchaseOrders || 0} POs · {systemStatus.records?.employees || 0} Employees
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 4 Real-Data Financial KPI Cards */}
      <section className="stat-grid dashboard-stats">
        <StatCard
          label="Total Procurement Spend"
          value={formatCurrency(summary.totalPOAmount)}
          icon={<ShoppingCart />}
          tone="gold"
          detail={`${summary.totalPOs} Verified Purchase Orders`}
        />
        <StatCard
          label="Realized Net P&L"
          value={`+${formatCurrency(summary.realizedProfit - summary.realizedLoss)}`}
          icon={<TrendingUp />}
          tone="green"
          detail={`Profit: +${formatCurrency(summary.realizedProfit)} · Loss: -${formatCurrency(summary.realizedLoss)}`}
        />
        {isAdmin ? (
          <StatCard
            label="Monthly Wage Obligations"
            value={formatCurrency(summary.monthlyWageCommitment)}
            icon={<WalletCards />}
            tone="blue"
            detail={`${summary.activeEmployees} Active Employees on Payroll`}
          />
        ) : (
          <StatCard
            label="Pending PO Approvals"
            value={String(summary.pendingApprovals)}
            icon={<Clock3 />}
            tone="blue"
            detail="Awaiting Admin Decision"
          />
        )}
        <StatCard
          label="Pending Reimbursements"
          value={formatCurrency(summary.pendingReimbursements)}
          icon={<ReceiptIndianRupee />}
          tone="rose"
          detail={`${summary.totalBillsCleared} Total Bills Cleared to Date`}
        />
      </section>

      {/* 2 Data Visualizations: Monthly Activity & PO Distribution */}
      <div className="dashboard-grid">
        <section className="dashboard-panel chart-panel">
          <div className="panel-heading">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-[#087A3E]" />
              <h2>Monthly Financial Flow (Procurement vs Wages vs Expenses)</h2>
            </div>
            <span className="text-xs text-gray-500 font-semibold">FY 2026-27</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#888" fontSize={11} />
                <YAxis stroke="#888" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => formatCurrency(Number(val))}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="poValue" fill="#087A3E" name="Procurement Volume" radius={[4, 4, 0, 0]} />
                <Bar dataKey="wagesPaid" fill="#24A65A" name="Wages Disbursed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#F59E0B" name="Employee Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dashboard-panel">
          <div className="panel-heading">
            <div className="flex items-center gap-2">
              <PieIcon size={18} className="text-[#087A3E]" />
              <h2>PO Fulfillment Status Breakdown</h2>
            </div>
            <span className="text-xs text-gray-500 font-semibold">{summary.totalPOs} Orders</span>
          </div>
          <div className="h-64 w-full flex flex-col items-center justify-center">
            {donutData.length === 0 || donutData.every((d) => d.value === 0) ? (
              <div className="text-center text-gray-400 text-xs py-8">
                No orders recorded yet to display distribution.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
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
              </>
            )}
          </div>
        </section>
      </div>

      {/* CSV Export Cards */}
      <div>
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">
          Download Certified Operational CSV Datasets
        </h2>
        <section className="report-grid">
          {reportItems.map((item) => (
            <article className="report-card" key={item.title}>
              <div className="report-icon">{item.icon}</div>
              <div className="flex-1 pr-2">
                <h3>{item.title}</h3>
                <p className="text-xs text-gray-500 mb-1">{item.desc}</p>
                <div className="font-semibold text-emerald-800 text-xs mt-1">{item.metric}</div>
                <span className="text-[10px] text-gray-400 mt-1 block">{item.updated}</span>
              </div>
              <button
                onClick={() => downloadReport(item.type, item.title)}
                title="Download CSV"
                className="hover:bg-emerald-100 transition inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-[#087A3E] font-bold text-xs border border-emerald-200 cursor-pointer shadow-xs shrink-0 self-center"
              >
                <ArrowDownToLine size={15} className="shrink-0" />
                <span>Export</span>
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};
