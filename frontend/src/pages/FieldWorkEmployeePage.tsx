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
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SellerBusinessTrackingEmployee } from '../components/field/SellerBusinessTrackingEmployee';

interface FieldWorkEmployeePageProps {
  onNotify: (msg: string) => void;
  initialTab?: string;
}

export const FieldWorkEmployeePage: React.FC<FieldWorkEmployeePageProps> = ({ onNotify, initialTab }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'business' | 'areas' | 'sellers' | 'visits' | 'reports' | 'leaderboard'>(
    (initialTab as any) || 'dashboard'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);
  const [loading, setLoading] = useState(true);

  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [assignedAreas, setAssignedAreas] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [dailyReports, setDailyReports] = useState<any[]>([]);
  const [pointsSummary, setPointsSummary] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // Search & Filter states
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerAreaFilter, setSellerAreaFilter] = useState('');
  const [sellerStageFilter, setSellerStageFilter] = useState('');

  // Modals
  const [showAddSellerModal, setShowAddSellerModal] = useState(false);
  const [showRecordVisitModal, setShowRecordVisitModal] = useState(false);
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [selectedSellerForVisit, setSelectedSellerForVisit] = useState<any>(null);
  const [selectedSellerDetails, setSelectedSellerDetails] = useState<any>(null);

  // New Seller Form State
  const [newSeller, setNewSeller] = useState({
    shopName: '',
    ownerName: '',
    mobileNumber: '',
    whatsappNumber: '',
    shopAddress: '',
    areaId: '',
    businessType: 'RETAILER',
    fruitsInterested: [] as string[],
    estimatedMonthlyQty: '',
    estimatedMonthlyValue: '',
    interestLevel: 'WARM',
    notes: '',
  });
  const [fruitInput, setFruitInput] = useState('');
  const [submittingSeller, setSubmittingSeller] = useState(false);
  const [sellerError, setSellerError] = useState('');

  // Record Visit Form State
  const [sellerSelectMode, setSellerSelectMode] = useState<'dropdown' | 'manual'>('dropdown');
  const [newVisit, setNewVisit] = useState({
    sellerId: '',
    manualShopName: '',
    manualOwner: '',
    manualMobile: '',
    manualAreaId: '',
    visitDate: new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().slice(0, 5),
    visitPurpose: 'Product Demo & Direct Sourcing Discussion',
    discussionSummary: '',
    fruitsDiscussed: [] as string[],
    customerRequirements: '',
    sellerFeedback: '',
    nextFollowUpDate: '',
    visitStatus: 'INTERESTED',
    visitPhoto: null as File | null,
  });
  const [visitFruitInput, setVisitFruitInput] = useState('');
  const [submittingVisit, setSubmittingVisit] = useState(false);
  const [visitError, setVisitError] = useState('');

  // Daily Report Form State
  const [newReport, setNewReport] = useState({
    reportDate: new Date().toISOString().split('T')[0],
    areaId: '',
    shopsVisitedCount: 0,
    sellersContactedCount: 0,
    sellersRegisteredCount: 0,
    interestedSellersCount: 0,
    followUpsCompletedCount: 0,
    conversionsCount: 0,
    majorAchievements: '',
    problemsFaced: '',
    tomorrowPlan: '',
  });
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, areasRes, sellersRes, visitsRes, reportsRes, pointsRes, lbRes] = await Promise.allSettled([
        api.getFieldEmployeeDashboard(),
        api.getFieldAreas(),
        api.getFieldSellers(),
        api.getFieldVisits(),
        api.getDailyFieldReports(),
        api.getMyPerformancePoints(),
        api.getFieldLeaderboard(),
      ]);

      if (dashRes.status === 'fulfilled') setDashboardData(dashRes.value);
      if (areasRes.status === 'fulfilled') {
        const areaList = Array.isArray(areasRes.value) ? areasRes.value : [];
        setAssignedAreas(areaList);
        if (areaList.length > 0) {
          setNewSeller((prev) => ({ ...prev, areaId: prev.areaId || areaList[0].id }));
          setNewReport((prev) => ({ ...prev, areaId: prev.areaId || areaList[0].id }));
          setNewVisit((prev) => ({ ...prev, manualAreaId: prev.manualAreaId || areaList[0].id }));
        }
      }
      if (sellersRes.status === 'fulfilled') setSellers(Array.isArray(sellersRes.value) ? sellersRes.value : []);
      if (visitsRes.status === 'fulfilled') setVisits(Array.isArray(visitsRes.value) ? visitsRes.value : []);
      if (reportsRes.status === 'fulfilled') setDailyReports(Array.isArray(reportsRes.value) ? reportsRes.value : []);
      if (pointsRes.status === 'fulfilled') setPointsSummary(pointsRes.value);
      if (lbRes.status === 'fulfilled') setLeaderboard(Array.isArray(lbRes.value) ? lbRes.value : []);
    } catch (err: any) {
      console.error('Error loading field work data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format currency
  const fmt = (num: number = 0) => '₹' + Number(num || 0).toLocaleString('en-IN');

  // Handle Add Seller
  const handleAddSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setSellerError('');

    if (!newSeller.shopName.trim() || !newSeller.mobileNumber.trim() || !newSeller.areaId) {
      setSellerError('Shop Name, Mobile Number, and Assigned Area are strictly required.');
      return;
    }

    // Phone format check (10 digits)
    const cleanedPhone = newSeller.mobileNumber.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      setSellerError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setSubmittingSeller(true);
    try {
      const payload = {
        ...newSeller,
        mobileNumber: cleanedPhone,
        estimatedMonthlyQty: Number(newSeller.estimatedMonthlyQty) || 0,
        estimatedMonthlyValue: Number(newSeller.estimatedMonthlyValue) || 0,
      };
      await api.createFieldSeller(payload);
      onNotify(`Seller "${newSeller.shopName}" registered successfully! +10 Points awarded.`);
      setShowAddSellerModal(false);
      setNewSeller({
        shopName: '',
        ownerName: '',
        mobileNumber: '',
        whatsappNumber: '',
        shopAddress: '',
        areaId: assignedAreas[0]?.id || '',
        businessType: 'RETAILER',
        fruitsInterested: [],
        estimatedMonthlyQty: '',
        estimatedMonthlyValue: '',
        interestLevel: 'WARM',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      setSellerError(err.message || 'Failed to register seller. Duplicate phone number or unassigned area.');
    } finally {
      setSubmittingSeller(false);
    }
  };

  // Handle Record Visit
  const handleRecordVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVisitError('');

    if (sellerSelectMode === 'dropdown' && !newVisit.sellerId) {
      setVisitError('Please select a registered seller from the list, or switch to manual entry.');
      return;
    }

    if (sellerSelectMode === 'manual' && (!newVisit.manualShopName.trim() || !newVisit.manualAreaId)) {
      setVisitError('Shop Name and Territory are strictly required for manual seller entry.');
      return;
    }

    if (!newVisit.visitPhoto) {
      setVisitError('Shop / Visit Photo is strictly mandatory. Please capture or select a photo.');
      return;
    }

    setSubmittingVisit(true);
    try {
      const formData = new FormData();
      if (sellerSelectMode === 'dropdown') {
        formData.append('sellerId', newVisit.sellerId);
      } else {
        formData.append('manualShopName', newVisit.manualShopName.trim());
        formData.append('manualOwner', newVisit.manualOwner.trim());
        formData.append('manualMobile', newVisit.manualMobile.trim());
        formData.append('manualAreaId', newVisit.manualAreaId);
        formData.append('shopName', newVisit.manualShopName.trim());
        formData.append('ownerName', newVisit.manualOwner.trim());
        formData.append('mobileNumber', newVisit.manualMobile.trim());
        formData.append('areaId', newVisit.manualAreaId);
      }
      formData.append('visitDate', newVisit.visitDate);
      formData.append('visitPurpose', newVisit.visitPurpose);
      formData.append('purpose', newVisit.visitPurpose);
      formData.append('discussionSummary', newVisit.discussionSummary);
      formData.append('fruitsDiscussed', JSON.stringify(newVisit.fruitsDiscussed));
      formData.append('customerRequirements', newVisit.customerRequirements);
      formData.append('sellerFeedback', newVisit.sellerFeedback);
      formData.append('feedbackText', newVisit.sellerFeedback);
      if (newVisit.nextFollowUpDate) formData.append('nextFollowUpDate', newVisit.nextFollowUpDate);
      formData.append('visitStatus', newVisit.visitStatus);
      formData.append('status', newVisit.visitStatus);
      if (newVisit.visitPhoto) {
        formData.append('photo', newVisit.visitPhoto);
        formData.append('visitPhoto', newVisit.visitPhoto);
      }

      await api.createFieldVisit(formData);
      onNotify('Field visit logged successfully! +5 Points awarded for unique seller visit.');
      setShowRecordVisitModal(false);
      setNewVisit({
        sellerId: '',
        manualShopName: '',
        manualOwner: '',
        manualMobile: '',
        manualAreaId: assignedAreas[0]?.id || '',
        visitDate: new Date().toISOString().split('T')[0] + 'T' + new Date().toTimeString().slice(0, 5),
        visitPurpose: 'Product Demo & Direct Sourcing Discussion',
        discussionSummary: '',
        fruitsDiscussed: [],
        customerRequirements: '',
        sellerFeedback: '',
        nextFollowUpDate: '',
        visitStatus: 'INTERESTED',
        visitPhoto: null,
      });
      loadData();
    } catch (err: any) {
      setVisitError(err.message || 'Failed to log field visit.');
    } finally {
      setSubmittingVisit(false);
    }
  };

  // Handle Submit Daily Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportError('');

    if (!newReport.areaId) {
      setReportError('Please select an assigned area visited today.');
      return;
    }

    setSubmittingReport(true);
    try {
      await api.submitDailyFieldReport({
        ...newReport,
        shopsVisitedCount: Number(newReport.shopsVisitedCount) || 0,
        sellersContactedCount: Number(newReport.sellersContactedCount) || 0,
        sellersRegisteredCount: Number(newReport.sellersRegisteredCount) || 0,
        interestedSellersCount: Number(newReport.interestedSellersCount) || 0,
        followUpsCompletedCount: Number(newReport.followUpsCompletedCount) || 0,
        conversionsCount: Number(newReport.conversionsCount) || 0,
      });
      onNotify('Daily field report submitted for Admin review. +5 Points upon approval.');
      setShowDailyReportModal(false);
      setNewReport({
        reportDate: new Date().toISOString().split('T')[0],
        areaId: assignedAreas[0]?.id || '',
        shopsVisitedCount: 0,
        sellersContactedCount: 0,
        sellersRegisteredCount: 0,
        interestedSellersCount: 0,
        followUpsCompletedCount: 0,
        conversionsCount: 0,
        majorAchievements: '',
        problemsFaced: '',
        tomorrowPlan: '',
      });
      loadData();
    } catch (err: any) {
      setReportError(err.message || 'Failed to submit daily report.');
    } finally {
      setSubmittingReport(false);
    }
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'LEAD_IDENTIFIED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">1. Lead Identified</span>;
      case 'FIRST_CONTACT':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">2. First Contact</span>;
      case 'INTERESTED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">3. Interested</span>;
      case 'FOLLOW_UP':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">4. Follow-up</span>;
      case 'REGISTERED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">5. Registered Seller</span>;
      case 'FIRST_PURCHASE':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">6. First Purchase 🎉</span>;
      case 'REPEAT_CUSTOMER':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-700 text-white shadow-sm">7. Repeat Customer 👑</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">{stage}</span>;
    }
  };

  const getInterestBadge = (level: string) => {
    switch (level) {
      case 'HOT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200">🔥 Hot</span>;
      case 'WARM':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">⚡ Warm</span>;
      case 'COLD':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-600 border border-blue-200">❄️ Cold</span>;
      default:
        return null;
    }
  };

  // Filtered sellers
  const filteredSellers = sellers.filter((s) => {
    const matchesSearch =
      sellerSearch === '' ||
      s.shopName.toLowerCase().includes(sellerSearch.toLowerCase()) ||
      (s.ownerName && s.ownerName.toLowerCase().includes(sellerSearch.toLowerCase())) ||
      s.mobileNumber.includes(sellerSearch);
    const matchesArea = sellerAreaFilter === '' || s.areaId === sellerAreaFilter;
    const matchesStage = sellerStageFilter === '' || s.conversionStage === sellerStageFilter;
    return matchesSearch && matchesArea && matchesStage;
  });

  const kpis = dashboardData?.kpis || {};

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-[#064D2B] via-[#086338] to-[#0A7B45] text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <MapPin size={220} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-0.5 bg-emerald-400/20 text-emerald-200 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-400/30">
                SAFAL Field Operations
              </span>
              <span className="px-3 py-0.5 bg-amber-400/20 text-amber-200 rounded-full text-xs font-black uppercase tracking-wider border border-amber-400/30">
                FY 2026-27
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Field Work & Seller Acquisition
            </h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-2xl">
              Connecting local fruit wholesalers, retailers, and distributors to SAFAL wholesale procurement and cold storage.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setNewSeller((prev) => ({ ...prev, areaId: prev.areaId || assignedAreas[0]?.id || '' }));
                setShowAddSellerModal(true);
              }}
              className="px-4 py-2.5 bg-white text-[#064D2B] rounded-xl font-bold text-sm shadow hover:bg-emerald-50 active:scale-95 transition flex items-center gap-2"
            >
              <Plus size={18} /> Add New Seller
            </button>
            <button
              onClick={() => {
                setSelectedSellerForVisit(null);
                setSellerSelectMode('dropdown');
                setNewVisit((prev) => ({ ...prev, sellerId: '', manualAreaId: assignedAreas[0]?.id || '' }));
                setShowRecordVisitModal(true);
              }}
              className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-bold text-sm shadow active:scale-95 transition flex items-center gap-2"
            >
              <Calendar size={18} /> Record Visit
            </button>
            <button
              onClick={() => setShowDailyReportModal(true)}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-950 rounded-xl font-bold text-sm shadow active:scale-95 transition flex items-center gap-2"
            >
              <FileText size={18} /> Daily Report
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'dashboard'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <BarChart2 size={16} /> Field Dashboard
        </button>
        <button
          onClick={() => setActiveTab('business')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'business'
              ? 'bg-[#064D2B] text-white shadow-sm ring-2 ring-emerald-400'
              : 'text-[#064D2B] bg-emerald-50 hover:bg-emerald-100 font-extrabold'
          }`}
        >
          <TrendingUp size={16} /> Seller Business Tracking 💰
        </button>
        <button
          onClick={() => setActiveTab('areas')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'areas'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <MapPin size={16} /> My Assigned Areas ({assignedAreas.length})
        </button>
        <button
          onClick={() => setActiveTab('sellers')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'sellers'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Store size={16} /> Local Sellers ({sellers.length})
        </button>
        <button
          onClick={() => setActiveTab('visits')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'visits'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Clock size={16} /> Field Visits ({visits.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <FileText size={16} /> Daily Reports ({dailyReports.length})
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2.5 font-bold text-sm rounded-t-xl transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'leaderboard'
              ? 'bg-[#064D2B] text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Trophy size={16} /> Points & Leaderboard
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={28} className="animate-spin text-[#064D2B]" />
          <span className="ml-3 text-sm font-bold text-[#064D2B]">Loading Field Data...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* TAB 1: FIELD DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 9 KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-xs font-semibold">Assigned Areas</span>
                    <MapPin size={18} className="text-emerald-700" />
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-black text-gray-900">{kpis.totalAssignedAreas || 0}</div>
                    <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                      {kpis.totalAreasVisited || 0} visited this month
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-xs font-semibold">Sellers Contacted</span>
                    <Users size={18} className="text-blue-600" />
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-black text-gray-900">{kpis.totalSellersContacted || 0}</div>
                    <div className="text-[11px] text-blue-600 font-semibold mt-0.5">Across assigned territories</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-xs font-semibold">Registered Sellers</span>
                    <Store size={18} className="text-teal-600" />
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-black text-teal-800">{kpis.newSellersRegistered || 0}</div>
                    <div className="text-[11px] text-teal-600 font-semibold mt-0.5">
                      {kpis.verifiedSellers || 0} Admin Verified
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="text-xs font-semibold">1st-Time Purchasing</span>
                    <ShoppingBag size={18} className="text-purple-600" />
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-black text-purple-900">{kpis.firstTimePurchasingSellers || 0}</div>
                    <div className="text-[11px] text-purple-600 font-semibold mt-0.5">
                      {kpis.repeatPurchasingSellers || 0} Repeat Buyers
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#064D2B] to-[#0A7B45] text-white p-4 rounded-2xl shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
                  <div className="flex items-center justify-between text-emerald-200">
                    <span className="text-xs font-bold uppercase tracking-wider">Performance Points</span>
                    <Award size={20} className="text-amber-300" />
                  </div>
                  <div className="mt-2">
                    <div className="text-3xl font-black text-amber-300">{kpis.monthlyPoints || 0}</div>
                    <div className="text-[11px] text-emerald-100 font-semibold mt-0.5">
                      Verified Value: {fmt(kpis.totalVerifiedPurchaseValue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion Pipeline & Territory Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pipeline Stages */}
                <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                      <Target size={18} className="text-[#064D2B]" /> Seller Conversion Pipeline (Customer Journey)
                    </h3>
                    <span className="text-xs text-gray-500 font-semibold">
                      Goal: Convert Fruit Sellers into SAFAL Purchasing Customers
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center">
                    {[
                      { stage: 'LEAD_IDENTIFIED', label: '1. Lead', count: dashboardData?.conversionStages?.LEAD_IDENTIFIED || 0, color: 'bg-slate-50 border-slate-200 text-slate-700' },
                      { stage: 'FIRST_CONTACT', label: '2. Contact', count: dashboardData?.conversionStages?.FIRST_CONTACT || 0, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                      { stage: 'INTERESTED', label: '3. Interested', count: dashboardData?.conversionStages?.INTERESTED || 0, color: 'bg-amber-50 border-amber-200 text-amber-800' },
                      { stage: 'FOLLOW_UP', label: '4. Follow-up', count: dashboardData?.conversionStages?.FOLLOW_UP || 0, color: 'bg-purple-50 border-purple-200 text-purple-700' },
                      { stage: 'REGISTERED', label: '5. Registered', count: dashboardData?.conversionStages?.REGISTERED || 0, color: 'bg-teal-50 border-teal-200 text-teal-800' },
                      { stage: 'FIRST_PURCHASE', label: '6. 1st Buy', count: dashboardData?.conversionStages?.FIRST_PURCHASE || 0, color: 'bg-emerald-50 border-emerald-300 text-emerald-800' },
                      { stage: 'REPEAT_CUSTOMER', label: '7. Repeat', count: dashboardData?.conversionStages?.REPEAT_CUSTOMER || 0, color: 'bg-green-600 border-green-700 text-white' },
                    ].map((step, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border ${step.color} flex flex-col justify-center`}>
                        <div className="text-lg font-black">{step.count}</div>
                        <div className="text-[11px] font-bold mt-0.5 leading-tight">{step.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-600" /> Conversions verified by admin purchase transactions
                    </span>
                    <button
                      onClick={() => setActiveTab('sellers')}
                      className="text-[#064D2B] font-bold hover:underline flex items-center gap-1"
                    >
                      View All Sellers <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Monthly Performance Targets */}
                <div className="bg-gradient-to-br from-[#F4F8F4] to-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-[#064D2B] text-sm flex items-center gap-2">
                        <Trophy size={18} /> Monthly Standing
                      </h3>
                      <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                        {dashboardData?.pointsData?.currentMonth || 'Current Month'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 font-medium">Monthly Points Target:</span>
                        <span className="text-xs font-bold text-gray-900">
                          {kpis.monthlyPoints || 0} / 200 pts
                        </span>
                      </div>
                      <div className="w-full bg-emerald-200/50 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-[#064D2B] h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ((kpis.monthlyPoints || 0) / 200) * 100)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-gray-600 font-medium">Purchase Value Target:</span>
                        <span className="text-xs font-bold text-gray-900">
                          {fmt(kpis.totalVerifiedPurchaseValue)} / ₹5,00,000
                        </span>
                      </div>
                      <div className="w-full bg-emerald-200/50 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ((kpis.totalVerifiedPurchaseValue || 0) / 500000) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-emerald-200/50 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#064D2B]">
                      Rank #{dashboardData?.pointsData?.rank || 1} in Field Team
                    </span>
                    <button
                      onClick={() => setActiveTab('leaderboard')}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
                    >
                      View Leaderboard →
                    </button>
                  </div>
                </div>
              </div>

              {/* Pending Follow-ups & Recent Activities */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Follow-ups */}
                <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                      <Clock size={16} className="text-amber-600" /> Pending Seller Follow-ups
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                      {dashboardData?.pendingFollowups?.length || 0} Scheduled
                    </span>
                  </div>

                  {dashboardData?.pendingFollowups?.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      No pending follow-ups scheduled. Log visits and set follow-up dates!
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {dashboardData?.pendingFollowups?.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="font-bold text-gray-900 text-xs">{item.sellerName}</div>
                            <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                              <span>📍 {item.areaName}</span>
                              <span>📞 {item.mobileNumber}</span>
                            </div>
                            {item.discussionSummary && (
                              <div className="text-[11px] text-gray-600 mt-1 italic line-clamp-1">
                                "{item.discussionSummary}"
                              </div>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <div className="text-xs font-bold text-amber-800">
                              {new Date(item.nextFollowUpDate).toLocaleDateString()}
                            </div>
                            <button
                              onClick={() => {
                                const sel = sellers.find((s) => s.id === item.sellerId);
                                setSelectedSellerForVisit(sel || { id: item.sellerId, shopName: item.sellerName });
                                setNewVisit((prev) => ({ ...prev, sellerId: item.sellerId }));
                                setShowRecordVisitModal(true);
                              }}
                              className="mt-1 px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Visit Now
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Field Visits */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                      <Clock size={16} className="text-emerald-700" /> Recent Field Visits
                    </h3>
                    <button
                      onClick={() => setActiveTab('visits')}
                      className="text-xs text-[#064D2B] font-bold hover:underline"
                    >
                      View All ({visits.length})
                    </button>
                  </div>

                  {visits.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      No visits recorded yet. Use "Record Visit" above.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {visits.slice(0, 5).map((v: any) => (
                        <div key={v.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="font-bold text-gray-900 text-xs flex items-center gap-2">
                              {v.seller?.shopName || 'Local Shop'}
                              {getInterestBadge(v.seller?.interestLevel)}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              {v.seller?.area?.name} • {new Date(v.visitDate).toLocaleDateString()}
                            </div>
                            <div className="text-[11px] text-gray-600 mt-1 line-clamp-1">
                              {v.discussionSummary || v.visitPurpose}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                              {v.visitStatus}
                            </span>
                            {v.photoUrl && (
                              <a
                                href={v.photoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block mt-1 text-[10px] text-blue-600 underline font-semibold"
                              >
                                View Photo
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1.5: SELLER BUSINESS TRACKING */}
          {activeTab === 'business' && (
            <SellerBusinessTrackingEmployee onNotify={onNotify} />
          )}

          {/* TAB 2: MY ASSIGNED AREAS */}
          {activeTab === 'areas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">My Allocated Territories</h2>
                  <p className="text-xs text-gray-500">
                    Territories officially assigned to you by SAFAL Admin. You can only register sellers and record visits in these areas.
                  </p>
                </div>
              </div>

              {assignedAreas.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm">
                  <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
                  <h3 className="text-sm font-bold text-gray-800">No Areas Assigned Yet</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Please contact SAFAL Administrator to allocate your designated field territory.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignedAreas.map((area: any) => {
                    const areaSellers = sellers.filter((s) => s.areaId === area.id);
                    const purchasingCount = areaSellers.filter(
                      (s) => s.conversionStage === 'FIRST_PURCHASE' || s.conversionStage === 'REPEAT_CUSTOMER'
                    ).length;
                    const totalVal = areaSellers.reduce((acc, s) => acc + (s.totalPurchaseAmount || 0), 0);

                    return (
                      <div key={area.id} className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#064D2B] flex items-center justify-center font-bold">
                              <MapPin size={20} />
                            </div>
                            <div>
                              <h3 className="font-extrabold text-base text-gray-900">{area.name}</h3>
                              <span className="text-[11px] text-gray-500">{area.state || 'Telangana'}</span>
                            </div>
                          </div>
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-extrabold">
                            Active Territory
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-100 text-xs">
                          <div className="bg-gray-50 p-2 rounded-xl">
                            <span className="text-gray-500 block text-[10px]">Registered Sellers</span>
                            <span className="font-extrabold text-gray-900 text-sm">{areaSellers.length}</span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-xl">
                            <span className="text-gray-500 block text-[10px]">Purchasing Clients</span>
                            <span className="font-extrabold text-emerald-700 text-sm">{purchasingCount}</span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-xl col-span-2">
                            <span className="text-gray-500 block text-[10px]">Total Purchase Value Generated</span>
                            <span className="font-extrabold text-[#064D2B] text-sm">{fmt(totalVal)}</span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                          <button
                            onClick={() => {
                              setSellerAreaFilter(area.id);
                              setActiveTab('sellers');
                            }}
                            className="text-xs font-bold text-[#064D2B] hover:underline flex items-center gap-1"
                          >
                            View Area Sellers <ChevronRight size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setNewSeller((prev) => ({ ...prev, areaId: area.id }));
                              setShowAddSellerModal(true);
                            }}
                            className="px-2.5 py-1 bg-[#064D2B] hover:bg-[#053d22] text-white rounded-lg text-xs font-bold"
                          >
                            + Add Seller
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LOCAL SELLERS */}
          {activeTab === 'sellers' && (
            <div className="space-y-4">
              {/* Header and Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search shop name, owner or mobile..."
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
                    <option value="">All My Areas</option>
                    {assignedAreas.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <select
                    value={sellerStageFilter}
                    onChange={(e) => setSellerStageFilter(e.target.value)}
                    className="py-2 px-3 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  >
                    <option value="">All Stages</option>
                    <option value="LEAD_IDENTIFIED">1. Lead Identified</option>
                    <option value="FIRST_CONTACT">2. First Contact</option>
                    <option value="INTERESTED">3. Interested</option>
                    <option value="FOLLOW_UP">4. Follow-up</option>
                    <option value="REGISTERED">5. Registered Seller</option>
                    <option value="FIRST_PURCHASE">6. First Purchase</option>
                    <option value="REPEAT_CUSTOMER">7. Repeat Customer</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setNewSeller((prev) => ({ ...prev, areaId: prev.areaId || assignedAreas[0]?.id || '' }));
                    setShowAddSellerModal(true);
                  }}
                  className="px-4 py-2 bg-[#064D2B] hover:bg-[#053d22] text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
                >
                  <Plus size={16} /> Register Local Seller
                </button>
              </div>

              {/* Sellers Table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#064D2B] text-white">
                      <tr>
                        <th className="py-3 px-4 font-bold">Shop / Business</th>
                        <th className="py-3 px-3 font-bold">Owner & Mobile</th>
                        <th className="py-3 px-3 font-bold">Area</th>
                        <th className="py-3 px-3 font-bold">Type</th>
                        <th className="py-3 px-3 font-bold">Interest</th>
                        <th className="py-3 px-3 font-bold">Customer Journey Stage</th>
                        <th className="py-3 px-3 font-bold">Verified Purchases</th>
                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredSellers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-gray-400">
                            No local sellers found. Click "Register Local Seller" to add your first customer lead.
                          </td>
                        </tr>
                      ) : (
                        filteredSellers.map((s: any) => (
                          <tr key={s.id} className="hover:bg-emerald-50/40 transition">
                            <td className="py-3 px-4">
                              <div className="font-extrabold text-gray-900">{s.shopName}</div>
                              {s.shopAddress && (
                                <div className="text-[11px] text-gray-500 line-clamp-1">{s.shopAddress}</div>
                              )}
                              {s.isVerified && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-0.5">
                                  <ShieldCheck size={12} /> Verified Seller
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-gray-800">{s.ownerName || '—'}</div>
                              <div className="text-gray-500 flex items-center gap-1 mt-0.5">
                                <Phone size={11} /> {s.mobileNumber}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-medium text-gray-700">{s.area?.name || '—'}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[10px] font-semibold">
                                {s.businessType}
                              </span>
                            </td>
                            <td className="py-3 px-3">{getInterestBadge(s.interestLevel)}</td>
                            <td className="py-3 px-3">{getStageBadge(s.conversionStage)}</td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-[#064D2B]">{fmt(s.totalPurchaseAmount)}</div>
                              <div className="text-[10px] text-gray-500">{s.ordersCount || 0} Orders</div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedSellerForVisit(s);
                                    setNewVisit((prev) => ({ ...prev, sellerId: s.id }));
                                    setShowRecordVisitModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#064D2B] rounded-lg font-bold text-[11px] transition"
                                >
                                  + Visit
                                </button>
                                <button
                                  onClick={() => setSelectedSellerDetails(s)}
                                  className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                                  title="View Seller Profile"
                                >
                                  <Eye size={15} />
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
            </div>
          )}

          {/* TAB 4: FIELD VISITS */}
          {activeTab === 'visits' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Field Visits Log</h2>
                  <p className="text-xs text-gray-500">
                    Chronological history of in-person visits to local fruit vendors, market discussions, and requirements.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedSellerForVisit(null);
                    setSellerSelectMode('dropdown');
                    setNewVisit((prev) => ({ ...prev, sellerId: '', manualAreaId: assignedAreas[0]?.id || '' }));
                    setShowRecordVisitModal(true);
                  }}
                  className="px-4 py-2 bg-[#064D2B] hover:bg-[#053d22] text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
                >
                  <Plus size={16} /> Record Field Visit
                </button>
              </div>

              <div className="space-y-3">
                {visits.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm text-gray-400">
                    No field visits logged yet. Click "Record Field Visit" after visiting a fruit seller.
                  </div>
                ) : (
                  visits.map((v: any) => (
                    <div key={v.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-gray-900 text-sm">{v.seller?.shopName}</h4>
                          <span className="text-xs text-gray-500">📍 {v.seller?.area?.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {v.visitStatus}
                          </span>
                        </div>

                        <div className="text-xs text-gray-700 mt-2 font-medium">
                          <span className="font-bold text-gray-900">Purpose: </span>{v.visitPurpose}
                        </div>

                        {v.discussionSummary && (
                          <div className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded-xl">
                            "{v.discussionSummary}"
                          </div>
                        )}

                        {v.sellerFeedback && (
                          <div className="text-xs text-amber-900 mt-1.5 flex items-center gap-1.5">
                            <MessageSquare size={13} className="text-amber-600" />
                            <span className="font-bold">Seller Feedback:</span> {v.sellerFeedback}
                          </div>
                        )}

                        {v.nextFollowUpDate && (
                          <div className="text-[11px] text-purple-700 mt-1.5 flex items-center gap-1 font-bold">
                            <Calendar size={13} />
                            Next Follow-up Scheduled: {new Date(v.nextFollowUpDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div className="flex md:flex-col items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4 min-w-[140px]">
                        <div className="text-right">
                          <div className="text-xs font-bold text-gray-900">
                            {new Date(v.visitDate).toLocaleDateString()}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {new Date(v.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>

                        {v.photoUrl && (
                          <a
                            href={v.photoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 px-3 py-1 bg-emerald-50 text-[#064D2B] rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center gap-1"
                          >
                            <Eye size={12} /> Proof Photo
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: DAILY REPORTS */}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Daily Field Work Reports</h2>
                  <p className="text-xs text-gray-500">
                    Daily comprehensive summary of market visits, new contacts, conversions, and plans submitted for Admin approval.
                  </p>
                </div>
                <button
                  onClick={() => setShowDailyReportModal(true)}
                  className="px-4 py-2 bg-[#064D2B] hover:bg-[#053d22] text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
                >
                  <Plus size={16} /> Submit Daily Report
                </button>
              </div>

              <div className="space-y-3">
                {dailyReports.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm text-gray-400">
                    No daily field reports submitted yet. Submit your report at the end of each field day.
                  </div>
                ) : (
                  dailyReports.map((r: any) => (
                    <div key={r.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar size={18} className="text-[#064D2B]" />
                          <span className="font-extrabold text-sm text-gray-900">
                            Report Date: {new Date(r.reportDate).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-500">📍 Area: {r.area?.name}</span>
                        </div>
                        <div>
                          {r.status === 'APPROVED' ? (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-extrabold flex items-center gap-1">
                              <CheckCircle2 size={13} /> Approved (+5 Points)
                            </span>
                          ) : r.status === 'REJECTED' ? (
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-extrabold flex items-center gap-1">
                              <AlertCircle size={13} /> Rejected
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-extrabold flex items-center gap-1">
                              <Clock size={13} /> Pending Admin Review
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stats grid */}
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

          {/* TAB 6: POINTS & LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-6">
              {/* Point Scoring Reference */}
              <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
                <h3 className="font-extrabold text-[#064D2B] text-sm flex items-center gap-2 mb-3">
                  <Award size={18} /> Transparent Monthly Performance Points Rules
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="block font-black text-emerald-800 text-lg">+5 Pts</span>
                    <span className="text-emerald-700 font-semibold mt-0.5 block">Approved Unique Seller Visit</span>
                  </div>
                  <div className="p-3 bg-teal-50 rounded-xl border border-teal-100">
                    <span className="block font-black text-teal-800 text-lg">+10 Pts</span>
                    <span className="text-teal-700 font-semibold mt-0.5 block">Verified Seller Registration</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="block font-black text-amber-800 text-lg">+50 Pts</span>
                    <span className="text-amber-700 font-semibold mt-0.5 block">1st Purchase Conversion</span>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <span className="block font-black text-purple-800 text-lg">+20 Pts</span>
                    <span className="text-purple-700 font-semibold mt-0.5 block">Repeat Purchase Customer</span>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 col-span-2 md:col-span-1">
                    <span className="block font-black text-blue-800 text-lg">+5 Pts</span>
                    <span className="text-blue-700 font-semibold mt-0.5 block">Approved Daily Field Report</span>
                  </div>
                </div>
              </div>

              {/* Leaderboard Table & User's Ledger */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Team Leaderboard */}
                <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                      <Trophy size={18} className="text-amber-500" /> SAFAL Field Team Monthly Leaderboard
                    </h3>
                    <span className="text-xs font-bold text-gray-500">
                      {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-600 border-y border-gray-100">
                        <tr>
                          <th className="py-2.5 px-3 font-bold">Rank</th>
                          <th className="py-2.5 px-3 font-bold">Field Executive</th>
                          <th className="py-2.5 px-3 font-bold">Assigned Territories</th>
                          <th className="py-2.5 px-3 font-bold text-center">Converted</th>
                          <th className="py-2.5 px-3 font-bold text-right">Purchase Value</th>
                          <th className="py-2.5 px-3 font-bold text-right">Points</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {leaderboard.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-400">
                              No leaderboard entries for current month.
                            </td>
                          </tr>
                        ) : (
                          leaderboard.map((item: any, idx: number) => {
                            const isMe = item.employeeId === user?.employee?.id || item.employeeName === user?.name;
                            return (
                              <tr key={idx} className={isMe ? 'bg-emerald-50/60 font-bold' : ''}>
                                <td className="py-3 px-3">
                                  {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : `#${idx + 1}`}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-extrabold text-gray-900 flex items-center gap-1.5">
                                    {item.employeeName}
                                    {isMe && (
                                      <span className="px-1.5 py-0.2 bg-[#064D2B] text-white rounded text-[9px]">You</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-gray-600">{item.areas || '—'}</td>
                                <td className="py-3 px-3 text-center text-teal-800 font-extrabold">
                                  {item.sellersConverted || 0}
                                </td>
                                <td className="py-3 px-3 text-right font-extrabold text-[#064D2B]">
                                  {fmt(item.purchaseValueGenerated)}
                                </td>
                                <td className="py-3 px-3 text-right font-black text-amber-600 text-sm">
                                  {item.points || 0} pts
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* My Points Audit Ledger */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-extrabold text-gray-900 text-sm mb-3 flex items-center gap-2">
                    <Award size={16} className="text-[#064D2B]" /> My Points History
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {!pointsSummary?.history || pointsSummary.history.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-xs">
                        No points awarded yet. Start visiting sellers and submitting reports!
                      </div>
                    ) : (
                      pointsSummary.history.map((pt: any) => (
                        <div key={pt.id} className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-gray-900">{pt.reason}</div>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {new Date(pt.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <span className={`font-black text-sm ${pt.points >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {pt.points >= 0 ? `+${pt.points}` : pt.points}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL 1: ADD LOCAL SELLER */}
      {showAddSellerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <Store size={22} className="text-[#064D2B]" />
                <h3 className="font-extrabold text-lg text-gray-900">Register Local Fruit Seller</h3>
              </div>
              <button
                onClick={() => setShowAddSellerModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {sellerError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{sellerError}</span>
              </div>
            )}

            <form onSubmit={handleAddSeller} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Seller / Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sri Balaji Fruit Wholesale Agency"
                  value={newSeller.shopName}
                  onChange={(e) => setNewSeller({ ...newSeller, shopName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={newSeller.ownerName}
                    onChange={(e) => setNewSeller({ ...newSeller, ownerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10 digit phone"
                    value={newSeller.mobileNumber}
                    onChange={(e) => setNewSeller({ ...newSeller, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">WhatsApp Number (Optional)</label>
                  <input
                    type="tel"
                    maxLength={10}
                    placeholder="WhatsApp number"
                    value={newSeller.whatsappNumber}
                    onChange={(e) => setNewSeller({ ...newSeller, whatsappNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Assigned Territory <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newSeller.areaId}
                    onChange={(e) => setNewSeller({ ...newSeller, areaId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  >
                    <option value="">-- Choose Territory --</option>
                    {assignedAreas.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Shop Address / Landmark</label>
                <input
                  type="text"
                  placeholder="Market road, shop number, landmark..."
                  value={newSeller.shopAddress}
                  onChange={(e) => setNewSeller({ ...newSeller, shopAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Business Type</label>
                  <select
                    value={newSeller.businessType}
                    onChange={(e) => setNewSeller({ ...newSeller, businessType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  >
                    <option value="RETAILER">Retailer</option>
                    <option value="WHOLESALER">Wholesaler</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                    <option value="OTHER">Other / Semi-Wholesale</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Interest Level</label>
                  <select
                    value={newSeller.interestLevel}
                    onChange={(e) => setNewSeller({ ...newSeller, interestLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  >
                    <option value="HOT">🔥 Hot (Ready to order)</option>
                    <option value="WARM">⚡ Warm (Considering)</option>
                    <option value="COLD">❄️ Cold (Need nurturing)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Est. Monthly Qty (Boxes / KGs)</label>
                  <input
                    type="number"
                    placeholder="e.g. 100"
                    value={newSeller.estimatedMonthlyQty}
                    onChange={(e) => setNewSeller({ ...newSeller, estimatedMonthlyQty: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Est. Monthly Value (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={newSeller.estimatedMonthlyValue}
                    onChange={(e) => setNewSeller({ ...newSeller, estimatedMonthlyValue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Fruits Interested In</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. Kashmir Apples, Shimla Apple, Orange"
                    value={fruitInput}
                    onChange={(e) => setFruitInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (fruitInput.trim()) {
                        setNewSeller({
                          ...newSeller,
                          fruitsInterested: [...newSeller.fruitsInterested, fruitInput.trim()],
                        });
                        setFruitInput('');
                      }
                    }}
                    className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl font-bold"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {newSeller.fruitsInterested.map((f, i) => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1 text-[11px]">
                      {f}
                      <X
                        size={12}
                        className="cursor-pointer"
                        onClick={() =>
                          setNewSeller({
                            ...newSeller,
                            fruitsInterested: newSeller.fruitsInterested.filter((_, idx) => idx !== i),
                          })
                        }
                      />
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="Key requirements, supplier complaints, pricing expectations..."
                  value={newSeller.notes}
                  onChange={(e) => setNewSeller({ ...newSeller, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSellerModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSeller}
                  className="px-5 py-2 bg-[#064D2B] hover:bg-[#053d22] text-white rounded-xl font-bold shadow flex items-center gap-1.5"
                >
                  {submittingSeller ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Register Seller (+10 Pts)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RECORD FIELD VISIT */}
      {showRecordVisitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={22} className="text-[#064D2B]" />
                <h3 className="font-extrabold text-lg text-gray-900">Record Field Visit</h3>
              </div>
              <button
                onClick={() => setShowRecordVisitModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {visitError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{visitError}</span>
              </div>
            )}

            <form onSubmit={handleRecordVisit} className="space-y-3.5 text-xs">
              {/* Seller Selection Mode Toggle */}
              <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSellerSelectMode('dropdown')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    sellerSelectMode === 'dropdown'
                      ? 'bg-white text-[#064D2B] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Choose Registered Seller
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSellerSelectMode('manual');
                    if (!newVisit.manualAreaId && assignedAreas.length > 0) {
                      setNewVisit((prev) => ({ ...prev, manualAreaId: assignedAreas[0].id }));
                    }
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                    sellerSelectMode === 'manual'
                      ? 'bg-white text-[#064D2B] shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  + Enter Seller Manually
                </button>
              </div>

              {sellerSelectMode === 'dropdown' ? (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Select Local Seller <span className="text-red-500">*</span>
                  </label>
                  <select
                    required={sellerSelectMode === 'dropdown'}
                    value={newVisit.sellerId}
                    onChange={(e) => {
                      if (e.target.value === '__manual__') {
                        setSellerSelectMode('manual');
                        if (!newVisit.manualAreaId && assignedAreas.length > 0) {
                          setNewVisit((prev) => ({ ...prev, manualAreaId: assignedAreas[0].id }));
                        }
                      } else {
                        setNewVisit({ ...newVisit, sellerId: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  >
                    <option value="">-- Choose Registered Seller --</option>
                    {sellers.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.shopName} ({s.area?.name || 'Area'}) - {s.ownerName || s.mobileNumber}
                      </option>
                    ))}
                    <option value="__manual__">+ Enter New Seller Manually...</option>
                  </select>
                </div>
              ) : (
                <div className="space-y-2.5 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-[#064D2B]">
                      Enter Shop / Seller Details Manually:
                    </span>
                    <button
                      type="button"
                      onClick={() => setSellerSelectMode('dropdown')}
                      className="text-[10px] text-gray-500 hover:underline"
                    >
                      ← Back to Dropdown
                    </button>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Shop / Seller Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={sellerSelectMode === 'manual'}
                      placeholder="e.g. Sri Balaji Fruit Center"
                      value={newVisit.manualShopName}
                      onChange={(e) => setNewVisit({ ...newVisit, manualShopName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#064D2B]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Owner Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Ramesh"
                        value={newVisit.manualOwner}
                        onChange={(e) => setNewVisit({ ...newVisit, manualOwner: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#064D2B]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required={sellerSelectMode === 'manual'}
                        maxLength={10}
                        placeholder="10 digit phone"
                        value={newVisit.manualMobile}
                        onChange={(e) => setNewVisit({ ...newVisit, manualMobile: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#064D2B]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Territory / Area <span className="text-red-500">*</span>
                    </label>
                    <select
                      required={sellerSelectMode === 'manual'}
                      value={newVisit.manualAreaId}
                      onChange={(e) => setNewVisit({ ...newVisit, manualAreaId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-[#064D2B]"
                    >
                      <option value="">-- Choose Territory --</option>
                      {assignedAreas.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Visit Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newVisit.visitDate}
                    onChange={(e) => setNewVisit({ ...newVisit, visitDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Visit Status / Outcome</label>
                  <select
                    value={newVisit.visitStatus}
                    onChange={(e) => setNewVisit({ ...newVisit, visitStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  >
                    <option value="INTERESTED">Interested (Samples shown)</option>
                    <option value="FOLLOW_UP_REQUIRED">Follow-up Required</option>
                    <option value="CONVERTED">Converted (Order Placed)</option>
                    <option value="NOT_INTERESTED">Not Interested</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Visit Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Sample Tasting & Price Comparison for Kashmir Apples"
                  value={newVisit.visitPurpose}
                  onChange={(e) => setNewVisit({ ...newVisit, visitPurpose: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Discussion Summary</label>
                <textarea
                  rows={2}
                  placeholder="Details of conversation with shop owner..."
                  value={newVisit.discussionSummary}
                  onChange={(e) => setNewVisit({ ...newVisit, discussionSummary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Customer Feedback / Objections</label>
                <input
                  type="text"
                  placeholder="e.g. Needs credit period of 3 days, prefers 1-box trial"
                  value={newVisit.sellerFeedback}
                  onChange={(e) => setNewVisit({ ...newVisit, sellerFeedback: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Next Follow-Up Date</label>
                  <input
                    type="date"
                    value={newVisit.nextFollowUpDate}
                    onChange={(e) => setNewVisit({ ...newVisit, nextFollowUpDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Shop / Visit Photo <span className="text-red-500">* (Mandatory Proof)</span>
                  </label>
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setNewVisit({ ...newVisit, visitPhoto: e.target.files[0] });
                      }
                    }}
                    className="w-full px-2 py-1.5 border border-emerald-300 bg-emerald-50/20 rounded-xl text-xs cursor-pointer"
                  />
                  {newVisit.visitPhoto && (
                    <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                      ✓ Ready to upload: {newVisit.visitPhoto.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecordVisitModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVisit}
                  className="px-5 py-2 bg-[#064D2B] hover:bg-[#053d22] text-white rounded-xl font-bold shadow flex items-center gap-1.5"
                >
                  {submittingVisit ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Visit (+5 Pts)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SUBMIT DAILY FIELD REPORT */}
      {showDailyReportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <FileText size={22} className="text-[#064D2B]" />
                <h3 className="font-extrabold text-lg text-gray-900">Submit Daily Field Work Report</h3>
              </div>
              <button
                onClick={() => setShowDailyReportModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {reportError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{reportError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReport} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Report Date</label>
                  <input
                    type="date"
                    required
                    value={newReport.reportDate}
                    onChange={(e) => setNewReport({ ...newReport, reportDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Assigned Territory Visited <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newReport.areaId}
                    onChange={(e) => setNewReport({ ...newReport, areaId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                  >
                    {assignedAreas.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-2xl">
                <div>
                  <label className="block font-bold text-gray-700 text-[11px] mb-1">Shops Visited</label>
                  <input
                    type="number"
                    min={0}
                    value={newReport.shopsVisitedCount}
                    onChange={(e) => setNewReport({ ...newReport, shopsVisitedCount: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 text-[11px] mb-1">New Contacted</label>
                  <input
                    type="number"
                    min={0}
                    value={newReport.sellersContactedCount}
                    onChange={(e) => setNewReport({ ...newReport, sellersContactedCount: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 text-[11px] mb-1">Registered</label>
                  <input
                    type="number"
                    min={0}
                    value={newReport.sellersRegisteredCount}
                    onChange={(e) => setNewReport({ ...newReport, sellersRegisteredCount: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 text-[11px] mb-1">Interested</label>
                  <input
                    type="number"
                    min={0}
                    value={newReport.interestedSellersCount}
                    onChange={(e) => setNewReport({ ...newReport, interestedSellersCount: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 text-[11px] mb-1">Follow-ups</label>
                  <input
                    type="number"
                    min={0}
                    value={newReport.followUpsCompletedCount}
                    onChange={(e) => setNewReport({ ...newReport, followUpsCompletedCount: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 text-[11px] mb-1">Conversions</label>
                  <input
                    type="number"
                    min={0}
                    value={newReport.conversionsCount}
                    onChange={(e) => setNewReport({ ...newReport, conversionsCount: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Major Achievements</label>
                <textarea
                  rows={2}
                  placeholder="Key progress, interested wholesalers, deals closed..."
                  value={newReport.majorAchievements}
                  onChange={(e) => setNewReport({ ...newReport, majorAchievements: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Problems Faced</label>
                <textarea
                  rows={2}
                  placeholder="Price resistance, competitor pricing, delivery delay complaints..."
                  value={newReport.problemsFaced}
                  onChange={(e) => setNewReport({ ...newReport, problemsFaced: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tomorrow's Plan</label>
                <textarea
                  rows={2}
                  placeholder="Target market area, scheduled follow-ups..."
                  value={newReport.tomorrowPlan}
                  onChange={(e) => setNewReport({ ...newReport, tomorrowPlan: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[#064D2B]"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDailyReportModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReport}
                  className="px-5 py-2 bg-[#064D2B] hover:bg-[#053d22] text-white rounded-xl font-bold shadow flex items-center gap-1.5"
                >
                  {submittingReport ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  Submit For Admin Approval (+5 Pts)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: SELLER PROFILE DOSSIER */}
      {selectedSellerDetails && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Store size={22} className="text-[#064D2B]" />
                <h3 className="font-extrabold text-lg text-gray-900">{selectedSellerDetails.shopName}</h3>
              </div>
              <button
                onClick={() => setSelectedSellerDetails(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl">
                <div>
                  <span className="text-gray-500 block text-[10px]">Owner Name</span>
                  <span className="font-bold text-gray-900">{selectedSellerDetails.ownerName || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Mobile Number</span>
                  <span className="font-bold text-gray-900">{selectedSellerDetails.mobileNumber}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Assigned Territory</span>
                  <span className="font-bold text-gray-900">{selectedSellerDetails.area?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Business Type</span>
                  <span className="font-bold text-gray-900">{selectedSellerDetails.businessType}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-500 block text-[10px]">Current Conversion Stage</span>
                <div className="mt-1">{getStageBadge(selectedSellerDetails.conversionStage)}</div>
              </div>

              <div>
                <span className="text-gray-500 block text-[10px]">Verified Purchases</span>
                <div className="mt-1 flex items-center gap-4">
                  <span className="text-base font-black text-[#064D2B]">
                    {fmt(selectedSellerDetails.totalPurchaseAmount)}
                  </span>
                  <span className="text-xs text-gray-600 font-bold">
                    {selectedSellerDetails.ordersCount || 0} Total Orders
                  </span>
                </div>
              </div>

              {selectedSellerDetails.shopAddress && (
                <div>
                  <span className="text-gray-500 block text-[10px]">Shop Address</span>
                  <span className="text-gray-700">{selectedSellerDetails.shopAddress}</span>
                </div>
              )}

              {selectedSellerDetails.notes && (
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                  <span className="text-emerald-900 font-bold block text-[10px] mb-0.5">Notes:</span>
                  <span className="text-emerald-800">{selectedSellerDetails.notes}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedSellerDetails(null)}
                className="px-5 py-2 bg-[#064D2B] text-white rounded-xl font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
