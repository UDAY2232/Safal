import React, { useState, useEffect } from 'react';
import {
  FileText,
  Hourglass,
  CheckCircle2,
  Coins,
  Search,
  Calendar,
  Filter,
  ArrowRight,
  TrendingUp,
  Download,
  Plus,
  ShoppingCart,
  ArrowDownToLine,
  SlidersHorizontal,
  CreditCard,
  AlertCircle,
  Clock,
  User,
  MapPin,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PurchaseOrder } from '../types';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { PODetailModal } from '../components/PODetailModal';
import { POFinancialsModal } from '../components/POFinancialsModal';
import { CreatePOModal } from '../components/CreatePOModal';
import { SubmitDuePaymentModal } from '../components/SubmitDuePaymentModal';
import { AddDuePOModal } from '../components/AddDuePOModal';

interface PurchaseOrdersPageProps {
  onNotify: (msg: string) => void;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  mode?: 'PO' | 'CD';
}

export const PurchaseOrdersPage: React.FC<PurchaseOrdersPageProps> = ({
  onNotify,
  showCreateModal,
  setShowCreateModal,
  mode,
}) => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE';
  const isAdmin = user?.role === 'ADMIN';
  const isAccountant = user?.role === 'ACCOUNTANT';
  const isCD = mode === 'CD' || isEmployee;

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState('All');
  const [financialStatus, setFinancialStatus] = useState('All');
  const [viewMode, setViewMode] = useState<'reference' | 'financial'>('reference');
  const [activeSection, setActiveSection] = useState<'all' | 'due'>('all');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [financialPO, setFinancialPO] = useState<PurchaseOrder | null>(null);
  const [duePaymentPO, setDuePaymentPO] = useState<PurchaseOrder | null>(null);
  const [showAddDueModal, setShowAddDueModal] = useState(false);

  const loadOrders = async () => {
    try {
      setLoading(true);
      let query = '?';
      if (status !== 'All') query += `status=${status}&`;
      if (financialStatus !== 'All') query += `financialStatus=${financialStatus}&`;
      if (search) query += `search=${encodeURIComponent(search)}&`;
      if (fromDate) query += `fromDate=${encodeURIComponent(fromDate)}&`;
      if (toDate) query += `toDate=${encodeURIComponent(toDate)}&`;
      if (isEmployee) {
        query += `myOrders=true&type=CD&`;
      } else if (isCD) {
        query += `type=CD&`;
      } else {
        query += `type=PO&`;
      }

      const list = await api.getPurchaseOrders(query);
      const scopedList = isEmployee ? list.filter((o: any) => o.createdById === user?.id) : list;
      setOrders(scopedList);
    } catch (err: any) {
      onNotify(err.message || 'Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [status, financialStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const handleExportCSV = async () => {
    try {
      await api.downloadReportCSV('purchase-orders');
      onNotify('Purchase orders report downloaded as CSV');
    } catch {
      onNotify('Failed to download report');
    }
  };

  // Calculations for All POs (Strict Rule: If due is pending > 0, status is OPEN!)
  const totalAmount = orders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
  const openCount = orders.filter((o) => {
    const adv = Number(o.advanceAmount || 0);
    const pend = Number(o.pendingAmount ?? Math.max(0, Number(o.grandTotal) - adv));
    return pend > 0 || o.status === 'OPEN';
  }).length;
  const closedCount = orders.filter((o) => {
    const adv = Number(o.advanceAmount || 0);
    const pend = Number(o.pendingAmount ?? Math.max(0, Number(o.grandTotal) - adv));
    return pend <= 0 && o.status === 'CLOSED';
  }).length;

  // 1-Day Window Grace Period for Customer Dues (CD):
  // Employee creates CD with 1-day time to settle. If not closed within 1 day (24 hours), it automatically moves into Due CD Tracker!
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  const dueOrders = orders.filter((o) => {
    const adv = Number(o.advanceAmount || 0);
    const pend = Number(o.pendingAmount ?? Math.max(0, Number(o.grandTotal) - adv));
    if (pend <= 0) return false;

    if (isCD) {
      const orderTime = new Date(o.poDate || o.createdAt).getTime();
      const isOverOneDay = (Date.now() - orderTime) >= ONE_DAY_MS;
      return isOverOneDay;
    }
    return true;
  });

  // Active CDs still within the 1-day grace period
  const activeGraceCDs = isCD ? orders.filter((o) => {
    const adv = Number(o.advanceAmount || 0);
    const pend = Number(o.pendingAmount ?? Math.max(0, Number(o.grandTotal) - adv));
    if (pend <= 0) return false;
    const orderTime = new Date(o.poDate || o.createdAt).getTime();
    return (Date.now() - orderTime) < ONE_DAY_MS;
  }) : [];

  const totalDueAmount = dueOrders.reduce((sum, o) => {
    const adv = Number(o.advanceAmount || 0);
    const pend = Number(o.pendingAmount ?? Math.max(0, Number(o.grandTotal) - adv));
    return sum + pend;
  }, 0);

  const totalCompletedAmount = dueOrders.reduce((sum, o) => sum + Number(o.advanceAmount || 0), 0);
  const totalDueCommitment = dueOrders.reduce((sum, o) => sum + Number(o.grandTotal), 0);

  return (
    <div className="space-y-5">
      {/* 1. Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#E7F5E9] rounded-xl text-[#064D2B]">
              <ShoppingCart size={26} strokeWidth={2.4} />
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#064D2B] font-['Manrope'] tracking-tight">
              {isCD ? (isEmployee ? 'My Customer Dues (CD)' : 'Customer Due (CD) Management') : 'Purchase Order (PO) Management'}
            </h1>
          </div>
          {/* Green accent underline bar */}
          <div className="h-1 w-64 bg-[#087A3E] rounded-full mt-2 ml-1" />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Enter Due PO / CD Button: REMOVED for CD as requested */}
          {!isCD && (
            <button
              type="button"
              onClick={() => {
                setActiveSection('due');
                setShowAddDueModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-sm font-bold rounded-xl shadow-md transition"
              title="Record an existing / pre-software PO with pending dues"
            >
              <Plus size={18} /> Record Due PO
            </button>
          )}

          {/* Direct Settle Due POs / CDs Button */}
          <button
            onClick={() => {
              setActiveSection('due');
              if (dueOrders.length === 1) {
                setDuePaymentPO(dueOrders[0]);
              }
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-xs transition border ${
              activeSection === 'due'
                ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-200'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <CreditCard size={17} />
            <span>{isCD ? 'Due CD Tracker' : 'Due Tracker'}</span>
            {dueOrders.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-rose-600 text-white font-extrabold ml-0.5">
                {dueOrders.length}
              </span>
            )}
          </button>

          {/* Create CD / PO Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white text-sm font-bold rounded-xl shadow-md transition"
          >
            <Plus size={18} /> {isCD ? 'Create CD [Customer Due]' : 'Create PO'}
          </button>
        </div>
      </div>

      {/* Primary Section Switcher Tabs: All POs / CDs vs Due Tracker */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-[#D5E3D8] shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSection === 'all'
                ? 'bg-[#064D2B] text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ShoppingCart size={15} /> {isCD ? `All Customer Dues (${orders.length})` : `All Purchase Orders (${orders.length})`}
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('due')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSection === 'due'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <CreditCard size={15} /> {isCD ? 'Due CDs Section' : 'Due POs Section'}
            {dueOrders.length > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white">
                {dueOrders.length}
              </span>
            )}
          </button>
        </div>

        {activeSection === 'due' && (
          <div className="text-xs text-rose-800 font-bold px-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Total Outstanding Due: <strong>₹{totalDueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
          </div>
        )}
      </div>

      {/* 2. Stat Cards Dynamic Based on Section */}
      {activeSection === 'all' ? (
        /* ALL POs STAT CARDS */
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4">
          <div className="stat-card blue flex items-center gap-3.5 p-4 rounded-2xl bg-[#EEF5FF] border border-[#D4E5FB]">
            <div className="w-12 h-12 rounded-xl bg-[#DCEBFF] flex items-center justify-center text-[#1564B7] flex-shrink-0">
              <FileText size={24} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#1E293B] block">
                {isCD ? (isEmployee ? 'My Total CDs' : 'Total Customer Dues (CD)') : 'Total PO'}
              </span>
              <strong className="text-2xl lg:text-3xl font-black text-[#0F172A] font-['Manrope'] block mt-0.5">
                {orders.length}
              </strong>
            </div>
          </div>

          <div className="stat-card green flex items-center gap-3.5 p-4 rounded-2xl bg-[#EAF8EE] border border-[#CEEED7]">
            <div className="w-12 h-12 rounded-xl bg-[#CEF2D8] flex items-center justify-center text-[#15813E] flex-shrink-0">
              <Hourglass size={24} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#1E293B] block">
                {isCD ? (isEmployee ? 'Within 1-Day Window' : 'Due Today (<1 Day Grace)') : 'Open PO'}
              </span>
              <strong className="text-2xl lg:text-3xl font-black text-[#064D2B] font-['Manrope'] block mt-0.5">
                {isCD ? activeGraceCDs.length : openCount}
              </strong>
            </div>
          </div>

          <div className="stat-card rose flex items-center gap-3.5 p-4 rounded-2xl bg-[#FEEFEF] border border-[#FCD8D8]">
            <div className="w-12 h-12 rounded-xl bg-[#FFDADA] flex items-center justify-center text-[#D32F2F] flex-shrink-0">
              <CreditCard size={24} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#1E293B] block">
                {isCD ? (isEmployee ? 'Due CD Tracker (>1 Day)' : 'Due Tracker (>1 Day Overdue)') : 'Closed PO'}
              </span>
              <strong className="text-2xl lg:text-3xl font-black text-[#991B1B] font-['Manrope'] block mt-0.5">
                {isCD ? dueOrders.length : closedCount}
              </strong>
            </div>
          </div>

          <div className="stat-card gold flex items-center gap-3.5 p-4 rounded-2xl bg-[#FEF9E6] border border-[#FCEBB5]">
            <div className="w-12 h-12 rounded-xl bg-[#FEEBB0] flex items-center justify-center text-[#B68100] flex-shrink-0">
              <Coins size={24} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-[#1E293B] block">
                {isCD ? (isEmployee ? 'My Total CD Amount' : 'Total CD Amount') : 'Total PO Amount'}
              </span>
              <strong className="text-xl lg:text-2xl xl:text-3xl font-black text-[#1F2937] font-['Manrope'] block mt-0.5 truncate">
                ₹ {totalAmount.toLocaleString('en-IN')}
              </strong>
            </div>
          </div>
        </section>
      ) : (
        /* DUE POs DEDICATED STAT CARDS (Avaru thiskunaru, Due antha undhi, Antha complete chesaru) */
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4">
          {/* Card 1: Due POs Count */}
          <div className="stat-card blue flex items-center gap-3.5 p-4 rounded-2xl bg-[#FFF5F5] border border-[#FED7D7]">
            <div className="w-12 h-12 rounded-xl bg-[#FEE2E2] flex items-center justify-center text-rose-700 flex-shrink-0">
              <CreditCard size={24} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-gray-700 block">Pending Due Orders</span>
              <strong className="text-2xl lg:text-3xl font-black text-rose-800 font-['Manrope'] block mt-0.5">
                {dueOrders.length}
              </strong>
              <small className="text-[10px] text-gray-500">Orders requiring settlement</small>
            </div>
          </div>

          {/* Card 2: Total Due Balance */}
          <div className="stat-card rose flex items-center gap-3.5 p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5]">
            <div className="w-12 h-12 rounded-xl bg-[#FEE2E2] flex items-center justify-center text-red-600 flex-shrink-0">
              <AlertCircle size={24} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-red-900 block">Pending Due Balance</span>
              <strong className="text-xl lg:text-2xl font-black text-red-700 font-['Manrope'] block mt-0.5 truncate">
                ₹{totalDueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
              <small className="text-[10px] text-red-600 font-semibold">Total outstanding due balance</small>
            </div>
          </div>

          {/* Card 3: Advance Paid */}
          <div className="stat-card green flex items-center gap-3.5 p-4 rounded-2xl bg-[#EAF8EE] border border-[#CEEED7]">
            <div className="w-12 h-12 rounded-xl bg-[#CEF2D8] flex items-center justify-center text-[#15813E] flex-shrink-0">
              <CheckCircle2 size={24} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-emerald-900 block">Advance Paid / Cleared</span>
              <strong className="text-xl lg:text-2xl font-black text-[#064D2B] font-['Manrope'] block mt-0.5 truncate">
                ₹{totalCompletedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
              <small className="text-[10px] text-emerald-700 font-semibold">Cleared / Paid upfront</small>
            </div>
          </div>

          {/* Card 4: Total Commitment */}
          <div className="stat-card gold flex items-center gap-3.5 p-4 rounded-2xl bg-[#FEF9E6] border border-[#FCEBB5]">
            <div className="w-12 h-12 rounded-xl bg-[#FEEBB0] flex items-center justify-center text-[#B68100] flex-shrink-0">
              <Coins size={24} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-gray-800 block">
                {isCD ? 'Total Due CD Value' : 'Total Due PO Value'}
              </span>
              <strong className="text-xl lg:text-2xl font-black text-gray-900 font-['Manrope'] block mt-0.5 truncate">
                ₹{totalDueCommitment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </strong>
              <small className="text-[10px] text-gray-500">Gross total commitment</small>
            </div>
          </div>
        </section>
      )}

      {/* 3. Search & Filter Bar */}
      <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search PO Number / Supplier */}
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#CBD9CE] rounded-xl text-xs text-[#274837] focus-within:border-[#087A3E] focus-within:ring-2 focus-within:ring-emerald-100 transition">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isCD ? "Search CD Number / Customer / Buyer / Employee" : "Search PO Number / Supplier / Order Person"}
              className="w-full bg-transparent outline-none text-xs text-gray-800 placeholder-gray-400 font-medium"
            />
          </div>

          {/* Date Range: From Date -> To Date */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-[#CBD9CE] rounded-xl text-xs text-gray-600">
            <Calendar size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent outline-none text-xs text-gray-700 font-medium"
              placeholder="From Date"
              title="From Date"
            />
            <ArrowRight size={13} className="text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent outline-none text-xs text-gray-700 font-medium"
              placeholder="To Date"
              title="To Date"
            />
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#CBD9CE] rounded-xl text-xs text-gray-700 min-w-[150px]">
            <span className="font-semibold text-gray-500 whitespace-nowrap">Status :</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-transparent outline-none font-bold text-gray-800 flex-1 cursor-pointer"
            >
              <option value="All">All</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {/* Search Button */}
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
          >
            <Search size={15} /> Search
          </button>
        </form>

        {/* View Toggle Bar & Export */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">View Style:</span>
            <button
              onClick={() => setViewMode('reference')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                viewMode === 'reference'
                  ? 'bg-[#087A3E] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Standard (Reference View)
            </button>
            <button
              onClick={() => setViewMode('financial')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                viewMode === 'financial'
                  ? 'bg-[#087A3E] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Extended Financial P&amp;L View
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              Showing <strong>{activeSection === 'due' ? dueOrders.length : orders.length}</strong> {isCD ? 'customer dues' : 'purchase orders'}
            </span>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#087A3E] border border-emerald-200 rounded-lg text-xs font-bold transition"
            >
              <ArrowDownToLine size={14} /> Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* 4. Main Tables: Either Due POs Section OR All POs Table */}
      {activeSection === 'due' ? (
        /* DEDICATED DUE POs SECTION (Supplier, Due Balance, Advance Paid, Submit Due Payment) */
        <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-rose-50/80 via-amber-50/50 to-emerald-50/40 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="text-rose-700" size={20} />
                <h2 className="text-base font-black text-gray-900">
                  {isCD ? 'Due CD Tracker' : 'Due POs Settlement Tracker'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  {dueOrders.length} {isCD ? 'Due CDs' : 'Dues'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {isCD
                  ? 'Customer & staff details, payment received, and pending due balance. Click Submit Due Payment to record settlements.'
                  : 'Supplier & staff details, advance paid, and pending balance. Click Submit Due Payment to record settlements.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <span className="px-3.5 py-1.5 bg-rose-700 text-white rounded-xl text-xs font-black shadow-xs">
                Total Due: ₹{totalDueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              {!isCD && (
                <button
                  type="button"
                  onClick={() => setShowAddDueModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  <Plus size={14} /> + Record Due PO
                </button>
              )}
            </div>
          </div>

          <div className="table-scroll-wrap overflow-x-auto w-full">
            <table className="w-full border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-[#064D2B] text-white">
                  <th className="py-3 px-3 text-center text-xs font-bold w-12 border-r border-[#085A33]">S.No.</th>
                  <th className="py-3 px-4 text-center text-xs font-bold border-r border-[#085A33]">
                    {isCD ? 'CD Number' : 'PO Number'}
                  </th>
                  <th className="py-3 px-5 text-left text-xs font-bold border-r border-[#085A33]">
                    {isCD ? 'Customer & Staff' : 'Supplier & Staff'}
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-bold border-r border-[#085A33]">Order Date</th>
                  <th className="py-3 px-4 text-right text-xs font-bold border-r border-[#085A33]">
                    {isCD ? 'Total CD Value' : 'Total PO Value'}
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-bold border-r border-[#085A33]">
                    {isCD ? 'Payed Amount' : 'Advance Paid'}
                  </th>
                  <th className="py-3 px-4 text-right text-xs font-bold border-r border-[#085A33]">
                    {isCD ? 'Pending CD Balance' : 'Pending Due Balance'}
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-bold border-r border-[#085A33]">Status</th>
                  <th className="py-3 px-4 text-center text-xs font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs">
                {dueOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14 text-gray-500">
                      <CreditCard size={38} className="mx-auto text-rose-500 mb-2" />
                      <p className="font-bold text-gray-800 text-sm">
                        {isCD ? 'No Overdue Customer Dues (>1 Day)' : 'No Pending Dues Recorded Yet'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {isCD
                          ? 'Customer Dues exceeding the 1-day settlement period will appear here automatically.'
                          : 'Record pre-existing or offline due purchase orders into the tracker.'}
                      </p>
                      {!isCD && (
                        <button
                          type="button"
                          onClick={() => setShowAddDueModal(true)}
                          className="mt-3.5 inline-flex items-center gap-2 px-4 py-2 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold text-xs shadow-md transition"
                        >
                          <Plus size={15} /> + Record Due PO
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  dueOrders.map((order, index) => {
                    const grand = Number(order.grandTotal);
                    const adv = Number(order.advanceAmount || 0);
                    const pending = Number(order.pendingAmount ?? Math.max(0, grand - adv));
                    const pct = grand > 0 ? Math.min(100, Math.round((adv / grand) * 100)) : 100;

                    return (
                      <tr key={order.id} className="hover:bg-rose-50/25 transition">
                        <td className="text-center py-3.5 px-3 font-bold text-gray-600 border-r border-gray-100">
                          {index + 1}
                        </td>
                        <td className="text-center py-3.5 px-4 font-black text-[#087A3E] border-r border-gray-100 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedPO(order)}
                            className="hover:underline font-extrabold"
                            title="View Full PO Dossier"
                          >
                            {order.poNumber}
                          </button>
                        </td>
                        <td className="py-3.5 px-5 border-r border-gray-100">
                          <div className="font-bold text-gray-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>{order.supplierName}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-1">
                            <span className="font-semibold text-gray-700">{order.createdByName}</span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                              📍 {order.orderPersonPlace || 'Hyderabad'}
                            </span>
                          </div>
                        </td>
                        <td className="text-center py-3.5 px-4 text-gray-600 border-r border-gray-100 font-medium whitespace-nowrap">
                          {new Date(order.poDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="text-right py-3.5 px-4 font-bold text-gray-900 border-r border-gray-100 whitespace-nowrap">
                          ₹{grand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="text-right py-3.5 px-4 border-r border-gray-100 whitespace-nowrap">
                          <div className="font-bold text-[#087A3E]">
                            ₹{adv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700">{pct}%</span>
                          </div>
                        </td>
                        <td className="text-right py-3.5 px-4 border-r border-gray-100 whitespace-nowrap">
                          <span className="inline-block px-3 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
                            ₹{pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="text-center py-3.5 px-4 border-r border-gray-100 whitespace-nowrap">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="text-center py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDuePaymentPO(order)}
                              className="px-3 py-1.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-lg font-bold text-xs shadow-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                              title="Submit Due Payment for this PO"
                            >
                              <CreditCard size={13} /> Submit Due Payment
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedPO(order)}
                              className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="View Details"
                            >
                              <FileText size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* MASTER PURCHASE ORDER TABLE (All POs) */
        <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm overflow-hidden">
          {viewMode === 'reference' ? (
            /* STANDARD REFERENCE VIEW */
            <div className="table-scroll-wrap overflow-x-auto w-full">
              <table className="w-full border-collapse min-w-[920px]">
                <thead>
                  <tr className="bg-[#064D2B] text-white">
                    <th className="text-center py-3.5 px-3 font-bold text-xs uppercase tracking-wider w-12 border-r border-[#085A33]">
                      S.No.
                    </th>
                    <th className="text-center py-3.5 px-4 font-bold text-xs uppercase tracking-wider border-r border-[#085A33]">
                      {isCD ? 'CD (Customer Due)' : 'PO (Purchase Order)'}
                    </th>
                    <th className="text-center py-3.5 px-4 font-bold text-xs uppercase tracking-wider border-r border-[#085A33]">
                      {isCD ? 'Buyer / Customer & Area' : 'Supplier & Area'}
                    </th>
                    <th className="text-center py-3.5 px-4 font-bold text-xs uppercase tracking-wider border-r border-[#085A33]">
                      {isCD ? 'Employee (Staff)' : 'Created By'}
                    </th>
                    <th className="text-center py-3.5 px-3 font-bold text-xs uppercase tracking-wider border-r border-[#085A33]">
                      Date
                    </th>
                    <th className="text-center py-3.5 px-4 font-bold text-xs uppercase tracking-wider border-r border-[#085A33]">
                      {isCD ? 'CD Amount (₹)' : 'PO Amount (₹)'}
                    </th>
                    <th className="text-center py-3.5 px-4 font-bold text-xs uppercase tracking-wider border-r border-[#085A33]">
                      Due Amount (₹)
                    </th>
                    <th className="text-center py-3.5 px-4 font-bold text-xs uppercase tracking-wider border-r border-[#085A33]">
                      Status
                    </th>
                    <th className="text-center py-3.5 px-4 font-bold text-xs uppercase tracking-wider">
                      Settlement / Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-gray-400 text-xs">
                        {isCD ? 'No customer dues (CD) found matching criteria.' : 'No purchase orders found matching criteria.'}
                      </td>
                    </tr>
                  ) : (
                    orders.map((order, index) => {
                      const isPending = order.status === 'PENDING_APPROVAL' || order.status === 'DRAFT';
                      const adv = Number(order.advanceAmount || 0);
                      const pendingDue = Number(order.pendingAmount ?? Math.max(0, Number(order.grandTotal) - adv));
                      // Strict Business Rule: Closed ONLY when pendingDue <= 0. If even 1 rupee is pending, status MUST BE OPEN!
                      const isClosed = !isPending && pendingDue <= 0 && order.status === 'CLOSED';

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-[#F4F9F5] transition cursor-pointer text-xs"
                          onClick={() => setSelectedPO(order)}
                          title="Click to view full order dossier & line items"
                        >
                          <td className="text-center py-3 px-3 font-bold text-gray-700 border-r border-gray-200">
                            {index + 1}
                          </td>
                          <td className="text-center py-3 px-4 font-extrabold text-[#087A3E] border-r border-gray-200 whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPO(order);
                              }}
                              className="hover:underline"
                            >
                              {order.poNumber}
                            </button>
                          </td>
                          {/* Buyer / Customer & Area */}
                          <td className="text-center py-3 px-4 text-gray-800 border-r border-gray-200">
                            <span className="font-bold text-gray-900 block truncate" title={order.supplierName}>
                              {order.supplierName || (isCD ? 'Retail Customer' : 'Supplier')}
                            </span>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              📍 {order.orderPersonPlace || 'Warangal'}
                            </span>
                          </td>
                          {/* Employee (Staff) */}
                          <td className="text-center py-3 px-4 border-r border-gray-200 whitespace-nowrap">
                            <span className="font-bold text-[#064D2B] block truncate" title={order.createdByName}>
                              {order.createdByName || 'Staff'}
                            </span>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase">
                              {isCD ? 'Employee' : 'Creator'}
                            </span>
                          </td>
                          <td className="text-center py-3 px-3 font-medium text-gray-700 border-r border-gray-200 whitespace-nowrap">
                            {new Date(order.poDate).toLocaleDateString('en-GB')}
                          </td>
                          <td className="text-center py-3 px-4 font-extrabold text-gray-900 border-r border-gray-200 whitespace-nowrap">
                            <div>₹{order.grandTotal.toLocaleString('en-IN')}</div>
                          </td>
                          <td className="text-center py-3 px-4 border-r border-gray-200 whitespace-nowrap">
                            {pendingDue > 0 ? (
                              <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200 shadow-xs">
                                ₹{pendingDue.toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ₹0 (Cleared)
                              </span>
                            )}
                            {order.paymentProofUrl && (
                              <div className="mt-1">
                                <a
                                  href={order.paymentProofUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 transition"
                                  title="View Uploaded Payment Proof"
                                >
                                  <FileText size={11} /> Proof Attached
                                </a>
                              </div>
                            )}
                          </td>
                          <td className="text-center py-3 px-4 border-r border-gray-200">
                            {isClosed ? (
                              <span className="inline-block px-5 py-1 rounded-full text-xs font-bold bg-[#D8F6D4] text-[#1E7438] border border-[#BCECC5] shadow-xs">
                                Closed
                              </span>
                            ) : pendingDue === 0 ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                  {isAdmin ? 'Ready to Close' : 'Awaiting Close'}
                                </span>
                                {order.paymentProofUrl ? (
                                  <span className="text-[10px] text-emerald-700 font-bold">Proof Verified ✓</span>
                                ) : (
                                  <span className="text-[10px] text-gray-500 font-medium">Due Cleared</span>
                                )}
                              </div>
                            ) : isCD ? (
                              (() => {
                                const orderTime = new Date(order.poDate || order.createdAt).getTime();
                                const isOverOneDay = (Date.now() - orderTime) >= ONE_DAY_MS;
                                return isOverOneDay ? (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="px-3 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                                      Due Tracker
                                    </span>
                                    <span className="text-[10px] text-rose-600 font-bold">&gt;1 Day Overdue</span>
                                  </div>
                                ) : (
                                  <div className="inline-flex flex-col items-center">
                                    <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                                      Due Today
                                    </span>
                                    <span className="text-[10px] text-emerald-700 font-semibold">1-Day Window</span>
                                  </div>
                                );
                              })()
                            ) : isPending ? (
                              <span className="inline-block px-4 py-1 rounded-full text-xs font-bold bg-[#FFF2C9] text-[#986B0C] border border-[#FBE39A]">
                                Pending
                              </span>
                            ) : (
                              <span className="inline-block px-5 py-1 rounded-full text-xs font-bold bg-[#FFE0DF] text-[#C53030] border border-[#FDC4C4] shadow-xs">
                                Open
                              </span>
                            )}
                          </td>
                          <td className="text-center py-3 px-4 border-l border-gray-200 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {pendingDue > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setDuePaymentPO(order)}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                  title="Submit Due Payment"
                                >
                                  <CreditCard size={12} /> Pay Due
                                </button>
                              )}
                              {pendingDue === 0 && !isClosed && isAdmin && (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      onNotify(`Closing ${order.poNumber}...`);
                                      await api.closePurchaseOrder(order.id);
                                      onNotify(`Customer Due ${order.poNumber} verified and formally CLOSED!`);
                                      loadOrders();
                                    } catch (err: any) {
                                      alert(err.message || 'Failed to close CD');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition shadow-xs cursor-pointer"
                                  title="Approve proof and close CD"
                                >
                                  <CheckCircle2 size={12} /> Close CD
                                </button>
                              )}
                              {order.paymentProofUrl && (
                                <a
                                  href={order.paymentProofUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#087A3E] border border-emerald-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                  title="View Uploaded Payment Proof"
                                >
                                  <FileText size={12} /> Proof
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    onNotify(`Downloading ${order.poNumber} PDF...`);
                                    await api.downloadPurchaseOrderPDF(order.id, order.poNumber);
                                    onNotify(`Order ${order.poNumber} PDF downloaded!`);
                                  } catch (err: any) {
                                    window.open(api.downloadPOPDFUrl(order.id), '_blank');
                                  }
                                }}
                                className="px-2 py-1 bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 hover:border-emerald-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                title="Download PDF"
                              >
                                <Download size={13} /> PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* EXTENDED FINANCIAL AUDIT & P&L VIEW */
            <div className="table-scroll-wrap overflow-x-auto w-full">
              <table className="w-full border-collapse min-w-[980px]">
                <thead>
                  <tr className="bg-[#064D2B] text-white">
                    <th className="py-3 px-3 text-left font-bold text-xs">S.No.</th>
                    <th className="py-3 px-3 text-left font-bold text-xs">PO Number</th>
                    <th className="py-3 px-3 text-left font-bold text-xs">Supplier</th>
                    <th className="py-3 px-3 text-left font-bold text-xs">PO Date</th>
                    <th className="py-3 px-3 text-left font-bold text-xs">Created By</th>
                    <th className="py-3 px-3 text-left font-bold text-xs">PO Amount</th>
                    <th className="py-3 px-3 text-left font-bold text-xs">Verified Cost</th>
                    <th className="py-3 px-3 text-left font-bold text-xs">Linked Revenue</th>
                    <th className="py-3 px-3 text-left font-bold text-xs">Profit / Loss</th>
                    <th className="py-3 px-3 text-left font-bold text-xs">Fin. Status</th>
                    <th className="py-3 px-3 text-left font-bold text-xs">PO Status</th>
                    <th className="py-3 px-3 text-center font-bold text-xs">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-10 text-gray-400 font-medium">
                        No purchase orders recorded yet. Click "+ Create Purchase Order" to begin.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order, index) => {
                      const profitLoss = order.financial.realizedProfitLoss;
                      const adv = Number(order.advanceAmount || 0);
                      const pendingDue = Number(order.pendingAmount ?? Math.max(0, Number(order.grandTotal) - adv));

                      return (
                        <tr key={order.id} className="hover:bg-emerald-50/20 text-xs">
                          <td className="py-3 px-3 text-gray-500 font-bold">{index + 1}</td>
                          <td className="py-3 px-3">
                            <button
                              className="font-bold text-[#087A3E] hover:underline"
                              onClick={() => setSelectedPO(order)}
                            >
                              {order.poNumber}
                            </button>
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-800">{order.supplierName}</td>
                          <td className="py-3 px-3 text-gray-600">
                            {new Date(order.poDate).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-3 px-3 text-gray-600">{order.createdByName}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-900">₹{order.grandTotal.toLocaleString('en-IN')}</div>
                            <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                              <span className="text-emerald-700 font-semibold">Adv: ₹{adv.toLocaleString('en-IN')}</span>
                              {' • '}
                              <span className="text-amber-800 font-semibold">Due: ₹{pendingDue.toLocaleString('en-IN')}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-gray-700">
                            {order.financial.verifiedCost !== null
                              ? `₹${order.financial.verifiedCost.toLocaleString('en-IN')}`
                              : 'Pending'}
                          </td>
                          <td className="py-3 px-3 text-gray-700">
                            {order.financial.linkedRevenue !== null
                              ? `₹${order.financial.linkedRevenue.toLocaleString('en-IN')}`
                              : 'Pending'}
                          </td>
                          <td className="py-3 px-3">
                            {profitLoss !== null ? (
                              <strong className={profitLoss >= 0 ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>
                                {profitLoss >= 0 ? '+' : ''}₹{profitLoss.toLocaleString('en-IN')}
                              </strong>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={order.financial.financialStatus} />
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={pendingDue > 0 ? 'OPEN' : order.status} />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {pendingDue > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setDuePaymentPO(order)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                  title="Submit Due Payment"
                                >
                                  <CreditCard size={12} /> Pay Due
                                </button>
                              )}
                              {pendingDue === 0 && order.status !== 'CLOSED' && isAdmin && (
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      onNotify(`Closing ${order.poNumber}...`);
                                      await api.closePurchaseOrder(order.id);
                                      onNotify(`Order ${order.poNumber} verified and CLOSED!`);
                                      loadOrders();
                                    } catch (err: any) {
                                      alert(err.message || 'Failed to close order');
                                    }
                                  }}
                                  className="px-2 py-1 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition shadow-xs cursor-pointer"
                                  title="Approve & Close"
                                >
                                  <CheckCircle2 size={12} /> Close
                                </button>
                              )}
                              {order.paymentProofUrl && (
                                <a
                                  href={order.paymentProofUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#087A3E] border border-emerald-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                  title="View Uploaded Payment Proof"
                                >
                                  <FileText size={12} /> Proof
                                </a>
                              )}
                              <button
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                onClick={() => setFinancialPO(order)}
                                title="Update Verified Profit / Loss"
                              >
                                <TrendingUp size={12} /> P&amp;L
                              </button>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    onNotify(`Downloading PDF for ${order.poNumber}...`);
                                    await api.downloadPurchaseOrderPDF(order.id, order.poNumber);
                                    onNotify(`Order ${order.poNumber} PDF downloaded successfully!`);
                                  } catch (err: any) {
                                    window.open(api.downloadPOPDFUrl(order.id), '_blank');
                                  }
                                }}
                                className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                title="Download PDF"
                              >
                                <Download size={12} /> PDF
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer info note */}
          <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-500 gap-2">
            <span>
              💡 Click on any purchase order row to view fruit line items, supplier contacts, invoice receipts, and print official PDF.
            </span>
            <div className="flex items-center gap-1 font-semibold text-gray-600">
              <span>Page 1 of 1</span>
            </div>
          </div>
        </section>
      )}

      {/* Detail Modal */}
      {selectedPO && (
        <PODetailModal
          order={selectedPO}
          onClose={() => setSelectedPO(null)}
          onRefresh={loadOrders}
          onNotify={onNotify}
          onOpenDuePayment={(po) => setDuePaymentPO(po)}
        />
      )}

      {/* Financials Modal */}
      {financialPO && (
        <POFinancialsModal
          order={financialPO}
          onClose={() => setFinancialPO(null)}
          onSuccess={(msg) => {
            onNotify(msg);
            loadOrders();
          }}
        />
      )}

      {/* Submit Due Payment Modal */}
      {duePaymentPO && (
        <SubmitDuePaymentModal
          order={duePaymentPO}
          onClose={() => setDuePaymentPO(null)}
          onSuccess={(msg) => {
            onNotify(msg);
            loadOrders();
          }}
        />
      )}

      {/* Enter / Add Pre-Existing Due PO / CD Modal */}
      {showAddDueModal && (
        <AddDuePOModal
          mode={isCD ? 'CD' : 'PO'}
          onClose={() => setShowAddDueModal(false)}
          onSuccess={(msg) => {
            onNotify(msg);
            loadOrders();
          }}
        />
      )}
    </div>
  );
};
