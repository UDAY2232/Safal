import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart2,
  Users,
  MapPin,
  Store,
  ShoppingBag,
  Calendar,
  DollarSign,
  Download,
  Search,
  Filter,
  Eye,
  X,
  Plus,
  Repeat,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Phone,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  UserCheck
} from 'lucide-react';
import { api } from '../../services/api';

interface SellerBusinessAnalyticsAdminProps {
  onNotify?: (msg: string) => void;
}

export const SellerBusinessAnalyticsAdmin: React.FC<SellerBusinessAnalyticsAdminProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'employees' | 'areas' | 'sellers' | 'monthly' | 'orders'
  >('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [overview, setOverview] = useState<any>(null);
  const [employeePerformance, setEmployeePerformance] = useState<any[]>([]);
  const [areaPerformance, setAreaPerformance] = useState<any[]>([]);
  const [sellerReports, setSellerReports] = useState<any[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // Filters & Search
  const [searchSeller, setSearchSeller] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');

  // Modals
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [selectedSellerForTransfer, setSelectedSellerForTransfer] = useState<any>(null);
  const [selectedEmployeeDrilldown, setSelectedEmployeeDrilldown] = useState<any>(null);
  const [selectedSellerProfile, setSelectedSellerProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Create Order Form State
  const [newOrder, setNewOrder] = useState({
    sellerId: '',
    orderDate: new Date().toISOString().split('T')[0],
    fruitNames: 'Kashmir Royal Apples (Grade A)',
    totalQuantityKg: 100,
    orderValue: 85000,
    paidAmount: 85000,
    paymentStatus: 'PAID',
    orderStatus: 'COMPLETED',
    notes: '',
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Transfer Seller Form State
  const [transferTargetEmpId, setTransferTargetEmpId] = useState('');
  const [transferReason, setTransferReason] = useState('Territory workload realignment');
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ovRes, empRes, areaRes, sellerRes, monthRes, ordRes] = await Promise.allSettled([
        api.getAdminBusinessOverview(),
        api.getAdminEmployeePerformance(),
        api.getAdminAreaPerformance(),
        api.getAdminSellerReports(),
        api.getAdminMonthlyReport(`?month=${selectedMonth}`),
        api.getSellerOrders(),
      ]);

      if (ovRes.status === 'fulfilled') setOverview(ovRes.value);
      if (empRes.status === 'fulfilled') setEmployeePerformance(Array.isArray(empRes.value) ? empRes.value : []);
      if (areaRes.status === 'fulfilled') setAreaPerformance(Array.isArray(areaRes.value) ? areaRes.value : []);
      if (sellerRes.status === 'fulfilled') setSellerReports(Array.isArray(sellerRes.value) ? sellerRes.value : []);
      if (monthRes.status === 'fulfilled') setMonthlyReport(monthRes.value);
      if (ordRes.status === 'fulfilled') setOrders(Array.isArray(ordRes.value) ? ordRes.value : []);
    } catch (err) {
      console.error('Error loading admin seller analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fmt = (num: number = 0) => '₹' + Number(num || 0).toLocaleString('en-IN');

  // Handle Record New Verified Order
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError('');

    if (!newOrder.sellerId) {
      setOrderError('Please select a registered fruit seller.');
      return;
    }
    if (!newOrder.orderValue || Number(newOrder.orderValue) <= 0) {
      setOrderError('Please enter a valid positive order value.');
      return;
    }

    setSubmittingOrder(true);
    try {
      await api.createSellerOrder({
        ...newOrder,
        totalQuantityKg: Number(newOrder.totalQuantityKg) || 1,
        orderValue: Number(newOrder.orderValue),
        paidAmount: Number(newOrder.paidAmount) || 0,
      });
      onNotify?.('Verified order successfully recorded and attributed to responsible employee!');
      setShowCreateOrderModal(false);
      loadData();
    } catch (err: any) {
      setOrderError(err.message || 'Failed to record verified order.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Handle Transfer Seller
  const handleTransferSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSellerForTransfer || !transferTargetEmpId) return;

    setSubmittingTransfer(true);
    try {
      await api.transferSellerAttribution({
        sellerId: selectedSellerForTransfer.id,
        toEmployeeId: transferTargetEmpId,
        reason: transferReason,
      });
      onNotify?.(`Seller ${selectedSellerForTransfer.shopName} successfully transferred!`);
      setSelectedSellerForTransfer(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to transfer seller');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Open Seller Profile
  const openSellerProfile = async (sellerId: string) => {
    setProfileLoading(true);
    try {
      const data = await api.getSellerBusinessProfile(sellerId);
      setSelectedSellerProfile(data);
    } catch (err: any) {
      alert(err.message || 'Could not load seller profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const kpis = overview?.kpis || {};

  // Export CSV
  const exportSellerReportsCSV = () => {
    if (sellerReports.length === 0) return;
    const headers = [
      'Seller Code',
      'Shop Name',
      'Owner Name',
      'Mobile',
      'Area',
      'Responsible Employee',
      'Registration Date',
      'Classification',
      'Total Orders',
      'Total Purchase Value (INR)',
      'Total Paid (INR)',
      'Outstanding Due (INR)',
      'Last Purchase Date',
    ];
    const rows = sellerReports.map((s) => [
      `"${s.sellerCode}"`,
      `"${s.shopName}"`,
      `"${s.ownerName}"`,
      `"${s.mobile}"`,
      `"${s.areaName}"`,
      `"${s.employeeName}"`,
      `"${new Date(s.registrationDate).toLocaleDateString()}"`,
      `"${s.customerType}"`,
      s.totalOrders,
      s.totalPurchaseValue,
      s.totalPaid,
      s.totalDue,
      s.lastPurchaseDate ? `"${new Date(s.lastPurchaseDate).toLocaleDateString()}"` : 'None',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SAFAL_Admin_Seller_Business_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered sellers list
  const filteredSellers = sellerReports.filter((s) => {
    const matchSearch =
      searchSeller === '' ||
      s.shopName.toLowerCase().includes(searchSeller.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(searchSeller.toLowerCase()) ||
      s.mobile.includes(searchSeller) ||
      s.sellerCode.toLowerCase().includes(searchSeller.toLowerCase());
    const matchArea = areaFilter === 'all' || s.areaName === areaFilter;
    const matchEmployee = employeeFilter === 'all' || s.employeeName === employeeFilter;
    return matchSearch && matchArea && matchEmployee;
  });

  const uniqueAreas = Array.from(new Set(sellerReports.map((s) => s.areaName).filter(Boolean)));
  const uniqueEmployees = Array.from(new Set(sellerReports.map((s) => s.employeeName).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#064D2B] via-[#086338] to-[#0A7B45] text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 bg-emerald-400/20 text-emerald-200 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-400/30">
                SAFAL Master Administration
              </span>
              <span className="px-3 py-0.5 bg-amber-400/20 text-amber-200 rounded-full text-xs font-black uppercase tracking-wider border border-amber-400/30">
                Audited Fiscal Governance
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Field Sales & Buyer Business Analytics
            </h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-2xl">
              Measuring real revenue, wholesale order conversions, and repeat customer retention across all sales territories and field employees.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                if (sellerReports.length > 0) {
                  setNewOrder((prev) => ({ ...prev, sellerId: prev.sellerId || sellerReports[0].id }));
                }
                setShowCreateOrderModal(true);
              }}
              className="px-4 py-2.5 bg-white text-[#064D2B] rounded-xl font-bold text-sm shadow hover:bg-emerald-50 active:scale-95 transition flex items-center gap-2"
            >
              <Plus size={18} /> Record Verified Order
            </button>
            <button
              onClick={exportSellerReportsCSV}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold text-sm shadow active:scale-95 transition flex items-center gap-2"
            >
              <Download size={18} /> Export Full Report
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <TrendingUp size={16} /> Business Overview
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'employees'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Users size={16} /> Employee-wise Performance ({employeePerformance.length})
        </button>
        <button
          onClick={() => setActiveTab('areas')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'areas'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <MapPin size={16} /> Area-wise Performance ({areaPerformance.length})
        </button>
        <button
          onClick={() => setActiveTab('sellers')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'sellers'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Store size={16} /> Buyer-wise Reports ({sellerReports.length})
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'monthly'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Calendar size={16} /> Monthly Reports
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <ShoppingBag size={16} /> All Verified Orders ({orders.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* 1. TAB: BUSINESS OVERVIEW                                 */}
      {/* ========================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 8 KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Registered Sellers</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{kpis.totalRegisteredSellers || 0}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Across all 14 sales territories</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Purchasing Sellers</p>
              <p className="text-2xl font-black text-emerald-800 mt-1">{kpis.totalActivePurchasingSellers || 0}</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                {kpis.totalRepeatBuyers || 0} Repeat Buyers 👑
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Verified Revenue</p>
              <p className="text-2xl font-black text-[#064D2B] mt-1">{fmt(kpis.totalVerifiedSalesValue)}</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{kpis.totalVerifiedOrders || 0} Orders</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Monthly Sales Value</p>
              <p className="text-2xl font-black text-purple-900 mt-1">{fmt(kpis.totalMonthlySalesValue)}</p>
              <p className="text-[11px] text-purple-600 font-bold mt-0.5 flex items-center gap-0.5">
                {kpis.monthOnMonthGrowth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {kpis.monthOnMonthGrowth}% MoM Growth
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Repeat Customer Rate</p>
              <p className="text-2xl font-black text-blue-900 mt-1">
                {kpis.totalActivePurchasingSellers > 0
                  ? Math.round((kpis.totalRepeatBuyers / kpis.totalActivePurchasingSellers) * 100)
                  : 0}
                %
              </p>
              <p className="text-[11px] text-blue-600 font-semibold mt-0.5">High retention ratio</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Average Order Value (AOV)</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{fmt(kpis.averageOrderValue)}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Per wholesale transaction</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inactive Buyers</p>
              <p className="text-2xl font-black text-rose-700 mt-1">{kpis.totalInactiveSellers || 0}</p>
              <p className="text-[11px] text-rose-600 font-semibold mt-0.5">&gt;30 days without orders</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Field Sales Team</p>
              <p className="text-2xl font-black text-[#064D2B] mt-1">{employeePerformance.length} Officers</p>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">14 Allocated Hubs</p>
            </div>
          </div>

          {/* Quick Comparison Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Employees by Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                <Users size={16} className="text-[#064D2B]" />
                Top Performing Sales Officers
              </h3>
              <div className="space-y-3">
                {employeePerformance
                  .slice()
                  .sort((a, b) => b.totalSalesValue - a.totalSalesValue)
                  .map((emp, idx) => (
                    <div key={emp.employeeId} className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-900">
                          {idx + 1}. {emp.fullName} ({emp.employeeCode})
                        </span>
                        <span className="font-black text-emerald-800">{fmt(emp.totalSalesValue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>{emp.assignedAreas.join(', ')}</span>
                        <span>{emp.ordersCount} orders • {emp.purchasingSellersCount} buyers</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Top Areas by Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                <MapPin size={16} className="text-[#064D2B]" />
                Top Revenue Territories
              </h3>
              <div className="space-y-3">
                {areaPerformance
                  .slice()
                  .sort((a, b) => b.totalSalesValue - a.totalSalesValue)
                  .slice(0, 5)
                  .map((area, idx) => (
                    <div key={area.areaId} className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-900">
                          {idx + 1}. {area.areaName}
                        </span>
                        <span className="font-black text-[#064D2B]">{fmt(area.totalSalesValue)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>Officers: {area.assignedEmployees.join(', ') || 'Unassigned'}</span>
                        <span>{area.sellersCount} sellers • {area.ordersCount} orders</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. TAB: EMPLOYEE-WISE BUSINESS PERFORMANCE                */}
      {/* ========================================================= */}
      {activeTab === 'employees' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Employee-wise Sales Performance</h3>
              <p className="text-xs text-gray-500">
                Audited wholesale fruit business generated by buyers registered or managed by each field employee.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Assigned Areas</th>
                  <th className="py-3 px-4 text-center">Registered Buyers</th>
                  <th className="py-3 px-4 text-center">Purchasing Buyers</th>
                  <th className="py-3 px-4 text-center">Repeat Buyers</th>
                  <th className="py-3 px-4 text-center">Total Orders</th>
                  <th className="py-3 px-4 text-right">Monthly Sales</th>
                  <th className="py-3 px-4 text-right">Total Verified Sales</th>
                  <th className="py-3 px-4 text-center">Points</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employeePerformance.map((emp) => (
                  <tr key={emp.employeeId} className="hover:bg-emerald-50/40 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900">{emp.fullName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{emp.employeeCode} • {emp.designation}</p>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-700 max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {emp.assignedAreas.map((a: string) => (
                          <span key={a} className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-md text-[10px] font-bold">
                            {a}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                      {emp.registeredSellersCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-800">
                      {emp.purchasingSellersCount}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-purple-800">
                      {emp.repeatBuyersCount} 👑
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                      {emp.ordersCount}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-purple-900">
                      {fmt(emp.monthlySalesValue)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-[#064D2B]">
                      {fmt(emp.totalSalesValue)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-black text-amber-700">
                      {emp.totalPoints} pts
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedEmployeeDrilldown(emp)}
                        className="px-3 py-1 bg-[#064D2B] text-white hover:bg-[#086338] rounded-lg text-xs font-bold transition"
                      >
                        Inspect Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. TAB: AREA-WISE BUSINESS PERFORMANCE                    */}
      {/* ========================================================= */}
      {activeTab === 'areas' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Territory Business Comparison</h3>
              <p className="text-xs text-gray-500">
                Comparing seller registrations, order count, and revenue across Warangal, Hanamkonda, Kazipet, Hasanparthy, Ghanpur, Huzurabad, Parakal, Mahabubabad, Thorrur, Suryapet, Bhadrachalam, Bhupalpally, Karimnagar, Khammam.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Territory Name</th>
                  <th className="py-3 px-4">District / State</th>
                  <th className="py-3 px-4">Assigned Sales Officers</th>
                  <th className="py-3 px-4 text-center">Registered Buyers</th>
                  <th className="py-3 px-4 text-center">Purchasing Customers</th>
                  <th className="py-3 px-4 text-center">Repeat Buyers</th>
                  <th className="py-3 px-4 text-center">Verified Orders</th>
                  <th className="py-3 px-4 text-right">Monthly Revenue</th>
                  <th className="py-3 px-4 text-right">Total Verified Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {areaPerformance.map((area) => (
                  <tr key={area.areaId} className="hover:bg-emerald-50/40 transition">
                    <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-1.5">
                      <MapPin size={14} className="text-[#064D2B]" /> {area.areaName}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 font-medium">{area.district}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      {area.assignedEmployees.length > 0 ? (
                        <span>{area.assignedEmployees.join(', ')}</span>
                      ) : (
                        <span className="text-gray-400 italic">No Officer Assigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-800">{area.sellersCount}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-emerald-800">{area.purchasingSellersCount}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-purple-800">{area.repeatBuyersCount} 👑</td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-900">{area.ordersCount}</td>
                    <td className="py-3.5 px-4 text-right font-black text-purple-900">{fmt(area.monthlySalesValue)}</td>
                    <td className="py-3.5 px-4 text-right font-black text-[#064D2B]">{fmt(area.totalSalesValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. TAB: SELLER-WISE REPORTS                               */}
      {/* ========================================================= */}
      {activeTab === 'sellers' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search buyers by name, owner, phone..."
                  value={searchSeller}
                  onChange={(e) => setSearchSeller(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700"
              >
                <option value="all">All Areas</option>
                {uniqueAreas.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700"
              >
                <option value="all">All Employees</option>
                {uniqueEmployees.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <button
              onClick={exportSellerReportsCSV}
              className="px-3.5 py-2 bg-emerald-50 text-[#064D2B] hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Buyer / Shop</th>
                  <th className="py-3 px-4">Area</th>
                  <th className="py-3 px-4">Responsible Officer</th>
                  <th className="py-3 px-4">Customer Type</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4 text-right">Lifetime Sales</th>
                  <th className="py-3 px-4 text-right">Current Month</th>
                  <th className="py-3 px-4 text-right">Outstanding Dues</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSellers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900">{s.shopName}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{s.sellerCode} • {s.ownerName} ({s.mobile})</p>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-gray-700">{s.areaName}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900">{s.employeeName}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-800">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {s.customerType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-800">{s.totalOrders}</td>
                    <td className="py-3.5 px-4 text-right font-black text-[#064D2B]">{fmt(s.totalPurchaseValue)}</td>
                    <td className="py-3.5 px-4 text-right font-black text-purple-900">{fmt(s.monthlyPurchaseValue)}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-amber-700">
                      {s.totalDue > 0 ? fmt(s.totalDue) : <span className="text-emerald-700">Cleared</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openSellerProfile(s.id)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSellerForTransfer(s);
                            setTransferTargetEmpId(employeePerformance[0]?.employeeId || '');
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <UserCheck size={12} /> Transfer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. TAB: MONTHLY REPORTS                                   */}
      {/* ========================================================= */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Monthly Fiscal Audit & Sales Report</h3>
              <p className="text-xs text-gray-500">
                Detailed breakdowns of employee-wise buyer acquisition and sales contribution for {selectedMonth}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">Select Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  loadData();
                }}
                className="py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
              />
            </div>
          </div>

          {monthlyReport && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employee Sales Contribution in Month */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                  <Users size={16} className="text-[#064D2B]" />
                  Employee Sales Contribution ({selectedMonth})
                </h4>
                <div className="space-y-3">
                  {monthlyReport.employeeReport?.map((emp: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-900">{emp.name}</span>
                        <span className="font-black text-emerald-800">{fmt(emp.sales)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>New Sellers Registered: {emp.registered}</span>
                        <span>{emp.orders} orders</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Area Sales Contribution in Month */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                  <MapPin size={16} className="text-[#064D2B]" />
                  Area Sales Contribution ({selectedMonth})
                </h4>
                <div className="space-y-3">
                  {monthlyReport.areaReport?.map((area: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-900">{area.name}</span>
                        <span className="font-black text-[#064D2B]">{fmt(area.sales)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>{area.orders} orders delivered</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inactive Sellers Requiring Immediate Follow-up */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 md:col-span-2">
                <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600" />
                  Inactive Sellers Requiring Field Follow-Up ({monthlyReport.inactiveSellersCount || 0})
                </h4>
                <p className="text-xs text-gray-500">
                  These fruit shops have made no purchases in this month. Follow-up visits are recommended to reactivate them.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {monthlyReport.inactiveSellers?.map((s: any) => (
                    <div key={s.id} className="p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-xs space-y-1">
                      <p className="font-extrabold text-gray-900">{s.shopName}</p>
                      <p className="text-gray-500">{s.ownerName} • {s.mobile}</p>
                      <p className="text-[11px] text-rose-700 font-semibold">{s.areaName} ({s.employeeName})</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. TAB: ALL VERIFIED ORDERS                               */}
      {/* ========================================================= */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">All Verified Wholesale Orders</h3>
              <p className="text-xs text-gray-500">
                Official transaction log of all verified wholesale fruit deliveries made to local buyers.
              </p>
            </div>
            <button
              onClick={() => {
                if (sellerReports.length > 0) {
                  setNewOrder((prev) => ({ ...prev, sellerId: prev.sellerId || sellerReports[0].id }));
                }
                setShowCreateOrderModal(true);
              }}
              className="px-3.5 py-2 bg-[#064D2B] text-white hover:bg-[#086338] rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus size={14} /> Record Order
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Buyer Name</th>
                  <th className="py-3 px-4">Territory</th>
                  <th className="py-3 px-4">Responsible Officer</th>
                  <th className="py-3 px-4">Commodities</th>
                  <th className="py-3 px-4 text-center">Qty (Boxes)</th>
                  <th className="py-3 px-4 text-right">Value (INR)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">{o.orderNumber}</td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {new Date(o.orderDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">{o.seller?.shopName}</td>
                    <td className="py-3.5 px-4 text-gray-700 font-medium">{o.area?.name}</td>
                    <td className="py-3.5 px-4 text-gray-800 font-semibold">{o.employee?.fullName}</td>
                    <td className="py-3.5 px-4 text-gray-700 max-w-xs truncate">{o.fruitNames}</td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-800">{o.totalQuantityKg}</td>
                    <td className="py-3.5 px-4 text-right font-black text-[#064D2B]">{fmt(o.orderValue)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {o.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: RECORD VERIFIED DIRECT ORDER                       */}
      {/* ========================================================= */}
      {showCreateOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <ShoppingBag size={18} className="text-[#064D2B]" />
                Record Verified Wholesale Order
              </h3>
              <button onClick={() => setShowCreateOrderModal(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            {orderError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold">
                {orderError}
              </div>
            )}

            <form onSubmit={handleCreateOrder} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Registered Fruit Buyer *</label>
                <select
                  value={newOrder.sellerId}
                  onChange={(e) => setNewOrder({ ...newOrder, sellerId: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-900"
                  required
                >
                  <option value="">-- Choose Registered Buyer --</option>
                  {sellerReports.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shopName} ({s.areaName} - {s.employeeName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Commodity / Fruit Names *</label>
                <input
                  type="text"
                  value={newOrder.fruitNames}
                  onChange={(e) => setNewOrder({ ...newOrder, fruitNames: e.target.value })}
                  placeholder="e.g. Kashmir Royal Apples (Grade A)"
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Volume (Boxes / Kg) *</label>
                  <input
                    type="number"
                    value={newOrder.totalQuantityKg}
                    onChange={(e) => setNewOrder({ ...newOrder, totalQuantityKg: Number(e.target.value) })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Order Date *</label>
                  <input
                    type="date"
                    value={newOrder.orderDate}
                    onChange={(e) => setNewOrder({ ...newOrder, orderDate: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Total Order Value (₹) *</label>
                  <input
                    type="number"
                    value={newOrder.orderValue}
                    onChange={(e) => setNewOrder({ ...newOrder, orderValue: Number(e.target.value), paidAmount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-black text-[#064D2B]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Paid Amount (₹)</label>
                  <input
                    type="number"
                    value={newOrder.paidAmount}
                    onChange={(e) => setNewOrder({ ...newOrder, paidAmount: Number(e.target.value) })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateOrderModal(false)}
                  className="px-4 py-2 bg-gray-100 font-bold rounded-xl text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="px-4 py-2 bg-[#064D2B] hover:bg-[#086338] text-white font-bold rounded-xl shadow-md transition"
                >
                  {submittingOrder ? 'Saving...' : 'Record Order (+Points)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TRANSFER SELLER ATTRIBUTION                        */}
      {/* ========================================================= */}
      {selectedSellerForTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <UserCheck size={18} className="text-amber-600" />
                Transfer Buyer Ownership
              </h3>
              <button onClick={() => setSelectedSellerForTransfer(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl text-xs space-y-1">
              <p className="font-bold text-amber-900">Transferring Buyer:</p>
              <p className="font-black text-gray-900">{selectedSellerForTransfer.shopName}</p>
              <p className="text-gray-600">Current Officer: <strong>{selectedSellerForTransfer.employeeName}</strong></p>
            </div>

            <form onSubmit={handleTransferSeller} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Reassign To Sales Officer *</label>
                <select
                  value={transferTargetEmpId}
                  onChange={(e) => setTransferTargetEmpId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                  required
                >
                  {employeePerformance.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Transfer Audit Reason *</label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl font-medium"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedSellerForTransfer(null)}
                  className="px-4 py-2 bg-gray-100 font-bold rounded-xl text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTransfer}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition"
                >
                  {submittingTransfer ? 'Transferring...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SELLER PROFILE DRILLDOWN                           */}
      {/* ========================================================= */}
      {selectedSellerProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-gray-200 my-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-[#064D2B] rounded-2xl">
                  <Store size={26} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">
                    {selectedSellerProfile.seller?.shopName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedSellerProfile.seller?.sellerCode} • {selectedSellerProfile.seller?.ownerName} • {selectedSellerProfile.seller?.mobile}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedSellerProfile(null)} className="p-2 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl text-xs">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Assigned Area</p>
                  <p className="font-extrabold text-gray-800">{selectedSellerProfile.seller?.areaName}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Responsible Officer</p>
                  <p className="font-extrabold text-gray-800">{selectedSellerProfile.seller?.registeredEmployee?.fullName}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Total Sales</p>
                  <p className="font-black text-[#064D2B]">{fmt(selectedSellerProfile.businessPerformance?.totalVerifiedPurchaseValue)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Orders Delivered</p>
                  <p className="font-extrabold text-gray-800">{selectedSellerProfile.businessPerformance?.totalPurchaseOrders} Orders</p>
                </div>
              </div>

              {/* Order History */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-gray-900 text-sm">Verified Transaction History</h4>
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Fruits</th>
                        <th className="py-2.5 px-3 text-center">Volume</th>
                        <th className="py-2.5 px-3 text-right">Value</th>
                        <th className="py-2.5 px-3 text-center">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedSellerProfile.orders?.map((o: any) => (
                        <tr key={o.id}>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{o.orderNumber}</td>
                          <td className="py-2.5 px-3 text-gray-600">{new Date(o.orderDate).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3 font-medium text-gray-800">{o.fruitNames}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-gray-700">{o.totalQuantityKg}</td>
                          <td className="py-2.5 px-3 text-right font-black text-gray-900">{fmt(o.orderValue)}</td>
                          <td className="py-2.5 px-3 text-center">{o.paymentStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EMPLOYEE DRILLDOWN                                 */}
      {/* ========================================================= */}
      {selectedEmployeeDrilldown && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-extrabold text-base text-gray-900">
                  {selectedEmployeeDrilldown.fullName} ({selectedEmployeeDrilldown.employeeCode})
                </h4>
                <p className="text-xs text-gray-500">
                  {selectedEmployeeDrilldown.assignedAreas?.join(', ')} • {selectedEmployeeDrilldown.designation}
                </p>
              </div>
              <button onClick={() => setSelectedEmployeeDrilldown(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-xl">
              <div>
                <p className="text-gray-400 text-[10px] uppercase font-bold">Total Lifetime Revenue</p>
                <p className="text-lg font-black text-[#064D2B] mt-0.5">{fmt(selectedEmployeeDrilldown.totalSalesValue)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[10px] uppercase font-bold">Monthly Revenue</p>
                <p className="text-lg font-black text-purple-900 mt-0.5">{fmt(selectedEmployeeDrilldown.monthlySalesValue)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[10px] uppercase font-bold">Purchasing Sellers</p>
                <p className="text-sm font-extrabold text-gray-800 mt-0.5">
                  {selectedEmployeeDrilldown.purchasingSellersCount} ({selectedEmployeeDrilldown.repeatBuyersCount} repeat)
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-[10px] uppercase font-bold">Total Orders Delivered</p>
                <p className="text-sm font-extrabold text-gray-800 mt-0.5">{selectedEmployeeDrilldown.ordersCount} Orders</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedEmployeeDrilldown(null)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 font-bold text-xs rounded-xl text-gray-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
