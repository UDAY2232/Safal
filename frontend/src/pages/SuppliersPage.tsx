import React, { useState, useEffect } from 'react';
import {
  Truck,
  Search,
  Plus,
  ArrowRight,
  ExternalLink,
  Edit3,
  Save,
  X,
  Phone,
  Mail,
  MapPin,
  User,
  Building2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { Supplier } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { AddSupplierModal } from '../components/AddSupplierModal';

interface SuppliersPageProps {
  onNotify: (msg: string) => void;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({ onNotify }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);

  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    category: '',
    paymentTerms: '',
    country: 'India',
    address: '',
    status: 'ACTIVE',
    notes: '',
  });
  const [isSavingDossier, setIsSavingDossier] = useState(false);
  const [dossierError, setDossierError] = useState('');

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const list = await api.getSuppliers(search ? `?search=${encodeURIComponent(search)}` : '');
      setSuppliers(list);
    } catch (err: any) {
      onNotify(err.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const openSupplierDetails = async (id: string) => {
    try {
      const details = await api.getSupplierById(id);
      setSelectedSupplier(details);
      setIsEditingDossier(false);
      setDossierError('');
      setEditFormData({
        name: details.name || '',
        contactPerson: details.contactPerson || '',
        phone: details.phone || '',
        email: details.email || '',
        category: details.category || (details.isBuyer || details.category === 'Customer Due' ? 'Customer Due' : 'Wholesale Fruits'),
        paymentTerms: details.paymentTerms || 'Custom',
        country: details.country || 'India',
        address: details.address || '',
        status: details.status || 'ACTIVE',
        notes: details.notes || '',
      });
    } catch {
      onNotify('Failed to load supplier details');
    }
  };

  const startEditing = () => {
    if (!selectedSupplier) return;
    setEditFormData({
      name: selectedSupplier.name || '',
      contactPerson: selectedSupplier.contactPerson || '',
      phone: selectedSupplier.phone || '',
      email: selectedSupplier.email || '',
      category: selectedSupplier.category || (selectedSupplier.isBuyer || selectedSupplier.category === 'Customer Due' ? 'Customer Due' : 'Wholesale Fruits'),
      paymentTerms: selectedSupplier.paymentTerms || 'Custom',
      country: selectedSupplier.country || 'India',
      address: selectedSupplier.address || '',
      status: selectedSupplier.status || 'ACTIVE',
      notes: selectedSupplier.notes || '',
    });
    setDossierError('');
    setIsEditingDossier(true);
  };

  const handleSaveDossier = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editFormData.name.trim()) {
      setDossierError('Supplier / Buyer name is required');
      return;
    }
    try {
      setIsSavingDossier(true);
      setDossierError('');
      await api.updateSupplier(selectedSupplier.id, {
        name: editFormData.name.trim(),
        contactPerson: editFormData.contactPerson.trim() || null,
        phone: editFormData.phone.trim() || null,
        email: editFormData.email.trim() || null,
        category: editFormData.category.trim() || 'Wholesale Fruits',
        paymentTerms: editFormData.paymentTerms.trim() || 'Custom',
        country: editFormData.country.trim() || 'India',
        address: editFormData.address.trim() || null,
        status: editFormData.status || 'ACTIVE',
        notes: editFormData.notes.trim() || null,
      });

      const refreshed = await api.getSupplierById(selectedSupplier.id);
      setSelectedSupplier(refreshed);
      setIsEditingDossier(false);
      onNotify(`${editFormData.name} details updated successfully!`);
      loadSuppliers();
    } catch (err: any) {
      setDossierError(err.message || 'Failed to update details');
    } finally {
      setIsSavingDossier(false);
    }
  };

  return (
    <>
      <section className="workspace-card">
        <div className="section-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search supplier name, ID, or contact..."
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="primary-button inline-flex items-center gap-1.5"
          >
            <Plus size={16} /> Add Supplier
          </button>
        </div>

        <div className="table-meta">
          <span>
            Showing <strong>{suppliers.length}</strong> fruit suppliers
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Supplier / Buyer Name</th>
                <th>Contact Person</th>
                <th>Phone / Email</th>
                <th>Category</th>
                <th>Payment Terms</th>
                <th>Orders / Dues</th>
                <th>Total Value</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-400">
                    No suppliers or buyers found.
                  </td>
                </tr>
              ) : (
                suppliers.map((s: any) => {
                  const isBuyer = s.isBuyer || s.category === 'Customer Due';
                  return (
                    <tr key={s.id} className="hover:bg-emerald-50/20">
                      <td className="font-semibold text-emerald-800">{s.supplierCode}</td>
                      <td className="font-bold text-gray-900">
                        {s.name}
                        {isBuyer && (
                          <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Buyer
                          </span>
                        )}
                      </td>
                      <td>{s.contactPerson || '—'}</td>
                      <td>
                        <span className="block text-gray-700">{s.phone || '—'}</span>
                        <small className="block text-gray-400 text-[10px]">{s.email || ''}</small>
                      </td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isBuyer ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {isBuyer ? 'Customer Due' : s.category}
                        </span>
                      </td>
                      <td>{s.paymentTerms}</td>
                      <td className="font-semibold">
                        {isBuyer ? (
                          <span className="text-emerald-800">{s.cdCount ?? s.poCount} CDs</span>
                        ) : (
                          <span>{s.poCount} Orders</span>
                        )}
                      </td>
                      <td>
                        {isBuyer ? (
                          <div>
                            <span className="font-bold text-gray-900">₹{(s.totalCDValue ?? s.totalPOValue).toLocaleString('en-IN')}</span>
                            {Number(s.totalCDDue || 0) > 0 && (
                              <span className="block text-[10px] text-rose-700 font-extrabold">
                                Due: ₹{Number(s.totalCDDue).toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="font-bold text-gray-900">
                            ₹{s.totalPOValue.toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="text-center">
                        <button
                          className="view-button"
                          onClick={() => openSupplierDetails(s.id)}
                        >
                          Profile <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showAddModal && (
        <AddSupplierModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(msg) => {
            onNotify(msg);
            loadSuppliers();
          }}
        />
      )}

      {selectedSupplier && (() => {
        const isSelectedBuyer =
          selectedSupplier?.isBuyer ||
          selectedSupplier?.category === 'Customer Due' ||
          selectedSupplier?.purchaseOrders?.some((p: any) => p.poNumber?.startsWith('CD/'));

        const orders = selectedSupplier?.purchaseOrders || [];
        const totalOrdersCount = orders.length;
        const totalVal = orders.reduce(
          (sum: number, po: any) => sum + Number(po.grandTotal || 0),
          0
        );
        const totalPaid = orders.reduce(
          (sum: number, po: any) => sum + Number(po.advanceAmount || 0),
          0
        );
        const totalDue = orders.reduce((sum: number, po: any) => {
          const adv = Number(po.advanceAmount || 0);
          const pending =
            po.pendingAmount !== undefined && po.pendingAmount !== null
              ? Number(po.pendingAmount)
              : Math.max(0, Number(po.grandTotal || 0) - adv);
          return sum + pending;
        }, 0);

        return (
          <div className="modal-backdrop">
            <div className="modal !w-[740px] max-w-[95vw] p-0 max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-white border border-gray-200">
              {/* Modal Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center font-black text-lg text-white shrink-0">
                    {isSelectedBuyer ? (
                      <User size={22} className="text-emerald-300" />
                    ) : (
                      <Building2 size={22} className="text-emerald-300" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-700/70 border border-emerald-400/30 text-emerald-100">
                        {isSelectedBuyer ? 'Buyer / Customer Dossier' : 'Supplier Dossier'}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/15 text-white">
                        {selectedSupplier.supplierCode}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          selectedSupplier.status === 'ACTIVE'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {selectedSupplier.status}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-white mt-1 leading-tight">
                      {selectedSupplier.name}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isEditingDossier ? (
                    <button
                      type="button"
                      onClick={startEditing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white text-xs font-bold rounded-lg border border-white/25 transition-all shadow-xs cursor-pointer"
                    >
                      <Edit3 size={13} />
                      <span>Edit Profile</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingDossier(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-lg border border-white/25 transition-all cursor-pointer"
                    >
                      <X size={13} />
                      <span>Cancel Edit</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedSupplier(null)}
                    className="w-8 h-8 rounded-lg bg-black/20 hover:bg-black/30 flex items-center justify-center text-white/80 hover:text-white transition-all text-sm font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
                {dossierError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0 text-rose-600" />
                    <span className="font-semibold">{dossierError}</span>
                  </div>
                )}

                {/* 4 Financial Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      {isSelectedBuyer ? 'Total Customer Dues' : 'Total Purchase Orders'}
                    </span>
                    <p className="text-lg font-black text-emerald-950 mt-1">
                      {totalOrdersCount}{' '}
                      <span className="text-xs font-semibold text-emerald-700">
                        {isSelectedBuyer ? 'CDs' : 'POs'}
                      </span>
                    </p>
                  </div>

                  <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">
                      Total Value
                    </span>
                    <p className="text-lg font-black text-blue-950 mt-1">
                      ₹{totalVal.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div className="bg-teal-50/60 border border-teal-100 rounded-xl p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">
                      Amount Cleared
                    </span>
                    <p className="text-lg font-black text-teal-950 mt-1">
                      ₹{totalPaid.toLocaleString('en-IN')}
                    </p>
                  </div>

                  <div
                    className={`${
                      totalDue > 0
                        ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    } border rounded-xl p-3`}
                  >
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider block ${
                        totalDue > 0 ? 'text-rose-800' : 'text-emerald-800'
                      }`}
                    >
                      Pending Due
                    </span>
                    <p
                      className={`text-lg font-black mt-1 ${
                        totalDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                    >
                      ₹{totalDue.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* View vs In-Place Edit Mode */}
                {isEditingDossier ? (
                  <form
                    onSubmit={handleSaveDossier}
                    className="bg-emerald-50/30 border border-emerald-200 rounded-xl p-4 space-y-3.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                      <span className="font-bold text-gray-900 text-xs flex items-center gap-1.5 text-emerald-800 uppercase tracking-wide">
                        <Edit3 size={14} /> Edit {isSelectedBuyer ? 'Buyer / Customer' : 'Supplier'} Details
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500">
                        Code: {selectedSupplier.supplierCode}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">
                          {isSelectedBuyer ? 'Buyer / Customer Name' : 'Supplier Company Name'}{' '}
                          <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, name: e.target.value })
                          }
                          className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs font-semibold focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-white"
                          placeholder="Enter name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">Category</label>
                        <input
                          type="text"
                          value={editFormData.category}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, category: e.target.value })
                          }
                          className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs focus:border-emerald-600 outline-none bg-white"
                          placeholder="e.g. Customer Due, Wholesale Fruits"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">Contact Person</label>
                        <input
                          type="text"
                          value={editFormData.contactPerson}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, contactPerson: e.target.value })
                          }
                          className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs focus:border-emerald-600 outline-none bg-white"
                          placeholder="Contact name"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={editFormData.phone}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, phone: e.target.value })
                          }
                          className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs focus:border-emerald-600 outline-none bg-white"
                          placeholder="+91..."
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">Email</label>
                        <input
                          type="email"
                          value={editFormData.email}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, email: e.target.value })
                          }
                          className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs focus:border-emerald-600 outline-none bg-white"
                          placeholder="email@domain.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">Payment Terms</label>
                        <input
                          type="text"
                          value={editFormData.paymentTerms}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, paymentTerms: e.target.value })
                          }
                          className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs focus:border-emerald-600 outline-none bg-white"
                          placeholder="Custom / Net 30"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">Status</label>
                        <select
                          value={editFormData.status}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, status: e.target.value })
                          }
                          className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs font-semibold focus:border-emerald-600 outline-none bg-white"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="BLOCKED">BLOCKED</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-bold mb-1">Country / Region</label>
                        <input
                          type="text"
                          value={editFormData.country}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, country: e.target.value })
                          }
                          className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs focus:border-emerald-600 outline-none bg-white"
                          placeholder="India"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        Physical / Depot Address
                      </label>
                      <input
                        type="text"
                        value={editFormData.address}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, address: e.target.value })
                        }
                        className="w-full h-9 px-3 border border-gray-300 rounded-lg text-xs focus:border-emerald-600 outline-none bg-white"
                        placeholder="Depot / Market yard location"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Notes / Remarks</label>
                      <textarea
                        rows={2}
                        value={editFormData.notes}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, notes: e.target.value })
                        }
                        className="w-full p-2 border border-gray-300 rounded-lg text-xs focus:border-emerald-600 outline-none bg-white"
                        placeholder="Internal notes or remarks..."
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setIsEditingDossier(false)}
                        className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-100 transition-colors cursor-pointer"
                        disabled={isSavingDossier}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingDossier}
                        className="primary-button inline-flex items-center gap-1.5 px-4 py-1.5 cursor-pointer shadow-xs"
                      >
                        <Save size={13} />
                        {isSavingDossier ? 'Saving...' : 'Save Profile Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* View Mode Profile Info */
                  <div className="bg-gray-50/70 border border-gray-200 rounded-xl p-4 shadow-2xs">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200/80">
                      <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider text-emerald-800">
                        Profile & Contact Information
                      </h3>
                      <button
                        type="button"
                        onClick={startEditing}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                      >
                        <Edit3 size={12} /> Edit Details
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                          Contact Person
                        </span>
                        <p className="font-bold text-gray-800 flex items-center gap-1">
                          <User size={13} className="text-gray-400" />
                          {selectedSupplier.contactPerson || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                          Phone
                        </span>
                        <p className="font-bold text-gray-800 flex items-center gap-1">
                          <Phone size={13} className="text-gray-400" />
                          {selectedSupplier.phone || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                          Email
                        </span>
                        <p
                          className="font-bold text-gray-800 flex items-center gap-1 truncate"
                          title={selectedSupplier.email}
                        >
                          <Mail size={13} className="text-gray-400" />
                          {selectedSupplier.email || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                          Category
                        </span>
                        <p className="font-bold text-gray-800">
                          {selectedSupplier.category ||
                            (isSelectedBuyer ? 'Customer Due' : 'Wholesale Fruits')}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                          Payment Terms
                        </span>
                        <p className="font-bold text-gray-800">
                          {selectedSupplier.paymentTerms || 'Custom'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                          Location / Country
                        </span>
                        <p className="font-bold text-gray-800">
                          {selectedSupplier.country || 'India'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                          Address / Depot
                        </span>
                        <p className="font-semibold text-gray-800 flex items-center gap-1">
                          <MapPin size={13} className="text-gray-400 shrink-0" />
                          {selectedSupplier.address || '—'}
                        </p>
                      </div>
                    </div>

                    {selectedSupplier.notes && (
                      <div className="mt-3 pt-2.5 border-t border-gray-200/70 text-gray-600">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                          Notes / Remarks
                        </span>
                        <p className="italic text-gray-700">{selectedSupplier.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Transaction History Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900 text-xs">
                      {isSelectedBuyer
                        ? 'Customer Due (CD) History'
                        : 'Purchase Order (PO) History'}{' '}
                      ({orders.length})
                    </span>
                    <span className="text-[11px] text-gray-400">
                      All recorded orders & settlements
                    </span>
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs">
                      <thead className="bg-[#E7F5E9] text-[#064D2B] font-bold">
                        <tr>
                          <th className="p-2.5 text-left">
                            {isSelectedBuyer ? 'CD Number' : 'PO Number'}
                          </th>
                          <th className="p-2.5 text-left">Date</th>
                          <th className="p-2.5 text-right">Total Amount</th>
                          <th className="p-2.5 text-right">Paid / Cleared</th>
                          <th className="p-2.5 text-right">Due Balance</th>
                          <th className="p-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {orders.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-6 text-gray-400">
                              No orders or customer dues recorded yet.
                            </td>
                          </tr>
                        ) : (
                          orders.map((po: any) => {
                            const adv = Number(po.advanceAmount || 0);
                            const grandTotal = Number(po.grandTotal || 0);
                            const pending =
                              po.pendingAmount !== undefined && po.pendingAmount !== null
                                ? Number(po.pendingAmount)
                                : Math.max(0, grandTotal - adv);
                            return (
                              <tr key={po.id} className="hover:bg-gray-50/50">
                                <td className="p-2.5 font-bold text-emerald-800">{po.poNumber}</td>
                                <td className="p-2.5 text-gray-600">
                                  {po.poDate ? new Date(po.poDate).toLocaleDateString('en-GB') : '—'}
                                </td>
                                <td className="p-2.5 text-right font-bold text-gray-900">
                                  ₹{grandTotal.toLocaleString('en-IN')}
                                </td>
                                <td className="p-2.5 text-right font-semibold text-emerald-700">
                                  ₹{adv.toLocaleString('en-IN')}
                                </td>
                                <td className="p-2.5 text-right font-bold">
                                  {pending > 0 ? (
                                    <span className="text-rose-700 font-black">
                                      ₹{pending.toLocaleString('en-IN')}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700">₹0 (Cleared)</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-center">
                                  <StatusBadge status={po.status} />
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-actions px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-gray-500">
                    Last updated:{' '}
                    {selectedSupplier.updatedAt
                      ? new Date(selectedSupplier.updatedAt).toLocaleDateString('en-GB')
                      : 'Recently'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => setSelectedSupplier(null)}
                  >
                    Close
                  </button>
                  {!isEditingDossier && (
                    <button
                      type="button"
                      className="primary-button inline-flex items-center gap-1.5"
                      onClick={startEditing}
                    >
                      <Edit3 size={13} />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

