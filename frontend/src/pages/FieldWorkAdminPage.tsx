import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Users,
  Store,
  CheckCircle2,
  Clock,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Calendar,
  Award,
  FileText,
  Phone,
  ShoppingBag,
  Star,
  MessageSquare,
  AlertCircle,
  Eye,
  X,
  Upload,
  ArrowUpRight,
  BarChart2,
  Trophy,
  Target,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Check,
  Download,
  Edit,
  Trash2,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SellerBusinessAnalyticsAdmin } from '../components/field/SellerBusinessAnalyticsAdmin';

interface FieldWorkAdminPageProps {
  onNotify: (msg: string) => void;
  initialTab?: string;
}

export const FieldWorkAdminPage: React.FC<FieldWorkAdminPageProps> = ({ onNotify, initialTab }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'business' | 'employees' | 'areas' | 'sellers' | 'reports' | 'settings'>(
    (initialTab as any) || 'overview'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);
  const [loading, setLoading] = useState(true);

  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);

  // Filters & Searches
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerEmployeeFilter, setSellerEmployeeFilter] = useState('');
  const [sellerAreaFilter, setSellerAreaFilter] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');

  // Modals
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);
  const [showAssignAreaModal, setShowAssignAreaModal] = useState(false);
  const [showLinkPurchaseModal, setShowLinkPurchaseModal] = useState(false);
  const [showReviewReportModal, setShowReviewReportModal] = useState(false);
  const [showAdjustPointsModal, setShowAdjustPointsModal] = useState(false);
  const [selectedSellerForPurchase, setSelectedSellerForPurchase] = useState<any>(null);
  const [selectedReportForReview, setSelectedReportForReview] = useState<any>(null);
  const [selectedEmployeeForDossier, setSelectedEmployeeForDossier] = useState<any>(null);

  // Forms
  const [newArea, setNewArea] = useState({ name: '', district: '', state: 'Telangana' });
  const [assignForm, setAssignForm] = useState({ employeeId: '', areaId: '', notes: '' });
  const [purchaseForm, setPurchaseForm] = useState({ orderId: '', purchaseAmount: '' });
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED' as 'APPROVED' | 'REJECTED', reviewComments: '' });
  const [adjustForm, setAdjustForm] = useState({ employeeId: '', points: 0, reason: '', monthYear: '' });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, areasRes, sellersRes, reportsRes, lbRes, empRes] = await Promise.allSettled([
        api.getFieldAdminDashboard(),
        api.getFieldAreas(),
        api.getFieldSellers(),
        api.getDailyFieldReports(),
        api.getFieldLeaderboard(),
        api.getEmployees ? api.getEmployees() : Promise.resolve([]),
      ]);

      if (dashRes.status === 'fulfilled') setDashboardData(dashRes.value);
      if (areasRes.status === 'fulfilled') setAreas(Array.isArray(areasRes.value) ? areasRes.value : []);
      if (sellersRes.status === 'fulfilled') setSellers(Array.isArray(sellersRes.value) ? sellersRes.value : []);
      if (reportsRes.status === 'fulfilled') setReports(Array.isArray(reportsRes.value) ? reportsRes.value : []);
      if (lbRes.status === 'fulfilled') setLeaderboard(Array.isArray(lbRes.value) ? lbRes.value : []);
      if (empRes.status === 'fulfilled') setAllEmployees(Array.isArray(empRes.value) ? empRes.value : []);
    } catch (err: any) {
      console.error('Error loading admin field work data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const fmt = (num: number = 0) => '₹' + Number(num || 0).toLocaleString('en-IN');

  // Handle Add Area
  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newArea.name.trim()) {
      setFormError('Area name is required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createFieldArea(newArea);
      onNotify(`Territory "${newArea.name}" added successfully.`);
      setShowAddAreaModal(false);
      setNewArea({ name: '', district: '', state: 'Telangana' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create area.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Assign Area
  const handleAssignArea = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!assignForm.employeeId || !assignForm.areaId) {
      setFormError('Both Employee and Area must be selected.');
      return;
    }
    setSubmitting(true);
    try {
      await api.assignFieldArea(assignForm);
      onNotify('Territory successfully assigned to employee.');
      setShowAssignAreaModal(false);
      setAssignForm({ employeeId: '', areaId: '', notes: '' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to assign area.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Deactivate Assignment
  const handleRemoveAssignment = async (assignmentId: string, areaName: string) => {
    if (!window.confirm(`Are you sure you want to remove the territory assignment for "${areaName}"?`)) return;
    try {
      await api.removeFieldAreaAssignment(assignmentId);
      onNotify(`Assignment for "${areaName}" removed.`);
      loadData();
    } catch (err: any) {
      onNotify(err.message || 'Failed to remove assignment.');
    }
  };

  // Handle Verify Seller
  const handleVerifySeller = async (sellerId: string, shopName: string) => {
    try {
      await api.verifyFieldSeller(sellerId);
      onNotify(`Seller "${shopName}" is now officially Verified.`);
      loadData();
    } catch (err: any) {
      onNotify(err.message || 'Failed to verify seller.');
    }
  };

  // Handle Link Purchase / Conversion
  const handleLinkPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!selectedSellerForPurchase) return;
    const amount = Number(purchaseForm.purchaseAmount);
    if (!amount || amount <= 0) {
      setFormError('Please enter a valid purchase amount in ₹.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.linkPurchaseConversion({
        sellerId: selectedSellerForPurchase.id,
        orderId: purchaseForm.orderId.trim() || undefined,
        purchaseAmount: amount,
      });
      onNotify(`Purchase verified! Converted to ${res.conversionStage}. ${res.pointsAwarded ? `+${res.pointsAwarded} Points awarded to executive!` : ''}`);
      setShowLinkPurchaseModal(false);
      setPurchaseForm({ orderId: '', purchaseAmount: '' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to link purchase conversion.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Review Report
  const handleReviewReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!selectedReportForReview) return;
    setSubmitting(true);
    try {
      await api.reviewDailyFieldReport(selectedReportForReview.id, {
        status: reviewForm.status,
        reviewComments: reviewForm.reviewComments,
      });
      onNotify(`Daily report marked as ${reviewForm.status}. ${reviewForm.status === 'APPROVED' ? '+5 Points awarded!' : ''}`);
      setShowReviewReportModal(false);
      setReviewForm({ status: 'APPROVED', reviewComments: '' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to review report.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Adjust Points
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!adjustForm.employeeId || !adjustForm.points || !adjustForm.reason.trim()) {
      setFormError('Employee, Points (+/-), and Mandatory Audit Reason are required.');
      return;
    }
    setSubmitting(true);
    try {
      await api.adjustFieldPoints({
        employeeId: adjustForm.employeeId,
        points: Number(adjustForm.points),
        reason: adjustForm.reason.trim(),
        monthYear: adjustForm.monthYear || undefined,
      });
      onNotify(`Points adjustment of ${adjustForm.points} logged successfully with audit trace.`);
      setShowAdjustPointsModal(false);
      setAdjustForm({ employeeId: '', points: 0, reason: '', monthYear: '' });
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to adjust points.');
    } finally {
      setSubmitting(false);
    }
  };

  // Export CSV
  const exportSellersCSV = () => {
    if (sellers.length === 0) {
      onNotify('No seller records to export.');
      return;
    }
    const headers = ['Shop Name', 'Owner Name', 'Mobile', 'WhatsApp', 'Area', 'Business Type', 'Interest', 'Stage', 'Verified', 'Registered By', 'Date', 'Orders', 'Total Purchase (INR)'];
    const rows = sellers.map((s) => [
      `"${s.shopName || ''}"`,
      `"${s.ownerName || ''}"`,
      `"${s.mobileNumber || ''}"`,
      `"${s.whatsappNumber || ''}"`,
      `"${s.area?.name || ''}"`,
      `"${s.businessType || ''}"`,
      `"${s.interestLevel || ''}"`,
      `"${s.conversionStage || ''}"`,
      s.isVerified ? 'YES' : 'NO',
      `"${s.registeredBy?.name || ''}"`,
      new Date(s.createdAt).toLocaleDateString(),
      s.ordersCount || 0,
      s.totalPurchaseAmount || 0,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SAFAL_Field_Sellers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify('Field Sellers CSV downloaded successfully.');
  };

  const overview = dashboardData?.overview || {};

  // Filtered sellers
  const filteredSellers = sellers.filter((s) => {
    const matchesSearch =
      sellerSearch === '' ||
      s.shopName.toLowerCase().includes(sellerSearch.toLowerCase()) ||
      (s.ownerName && s.ownerName.toLowerCase().includes(sellerSearch.toLowerCase())) ||
      s.mobileNumber.includes(sellerSearch);
    const matchesEmp = sellerEmployeeFilter === '' || s.registeredById === sellerEmployeeFilter;
    const matchesArea = sellerAreaFilter === '' || s.areaId === sellerAreaFilter;
    return matchesSearch && matchesEmp && matchesArea;
  });

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    if (reportStatusFilter === 'ALL') return true;
    return r.status === reportStatusFilter;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#064D2B] via-[#086338] to-[#0A7B45] text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <MapPin size={220} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 bg-emerald-400/20 text-emerald-200 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-400/30">
                Admin Management Console
              </span>
              <span className="px-3 py-0.5 bg-amber-400/20 text-amber-200 rounded-full text-xs font-black uppercase tracking-wider border border-amber-400/30">
                FY 2026-27
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Field Work Management & Territory Control
            </h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-2xl">
              Centralized administration of employee territories, seller verification, conversion tracking, daily reports, and points auditing.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAddAreaModal(true)}
              className="px-4 py-2.5 bg-white text-[#064D2B] rounded-xl font-bold text-sm shadow hover:bg-emerald-50 active:scale-95 transition flex items-center gap-2"
            >
              <Plus size={18} /> Add New Area
            </button>
            <button
              onClick={() => setShowAssignAreaModal(true)}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold text-sm shadow active:scale-95 transition flex items-center gap-2"
            >
              <MapPin size={18} /> Assign Territory
            </button>
            <button
              onClick={exportSellersCSV}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-950 rounded-xl font-bold text-sm shadow active:scale-95 transition flex items-center gap-2"
            >
              <Download size={18} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <BarChart2 size={16} /> Overview KPIs
        </button>
        <button
          onClick={() => setActiveTab('business')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'business'
              ? 'bg-[#064D2B] text-white shadow-sm ring-2 ring-emerald-400'
              : 'text-[#064D2B] bg-emerald-50 hover:bg-emerald-100 font-extrabold'
          }`}
        >
          <TrendingUp size={16} /> Field Sales & Buyer Business Analytics 💰
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'employees'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Users size={16} /> Employee Performance ({dashboardData?.employeePerformance?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('areas')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'areas'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <MapPin size={16} /> Territory Allocation ({areas.length})
        </button>
        <button
          onClick={() => setActiveTab('sellers')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'sellers'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Store size={16} /> Buyer Directory ({sellers.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <FileText size={16} /> Daily Reports Review ({reports.filter((r) => r.status === 'PENDING').length} Pending)
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Award size={16} /> Scoring Rules & Points Audit
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={28} className="animate-spin text-[#064D2B]" />
          <span className="ml-3 text-sm font-bold text-[#064D2B]">Loading Admin Field Work Module...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Top 10 High-Level KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="text-xs text-gray-500 font-semibold">Field Employees</div>
                  <div className="text-2xl font-black text-gray-900 mt-1">{overview.totalEmployees || 0}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Active Workforce</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm">
                  <div className="text-xs text-gray-500 font-semibold">Assigned Territories</div>
                  <div className="text-2xl font-black text-emerald-800 mt-1">{overview.totalAssignedAreas || 0}</div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">{overview.totalAreasCovered || 0} Visited this month</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                  <div className="text-xs text-gray-500 font-semibold">Sellers Contacted</div>
                  <div className="text-2xl font-black text-blue-800 mt-1">{overview.totalSellersContacted || 0}</div>
                  <div className="text-[11px] text-blue-600 mt-0.5">Market leads reached</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm">
                  <div className="text-xs text-gray-500 font-semibold">Registered Sellers</div>
                  <div className="text-2xl font-black text-teal-800 mt-1">{overview.totalRegisteredSellers || 0}</div>
                  <div className="text-[11px] text-teal-600 mt-0.5">{overview.totalVerifiedSellers || 0} Admin Verified</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm">
                  <div className="text-xs text-gray-500 font-semibold">1st-Time Buyers</div>
                  <div className="text-2xl font-black text-purple-900 mt-1">{overview.totalFirstTimePurchasingSellers || 0}</div>
                  <div className="text-[11px] text-purple-600 mt-0.5">{overview.totalRepeatCustomers || 0} Repeat Customers</div>
                </div>

                <div className="bg-gradient-to-br from-[#064D2B] to-[#0A7B45] text-white p-4 rounded-2xl shadow-sm col-span-2 md:col-span-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
                      Total Verified Purchase Value Generated
                    </span>
                    <DollarSign size={20} className="text-amber-300" />
                  </div>
                  <div className="text-3xl font-black text-amber-300 mt-1">
                    {fmt(overview.totalVerifiedPurchaseValue)}
                  </div>
                  <div className="text-xs text-emerald-100 mt-1">
                    Direct wholesale revenue brought by field executives from converted fruit vendors
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Total Awarded Points</span>
                    <Award size={20} className="text-amber-500" />
                  </div>
                  <div className="text-3xl font-black text-amber-600 mt-1">{overview.totalEmployeePoints || 0} pts</div>
                  <div className="text-xs text-gray-500 mt-1">Across all field executives for current month</div>
                </div>
              </div>

              {/* Conversion Pipeline & Territory Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Network-wide Customer Conversion Funnel */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2 mb-4">
                    <Target size={18} className="text-[#064D2B]" /> Network-wide Seller Conversion Journey
                  </h3>
                  <div className="space-y-3 text-xs">
                    {[
                      { stage: '1. Lead Identified', count: sellers.filter((s) => s.conversionStage === 'LEAD_IDENTIFIED').length, color: 'bg-slate-500' },
                      { stage: '2. First Contact Completed', count: sellers.filter((s) => s.conversionStage === 'FIRST_CONTACT').length, color: 'bg-blue-500' },
                      { stage: '3. Interested in SAFAL Procurement', count: sellers.filter((s) => s.conversionStage === 'INTERESTED').length, color: 'bg-amber-500' },
                      { stage: '4. Follow-up in Progress', count: sellers.filter((s) => s.conversionStage === 'FOLLOW_UP').length, color: 'bg-purple-500' },
                      { stage: '5. Registered Local Seller', count: sellers.filter((s) => s.conversionStage === 'REGISTERED').length, color: 'bg-teal-500' },
                      { stage: '6. First Purchase Completed 🎉', count: sellers.filter((s) => s.conversionStage === 'FIRST_PURCHASE').length, color: 'bg-emerald-500' },
                      { stage: '7. Repeat Purchasing Customer 👑', count: sellers.filter((s) => s.conversionStage === 'REPEAT_CUSTOMER').length, color: 'bg-[#064D2B]' },
                    ].map((step, idx) => {
                      const total = sellers.length || 1;
                      const pct = Math.round((step.count / total) * 100);
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between font-bold text-gray-800">
                            <span>{step.stage}</span>
                            <span>{step.count} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className={`${step.color} h-2 rounded-full transition-all`} style={{ width: `${Math.max(5, pct)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Territory Allocation Summary */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                      <MapPin size={18} className="text-[#064D2B]" /> Territory Overview & Initial Allocations
                    </h3>
                    <button
                      onClick={() => setActiveTab('areas')}
                      className="text-xs font-bold text-[#064D2B] hover:underline"
                    >
                      Manage All ({areas.length})
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 text-xs">
                    {areas.map((a: any) => {
                      const activeAss = a.assignments?.filter((ass: any) => ass.isActive) || [];
                      const sellerCount = sellers.filter((s) => s.areaId === a.id).length;
                      return (
                        <div key={a.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="font-extrabold text-gray-900">{a.name}</div>
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              Assigned to:{' '}
                              {activeAss.length > 0 ? (
                                <span className="font-bold text-[#064D2B]">
                                  {activeAss.map((ass: any) => ass.employee?.name).join(', ')}
                                </span>
                              ) : (
                                <span className="text-amber-600 font-semibold">Unassigned</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-gray-800">{sellerCount} Sellers</span>
                            <div className="text-[10px] text-gray-500">
                              {a.district || 'Telangana'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1.5: FIELD SALES & SELLER BUSINESS ANALYTICS */}
          {activeTab === 'business' && (
            <SellerBusinessAnalyticsAdmin onNotify={onNotify} />
          )}

          {/* TAB 2: EMPLOYEE PERFORMANCE */}
          {activeTab === 'employees' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Field Employee Performance Matrix</h2>
                  <p className="text-xs text-gray-500">
                    Comparative tracking of field representatives across territory coverage, new registrations, purchasing conversions, and awarded points.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#064D2B] text-white">
                      <tr>
                        <th className="py-3 px-4 font-bold">Employee</th>
                        <th className="py-3 px-3 font-bold">Assigned Territories</th>
                        <th className="py-3 px-3 font-bold text-center">Visits Logged</th>
                        <th className="py-3 px-3 font-bold text-center">Sellers Registered</th>
                        <th className="py-3 px-3 font-bold text-center">Purchasing Sellers</th>
                        <th className="py-3 px-3 font-bold text-right">Purchase Value (₹)</th>
                        <th className="py-3 px-3 font-bold text-right">Performance Points</th>
                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dashboardData?.employeePerformance?.map((emp: any) => (
                        <tr key={emp.employeeId} className="hover:bg-emerald-50/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-gray-900">{emp.employeeName}</div>
                            <div className="text-[11px] text-gray-500">{emp.employeeCode} • {emp.email}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {emp.assignedAreas?.map((area: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md text-[10px] font-semibold">
                                  {area}
                                </span>
                              ))}
                              {(!emp.assignedAreas || emp.assignedAreas.length === 0) && (
                                <span className="text-gray-400 italic">None</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center font-bold text-gray-700">{emp.visitsCount || 0}</td>
                          <td className="py-3.5 px-3 text-center font-bold text-teal-800">{emp.sellersRegistered || 0}</td>
                          <td className="py-3.5 px-3 text-center font-bold text-purple-800">{emp.purchasingSellers || 0}</td>
                          <td className="py-3.5 px-3 text-right font-extrabold text-[#064D2B]">
                            {fmt(emp.totalPurchaseValue)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-black text-amber-600 text-sm">
                            {emp.points || 0} pts
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedEmployeeForDossier(emp)}
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#064D2B] rounded-lg font-bold text-xs transition"
                            >
                              Dossier
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TERRITORY ALLOCATION */}
          {activeTab === 'areas' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Territory Allocation & Area Control</h2>
                  <p className="text-xs text-gray-500">
                    Configure operational regions and assign or reassign dedicated field representatives.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddAreaModal(true)}
                    className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <Plus size={15} /> Add Territory
                  </button>
                  <button
                    onClick={() => setShowAssignAreaModal(true)}
                    className="px-3.5 py-2 bg-[#064D2B] hover:bg-[#053d22] text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <MapPin size={15} /> Assign to Executive
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {areas.map((a: any) => {
                  const activeAssignments = a.assignments?.filter((ass: any) => ass.isActive) || [];
                  const areaSellers = sellers.filter((s) => s.areaId === a.id);
                  const purchasingCount = areaSellers.filter(
                    (s) => s.conversionStage === 'FIRST_PURCHASE' || s.conversionStage === 'REPEAT_CUSTOMER'
                  ).length;
                  const totalRev = areaSellers.reduce((acc, s) => acc + (s.totalPurchaseAmount || 0), 0);

                  return (
                    <div key={a.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#064D2B] flex items-center justify-center font-bold">
                            <MapPin size={18} />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm text-gray-900">{a.name}</h3>
                            <span className="text-[11px] text-gray-500">{a.district || 'Telangana'}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold">
                          {areaSellers.length} Sellers
                        </span>
                      </div>

                      {/* Active Assignments */}
                      <div className="pt-2 border-t border-gray-100 text-xs">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">
                          Assigned Field Executive(s)
                        </span>
                        {activeAssignments.length === 0 ? (
                          <div className="text-amber-600 font-semibold italic text-[11px]">
                            No executive assigned currently
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {activeAssignments.map((ass: any) => (
                              <div key={ass.id} className="flex items-center justify-between bg-emerald-50/50 p-2 rounded-xl">
                                <div>
                                  <div className="font-bold text-gray-900">{ass.employee?.name}</div>
                                  <div className="text-[10px] text-gray-500">
                                    Assigned: {new Date(ass.assignedDate).toLocaleDateString()}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveAssignment(ass.id, a.name)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Remove Assignment"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Performance Snapshot */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                        <div className="bg-gray-50 p-2 rounded-xl">
                          <span className="text-gray-500 block text-[10px]">Purchasing Clients</span>
                          <span className="font-bold text-emerald-800">{purchasingCount}</span>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl">
                          <span className="text-gray-500 block text-[10px]">Total Revenue</span>
                          <span className="font-bold text-[#064D2B]">{fmt(totalRev)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: SELLER DIRECTORY */}
          {activeTab === 'sellers' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search seller, owner, or mobile..."
                      value={sellerSearch}
                      onChange={(e) => setSellerSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                    />
                  </div>
                  <select
                    value={sellerAreaFilter}
                    onChange={(e) => setSellerAreaFilter(e.target.value)}
                    className="py-2 px-3 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  >
                    <option value="">All Territories</option>
                    {areas.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <select
                    value={sellerEmployeeFilter}
                    onChange={(e) => setSellerEmployeeFilter(e.target.value)}
                    className="py-2 px-3 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  >
                    <option value="">All Field Employees</option>
                    {dashboardData?.employeePerformance?.map((emp: any) => (
                      <option key={emp.employeeId} value={emp.employeeId}>{emp.employeeName}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={exportSellersCSV}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#064D2B] rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <Download size={15} /> Export CSV
                </button>
              </div>

              {/* Sellers Table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#064D2B] text-white">
                      <tr>
                        <th className="py-3 px-4 font-bold">Seller / Shop</th>
                        <th className="py-3 px-3 font-bold">Contact</th>
                        <th className="py-3 px-3 font-bold">Territory</th>
                        <th className="py-3 px-3 font-bold">Field Rep</th>
                        <th className="py-3 px-3 font-bold">Customer Stage</th>
                        <th className="py-3 px-3 font-bold text-center">Verified?</th>
                        <th className="py-3 px-3 font-bold text-right">Verified Revenue</th>
                        <th className="py-3 px-4 font-bold text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredSellers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-gray-400">
                            No registered sellers found matching criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredSellers.map((s: any) => (
                          <tr key={s.id} className="hover:bg-emerald-50/40 transition">
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-gray-900">{s.shopName}</div>
                              <div className="text-[11px] text-gray-500">{s.businessType}</div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-gray-800">{s.ownerName || '—'}</div>
                              <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                                <Phone size={11} /> {s.mobileNumber}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-medium text-gray-700">{s.area?.name || '—'}</td>
                            <td className="py-3 px-3 font-semibold text-gray-800">{s.registeredBy?.name || '—'}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                                {s.conversionStage}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {s.isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold">
                                  <ShieldCheck size={12} /> Verified
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleVerifySeller(s.id, s.shopName)}
                                  className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold"
                                >
                                  Verify Now
                                </button>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="font-bold text-[#064D2B]">{fmt(s.totalPurchaseAmount)}</div>
                              <div className="text-[10px] text-gray-500">{s.ordersCount || 0} Orders</div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedSellerForPurchase(s);
                                  setShowLinkPurchaseModal(true);
                                }}
                                className="px-2.5 py-1 bg-[#064D2B] hover:bg-[#053d22] text-white rounded-lg text-[10px] font-bold shadow-sm"
                              >
                                Link Purchase
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DAILY REPORTS REVIEW */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Daily Field Reports Review & Approval</h2>
                  <p className="text-xs text-gray-500">
                    Review submissions from field representatives. Approving a report awards +5 performance points.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={reportStatusFilter}
                    onChange={(e) => setReportStatusFilter(e.target.value)}
                    className="py-2 px-3 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  >
                    <option value="ALL">All Reports ({reports.length})</option>
                    <option value="PENDING">Pending Approval ({reports.filter((r) => r.status === 'PENDING').length})</option>
                    <option value="APPROVED">Approved ({reports.filter((r) => r.status === 'APPROVED').length})</option>
                    <option value="REJECTED">Rejected ({reports.filter((r) => r.status === 'REJECTED').length})</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {filteredReports.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm text-gray-400">
                    No field reports matching the selected filter.
                  </div>
                ) : (
                  filteredReports.map((r: any) => (
                    <div key={r.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#064D2B] flex items-center justify-center font-bold">
                            <FileText size={20} />
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-gray-900">
                              {r.employee?.name} • Area: {r.area?.name}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              Report Date: {new Date(r.reportDate).toLocaleDateString()} | Submitted:{' '}
                              {new Date(r.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {r.status === 'APPROVED' ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 size={13} /> Approved (+5 Pts)
                            </span>
                          ) : r.status === 'REJECTED' ? (
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold flex items-center gap-1">
                              <AlertCircle size={13} /> Rejected
                            </span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedReportForReview(r);
                                  setReviewForm({ status: 'APPROVED', reviewComments: 'Verified and approved.' });
                                  setShowReviewReportModal(true);
                                }}
                                className="px-3 py-1.5 bg-[#064D2B] hover:bg-[#053d22] text-white rounded-xl text-xs font-bold shadow flex items-center gap-1"
                              >
                                <Check size={14} /> Approve (+5 Pts)
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedReportForReview(r);
                                  setReviewForm({ status: 'REJECTED', reviewComments: '' });
                                  setShowReviewReportModal(true);
                                }}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Daily Numbers */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 bg-gray-50 p-3 rounded-xl text-center text-xs">
                        <div>
                          <div className="text-gray-500 text-[10px]">Shops Visited</div>
                          <div className="font-black text-gray-900">{r.shopsVisitedCount}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-[10px]">Contacted</div>
                          <div className="font-black text-gray-900">{r.sellersContactedCount}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-[10px]">Registered</div>
                          <div className="font-black text-teal-800">{r.sellersRegisteredCount}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-[10px]">Interested</div>
                          <div className="font-black text-amber-700">{r.interestedSellersCount}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-[10px]">Follow-ups</div>
                          <div className="font-black text-purple-700">{r.followUpsCompletedCount}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-[10px]">Conversions</div>
                          <div className="font-black text-emerald-700">{r.conversionsCount}</div>
                        </div>
                      </div>

                      {/* Notes / Plan */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        {r.majorAchievements && (
                          <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100">
                            <span className="font-bold text-emerald-900 block mb-0.5">🌟 Achievements:</span>
                            <span className="text-emerald-800">{r.majorAchievements}</span>
                          </div>
                        )}
                        {r.problemsFaced && (
                          <div className="bg-red-50/50 p-2.5 rounded-xl border border-red-100">
                            <span className="font-bold text-red-900 block mb-0.5">⚠️ Problems Faced:</span>
                            <span className="text-red-800">{r.problemsFaced}</span>
                          </div>
                        )}
                        {r.tomorrowPlan && (
                          <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-100">
                            <span className="font-bold text-blue-900 block mb-0.5">🎯 Tomorrow's Plan:</span>
                            <span className="text-blue-800">{r.tomorrowPlan}</span>
                          </div>
                        )}
                      </div>

                      {r.reviewComments && (
                        <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900">
                          <span className="font-bold">Admin Review Notes: </span>{r.reviewComments}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS & POINTS AUDIT */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Scoring Configuration Overview */}
              <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-[#064D2B] text-base flex items-center gap-2">
                      <Award size={20} /> Field Work Points Scoring Configuration
                    </h3>
                    <p className="text-xs text-gray-500">
                      Standardized points awarded to executives upon verification of field activities.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAdjustPointsModal(true)}
                    className="px-4 py-2 bg-[#064D2B] hover:bg-[#053d22] text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5"
                  >
                    <Plus size={15} /> Manual Points Adjustment
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <span className="block font-black text-emerald-800 text-2xl">5</span>
                    <span className="text-emerald-700 font-bold mt-1 block">Approved Unique Seller Visit</span>
                    <span className="text-[10px] text-gray-400 mt-1 block">Points / unique visit</span>
                  </div>
                  <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100">
                    <span className="block font-black text-teal-800 text-2xl">10</span>
                    <span className="text-teal-700 font-bold mt-1 block">Verified Seller Registration</span>
                    <span className="text-[10px] text-gray-400 mt-1 block">Points / verified registration</span>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <span className="block font-black text-amber-800 text-2xl">50</span>
                    <span className="text-amber-700 font-bold mt-1 block">1st Purchase Conversion</span>
                    <span className="text-[10px] text-gray-400 mt-1 block">Points / verified first order</span>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <span className="block font-black text-purple-800 text-2xl">20</span>
                    <span className="text-purple-700 font-bold mt-1 block">Repeat Customer</span>
                    <span className="text-[10px] text-gray-400 mt-1 block">Points / subsequent purchase</span>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <span className="block font-black text-blue-800 text-2xl">5</span>
                    <span className="text-blue-700 font-bold mt-1 block">Approved Daily Field Report</span>
                    <span className="text-[10px] text-gray-400 mt-1 block">Points / approved report</span>
                  </div>
                </div>
              </div>

              {/* Monthly Leaderboard View */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    <Trophy size={18} className="text-amber-500" /> Current Monthly Standing & Targets
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 border-y border-gray-100">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">Rank</th>
                        <th className="py-2.5 px-3 font-bold">Executive</th>
                        <th className="py-2.5 px-3 font-bold">Assigned Territories</th>
                        <th className="py-2.5 px-3 font-bold text-center">Converted Sellers</th>
                        <th className="py-2.5 px-3 font-bold text-right">Purchase Value</th>
                        <th className="py-2.5 px-3 font-bold text-right">Total Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leaderboard.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-3 px-3 font-bold">
                            {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                          </td>
                          <td className="py-3 px-3 font-extrabold text-gray-900">{item.employeeName}</td>
                          <td className="py-3 px-3 text-gray-600">{item.areas || '—'}</td>
                          <td className="py-3 px-3 text-center font-bold text-teal-800">
                            {item.sellersConverted || 0}
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-[#064D2B]">
                            {fmt(item.purchaseValueGenerated)}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-amber-600 text-sm">
                            {item.points || 0} pts
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: ADD AREA */}
      {showAddAreaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-extrabold text-base text-gray-900">Add New Field Territory</h3>
              <button
                onClick={() => setShowAddAreaModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddArea} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Territory / Area Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Narsampet"
                  value={newArea.name}
                  onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">District / Region</label>
                <input
                  type="text"
                  placeholder="e.g. Warangal Rural"
                  value={newArea.district}
                  onChange={(e) => setNewArea({ ...newArea, district: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  value={newArea.state}
                  onChange={(e) => setNewArea({ ...newArea, state: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddAreaModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#064D2B] text-white rounded-xl font-bold shadow"
                >
                  {submitting ? 'Creating...' : 'Save Territory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN TERRITORY */}
      {showAssignAreaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-extrabold text-base text-gray-900">Assign Territory to Executive</h3>
              <button
                onClick={() => setShowAssignAreaModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAssignArea} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Field Representative <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                >
                  <option value="">-- Choose Employee --</option>
                  {dashboardData?.employeePerformance?.map((emp: any) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.employeeName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Territory / Area <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={assignForm.areaId}
                  onChange={(e) => setAssignForm({ ...assignForm, areaId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                >
                  <option value="">-- Choose Area --</option>
                  {areas.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.district || 'Telangana'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Assignment Notes</label>
                <input
                  type="text"
                  placeholder="Optional territory assignment memo..."
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignAreaModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#064D2B] text-white rounded-xl font-bold shadow"
                >
                  {submitting ? 'Assigning...' : 'Assign Territory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LINK PURCHASE CONVERSION */}
      {showLinkPurchaseModal && selectedSellerForPurchase && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-gray-900">Link Purchase Conversion</h3>
                <span className="text-xs text-gray-500 font-semibold">{selectedSellerForPurchase.shopName}</span>
              </div>
              <button
                onClick={() => setShowLinkPurchaseModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleLinkPurchase} className="space-y-3.5 text-xs">
              <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 text-emerald-900">
                <div className="font-bold">Verified Conversion Rule:</div>
                <div className="text-[11px] mt-0.5">
                  1st Purchase: Converts stage to <strong>First Purchase</strong> and awards <strong>+50 Points</strong> to executive.<br/>
                  Subsequent: Converts to <strong>Repeat Customer</strong> and awards <strong>+20 Points</strong>.
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Verified Purchase Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="e.g. 75000"
                  value={purchaseForm.purchaseAmount}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B] text-sm font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Linked Order / Invoice # (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. PO/SF/2026/018 or CD/SF/2026/003"
                  value={purchaseForm.orderId}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, orderId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLinkPurchaseModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#064D2B] text-white rounded-xl font-bold shadow"
                >
                  {submitting ? 'Linking...' : 'Verify & Grant Points'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REVIEW DAILY REPORT */}
      {showReviewReportModal && selectedReportForReview && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-gray-900">Review Daily Field Report</h3>
                <span className="text-xs text-gray-500 font-semibold">{selectedReportForReview.employee?.name}</span>
              </div>
              <button
                onClick={() => setShowReviewReportModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleReviewReport} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, status: 'APPROVED' })}
                    className={`py-2 text-center rounded-xl font-bold border ${
                      reviewForm.status === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    ✓ Approve (+5 Pts)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, status: 'REJECTED' })}
                    className={`py-2 text-center rounded-xl font-bold border ${
                      reviewForm.status === 'REJECTED'
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Review Comments / Feedback</label>
                <textarea
                  rows={3}
                  placeholder="Feedback to employee regarding their visits and achievements..."
                  value={reviewForm.reviewComments}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewComments: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReviewReportModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#064D2B] text-white rounded-xl font-bold shadow"
                >
                  {submitting ? 'Saving...' : 'Submit Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL POINTS ADJUSTMENT */}
      {showAdjustPointsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-extrabold text-base text-gray-900">Manual Points Audit Adjustment</h3>
              <button
                onClick={() => setShowAdjustPointsModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAdjustPoints} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Field Executive <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={adjustForm.employeeId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                >
                  <option value="">-- Choose Employee --</option>
                  {dashboardData?.employeePerformance?.map((emp: any) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.employeeName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Points Adjustment (+ or -) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15 or -10"
                  value={adjustForm.points}
                  onChange={(e) => setAdjustForm({ ...adjustForm, points: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B] font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Mandatory Audit Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Special bonus for high-volume wholesaler contract signed"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustPointsModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#064D2B] text-white rounded-xl font-bold shadow"
                >
                  {submitting ? 'Logging...' : 'Apply Points Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EMPLOYEE DOSSIER */}
      {selectedEmployeeForDossier && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-extrabold text-base text-gray-900">{selectedEmployeeForDossier.employeeName}</h3>
                <span className="text-xs text-gray-500">
                  {selectedEmployeeForDossier.employeeCode} • {selectedEmployeeForDossier.email}
                </span>
              </div>
              <button
                onClick={() => setSelectedEmployeeForDossier(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-2xl">
                <div>
                  <span className="text-gray-500 block text-[10px]">Territories</span>
                  <span className="font-bold text-gray-900">
                    {selectedEmployeeForDossier.assignedAreas?.join(', ') || 'None'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Performance Score</span>
                  <span className="font-black text-amber-600 text-base">
                    {selectedEmployeeForDossier.points || 0} pts
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Visits Logged</span>
                  <span className="font-bold text-gray-900">{selectedEmployeeForDossier.visitsCount || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Sellers Registered</span>
                  <span className="font-bold text-teal-800">{selectedEmployeeForDossier.sellersRegistered || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Purchasing Sellers</span>
                  <span className="font-bold text-purple-800">{selectedEmployeeForDossier.purchasingSellers || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Verified Revenue</span>
                  <span className="font-black text-[#064D2B]">
                    {fmt(selectedEmployeeForDossier.totalPurchaseValue)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedEmployeeForDossier(null)}
                className="px-5 py-2 bg-[#064D2B] text-white rounded-xl font-bold text-xs"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
