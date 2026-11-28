import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Store,
  ShoppingBag,
  Calendar,
  Users,
  Repeat,
  DollarSign,
  Search,
  Filter,
  Eye,
  X,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  MapPin,
  Phone,
  BarChart2,
  ShieldCheck,
  ChevronRight,
  Plus
} from 'lucide-react';
import { api } from '../../services/api';

interface SellerBusinessTrackingProps {
  onNotify?: (msg: string) => void;
}

export const SellerBusinessTrackingEmployee: React.FC<SellerBusinessTrackingProps> = ({ onNotify }) => {
  const [subTab, setSubTab] = useState<
    'my-sellers' | 'orders' | 'monthly' | 'repeat' | 'performance'
  >('my-sellers');
  const [loading, setLoading] = useState(true);

  // Data states
  const [sellers, setSellers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [orders, setOrders] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortField, setSortField] = useState<'createdAt' | 'totalPurchaseValue' | 'totalPurchaseOrders' | 'shopName'>('totalPurchaseValue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);

  // Load Sellers & Summary
  const loadSellers = async () => {
    try {
      const res = await api.getMyRegisteredSellersBusiness();
      setSellers(res.sellers || []);
      setSummary(res.summary || {});
    } catch (err) {
      console.error('Error loading sellers business:', err);
    }
  };

  // Load Orders
  const loadOrders = async () => {
    try {
      const res = await api.getSellerOrders();
      setOrders(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error loading seller orders:', err);
    }
  };

  // Load Monthly Summary
  const loadMonthlySummary = async (month: string) => {
    try {
      const res = await api.getMonthlySellerBusiness(`?month=${month}`);
      setMonthlyData(res);
    } catch (err) {
      console.error('Error loading monthly seller business:', err);
    }
  };

  // Load Performance
  const loadPerformance = async () => {
    try {
      const res = await api.getEmployeeSalesPerformance();
      setPerformanceData(res);
    } catch (err) {
      console.error('Error loading performance:', err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.allSettled([
      loadSellers(),
      loadOrders(),
      loadMonthlySummary(selectedMonth),
      loadPerformance(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // When opening seller profile modal
  const openSellerProfile = async (sellerId: string) => {
    setSelectedSellerId(sellerId);
    setProfileLoading(true);
    try {
      const data = await api.getSellerBusinessProfile(sellerId);
      setSellerProfile(data);
    } catch (err: any) {
      console.error('Failed to load seller profile:', err);
      onNotify?.(err.message || 'Could not load seller business profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const fmt = (num: number = 0) => '₹' + Number(num || 0).toLocaleString('en-IN');

  const getCustomerTypeBadge = (type: string) => {
    switch (type) {
      case 'Repeat Buyer':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 w-fit">
            <Repeat size={12} /> Repeat Buyer 👑
          </span>
        );
      case 'First-Time Buyer':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1 w-fit">
            <ShoppingBag size={12} /> First Purchase 🎉
          </span>
        );
      case 'Active':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200 flex items-center gap-1 w-fit">
            <CheckCircle2 size={12} /> Active
          </span>
        );
      case 'Inactive':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 w-fit">
            <AlertTriangle size={12} /> Inactive (&gt;30d)
          </span>
        );
      case 'Interested':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
            ⚡ Interested Lead
          </span>
        );
      case 'New':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 w-fit">
            ✨ New Registered
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 w-fit">
            {type}
          </span>
        );
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Paid in Full</span>;
      case 'PARTIAL':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">Partially Paid</span>;
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">Payment Due</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  // Filtered and sorted sellers
  const filteredSellers = sellers
    .filter((s) => {
      const matchSearch =
        searchQuery === '' ||
        s.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.mobile?.includes(searchQuery) ||
        s.sellerCode?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchArea = areaFilter === 'all' || s.areaName === areaFilter;
      const matchType =
        typeFilter === 'all' ||
        (typeFilter === 'repeat' && s.customerType === 'Repeat Buyer') ||
        (typeFilter === 'first' && s.customerType === 'First-Time Buyer') ||
        (typeFilter === 'active' && (s.customerType === 'Active' || s.customerType === 'Repeat Buyer' || s.customerType === 'First-Time Buyer')) ||
        (typeFilter === 'inactive' && s.customerType === 'Inactive') ||
        (typeFilter === 'leads' && (s.customerType === 'Interested' || s.customerType === 'New' || s.customerType === 'Registered'));
      return matchSearch && matchArea && matchType;
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      valA = Number(valA || 0);
      valB = Number(valB || 0);
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

  // Extract unique areas
  const uniqueAreas = Array.from(new Set(sellers.map((s) => s.areaName).filter(Boolean)));

  // Export to CSV
  const exportSellersCSV = () => {
    if (filteredSellers.length === 0) return;
    const headers = [
      'Seller Code',
      'Shop Name',
      'Owner Name',
      'Mobile Number',
      'Assigned Area',
      'Registration Date',
      'Customer Classification',
      'Total Verified Orders',
      'Total Purchase Value (INR)',
      'Total Paid (INR)',
      'Outstanding Dues (INR)',
      'Last Purchase Date',
    ];
    const rows = filteredSellers.map((s) => [
      `"${s.sellerCode}"`,
      `"${s.shopName}"`,
      `"${s.ownerName}"`,
      `"${s.mobile}"`,
      `"${s.areaName}"`,
      `"${new Date(s.registeredDate).toLocaleDateString()}"`,
      `"${s.customerType}"`,
      s.totalPurchaseOrders,
      s.totalPurchaseValue,
      s.totalPaidAmount,
      s.totalDueAmount,
      s.lastPurchaseDate ? `"${new Date(s.lastPurchaseDate).toLocaleDateString()}"` : 'None',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SAFAL_Registered_Sellers_Business_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-[#064D2B] rounded-xl font-bold">
              <TrendingUp size={22} />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                Seller Business & Purchase Tracking
                <span className="text-xs bg-emerald-500 text-white px-2.5 py-0.5 rounded-full font-bold">
                  Verified Sales
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Track revenue, repeat purchasing customers, and real order transactions generated by your local sellers.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none bg-gray-50 p-1.5 rounded-xl border border-gray-200">
          <button
            onClick={() => setSubTab('my-sellers')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'my-sellers'
                ? 'bg-[#064D2B] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <Store size={14} /> My Registered Sellers ({summary.totalRegisteredSellers || sellers.length})
          </button>
          <button
            onClick={() => setSubTab('orders')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'orders'
                ? 'bg-[#064D2B] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <ShoppingBag size={14} /> Seller Purchase Orders ({orders.length})
          </button>
          <button
            onClick={() => setSubTab('monthly')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'monthly'
                ? 'bg-[#064D2B] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <Calendar size={14} /> Monthly Seller Business
          </button>
          <button
            onClick={() => setSubTab('repeat')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'repeat'
                ? 'bg-[#064D2B] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <Repeat size={14} /> Repeat Customers ({summary.repeatBuyers || 0})
          </button>
          <button
            onClick={() => setSubTab('performance')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              subTab === 'performance'
                ? 'bg-[#064D2B] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            <BarChart2 size={14} /> My Sales Performance
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Verified Revenue</p>
            <p className="text-2xl font-black text-[#064D2B] mt-1">{fmt(summary.totalSalesValue || 0)}</p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Real wholesale transactions</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Purchasing Sellers</p>
            <p className="text-2xl font-black text-blue-900 mt-1">{summary.activePurchasingSellers || 0}</p>
            <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
              {summary.repeatBuyers || 0} repeat buyers
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
            <ShoppingBag size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Repeat Customers</p>
            <p className="text-2xl font-black text-purple-900 mt-1">{summary.repeatBuyers || 0}</p>
            <p className="text-[11px] text-purple-600 font-semibold mt-0.5">&gt;1 verified orders completed</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
            <Repeat size={24} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Outstanding Dues</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{fmt(summary.totalOutstandingDues || 0)}</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Pending collection from sellers</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. SUB-TAB: MY REGISTERED SELLERS TABLE                   */}
      {/* ========================================================= */}
      {subTab === 'my-sellers' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by shop name, owner, phone, or seller code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* Area filter */}
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">All Areas ({uniqueAreas.length})</option>
                {uniqueAreas.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>

              {/* Customer type filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="py-2 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">All Customer Types</option>
                <option value="repeat">Repeat Buyers 👑</option>
                <option value="first">First Purchase 🎉</option>
                <option value="active">All Purchasing Sellers</option>
                <option value="inactive">Inactive (&gt;30d)</option>
                <option value="leads">Interested Leads</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={exportSellersCSV}
                className="px-3.5 py-2 bg-emerald-50 text-[#064D2B] hover:bg-emerald-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Download size={14} /> Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Seller / Shop Name</th>
                  <th className="py-3 px-4">Owner & Contact</th>
                  <th className="py-3 px-4">Assigned Area</th>
                  <th className="py-3 px-4">Reg. Date</th>
                  <th className="py-3 px-4">Customer Type</th>
                  <th className="py-3 px-4 text-center">Purchase Orders</th>
                  <th className="py-3 px-4 text-right">Total Verified Value</th>
                  <th className="py-3 px-4">Last Purchase</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSellers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <Store size={36} className="mx-auto text-gray-300 mb-2" />
                      <p className="font-semibold text-gray-600">No registered sellers found matching criteria.</p>
                      <p className="text-xs text-gray-400 mt-0.5">Register new local fruit sellers to begin generating business!</p>
                    </td>
                  </tr>
                ) : (
                  filteredSellers.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => openSellerProfile(s.id)}
                      className="hover:bg-emerald-50/40 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <Store size={15} className="text-[#064D2B] shrink-0" />
                          <span>{s.shopName}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono tracking-wider">{s.sellerCode}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-gray-800">{s.ownerName}</p>
                        <p className="text-gray-500 font-mono text-[11px] flex items-center gap-1">
                          <Phone size={10} /> {s.mobile}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-700">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-lg text-[11px]">
                          <MapPin size={11} className="text-emerald-700" /> {s.areaName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                        {new Date(s.registeredDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getCustomerTypeBadge(s.customerType)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-800">
                        {s.totalPurchaseOrders > 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-full font-black text-xs border border-emerald-200">
                            {s.totalPurchaseOrders} Orders
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">0 Orders</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <p className="font-black text-gray-900">{fmt(s.totalPurchaseValue)}</p>
                        {s.totalDueAmount > 0 && (
                          <p className="text-[10px] text-amber-700 font-semibold">Due: {fmt(s.totalDueAmount)}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs whitespace-nowrap">
                        {s.lastPurchaseDate ? (
                          <span>{new Date(s.lastPurchaseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        ) : (
                          <span className="text-gray-400 italic">No purchase yet</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openSellerProfile(s.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-sm transition flex items-center gap-1 mx-auto"
                        >
                          <Eye size={12} /> View Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SUB-TAB: SELLER PURCHASE ORDERS / TRANSACTION TABLE    */}
      {/* ========================================================= */}
      {subTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Seller Purchase Orders & Invoices</h3>
              <p className="text-xs text-gray-500">
                Verified wholesale commodity deliveries and invoices credited to your local fruit sellers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">
                Total Orders: <strong className="text-gray-900">{orders.length}</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Seller & Area</th>
                  <th className="py-3 px-4">Commodity / Fruits</th>
                  <th className="py-3 px-4 text-center">Volume (Boxes/Kg)</th>
                  <th className="py-3 px-4 text-right">Order Value</th>
                  <th className="py-3 px-4 text-center">Payment Status</th>
                  <th className="py-3 px-4 text-center">Order Status</th>
                  <th className="py-3 px-4 text-center">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <ShoppingBag size={36} className="mx-auto text-gray-300 mb-2" />
                      <p className="font-semibold text-gray-600">No verified purchase orders found.</p>
                      <p className="text-xs text-gray-400 mt-0.5">Orders will appear here as your sellers make purchases.</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                        {o.orderNumber}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                        {new Date(o.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-gray-900">{o.seller?.shopName || 'Local Seller'}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1">
                          <MapPin size={10} /> {o.area?.name || 'Area'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-gray-800 max-w-xs truncate">
                        {o.fruitNames || 'Assorted Wholesale Fruits'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                        {o.totalQuantityKg}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <p className="font-black text-gray-900">{fmt(o.orderValue)}</p>
                        {o.dueAmount > 0 ? (
                          <p className="text-[10px] text-amber-700">Paid: {fmt(o.paidAmount)} | Due: {fmt(o.dueAmount)}</p>
                        ) : (
                          <p className="text-[10px] text-emerald-700 font-semibold">Fully Cleared</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getPaymentStatusBadge(o.paymentStatus)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {o.orderStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedOrderDetails(o)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition"
                        >
                          View Items
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SUB-TAB: MONTHLY SELLER BUSINESS                       */}
      {/* ========================================================= */}
      {subTab === 'monthly' && (
        <div className="space-y-6">
          {/* Month Selector Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">Monthly Business Snapshot</h3>
              <p className="text-xs text-gray-500">
                Detailed monthly performance and seller-wise revenue contribution.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">Select Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  loadMonthlySummary(e.target.value);
                }}
                className="py-1.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Monthly KPI Grid */}
          {monthlyData?.kpis && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase">Monthly Verified Sales</p>
                <p className="text-2xl font-black text-[#064D2B] mt-1">{fmt(monthlyData.kpis.totalVerifiedSalesValue)}</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                  {monthlyData.kpis.totalVerifiedOrders} Orders this month
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase">Average Order Value</p>
                <p className="text-2xl font-black text-blue-900 mt-1">{fmt(monthlyData.kpis.averageOrderValue)}</p>
                <p className="text-[11px] text-blue-600 font-semibold mt-0.5">Per verified delivery</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase">Active Buyers in Month</p>
                <p className="text-2xl font-black text-purple-900 mt-1">{monthlyData.kpis.activePurchasingSellers}</p>
                <p className="text-[11px] text-purple-600 font-semibold mt-0.5">
                  {monthlyData.kpis.firstTimePurchasingSellers} new first-time buyers
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase">Fruit Volume Sold</p>
                <p className="text-2xl font-black text-amber-700 mt-1">{monthlyData.kpis.totalFruitQuantitySold} Boxes</p>
                <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Delivered to sellers</p>
              </div>
            </div>
          )}

          {/* Monthly Seller Contribution & Trends */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Seller Contributors */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                <TrendingUp size={16} className="text-[#064D2B]" />
                Top Contributing Sellers ({selectedMonth})
              </h4>
              <div className="space-y-3">
                {monthlyData?.sellerContributions?.length === 0 ? (
                  <p className="text-xs text-gray-400 py-6 text-center">No purchases recorded for this month.</p>
                ) : (
                  monthlyData?.sellerContributions?.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                            {idx + 1}
                          </span>
                          {item.seller?.shopName}
                        </span>
                        <span className="font-black text-emerald-800">{fmt(item.sales)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>{item.seller?.areaName} • {item.orders} orders</span>
                        <span className="font-semibold text-emerald-700">{item.percentage}% share</span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#064D2B] h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, item.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 6-Month Comparison */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                <BarChart2 size={16} className="text-[#064D2B]" />
                6-Month Business Trend
              </h4>
              <div className="space-y-3">
                {monthlyData?.monthlyTrend?.map((m: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-16 text-xs font-bold text-gray-500">{m.label}</span>
                    <div className="flex-1 bg-gray-100 h-6 rounded-lg overflow-hidden relative flex items-center px-2">
                      <div
                        className="bg-emerald-600/80 h-full absolute left-0 top-0 transition-all duration-500"
                        style={{
                          width: `${
                            monthlyData?.kpis?.totalVerifiedSalesValue > 0
                              ? Math.min(100, (m.salesValue / monthlyData.kpis.totalVerifiedSalesValue) * 100)
                              : 10
                          }%`,
                        }}
                      />
                      <span className="relative z-10 text-[11px] font-black text-gray-900">
                        {fmt(m.salesValue)} ({m.ordersCount} orders)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. SUB-TAB: REPEAT CUSTOMERS TRACKING                     */}
      {/* ========================================================= */}
      {subTab === 'repeat' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Repeat size={18} className="text-purple-600" />
                Loyalty & Repeat Purchasing Sellers
              </h3>
              <p className="text-xs text-gray-500">
                Sellers who have made repeated verified purchases from SAFAL. Repeat business delivers higher monthly performance points!
              </p>
            </div>
            <div className="px-3 py-1.5 bg-purple-50 text-purple-800 rounded-xl font-bold text-xs border border-purple-200">
              Repeat Conversion: +20 Points each
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredSellers
              .filter((s) => s.customerType === 'Repeat Buyer')
              .map((s) => (
                <div
                  key={s.id}
                  onClick={() => openSellerProfile(s.id)}
                  className="p-4 bg-gradient-to-br from-purple-50/50 via-white to-purple-50/20 border border-purple-200 rounded-2xl hover:shadow-md transition cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-sm">{s.shopName}</h4>
                      <p className="text-xs text-gray-500">{s.ownerName} • {s.mobile}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-black rounded-full">
                      👑 REPEAT
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-purple-100">
                    <div>
                      <p className="text-gray-400 text-[10px]">Total Revenue</p>
                      <p className="font-black text-purple-900 text-sm">{fmt(s.totalPurchaseValue)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-[10px]">Verified Orders</p>
                      <p className="font-bold text-gray-800 text-sm">{s.totalPurchaseOrders} Orders</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {s.areaName}
                    </span>
                    <span className="font-bold text-purple-700">View Dossier →</span>
                  </div>
                </div>
              ))}
          </div>

          {filteredSellers.filter((s) => s.customerType === 'Repeat Buyer').length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <Repeat size={36} className="mx-auto text-gray-300 mb-2" />
              <p className="font-semibold text-gray-600">No repeat purchasing sellers yet.</p>
              <p className="text-xs text-gray-400 mt-0.5">Encourage your first-time buyers with product quality to secure repeat orders!</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SUB-TAB: MY SALES PERFORMANCE & ATTRIBUTION            */}
      {/* ========================================================= */}
      {subTab === 'performance' && performanceData && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">My Sales Performance & Attribution</h3>
              <p className="text-xs text-gray-500">
                Audited wholesale revenue generated by fruit sellers registered or assigned to you.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3.5 bg-gray-50 rounded-xl">
                <p className="text-[11px] text-gray-500 font-bold uppercase">Sellers Onboarded</p>
                <p className="text-xl font-black text-gray-900 mt-1">{performanceData.performance?.sellersOnboarded || 0}</p>
                <p className="text-[10px] text-gray-400">Registered by you</p>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl">
                <p className="text-[11px] text-gray-500 font-bold uppercase">Converted Buyers</p>
                <p className="text-xl font-black text-emerald-800 mt-1">{performanceData.performance?.purchasingSellers || 0}</p>
                <p className="text-[10px] text-emerald-600">Made verified purchase</p>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl">
                <p className="text-[11px] text-gray-500 font-bold uppercase">Current Month Sales</p>
                <p className="text-xl font-black text-[#064D2B] mt-1">{fmt(performanceData.performance?.monthlyVerifiedSalesValue)}</p>
                <p className="text-[10px] text-emerald-600 font-bold">
                  {performanceData.performance?.growthPercentage >= 0 ? '+' : ''}
                  {performanceData.performance?.growthPercentage}% growth
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl">
                <p className="text-[11px] text-gray-500 font-bold uppercase">Total Lifetime Sales</p>
                <p className="text-xl font-black text-purple-900 mt-1">{fmt(performanceData.performance?.totalVerifiedSalesValue)}</p>
                <p className="text-[10px] text-gray-400">{performanceData.performance?.orderCount} Total Orders</p>
              </div>
            </div>
          </div>

          {/* Area-wise Sales Breakdown */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
              <MapPin size={16} className="text-[#064D2B]" />
              Area-wise Business Contribution
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {performanceData.performance?.areaContributions?.map((area: any, idx: number) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-gray-900">{area.areaName}</span>
                    <span className="font-black text-emerald-800">{fmt(area.sales)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>{area.sellers} Sellers • {area.orders} Orders</span>
                    <span className="font-bold text-emerald-700">{area.percentage}% of your total</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, area.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: SELLER BUSINESS PROFILE DOSSIER                    */}
      {/* ========================================================= */}
      {selectedSellerId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-gray-200 my-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-[#064D2B] rounded-2xl">
                  <Store size={26} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-gray-900">
                    {sellerProfile?.seller?.shopName || 'Loading...'}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-2">
                    <span className="font-mono text-emerald-800 font-bold">{sellerProfile?.seller?.sellerCode}</span>
                    <span>•</span>
                    <span>{sellerProfile?.seller?.ownerName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono"><Phone size={10} /> {sellerProfile?.seller?.mobile}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedSellerId(null);
                  setSellerProfile(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {profileLoading ? (
              <div className="py-16 text-center text-gray-400 font-bold text-sm">
                Loading Seller Business Intelligence...
              </div>
            ) : sellerProfile ? (
              <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
                {/* Information & Attribution Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl text-xs">
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase font-bold">Assigned Area</p>
                    <p className="font-extrabold text-gray-800">{sellerProfile.seller?.areaName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase font-bold">Registered Employee</p>
                    <p className="font-extrabold text-gray-800">{sellerProfile.seller?.registeredEmployee?.fullName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase font-bold">Registration Date</p>
                    <p className="font-extrabold text-gray-800">
                      {new Date(sellerProfile.seller?.registeredDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase font-bold">Customer Status</p>
                    <div className="mt-0.5">{getCustomerTypeBadge(sellerProfile.businessPerformance?.customerType)}</div>
                  </div>
                </div>

                {/* Business Performance KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                    <p className="text-[10px] text-emerald-700 font-bold uppercase">Total Purchase Value</p>
                    <p className="text-xl font-black text-emerald-900 mt-0.5">
                      {fmt(sellerProfile.businessPerformance?.totalVerifiedPurchaseValue)}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-semibold">
                      {sellerProfile.businessPerformance?.totalPurchaseOrders} Total Orders
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl">
                    <p className="text-[10px] text-blue-700 font-bold uppercase">Current Month Value</p>
                    <p className="text-xl font-black text-blue-900 mt-0.5">
                      {fmt(sellerProfile.businessPerformance?.currentMonthPurchaseValue)}
                    </p>
                    <p className="text-[10px] text-blue-600 font-semibold">
                      Prev: {fmt(sellerProfile.businessPerformance?.previousMonthPurchaseValue)}
                    </p>
                  </div>

                  <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-2xl">
                    <p className="text-[10px] text-purple-700 font-bold uppercase">Average Order Value</p>
                    <p className="text-xl font-black text-purple-900 mt-0.5">
                      {fmt(sellerProfile.businessPerformance?.averageOrderValue)}
                    </p>
                    <p className="text-[10px] text-purple-600 font-semibold">
                      Repeat every {sellerProfile.businessPerformance?.repeatPurchaseFrequencyDays || 0}d
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl">
                    <p className="text-[10px] text-amber-700 font-bold uppercase">Outstanding Dues</p>
                    <p className="text-xl font-black text-amber-900 mt-0.5">
                      {fmt(sellerProfile.businessPerformance?.totalDueAmount)}
                    </p>
                    <p className="text-[10px] text-amber-600 font-semibold">
                      Paid: {fmt(sellerProfile.businessPerformance?.totalPaidAmount)}
                    </p>
                  </div>
                </div>

                {/* Fruit Breakdown */}
                {sellerProfile.businessPerformance?.fruitBreakdown?.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Commodities & Fruit Purchases Breakdown
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {sellerProfile.businessPerformance.fruitBreakdown.map((f: any, idx: number) => (
                        <div key={idx} className="p-2.5 bg-white border border-gray-100 rounded-xl text-xs flex justify-between items-center">
                          <span className="font-semibold text-gray-800">{f.fruit}</span>
                          <span className="font-black text-[#064D2B]">{fmt(f.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Purchase Order History Table */}
                <div className="space-y-3">
                  <h4 className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                    <ShoppingBag size={16} className="text-[#064D2B]" />
                    Verified Order & Transaction History ({sellerProfile.orders?.length || 0})
                  </h4>

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
                        {sellerProfile.orders?.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-gray-400">
                              No purchase orders recorded for this seller yet.
                            </td>
                          </tr>
                        ) : (
                          sellerProfile.orders?.map((o: any) => (
                            <tr key={o.id} className="hover:bg-gray-50">
                              <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">{o.orderNumber}</td>
                              <td className="py-2.5 px-3 text-gray-600">
                                {new Date(o.orderDate).toLocaleDateString()}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-gray-800 max-w-[200px] truncate">{o.fruitNames}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-gray-700">{o.totalQuantityKg}</td>
                              <td className="py-2.5 px-3 text-right font-black text-gray-900">{fmt(o.orderValue)}</td>
                              <td className="py-2.5 px-3 text-center">{getPaymentStatusBadge(o.paymentStatus)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: VIEW ORDER ITEMS DETAILS                          */}
      {/* ========================================================= */}
      {selectedOrderDetails && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-extrabold text-base text-gray-900 flex items-center gap-1.5">
                  <ShoppingBag size={18} className="text-[#064D2B]" />
                  Order #{selectedOrderDetails.orderNumber}
                </h4>
                <p className="text-xs text-gray-500">
                  {new Date(selectedOrderDetails.orderDate).toLocaleDateString()} • {selectedOrderDetails.seller?.shopName}
                </p>
              </div>
              <button onClick={() => setSelectedOrderDetails(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1 text-xs">
                <p className="text-gray-500 font-bold">Commodity Lines:</p>
                <p className="font-extrabold text-gray-900">{selectedOrderDetails.fruitNames}</p>
                <div className="flex justify-between pt-1 border-t border-gray-200 mt-2 font-black text-sm text-[#064D2B]">
                  <span>Total Order Value:</span>
                  <span>{fmt(selectedOrderDetails.orderValue)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Paid: {fmt(selectedOrderDetails.paidAmount)}</span>
                  <span className="font-bold text-amber-700">Due: {fmt(selectedOrderDetails.dueAmount)}</span>
                </div>
              </div>

              {selectedOrderDetails.items && selectedOrderDetails.items.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="p-2">Item</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedOrderDetails.items.map((it: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2 font-medium">{it.fruitName}</td>
                          <td className="p-2 text-center font-bold">{it.quantity} {it.unit}</td>
                          <td className="p-2 text-right">{fmt(it.rate)}</td>
                          <td className="p-2 text-right font-black">{fmt(it.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedOrderDetails(null)}
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
