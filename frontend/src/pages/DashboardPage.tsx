import React, { useState, useEffect } from 'react';
import {
  CircleDollarSign,
  Clock,
  Clock3,
  WalletCards,
  ReceiptIndianRupee,
  ShoppingCart,
  CreditCard,
  Users,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  FileText,
  AlertCircle,
  Briefcase,
  Truck,
  ShieldCheck,
  Lock,
  MapPin,
  Building2,
  Phone,
  User,
  X,
} from 'lucide-react';
import { VENDOR_WHITELISTED_LOCATIONS } from '../types';
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
import { AttendancePunchWidget } from '../components/AttendancePunchWidget';
import { PODetailModal } from '../components/PODetailModal';
import { SubmitDuePaymentModal } from '../components/SubmitDuePaymentModal';

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
    totalCDs: 0,
    openCDs: 0,
    closedCDs: 0,
    totalCDAmount: 0,
    totalCDDue: 0,
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
  recentCDs: [],
  pendingPOApprovals: [],
  recentExpenses: [],
  recentActivityLogs: [],
};

// In-memory cache for 0ms instantaneous dashboard transitions
let memoryDashboardCache: any = null;

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onCreatePO }) => {
  const { user } = useAuth();
  // Initialize with in-memory or persisted cache so page renders IMMEDIATELY with zero spinner delay
  const [data, setData] = useState<any>(() => {
    if (memoryDashboardCache) return memoryDashboardCache;
    try {
      const saved = localStorage.getItem('safal_dashboard_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        memoryDashboardCache = parsed;
        return parsed;
      }
    } catch {}
    return DEFAULT_DASHBOARD_DATA;
  });
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [duePaymentOrder, setDuePaymentOrder] = useState<any | null>(null);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);

  // Vendor Network state
  const [vendors, setVendors] = useState<any[]>([]);
  const [loadingVendors, setLoadingVendors] = useState<boolean>(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState<boolean>(false);
  const [submittingVendor, setSubmittingVendor] = useState<boolean>(false);
  const [vendorFormError, setVendorFormError] = useState<string>('');

  // Add Vendor form state
  const [vBusinessName, setVBusinessName] = useState('');
  const [vContactPerson, setVContactPerson] = useState('');
  const [vPhone, setVPhone] = useState('');
  const [vEmail, setVEmail] = useState('');
  const [vPrimaryLocation, setVPrimaryLocation] = useState<string>(VENDOR_WHITELISTED_LOCATIONS[0]);
  const [vAadhar, setVAadhar] = useState('');
  const [vPan, setVPan] = useState('');
  const [vBankAcc, setVBankAcc] = useState('');
  const [vBankIfsc, setVBankIfsc] = useState('');
  const [vBankHolder, setVBankHolder] = useState('');
  const [vBankName, setVBankName] = useState('');
  const [vBankBranch, setVBankBranch] = useState('');
  const [vPassword, setVPassword] = useState('Safal@2026');

  const loadVendors = async () => {
    try {
      setLoadingVendors(true);
      const res = await api.getAllVendors();
      setVendors(Array.isArray(res) ? res : []);
    } catch (e) {
      console.warn('Failed to load vendors:', e);
    } finally {
      setLoadingVendors(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setVendorFormError('');
    if (!vBusinessName || !vContactPerson || !vPhone || !vAadhar || !vPan || !vBankAcc || !vBankIfsc || !vBankHolder) {
      setVendorFormError('Please fill all mandatory fields (Business Name, Contact, Phone, Aadhaar, PAN, Bank Details).');
      return;
    }
    const cleanAadhaar = vAadhar.replace(/\D/g, '');
    if (cleanAadhaar.length !== 12) {
      setVendorFormError('Aadhaar number must be exactly 12 digits.');
      return;
    }
    if (vPan.trim().length !== 10) {
      setVendorFormError('PAN number must be exactly 10 alphanumeric characters.');
      return;
    }
    try {
      setSubmittingVendor(true);
      await api.createVendorByAdmin({
        businessName: vBusinessName.trim(),
        contactPerson: vContactPerson.trim(),
        phone: vPhone.trim(),
        email: vEmail.trim() || undefined,
        primaryLocation: vPrimaryLocation,
        aadharNumber: cleanAadhaar,
        panNumber: vPan.trim().toUpperCase(),
        bankAccountNumber: vBankAcc.trim(),
        bankIfscCode: vBankIfsc.trim().toUpperCase(),
        bankAccountHolder: vBankHolder.trim(),
        bankName: vBankName.trim() || undefined,
        bankBranch: vBankBranch.trim() || undefined,
        password: vPassword || 'Safal@2026',
        isKycLocked: true,
      });
      setShowAddVendorModal(false);
      setVBusinessName('');
      setVContactPerson('');
      setVPhone('');
      setVEmail('');
      setVAadhar('');
      setVPan('');
      setVBankAcc('');
      setVBankIfsc('');
      setVBankHolder('');
      setVBankName('');
      setVBankBranch('');
      await loadVendors();
      await refreshDashboard();
      alert('Vendor registered successfully with permanent KYC freeze!');
    } catch (err: any) {
      setVendorFormError(err.message || 'Failed to register vendor.');
    } finally {
      setSubmittingVendor(false);
    }
  };

  const refreshDashboard = async () => {
    try {
      const res = await api.getAdminDashboard();
      setData(res);
      memoryDashboardCache = res;
      try {
        localStorage.setItem('safal_dashboard_cache', JSON.stringify(res));
      } catch {}
    } catch {}
  };

  const handleOpenOrder = async (orderId: string) => {
    try {
      setLoadingOrderId(orderId);
      const fullOrder = await api.getPurchaseOrderById(orderId);
      setSelectedOrder(fullOrder);
    } catch (err: any) {
      console.error('Failed to open order dossier:', err);
      alert('Failed to load order details');
    } finally {
      setLoadingOrderId(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await api.getAdminDashboard();
        if (isMounted) {
          setData(res);
          memoryDashboardCache = res;
          try {
            localStorage.setItem('safal_dashboard_cache', JSON.stringify(res));
          } catch {}
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        if (isMounted && !data) setData(DEFAULT_DASHBOARD_DATA);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    loadVendors();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // NEVER block the user screen with full-page loading spinner. Always render immediately!
  const safeData = data || DEFAULT_DASHBOARD_DATA;
  const summary = safeData.summary || DEFAULT_DASHBOARD_DATA.summary;
  const charts = safeData.charts || DEFAULT_DASHBOARD_DATA.charts;
  const rawRecentPOs = safeData.recentPOs || [];
  const rawRecentCDs = safeData.recentCDs || [];
  const recentPOs = rawRecentPOs.filter((p: any) => !String(p.number || '').startsWith('CD/'));
  const recentCDs = rawRecentCDs.length > 0 
    ? rawRecentCDs 
    : rawRecentPOs.filter((p: any) => String(p.number || '').startsWith('CD/'));
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
  // 1. OPERATIONS CONSOLE (Accountants & Field Employees)
  // -------------------------------------------------------------
  if (isAccountant || isEmployee) {
    const roleId = isAccountant
      ? user?.accountantProfile?.accountantId || 'SEI-01'
      : user?.employee?.employeeId || 'EMP';

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-[#064D2B] via-[#086333] to-[#0A7B3E] text-white p-6 rounded-2xl shadow-sm border border-emerald-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isAccountant ? 'Finance & Procurement Desk' : 'Field Customer Due Desk'}</span>
            </div>
            <h1 className="text-2xl font-extrabold font-['Manrope']">
              {isAccountant ? 'Accountant Operations Console' : 'Employee Operations Console'}
            </h1>
            <p className="text-xs text-emerald-100 mt-1">
              Logged in as <strong>{user?.name}</strong> ({roleId}) · {isAccountant ? 'Maintain fruit POs, review employee expense claims, and track payments.' : isEmployee ? 'Record Customer Dues (CD), submit expense claims, and track daily office attendance.' : 'Initiate fruit POs, submit expense claims, and track daily office attendance.'}
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            {isAccountant && (
              <button
                onClick={() => onNavigate('Customer Due (CD)')}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800/80 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition border border-emerald-600/40 shadow-sm"
              >
                <CreditCard size={15} /> Customer Due (CD)
              </button>
            )}
            <button
              onClick={() => onNavigate('Attendance')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-800/80 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition border border-emerald-600/40 shadow-sm"
            >
              <Clock size={15} /> My Attendance
            </button>
            <button
              onClick={onCreatePO}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#064D2B] hover:bg-emerald-50 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus size={16} /> {isEmployee ? 'Create CD [Customer Due]' : 'Create New PO'}
            </button>
          </div>
        </div>

        {/* Priority Daily Attendance Tracker */}
        <AttendancePunchWidget onViewLogs={() => onNavigate('Attendance')} />

        {/* Summary Stat Cards */}
        <section className="stat-grid dashboard-stats">
          <StatCard
            label={isAccountant ? 'Total PO Amount' : isEmployee ? 'My Total Customer Dues (CD)' : 'My Total PO Amount'}
            value={formatCurrency(isEmployee ? (summary.totalCDAmount || summary.totalPOAmount) : summary.totalPOAmount)}
            icon={<CircleDollarSign />}
            tone="gold"
            detail={isAccountant ? `${summary.totalPOs} Company POs` : isEmployee ? 'Recorded Customer Orders' : 'My Initiated POs'}
            onClick={() => onNavigate(isEmployee ? 'Customer Due (CD)' : 'Purchase Order (PO)')}
          />
          {isAccountant && (
            <StatCard
              label="Total CD Amount"
              value={formatCurrency(summary.totalCDAmount || 0)}
              icon={<CreditCard />}
              tone="gold"
              detail={`${summary.totalCDs || 0} Total Customer Dues`}
              onClick={() => onNavigate('Customer Due (CD)')}
            />
          )}
          <StatCard
            label={isAccountant ? 'Pending Approvals' : 'My Pending Approvals'}
            value={summary.pendingApprovals}
            icon={<Clock3 />}
            tone="blue"
            detail="Awaiting Admin Decision"
            onClick={() => onNavigate('Customer Due (CD)')}
          />
          <StatCard
            label={isAccountant ? 'Total Employee Expenses' : 'My Expenses Submitted'}
            value={formatCurrency(summary.totalExpensesSubmitted)}
            icon={<ReceiptIndianRupee />}
            tone="green"
            detail={isAccountant ? 'All Staff Claims' : 'Submitted Claims'}
            onClick={() => onNavigate('Employee Expenses')}
          />
          <StatCard
            label="Pending Reimbursements"
            value={formatCurrency(summary.pendingReimbursements)}
            icon={<WalletCards />}
            tone="rose"
            detail="Needs Disbursement"
            onClick={() => onNavigate(isAccountant ? 'Bill Clearance' : 'Employee Expenses')}
          />
        </section>

        {/* Workload Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase">
              {isAccountant ? 'Company Open POs' : isEmployee ? 'My Open CDs' : 'My Open POs'}
            </span>
            <p className="text-2xl font-black text-[#087A3E] mt-1">{isEmployee ? summary.openCDs : summary.openPOs}</p>
            <span className="text-[11px] text-gray-400">
              {isEmployee ? 'Active customer dues pending clearance' : 'Goods in transit / active procurement'}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase">
              {isAccountant ? 'Company Closed POs' : isEmployee ? 'My Settled CDs' : 'My Closed POs'}
            </span>
            <p className="text-2xl font-black text-gray-800 mt-1">{isEmployee ? summary.closedCDs : summary.closedPOs}</p>
            <span className="text-[11px] text-gray-400">
              {isEmployee ? 'Fully settled & approved customer dues' : 'Consignments fully verified and cleared'}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-500 uppercase">
              {isAccountant ? 'Expense Claims for Review' : 'My Claims Submitted'}
            </span>
            <p className="text-2xl font-black text-blue-700 mt-1">
              {recentExpenses.length}
            </p>
            <span className="text-[11px] text-gray-400">
              {isAccountant ? 'Audit compliance verified' : 'Verified status & reimbursements'}
            </span>
          </div>
        </div>

        {/* Tables stacked vertically so Expense Claims is down and both tables get full width */}
        <div className="space-y-6">
          {isEmployee ? (
            <section className="dashboard-panel">
              <div className="panel-heading">
                <h2>My Recent Customer Dues (CD)</h2>
                <button onClick={() => onNavigate('Customer Due (CD)')}>
                  See all <ArrowRight size={14} />
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>CD Number</th>
                      <th>Customer / Buyer</th>
                      <th>Order Date</th>
                      <th>Amount</th>
                      <th>Due Amount</th>
                      <th>Status</th>
                      <th>Created By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCDs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-400 text-xs">
                          No customer dues recorded yet. Click "+ Create CD [Customer Due]" above to begin.
                        </td>
                      </tr>
                    ) : (
                      recentCDs.slice(0, 6).map((cd: any) => (
                        <tr key={cd.id}>
                          <td className="font-semibold text-emerald-800">{cd.number}</td>
                          <td className="font-medium text-gray-900">{cd.supplier}</td>
                          <td className="text-gray-600 text-xs">{cd.date ? new Date(cd.date).toLocaleDateString('en-GB') : '--'}</td>
                          <td className="font-bold">{formatCurrency(cd.amount)}</td>
                          <td>
                            {Number(cd.pendingAmount || 0) > 0 ? (
                              <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                {formatCurrency(cd.pendingAmount)}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-bold">₹0 (Cleared)</span>
                            )}
                          </td>
                          <td>
                            <StatusBadge status={cd.status} />
                          </td>
                          <td className="text-gray-500 text-xs">{cd.createdBy}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <>
              {/* Accountant View: Separate Recent Purchase Orders and Recent Customer Dues (CD) */}
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
                        <th>Supplier / Buyer</th>
                        <th>Order Date</th>
                        <th>Total Amount</th>
                        <th>Due Amount</th>
                        <th>Status</th>
                        <th>Order Taken By</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPOs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-gray-400 text-xs">
                            No purchase orders recorded yet. Click "+ Create New PO" above to begin.
                          </td>
                        </tr>
                      ) : (
                        recentPOs.slice(0, 6).map((po: any) => (
                          <tr
                            key={po.id}
                            onClick={() => handleOpenOrder(po.id)}
                            className="cursor-pointer hover:bg-emerald-50/40 transition"
                            title="Click to view purchase order dossier"
                          >
                            <td className="font-semibold text-emerald-800">{po.number}</td>
                            <td className="font-medium text-gray-900">{po.supplier}</td>
                            <td className="text-gray-600 text-xs">{po.date ? new Date(po.date).toLocaleDateString('en-GB') : '--'}</td>
                            <td className="font-bold">{formatCurrency(po.amount)}</td>
                            <td>
                              {Number(po.pendingAmount || 0) > 0 ? (
                                <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  {formatCurrency(po.pendingAmount)}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold">₹0 (Cleared)</span>
                              )}
                            </td>
                            <td>
                              <StatusBadge status={po.status} />
                            </td>
                            <td className="text-gray-600 text-xs font-semibold">{po.createdBy}</td>
                            <td>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenOrder(po.id);
                                }}
                                disabled={loadingOrderId === po.id}
                                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                {loadingOrderId === po.id ? 'Loading...' : 'View'} <ArrowRight size={12} />
                              </button>
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
                  <h2>Recent Customer Dues (CD)</h2>
                  <button onClick={() => onNavigate('Customer Due (CD)')}>
                    See all <ArrowRight size={14} />
                  </button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>CD Number</th>
                        <th>Customer / Buyer</th>
                        <th>Order Date</th>
                        <th>Total Amount</th>
                        <th>Due Balance</th>
                        <th>Status</th>
                        <th>Recorded By</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCDs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-8 text-gray-400 text-xs">
                            No customer dues recorded yet.
                          </td>
                        </tr>
                      ) : (
                        recentCDs.slice(0, 6).map((cd: any) => (
                          <tr
                            key={cd.id}
                            onClick={() => handleOpenOrder(cd.id)}
                            className="cursor-pointer hover:bg-emerald-50/40 transition"
                            title="Click to view customer due dossier"
                          >
                            <td className="font-semibold text-emerald-800">{cd.number}</td>
                            <td className="font-medium text-gray-900">{cd.supplier}</td>
                            <td className="text-gray-600 text-xs">{cd.date ? new Date(cd.date).toLocaleDateString('en-GB') : '--'}</td>
                            <td className="font-bold">{formatCurrency(cd.amount)}</td>
                            <td>
                              {Number(cd.pendingAmount || 0) > 0 ? (
                                <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  {formatCurrency(cd.pendingAmount)}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold">₹0 (Cleared)</span>
                              )}
                            </td>
                            <td>
                              <StatusBadge status={cd.status} />
                            </td>
                            <td className="text-gray-600 text-xs font-semibold">{cd.createdBy}</td>
                            <td>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenOrder(cd.id);
                                }}
                                disabled={loadingOrderId === cd.id}
                                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                {loadingOrderId === cd.id ? 'Loading...' : 'View'} <ArrowRight size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          <section className="dashboard-panel">
            <div className="panel-heading">
              <h2>{isAccountant ? 'Expense Claims for Verification' : 'My Recent Expense Claims'}</h2>
              <button onClick={() => onNavigate('Employee Expenses')}>
                {isAccountant ? 'Review expenses' : 'View all'} <ArrowRight size={14} />
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
                <span className="font-semibold text-white">Active POs:</span>{' '}
                {summary.totalPOs} {summary.totalPOs === 1 ? 'Order' : 'Orders'} ({formatCurrency(summary.totalPOAmount)})
              </span>
              <span className="inline-flex items-center gap-1.5 bg-black/15 px-3 py-1 rounded-full text-emerald-100 border border-emerald-500/20">
                <span className="font-semibold text-white">Active CDs:</span>{' '}
                {summary.totalCDs || 0} {(summary.totalCDs || 0) === 1 ? 'Customer Due' : 'Customer Dues'} ({formatCurrency(summary.totalCDAmount || 0)})
              </span>
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-2.5 self-start lg:self-auto flex-shrink-0">
            <button
              onClick={() => onNavigate('Customer Due (CD)')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-800/80 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition border border-emerald-600/40"
            >
              <CreditCard size={14} /> Customer Due (CD)
            </button>
            <button
              onClick={onCreatePO}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-[#064D2B] hover:bg-emerald-50 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus size={16} /> Create PO
            </button>
            <button
              onClick={() => onNavigate('Attendance')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-800/80 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition border border-emerald-600/40"
            >
              <Clock size={14} /> Staff Attendance
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

      {/* Biometric Office Shift Attendance Tracker */}
      <div className="mb-6">
        <AttendancePunchWidget onViewLogs={() => onNavigate('Attendance')} />
      </div>

      {/* 14 Core KPI Stat Cards in Clean Grids */}
      <section className="stat-grid dashboard-stats">
        <StatCard
          label="Total PO Amount"
          value={formatCurrency(summary.totalPOAmount)}
          icon={<CircleDollarSign />}
          tone="gold"
          detail={`${summary.totalPOs} Total POs`}
          onClick={() => onNavigate('Purchase Order (PO)')}
        />
        <StatCard
          label="Total CD Amount"
          value={formatCurrency(summary.totalCDAmount || 0)}
          icon={<CreditCard />}
          tone="gold"
          detail={`${summary.totalCDs || 0} Total Customer Dues`}
          onClick={() => onNavigate('Customer Due (CD)')}
        />
        <StatCard
          label="Pending Approvals"
          value={String(summary.pendingApprovals)}
          icon={<Clock3 />}
          tone="blue"
          detail="Requires Admin Decision"
          onClick={() => onNavigate('Customer Due (CD)')}
        />
        <StatCard
          label="Monthly Wage Commitment"
          value={formatCurrency(summary.monthlyWageCommitment)}
          icon={<WalletCards />}
          tone="green"
          detail={`${summary.activeEmployees} Active Employees`}
          onClick={() => onNavigate('Wages & Salary')}
        />
        <StatCard
          label="Pending Reimbursements"
          value={formatCurrency(summary.pendingReimbursements)}
          icon={<ReceiptIndianRupee />}
          tone="rose"
          detail="Approved Bills to Clear"
          onClick={() => onNavigate('Employee Expenses')}
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
            <span className="text-[11px] text-gray-500 font-bold block uppercase">Active Workforce</span>
            <strong className="text-purple-700 text-lg font-black block mt-0.5">
              {summary.activeEmployees} Active Today
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
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
      {/* VENDOR OPERATIONS & PROCUREMENT NETWORK SECTION */}
      <section className="dashboard-panel border-2 border-emerald-500/20 bg-gradient-to-b from-white to-[#F7FAF8] shadow-sm rounded-2xl overflow-hidden p-4 sm:p-6 mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D5E3D8]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-[#064D2B] text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-700" />
                Vendor Procurement &amp; Logistics
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                8 Regional Hubs
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                55% Auto-Advance Policy
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 mt-2 font-['Manrope']">
              Direct Farmer &amp; Wholesale Vendor Network
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Wholesale procurement contracts across 8 regional hubs with verified, locked bank KYCs.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAddVendorModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#087A3E] hover:bg-[#064D2B] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} /> Add Vendor
            </button>
            <button
              type="button"
              onClick={onCreatePO}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#064D2B] border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart size={15} /> Create Vendor PO
            </button>
            <button
              type="button"
              onClick={() => onNavigate('Vendors (KYC)')}
              className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              Manage KYC <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* 4 Mini Vendor KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 my-4">
          <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Registered Vendors</span>
            <p className="text-xl font-black text-[#064D2B] mt-1">{vendors.length}</p>
            <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">✓ KYC Frozen &amp; Active</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-amber-100 shadow-2xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Procurement Hubs</span>
            <p className="text-xl font-black text-amber-700 mt-1">8 Cities</p>
            <span className="text-[10px] text-gray-500 truncate block mt-0.5">Chennai, Hyd, Wgl, Vja...</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Active Dispatches</span>
            <p className="text-xl font-black text-blue-700 mt-1">
              {recentPOs.filter((p: any) => p.dispatchStatus === 'LOADED_AND_DISPATCHED' || p.dispatchStatus === 'IN_TRANSIT').length}
            </p>
            <span className="text-[10px] text-blue-600 font-bold block mt-0.5">Trucks on Road</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-2xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">55% Advance Outlay</span>
            <p className="text-xl font-black text-emerald-800 mt-1">
              {formatCurrency(
                recentPOs.reduce((sum: number, p: any) => sum + Number(p.advanceAmount || 0), 0)
              )}
            </p>
            <span className="text-[10px] text-gray-500 block mt-0.5">Auto-Allocated</span>
          </div>
        </div>

        {/* Registered Vendors Table */}
        <div className="table-wrap bg-white rounded-xl border border-[#D5E3D8] overflow-hidden">
          <table>
            <thead>
              <tr>
                <th>Vendor ID</th>
                <th>Business / Trade Name</th>
                <th>Contact Person</th>
                <th>Primary Hub</th>
                <th>KYC Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-400 text-xs">
                    {loadingVendors ? 'Loading vendor network...' : 'No vendors registered yet. Click "+ Add Vendor" to register a wholesale supplier.'}
                  </td>
                </tr>
              ) : (
                vendors.slice(0, 5).map((v) => (
                  <tr key={v.id} className="hover:bg-emerald-50/30 transition">
                    <td>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded font-mono font-black text-xs">
                        {v.vendorId}
                      </span>
                    </td>
                    <td className="font-bold text-gray-900">
                      {v.businessName}
                      <span className="block text-[10px] text-gray-400 font-normal">{v.phone}</span>
                    </td>
                    <td className="text-gray-700 font-medium text-xs">{v.contactPerson}</td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-md">
                        <MapPin size={11} className="text-emerald-700" /> {v.primaryLocation}
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Lock size={10} className="text-emerald-700" /> KYC Frozen
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onCreatePO}
                          className="text-xs text-[#087A3E] hover:text-[#064D2B] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          + Issue PO
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigate('Vendors (KYC)')}
                          className="text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
                        >
                          Details &rarr;
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Lower Tables Stacked Vertically (Recent POs on top full-width, Expense Claims Needing Attention directly below) */}
      <div className="space-y-6 mt-6">
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
                  <th>Order Number</th>
                  <th>Party / Supplier</th>
                  <th>Order Taken By (Staff / Admin)</th>
                  <th>Order Date</th>
                  <th>Total Amount</th>
                  <th>Due Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentPOs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400 text-xs">
                      No purchase orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentPOs.map((order: any) => (
                    <tr
                      key={order.id}
                      onClick={() => handleOpenOrder(order.id)}
                      className="cursor-pointer hover:bg-emerald-50/40 transition"
                      title="Click to view full purchase order dossier"
                    >
                      <td className="font-semibold text-emerald-800">{order.number}</td>
                      <td className="font-medium text-gray-900">{order.supplier}</td>
                      <td className="text-gray-700 text-xs font-semibold">{order.createdBy || '--'}</td>
                      <td className="text-gray-600 text-xs">
                        {order.date ? new Date(order.date).toLocaleDateString('en-GB') : '--'}
                      </td>
                      <td className="font-bold">{formatCurrency(order.amount)}</td>
                      <td>
                        {Number(order.pendingAmount || 0) > 0 ? (
                          <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {formatCurrency(order.pendingAmount)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold">₹0 (Cleared)</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenOrder(order.id);
                          }}
                          disabled={loadingOrderId === order.id}
                          className="text-xs text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          {loadingOrderId === order.id ? 'Loading...' : 'View'} <ArrowRight size={12} />
                        </button>
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
            <h2>Recent Customer Dues (CD)</h2>
            <button onClick={() => onNavigate('Customer Due (CD)')}>
              See all <ArrowRight size={14} />
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CD Number</th>
                  <th>Buyer / Customer</th>
                  <th>Order Taken By (Staff)</th>
                  <th>Order Date</th>
                  <th>Total Amount</th>
                  <th>Due Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentCDs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-400 text-xs">
                      No customer dues recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentCDs.map((order: any) => (
                    <tr
                      key={order.id}
                      onClick={() => handleOpenOrder(order.id)}
                      className="cursor-pointer hover:bg-emerald-50/40 transition"
                      title="Click to view full customer due dossier"
                    >
                      <td className="font-semibold text-emerald-800">{order.number}</td>
                      <td className="font-medium text-gray-900">{order.supplier}</td>
                      <td className="text-gray-700 text-xs font-semibold">{order.createdBy || '--'}</td>
                      <td className="text-gray-600 text-xs">
                        {order.date ? new Date(order.date).toLocaleDateString('en-GB') : '--'}
                      </td>
                      <td className="font-bold">{formatCurrency(order.amount)}</td>
                      <td>
                        {Number(order.pendingAmount || 0) > 0 ? (
                          <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {formatCurrency(order.pendingAmount)}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold">₹0 (Cleared)</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={order.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenOrder(order.id);
                          }}
                          disabled={loadingOrderId === order.id}
                          className="text-xs text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          {loadingOrderId === order.id ? 'Loading...' : 'View'} <ArrowRight size={12} />
                        </button>
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
                  <th>Category</th>
                  <th>Expense Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400 text-xs">
                      No expense claims pending attention.
                    </td>
                  </tr>
                ) : (
                  recentExpenses.map((expense: any) => (
                    <tr key={expense.id}>
                      <td className="font-semibold text-emerald-800">{expense.claim}</td>
                      <td>{expense.employee}</td>
                      <td className="text-gray-600 text-xs">{expense.category || 'Operations'}</td>
                      <td className="text-gray-600 text-xs">
                        {expense.date ? new Date(expense.date).toLocaleDateString('en-GB') : '--'}
                      </td>
                      <td className="font-bold">{formatCurrency(expense.amount)}</td>
                      <td>
                        <StatusBadge status={expense.status} />
                      </td>
                      <td>
                        <button
                          onClick={() => onNavigate('Employee Expenses')}
                          className="text-xs text-emerald-700 hover:text-emerald-900 font-bold inline-flex items-center gap-1"
                        >
                          Review <ArrowRight size={12} />
                        </button>
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
            ['Customer Due (CD)', 'Customer Due (CD)'],
            ['Create PO', 'Purchase Order (PO)'],
            ['Add Employee', 'Employees'],
            ['Review Expenses', 'Employee Expenses'],
            ['Clear Bills', 'Bill Clearance'],
            ['Wages & Salary', 'Wages & Salary'],
            ['Staff Attendance', 'Attendance'],
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

      {/* PO / CD Dossier Detail Modal */}
      {selectedOrder && (
        <PODetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onRefresh={refreshDashboard}
          onNotify={(msg) => alert(msg)}
          onOpenDuePayment={(ord) => {
            setSelectedOrder(null);
            setDuePaymentOrder(ord);
          }}
        />
      )}

      {/* Direct Settlement Modal */}
      {duePaymentOrder && (
        <SubmitDuePaymentModal
          order={duePaymentOrder}
          onClose={() => setDuePaymentOrder(null)}
          onSuccess={(msg) => {
            alert(msg);
            setDuePaymentOrder(null);
            refreshDashboard();
          }}
        />
      )}

      {/* Admin Fast Add Vendor Modal */}
      {showAddVendorModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-70 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-gray-200 shadow-2xl p-5 sm:p-6 my-auto max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                  Wholesale Procurement Partner
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-0.5 font-['Manrope']">
                  Register New Vendor (KYC Frozen)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVendorModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {vendorFormError && (
              <div className="p-3 my-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-200">
                {vendorFormError}
              </div>
            )}

            <form onSubmit={handleCreateVendor} className="overflow-y-auto flex-1 pr-1 py-3 space-y-4 text-xs">
              {/* Business & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Business / Firm Name *</label>
                  <input
                    type="text"
                    required
                    value={vBusinessName}
                    onChange={(e) => setVBusinessName(e.target.value)}
                    placeholder="e.g. Ramesh Agro Farms & Cold Storage"
                    className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Authorized Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={vContactPerson}
                    onChange={(e) => setVContactPerson(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Phone, Email, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={vPhone}
                    onChange={(e) => setVPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Login Email (Optional)</label>
                  <input
                    type="email"
                    value={vEmail}
                    onChange={(e) => setVEmail(e.target.value)}
                    placeholder="vendor@safalexports.com"
                    className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Primary Delivery Hub *</label>
                  <select
                    value={vPrimaryLocation}
                    onChange={(e) => setVPrimaryLocation(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                  >
                    {VENDOR_WHITELISTED_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc} Hub
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tax Records: Aadhaar & PAN */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                  Statutory Tax &amp; Identity (Permanently Frozen)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Aadhaar Number (12 digits) *</label>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={vAadhar}
                      onChange={(e) => setVAadhar(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456789012"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">PAN Card Number (10 chars) *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={vPan}
                      onChange={(e) => setVPan(e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Banking Details */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block flex items-center gap-1">
                  <Lock size={12} /> Direct Settlement Bank Account (Permanently Frozen)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Account Number *</label>
                    <input
                      type="text"
                      required
                      value={vBankAcc}
                      onChange={(e) => setVBankAcc(e.target.value)}
                      placeholder="Account number"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">IFSC Code *</label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={vBankIfsc}
                      onChange={(e) => setVBankIfsc(e.target.value.toUpperCase())}
                      placeholder="SBIN0001234"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Account Holder Name *</label>
                    <input
                      type="text"
                      required
                      value={vBankHolder}
                      onChange={(e) => setVBankHolder(e.target.value)}
                      placeholder="Beneficiary name"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={vBankName}
                      onChange={(e) => setVBankName(e.target.value)}
                      placeholder="e.g. State Bank of India"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={vBankBranch}
                      onChange={(e) => setVBankBranch(e.target.value)}
                      placeholder="e.g. Warangal Main Branch"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Initial Portal Password</label>
                <input
                  type="text"
                  value={vPassword}
                  onChange={(e) => setVPassword(e.target.value)}
                  placeholder="Safal@2026"
                  className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Vendor can log in using either sequential Vendor ID (e.g. VND-002) or email.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVendor}
                  className="px-5 py-2.5 rounded-xl bg-[#087A3E] hover:bg-[#064D2B] text-white font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Lock size={14} />
                  {submittingVendor ? 'Registering & Freezing KYC...' : 'Register & Lock Vendor (KYC)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

