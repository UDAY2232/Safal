import React, { useState, useEffect } from 'react';
import {
  FileText,
  DollarSign,
  Clock,
  AlertTriangle,
  Search,
  Plus,
  Printer,
  Download,
  CheckCircle2,
  Trash2,
  Receipt,
  X,
  CreditCard,
  Building,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { Invoice, InvoiceStats } from '../types';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';

interface InvoicesPageProps {
  onNotify: (msg: string) => void;
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({ onNotify }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    totalBilled: 0,
    totalPaid: 0,
    totalPending: 0,
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Create form state
  const [formData, setFormData] = useState({
    invoiceType: 'SALES',
    partyName: '',
    partyGst: '',
    partyAddress: '',
    partyEmail: '',
    partyPhone: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    linkedPoNumber: '',
    taxRate: '5',
    freightShipping: '0',
    paymentTerms: 'Net 15 Days',
    notes: '',
    items: [
      {
        description: '',
        hsnCode: '08081000',
        quantity: 1,
        unit: 'KG',
        rate: 0,
      },
    ],
  });

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (typeFilter !== 'All') params.append('type', typeFilter);

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await api.getInvoices(queryString);
      setInvoices(res.invoices || []);
      setStats(
        res.stats || {
          totalInvoices: 0,
          totalBilled: 0,
          totalPaid: 0,
          totalPending: 0,
          overdueCount: 0,
        }
      );
    } catch (err: any) {
      onNotify(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoices();
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    try {
      await api.recordInvoicePayment(showPaymentModal.id, {
        amountPaid: Number(paymentAmount),
        paymentMethod,
        notes: paymentNotes,
      });
      onNotify(`Payment of ₹${Number(paymentAmount).toLocaleString('en-IN')} recorded successfully!`);
      setShowPaymentModal(null);
      setPaymentAmount('');
      setPaymentNotes('');
      loadInvoices();
    } catch (err: any) {
      onNotify(err.message || 'Failed to record payment');
    }
  };

  const handleDeleteInvoice = async (id: string, invoiceNumber: string) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invoiceNumber}?`)) return;
    try {
      await api.deleteInvoice(id);
      onNotify(`Invoice ${invoiceNumber} deleted successfully`);
      loadInvoices();
    } catch (err: any) {
      onNotify(err.message || 'Failed to delete invoice');
    }
  };

  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          hsnCode: '08081000',
          quantity: 100,
          unit: 'BOX',
          rate: 1000,
        },
      ],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.items];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, items: updated };
    });
  };

  const calculateFormTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.rate || 0), 0);
    const tax = (subtotal * Number(formData.taxRate || 0)) / 100;
    const freight = Number(formData.freightShipping || 0);
    const grand = subtotal + tax + freight;
    return { subtotal, tax, freight, grand };
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createInvoice({
        ...formData,
        taxRate: Number(formData.taxRate),
        freightShipping: Number(formData.freightShipping),
      });
      onNotify('Invoice generated successfully!');
      setShowCreateModal(false);
      loadInvoices();
    } catch (err: any) {
      onNotify(err.message || 'Failed to create invoice');
    }
  };

  const exportCSV = () => {
    if (!invoices.length) return;
    const headers = ['Invoice No', 'Type', 'Party Name', 'Date', 'Due Date', 'Total Amount', 'Paid', 'Balance Due', 'Status'];
    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      inv.invoiceType,
      `"${inv.partyName}"`,
      new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
      new Date(inv.dueDate).toLocaleDateString('en-IN'),
      inv.grandTotal,
      inv.amountPaid,
      inv.balanceDue,
      inv.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SAFAL_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (val?: number | string | null) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const formTotals = calculateFormTotals();

  return (
    <div className="space-y-6">
      {/* 4 Crisp Summary Stat Cards */}
      <div className="stat-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Invoices"
          value={stats.totalInvoices.toString()}
          icon={<FileText size={22} />}
          tone="blue"
          detail="Active Billing Consignments"
        />
        <StatCard
          label="Total Billed"
          value={formatCurrency(stats.totalBilled)}
          icon={<DollarSign size={22} />}
          tone="green"
          detail={`Collected: ${formatCurrency(stats.totalPaid)}`}
        />
        <StatCard
          label="Pending Receivables"
          value={formatCurrency(stats.totalPending)}
          icon={<Clock size={22} />}
          tone="gold"
          detail="Awaiting Clearance"
        />
        <StatCard
          label="Overdue Invoices"
          value={stats.overdueCount.toString()}
          icon={<AlertTriangle size={22} />}
          tone="rose"
          detail="Urgent Follow-Up"
        />
      </div>

      {/* Main Workspace Card */}
      <div className="workspace-card bg-white rounded-2xl border border-[#e1eee4] shadow-xs p-5">
        {/* Toolbar: Search, Filters, and + Create Invoice */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-5">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="search-field flex-1 max-w-md">
              <Search size={18} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search Invoice #, Party Name, or Linked PO..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button type="submit" className="filter-button">
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Type Filter */}
            <div className="status-select">
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="All">All Types</option>
                <option value="EXPORT">Export</option>
                <option value="IMPORT">Import</option>
                <option value="SALES">Domestic Sales</option>
                <option value="PURCHASE">Purchase</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="status-select">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>

            {/* Export CSV */}
            <button
              onClick={exportCSV}
              className="secondary-filter flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              title="Export as CSV"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>

            {/* Create Invoice Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="primary-button flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm"
            >
              <Plus size={16} />
              <span>Create Invoice</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-wrap overflow-x-auto border border-[#d5e3d8] rounded-xl">
          {loading ? (
            <div className="py-12 text-center text-sm font-semibold text-emerald-800">
              Loading SAFAL Invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="empty-state py-12 flex flex-col items-center justify-center gap-2 text-gray-500">
              <FileText size={32} className="text-gray-300" />
              <strong>No invoices found</strong>
              <span className="text-xs">Create your first invoice or adjust filter settings.</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#087a3e] text-white font-bold h-10">
                  <th className="px-3.5">S.No</th>
                  <th className="px-3.5">Invoice #</th>
                  <th className="px-3.5">Type</th>
                  <th className="px-3.5">Party / Consignee</th>
                  <th className="px-3.5">Date</th>
                  <th className="px-3.5">Due Date</th>
                  <th className="px-3.5 text-right">Grand Total (₹)</th>
                  <th className="px-3.5 text-right">Balance Due (₹)</th>
                  <th className="px-3.5 text-center">Status</th>
                  <th className="px-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e9e2]">
                {invoices.map((inv, index) => (
                  <tr key={inv.id} className="hover:bg-emerald-50/40 transition">
                    <td className="px-3.5 py-3 serial font-medium">{index + 1}</td>
                    <td className="px-3.5 py-3 font-bold text-[#0d7540]">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="hover:underline flex items-center gap-1.5 text-left"
                      >
                        <FileText size={14} className="text-emerald-600" />
                        <span>{inv.invoiceNumber}</span>
                      </button>
                    </td>
                    <td className="px-3.5 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.invoiceType === 'EXPORT'
                            ? 'bg-blue-100 text-blue-700'
                            : inv.invoiceType === 'IMPORT'
                            ? 'bg-purple-100 text-purple-700'
                            : inv.invoiceType === 'SALES'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.invoiceType}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 font-semibold text-gray-800 max-w-xs truncate" title={inv.partyName}>
                      {inv.partyName}
                      {inv.linkedPoNumber && (
                        <span className="block text-[10px] font-normal text-gray-400">
                          Ref: {inv.linkedPoNumber}
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-gray-600">
                      {new Date(inv.invoiceDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-3.5 py-3 text-gray-600">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-3.5 py-3 text-right font-bold text-gray-900">
                      {formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-bold text-amber-800">
                      {Number(inv.balanceDue) > 0 ? formatCurrency(inv.balanceDue) : (
                        <span className="text-emerald-700 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 size={13} /> Nil
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                          title="View / Print Tax Invoice"
                        >
                          <Printer size={15} />
                        </button>
                        {Number(inv.balanceDue) > 0 && (
                          <button
                            onClick={() => {
                              setShowPaymentModal(inv);
                              setPaymentAmount(inv.balanceDue.toString());
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Record Payment"
                          >
                            <CreditCard size={15} />
                          </button>
                        )}
                        {inv.status !== 'PAID' && (
                          <button
                            onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Delete Invoice"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* VIEW / PRINT TAX INVOICE MODAL */}
      {selectedInvoice && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative my-8 text-gray-800">
            {/* Modal Actions */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Receipt size={16} /> Tax Invoice Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-800 transition"
                >
                  <Printer size={14} /> Print
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Tax Invoice Content */}
            <div className="pt-4 space-y-6">
              {/* Official SAFAL Letterhead */}
              <div className="flex justify-between items-start pb-4 border-b-2 border-emerald-800">
                <div className="flex items-center gap-3">
                  <img
                    src="/safal-globe-logo.png"
                    alt="SAFAL Global"
                    className="h-16 w-auto object-contain"
                  />
                  <div>
                    <h2 className="text-2xl font-black text-[#064D2B] font-['Manrope'] tracking-tight">
                      SAFAL
                    </h2>
                    <p className="text-xs font-black text-[#D32F2F] uppercase tracking-wider">
                      EXPORT AND IMPORT PVT LTD
                    </p>
                    <p className="text-[11px] text-gray-500 font-semibold">
                      Fruits Import &amp; Export · Freshness Beyond Borders
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      GSTIN: 36AAFCS1234F1Z8 · APEDA Reg: 198273
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-emerald-50 text-emerald-800 font-extrabold text-xs rounded-md border border-emerald-200">
                    TAX INVOICE
                  </span>
                  <p className="text-base font-black text-gray-900 mt-1">
                    {selectedInvoice.invoiceNumber}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Date:{' '}
                    <strong>
                      {new Date(selectedInvoice.invoiceDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>
                  </p>
                  <p className="text-xs text-gray-600">
                    Due Date:{' '}
                    <strong>
                      {new Date(selectedInvoice.dueDate).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Bill To & Consignment Details */}
              <div className="grid grid-cols-2 gap-6 text-xs bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div>
                  <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block mb-1">
                    Billed To / Consignee:
                  </span>
                  <p className="text-sm font-bold text-gray-900">{selectedInvoice.partyName}</p>
                  {selectedInvoice.partyAddress && (
                    <p className="text-gray-600 mt-0.5">{selectedInvoice.partyAddress}</p>
                  )}
                  {selectedInvoice.partyGst && (
                    <p className="text-gray-700 font-medium mt-1">
                      GST / Tax ID: <span className="font-mono">{selectedInvoice.partyGst}</span>
                    </p>
                  )}
                  {selectedInvoice.partyEmail && (
                    <p className="text-gray-500 mt-0.5">Email: {selectedInvoice.partyEmail}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] block mb-1">
                    Consignment Information:
                  </span>
                  <p className="text-gray-700">
                    Invoice Type: <strong className="uppercase">{selectedInvoice.invoiceType}</strong>
                  </p>
                  {selectedInvoice.linkedPoNumber && (
                    <p className="text-gray-700">
                      Linked Purchase Order: <strong>{selectedInvoice.linkedPoNumber}</strong>
                    </p>
                  )}
                  <p className="text-gray-700">
                    Payment Terms: <strong>{selectedInvoice.paymentTerms || 'Net 15 Days'}</strong>
                  </p>
                  <p className="text-gray-700">
                    Payment Status:{' '}
                    <span className="font-bold uppercase text-emerald-800">
                      {selectedInvoice.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#087a3e] text-white font-bold h-9">
                    <tr>
                      <th className="px-3">#</th>
                      <th className="px-3">Description of Goods</th>
                      <th className="px-3">HSN Code</th>
                      <th className="px-3 text-right">Quantity</th>
                      <th className="px-3">Unit</th>
                      <th className="px-3 text-right">Rate (₹)</th>
                      <th className="px-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selectedInvoice.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2.5 text-gray-500">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-800">
                          {item.description}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-gray-600">{item.hsnCode}</td>
                        <td className="px-3 py-2.5 text-right font-medium">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-gray-600">{item.unit}</td>
                        <td className="px-3 py-2.5 text-right">{formatCurrency(item.rate)}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-gray-900">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Notes */}
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="text-xs text-gray-600 space-y-2">
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                    <span className="font-bold text-emerald-900 block text-[11px]">Bank Wire Details:</span>
                    <p className="mt-0.5 text-gray-700">Bank: HDFC Bank Ltd (Corporate Branch)</p>
                    <p className="text-gray-700">A/C: 50200088991234 · IFSC: HDFC0001234</p>
                    <p className="text-gray-700">Beneficiary: SAFAL EXPORT AND IMPORT PVT LTD</p>
                  </div>
                  {selectedInvoice.notes && (
                    <p className="text-[11px] text-gray-500 italic">
                      Notes: {selectedInvoice.notes}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-right">
                  <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-bold">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                    <span>GST ({selectedInvoice.taxRate}%):</span>
                    <span>{formatCurrency(selectedInvoice.taxAmount)}</span>
                  </div>
                  {Number(selectedInvoice.freightShipping) > 0 && (
                    <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                      <span>Refrigerated Freight &amp; Handling:</span>
                      <span>{formatCurrency(selectedInvoice.freightShipping)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b-2 border-gray-900 text-sm font-black text-gray-900">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(selectedInvoice.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-emerald-700 font-bold">
                    <span>Amount Paid:</span>
                    <span>{formatCurrency(selectedInvoice.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-amber-800 font-black text-sm">
                    <span>Balance Due:</span>
                    <span>{formatCurrency(selectedInvoice.balanceDue)}</span>
                  </div>
                </div>
              </div>

              {/* Signatory */}
              <div className="pt-6 flex justify-between items-end text-xs text-gray-500 border-t border-gray-100">
                <div>
                  <p>Declaration: This invoice shows actual price of the goods described</p>
                  <p>and that all particulars are true and correct.</p>
                </div>
                <div className="text-center">
                  <div className="h-10 border-b border-gray-400 w-44 mx-auto mb-1" />
                  <strong className="block text-gray-800">SAFAL EXPORT AND IMPORT PVT LTD</strong>
                  <span className="text-[10px]">Authorized Signatory</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE INVOICE MODAL */}
      {showCreateModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="text-emerald-700" size={20} /> Generate New Invoice
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Invoice Type</label>
                  <select
                    value={formData.invoiceType}
                    onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-600"
                  >
                    <option value="SALES">Domestic Wholesale Sales</option>
                    <option value="EXPORT">International Export Consignment</option>
                    <option value="IMPORT">Import Consignment</option>
                    <option value="PURCHASE">Procurement Invoice</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Party / Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Fresh Trading LLC"
                    value={formData.partyName}
                    onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AABCR1234F1Z8"
                    value={formData.partyGst}
                    onChange={(e) => setFormData({ ...formData, partyGst: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Linked PO # (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. PO/SF/2026/001"
                    value={formData.linkedPoNumber}
                    onChange={(e) => setFormData({ ...formData, linkedPoNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Party Address</label>
                <input
                  type="text"
                  placeholder="e.g. APMC Market, Vashi, Navi Mumbai"
                  value={formData.partyAddress}
                  onChange={(e) => setFormData({ ...formData, partyAddress: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              {/* Dynamic Line Items */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                    <Layers size={14} className="text-emerald-700" /> Line Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> Add Product
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formData.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <input
                        type="text"
                        placeholder="Description (e.g. Alphonso Mangoes)"
                        required
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="flex-2 border border-gray-300 rounded p-1.5 text-xs"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        required
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-16 border border-gray-300 rounded p-1.5 text-xs text-right"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-16 border border-gray-300 rounded p-1.5 text-xs"
                      >
                        <option value="BOX">BOX</option>
                        <option value="CRATE">CRATE</option>
                        <option value="KG">KG</option>
                        <option value="TON">TON</option>
                        <option value="CARTON">CARTON</option>
                      </select>
                      <input
                        type="number"
                        placeholder="Rate ₹"
                        required
                        min="1"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        className="w-24 border border-gray-300 rounded p-1.5 text-xs text-right"
                      />
                      <span className="w-24 text-right font-bold text-gray-800 text-xs">
                        ₹{(Number(item.quantity || 0) * Number(item.rate || 0)).toLocaleString('en-IN')}
                      </span>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax & Freight Calculation */}
              <div className="grid grid-cols-2 gap-4 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">GST Tax Rate (%)</label>
                  <input
                    type="number"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Freight / Reefer Shipping (₹)</label>
                  <input
                    type="number"
                    value={formData.freightShipping}
                    onChange={(e) => setFormData({ ...formData, freightShipping: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              {/* Total Summary */}
              <div className="text-right text-xs space-y-1 pr-1 font-semibold text-gray-700">
                <p>Subtotal: {formatCurrency(formTotals.subtotal)}</p>
                <p>GST ({formData.taxRate}%): {formatCurrency(formTotals.tax)}</p>
                <p>Freight: {formatCurrency(formTotals.freight)}</p>
                <p className="text-base font-black text-emerald-900 pt-1 border-t border-gray-200">
                  Estimated Grand Total: {formatCurrency(formTotals.grand)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button px-5 py-2 text-xs font-bold text-white rounded-lg"
                >
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-gray-800">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="text-emerald-700" size={18} /> Record Invoice Payment
              </h3>
              <button onClick={() => setShowPaymentModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 pt-4 text-xs">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="font-semibold text-gray-600">Invoice: {showPaymentModal.invoiceNumber}</p>
                <p className="font-semibold text-gray-600">Party: {showPaymentModal.partyName}</p>
                <p className="text-sm font-bold text-amber-800 mt-1">
                  Balance Remaining: {formatCurrency(showPaymentModal.balanceDue)}
                </p>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={Number(showPaymentModal.balanceDue)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-bold focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs"
                >
                  <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="Wire Transfer (SWIFT)">Wire Transfer (SWIFT)</option>
                  <option value="Letter of Credit (LC)">Letter of Credit (LC)</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Transaction Ref / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. UTR# 9182736452 HDFC Bank"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button px-5 py-2 text-xs font-bold text-white rounded-lg"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
