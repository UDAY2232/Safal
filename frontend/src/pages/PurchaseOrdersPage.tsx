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
} from 'lucide-react';
import { api } from '../services/api';
import { PurchaseOrder } from '../types';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { PODetailModal } from '../components/PODetailModal';
import { POFinancialsModal } from '../components/POFinancialsModal';
import { CreatePOModal } from '../components/CreatePOModal';

interface PurchaseOrdersPageProps {
  onNotify: (msg: string) => void;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
}

export const PurchaseOrdersPage: React.FC<PurchaseOrdersPageProps> = ({
  onNotify,
  showCreateModal,
  setShowCreateModal,
}) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [status, setStatus] = useState('All');
  const [financialStatus, setFinancialStatus] = useState('All');
  const [viewMode, setViewMode] = useState<'reference' | 'financial'>('reference');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [financialPO, setFinancialPO] = useState<PurchaseOrder | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      let query = '?';
      if (status !== 'All') query += `status=${status}&`;
      if (financialStatus !== 'All') query += `financialStatus=${financialStatus}&`;
      if (search) query += `search=${encodeURIComponent(search)}&`;
      if (fromDate) query += `fromDate=${encodeURIComponent(fromDate)}&`;
      if (toDate) query += `toDate=${encodeURIComponent(toDate)}&`;

      const list = await api.getPurchaseOrders(query);
      setOrders(list);
    } catch (err: any) {
      onNotify(err.message || 'Failed to fetch purchase orders');
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

  const totalAmount = orders.reduce((sum, o) => sum + Number(o.grandTotal), 0);
  const openCount = orders.filter((o) => o.status === 'OPEN').length;
  const closedCount = orders.filter((o) => o.status === 'CLOSED').length;

  return (
    <div className="space-y-5">
      {/* 1. Page Title & Action Bar matching Reference Image */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#E7F5E9] rounded-xl text-[#064D2B]">
              <ShoppingCart size={26} strokeWidth={2.4} />
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-[#064D2B] font-['Manrope'] tracking-tight">
              Purchase Order (PO) Management
            </h1>
          </div>
          {/* Green accent underline bar matching reference */}
          <div className="h-1 w-64 bg-[#087A3E] rounded-full mt-2 ml-1" />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white text-sm font-bold rounded-xl shadow-md transition self-start sm:self-auto"
        >
          <Plus size={18} /> Create PO
        </button>
      </div>

      {/* 2. 4 Summary Stat Cards matching Reference Image */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 lg:gap-4">
        {/* Card 1: Total PO */}
        <div className="stat-card blue flex items-center gap-3.5 p-4 rounded-2xl bg-[#EEF5FF] border border-[#D4E5FB]">
          <div className="w-12 h-12 rounded-xl bg-[#DCEBFF] flex items-center justify-center text-[#1564B7] flex-shrink-0">
            <FileText size={24} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#1E293B] block">Total PO</span>
            <strong className="text-2xl lg:text-3xl font-black text-[#0F172A] font-['Manrope'] block mt-0.5">
              {orders.length}
            </strong>
          </div>
        </div>

        {/* Card 2: Open PO */}
        <div className="stat-card green flex items-center gap-3.5 p-4 rounded-2xl bg-[#EAF8EE] border border-[#CEEED7]">
          <div className="w-12 h-12 rounded-xl bg-[#CEF2D8] flex items-center justify-center text-[#15813E] flex-shrink-0">
            <Hourglass size={24} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#1E293B] block">Open PO</span>
            <strong className="text-2xl lg:text-3xl font-black text-[#064D2B] font-['Manrope'] block mt-0.5">
              {openCount}
            </strong>
          </div>
        </div>

        {/* Card 3: Closed PO */}
        <div className="stat-card rose flex items-center gap-3.5 p-4 rounded-2xl bg-[#FEEFEF] border border-[#FCD8D8]">
          <div className="w-12 h-12 rounded-xl bg-[#FFDADA] flex items-center justify-center text-[#D32F2F] flex-shrink-0">
            <CheckCircle2 size={24} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#1E293B] block">Closed PO</span>
            <strong className="text-2xl lg:text-3xl font-black text-[#991B1B] font-['Manrope'] block mt-0.5">
              {closedCount}
            </strong>
          </div>
        </div>

        {/* Card 4: Total PO Amount */}
        <div className="stat-card gold flex items-center gap-3.5 p-4 rounded-2xl bg-[#FEF9E6] border border-[#FCEBB5]">
          <div className="w-12 h-12 rounded-xl bg-[#FEEBB0] flex items-center justify-center text-[#B68100] flex-shrink-0">
            <Coins size={24} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-[#1E293B] block">Total PO Amount</span>
            <strong className="text-xl lg:text-2xl xl:text-3xl font-black text-[#1F2937] font-['Manrope'] block mt-0.5 truncate">
              ₹ {totalAmount.toLocaleString('en-IN')}
            </strong>
          </div>
        </div>
      </section>

      {/* 3. Search & Filter Bar matching Reference Image */}
      <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search PO Number / Supplier */}
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#CBD9CE] rounded-xl text-xs text-[#274837] focus-within:border-[#087A3E] focus-within:ring-2 focus-within:ring-emerald-100 transition">
            <Search size={16} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO Number / Supplier"
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
              Showing <strong>{orders.length}</strong> purchase orders
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

      {/* 4. Master Purchase Order Table */}
      <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm overflow-hidden">
        {viewMode === 'reference' ? (
          /* STANDARD REFERENCE VIEW (Matching Uploaded Image 100%) */
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#064D2B] text-white">
                  <th className="text-center py-3.5 px-4 font-bold text-xs uppercase tracking-wider w-16 border-r border-[#085A33]">
                    S.No.
                  </th>
                  <th className="text-center py-3.5 px-6 font-bold text-xs uppercase tracking-wider border-r border-[#085A33]">
                    PO (Purchase Order)
                  </th>
                  <th className="text-center py-3.5 px-6 font-bold text-xs uppercase tracking-wider border-r border-[#085A33]">
                    Date
                  </th>
                  <th className="text-center py-3.5 px-6 font-bold text-xs uppercase tracking-wider border-r border-[#085A33]">
                    PO Amount (₹)
                  </th>
                  <th className="text-center py-3.5 px-6 font-bold text-xs uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400 text-xs">
                      No purchase orders found matching criteria.
                    </td>
                  </tr>
                ) : (
                  orders.map((order, index) => {
                    const isClosed = order.status === 'CLOSED';
                    const isPending = order.status === 'PENDING_APPROVAL' || order.status === 'DRAFT';
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-[#F4F9F5] transition cursor-pointer"
                        onClick={() => setSelectedPO(order)}
                        title="Click to view full purchase order dossier & line items"
                      >
                        <td className="text-center py-3 px-4 text-xs font-bold text-gray-700 border-r border-gray-200">
                          {index + 1}
                        </td>
                        <td className="text-center py-3 px-6 text-xs font-extrabold text-[#087A3E] border-r border-gray-200">
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
                        <td className="text-center py-3 px-6 text-xs font-medium text-gray-700 border-r border-gray-200">
                          {new Date(order.poDate).toLocaleDateString('en-GB')}
                        </td>
                        <td className="text-center py-3 px-6 text-xs font-extrabold text-gray-900 border-r border-gray-200">
                          {order.grandTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="text-center py-3 px-6 text-xs">
                          {isClosed ? (
                            <span className="inline-block px-5 py-1 rounded-full text-xs font-bold bg-[#D8F6D4] text-[#1E7438] border border-[#BCECC5] shadow-xs">
                              Closed
                            </span>
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* EXTENDED FINANCIAL AUDIT & P&L VIEW */
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
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
                          <span className="text-emerald-700 font-semibold">Adv: ₹{Number(order.advanceAmount || 0).toLocaleString('en-IN')}</span>
                          {' • '}
                          <span className="text-amber-800 font-semibold">Pend: ₹{Number(order.pendingAmount ?? Math.max(0, order.grandTotal - (order.advanceAmount || 0))).toLocaleString('en-IN')}</span>
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
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center gap-1.5 justify-center">
                          <button
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-bold"
                            onClick={() => setSelectedPO(order)}
                            title="View PO Details"
                          >
                            View
                          </button>
                          <button
                            className="p-1 text-emerald-700 hover:text-emerald-900"
                            onClick={() => setFinancialPO(order)}
                            title="Update Verified Profit / Loss"
                          >
                            <TrendingUp size={15} />
                          </button>
                          <a
                            href={api.downloadPOPDFUrl(order.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-gray-500 hover:text-gray-800"
                            title="Download PDF"
                          >
                            <Download size={15} />
                          </a>
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

      {/* Detail Modal */}
      {selectedPO && (
        <PODetailModal
          order={selectedPO}
          onClose={() => setSelectedPO(null)}
          onRefresh={loadOrders}
          onNotify={onNotify}
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
    </div>
  );
};
