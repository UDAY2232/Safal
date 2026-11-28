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
  CreditCard,
  Percent,
  Building2,
  Layers,
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
  const [vendorCommData, setVendorCommData] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadReportsData() {
      try {
        setLoading(true);
        const [dashboardRes, statusRes, vendorCommRes] = await Promise.all([
          api.getAdminDashboard().catch(() => DEFAULT_METRICS),
          api.getSystemStatus().catch(() => null),
          api.getVendorCommissionReport().catch(() => []),
        ]);
        if (isMounted) {
          setData(dashboardRes || DEFAULT_METRICS);
          setSystemStatus(statusRes);
          setVendorCommData(Array.isArray(vendorCommRes) ? vendorCommRes : []);
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

  // Vendor Commission Aggregations (5% SAFAL, 1% APMC, 6% Total, 94% Net)
  const vendorGross = vendorCommData.reduce((sum, p) => sum + Number(p.grandTotal || 0), 0);
  const vendorSafal = vendorCommData.reduce((sum, p) => {
    return sum + (p.safalCommissionAmount !== undefined && p.safalCommissionAmount !== null ? Number(p.safalCommissionAmount) : Math.round(Number(p.grandTotal || 0) * 0.05));
  }, 0);
  const vendorApmc = vendorCommData.reduce((sum, p) => {
    return sum + (p.apmcCommissionAmount !== undefined && p.apmcCommissionAmount !== null ? Number(p.apmcCommissionAmount) : Math.round(Number(p.grandTotal || 0) * 0.01));
  }, 0);
  const vendorTotalComm = vendorSafal + vendorApmc;
  const vendorNetPayable = Math.max(0, vendorGross - vendorTotalComm);
  const vendorAdvancePaid = vendorCommData.reduce((sum, p) => sum + Number(p.advanceAmount || 0), 0);
  const vendorPendingDue = vendorCommData.reduce((sum, p) => {
    const net = p.netPayableAmount !== null && p.netPayableAmount !== undefined ? Number(p.netPayableAmount) : Math.max(0, Number(p.grandTotal || 0) * 0.94);
    const adv = Number(p.advanceAmount || 0);
    return sum + Number(p.pendingAmount ?? Math.max(0, net - adv));
  }, 0);

  const donutData = Object.entries(charts.statusCounts || {}).map(([key, value]) => ({
    name: key.replace(/([A-Z])/g, ' $1').trim(),
    value: Number(value),
  }));

  const reportItems = [
    {
      title: 'Vendor Commission & Mandi Settlement Report',
      type: 'vendor-commissions',
      desc: 'Itemized vendor consignment orders: 5% SAFAL platform commission, 1% APMC cess, total 6% commission deductions, and 94% net settlement payables.',
      icon: <Percent size={22} />,
      metric: `${vendorCommData.length} Vendor Orders · Comm: ${formatCurrency(vendorTotalComm)} · Net: ${formatCurrency(vendorNetPayable)}`,
      updated: '5% SAFAL + 1% APMC Rule Synced',
    },
    {
      title: 'Admin Purchase Orders Report (0% Commission)',
      type: 'admin-purchase-orders',
      desc: 'Direct fruit procurement purchase orders created by Head Office / Full Administrators with 0% commission applied.',
      icon: <Building2 size={22} />,
      metric: 'Exempt from Mandi Commission · 0% Deductions',
      updated: 'Corporate Direct Procurement',
    },
    {
      title: 'Purchase Orders Report (PO - Master)',
      type: 'purchase-orders',
      desc: 'Complete fruit procurement orders, suppliers, quantities, advance, pending due, and GST totals.',
      icon: <ShoppingCart size={22} />,
      metric: `${summary.totalPOs} Total Orders · ${formatCurrency(summary.totalPOAmount)}`,
      updated: 'Neon PostgreSQL Synced',
    },
    {
      title: 'Customer Dues (CD) Report',
      type: 'customer-dues',
      desc: 'Complete buyer dues, retail accounts, customer names, advance paid, pending collection dues, and clearing proofs.',
      icon: <CreditCard size={22} />,
      metric: `${summary.totalCDs || 0} Total Dues · ${formatCurrency(summary.totalCDAmount || 0)} (Due: ${formatCurrency(summary.totalCDDue || 0)})`,
      updated: 'Live Database Synced',
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

      {/* Real-Data Financial KPI Cards */}
      <section className="stat-grid dashboard-stats">
        <StatCard
          label="Total Procurement Spend (PO)"
          value={formatCurrency(summary.totalPOAmount)}
          icon={<ShoppingCart />}
          tone="gold"
          detail={`${summary.totalPOs} Verified Purchase Orders`}
        />
        <StatCard
          label="Total Customer Dues (CD)"
          value={formatCurrency(summary.totalCDAmount || 0)}
          icon={<CreditCard />}
          tone="green"
          detail={`${summary.totalCDs || 0} Customer Dues · Due: ${formatCurrency(summary.totalCDDue || 0)}`}
        />
        <StatCard
          label="Realized Net P&L"
          value={`+${formatCurrency(summary.realizedProfit - summary.realizedLoss)}`}
          icon={<TrendingUp />}
          tone="blue"
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
            label="Pending Approvals"
            value={String(summary.pendingApprovals)}
            icon={<Clock3 />}
            tone="rose"
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

      {/* Vendor Mandi Commission & Settlement Intelligence */}
      <section className="bg-gradient-to-br from-emerald-50/80 via-white to-green-50/60 p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Percent size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Vendor Consignment Commission &amp; Mandi Settlement Intelligence
              </h2>
              <p className="text-xs text-gray-500">
                Automated role-based commission accounting: SAFAL Platform (5%) + APMC Mandi Cess (1%) = 6% Total Deductions from Vendor POs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadReport('vendor-commissions', 'Vendor Commission Report')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              <ArrowDownToLine size={13} />
              <span>Vendor Commission CSV</span>
            </button>
            <button
              type="button"
              onClick={() => downloadReport('admin-purchase-orders', 'Admin PO Report')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs border border-gray-200 transition cursor-pointer"
            >
              <ArrowDownToLine size={13} />
              <span>Admin PO (0%) CSV</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-xs">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Vendor Orders</div>
            <div className="text-lg font-black text-gray-900 mt-1">{vendorCommData.length}</div>
            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Consignments</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-xs">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Gross Amount</div>
            <div className="text-lg font-black text-gray-900 mt-1">{formatCurrency(vendorGross)}</div>
            <div className="text-[10px] text-gray-500 font-medium mt-0.5">Pre-commission value</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-xs">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">SAFAL 5% Share</div>
            <div className="text-lg font-black text-emerald-800 mt-1">{formatCurrency(vendorSafal)}</div>
            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Platform commission</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-xs">
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">APMC 1% Cess</div>
            <div className="text-lg font-black text-amber-800 mt-1">{formatCurrency(vendorApmc)}</div>
            <div className="text-[10px] text-amber-600 font-medium mt-0.5">Market committee levy</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-purple-100 shadow-xs">
            <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide">Total 6% Comm</div>
            <div className="text-lg font-black text-purple-900 mt-1">{formatCurrency(vendorTotalComm)}</div>
            <div className="text-[10px] text-purple-600 font-medium mt-0.5">Total deductions</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-teal-100 shadow-xs">
            <div className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide">Net Vendor Payable</div>
            <div className="text-lg font-black text-teal-900 mt-1">{formatCurrency(vendorNetPayable)}</div>
            <div className="text-[10px] text-teal-600 font-medium mt-0.5">94% Eligible settlement</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 bg-white/70 p-2.5 rounded-xl border border-emerald-100/60 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span><b>Admin Direct Procurement:</b> ₹0 commission (0% applied). Full gross payable to direct suppliers.</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Disbursed Advance: <b className="text-gray-900">{formatCurrency(vendorAdvancePaid)}</b></span>
            <span>Pending Balance Due: <b className="text-amber-700">{formatCurrency(vendorPendingDue)}</b></span>
          </div>
        </div>
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
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
