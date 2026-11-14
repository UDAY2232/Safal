import React, { useState, useEffect } from 'react';
import { Truck, Search, Plus, ArrowRight, ExternalLink } from 'lucide-react';
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
    } catch {
      onNotify('Failed to load supplier details');
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
                <th>Supplier ID</th>
                <th>Supplier Name</th>
                <th>Contact Person</th>
                <th>Phone / Email</th>
                <th>Category</th>
                <th>Payment Terms</th>
                <th>Total POs</th>
                <th>Total PO Value</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-gray-400">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-emerald-50/20">
                    <td className="font-semibold text-emerald-800">{s.supplierCode}</td>
                    <td className="font-bold text-gray-900">{s.name}</td>
                    <td>{s.contactPerson || '—'}</td>
                    <td>
                      <span className="block text-gray-700">{s.phone || '—'}</span>
                      <small className="block text-gray-400 text-[10px]">{s.email || ''}</small>
                    </td>
                    <td>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px] text-gray-700">
                        {s.category}
                      </span>
                    </td>
                    <td>{s.paymentTerms}</td>
                    <td className="font-semibold">{s.poCount} Orders</td>
                    <td className="font-bold text-gray-900">
                      ₹{s.totalPOValue.toLocaleString('en-IN')}
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
                ))
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

      {selectedSupplier && (
        <div className="modal-backdrop">
          <div className="modal !w-[680px] max-w-[94vw] p-6 max-h-[90vh] overflow-y-auto">
            <div className="modal-header pb-3 border-b border-gray-100">
              <div>
                <span className="eyebrow text-emerald-800 font-bold">SUPPLIER DOSSIER</span>
                <h2 className="text-xl font-bold text-gray-900 mt-1">{selectedSupplier.name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSupplier(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="py-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div>
                  <span className="text-gray-400">Supplier Code</span>
                  <p className="font-bold text-gray-800">{selectedSupplier.supplierCode}</p>
                </div>
                <div>
                  <span className="text-gray-400">Contact</span>
                  <p className="font-bold text-gray-800">{selectedSupplier.contactPerson || '—'}</p>
                </div>
                <div>
                  <span className="text-gray-400">Terms</span>
                  <p className="font-bold text-gray-800">{selectedSupplier.paymentTerms}</p>
                </div>
                <div>
                  <span className="text-gray-400">Country</span>
                  <p className="font-bold text-gray-800">{selectedSupplier.country}</p>
                </div>
              </div>

              <div>
                <span className="font-bold text-gray-700 block mb-1">
                  Purchase Order History ({selectedSupplier.purchaseOrders?.length || 0})
                </span>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[#E7F5E9] text-[#064D2B] font-bold">
                      <tr>
                        <th className="p-2">PO Number</th>
                        <th className="p-2">Date</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedSupplier.purchaseOrders?.map((po: any) => (
                        <tr key={po.id}>
                          <td className="p-2 font-bold text-emerald-800">{po.poNumber}</td>
                          <td className="p-2">{new Date(po.poDate).toLocaleDateString('en-GB')}</td>
                          <td className="p-2 text-right font-bold">
                            ₹{Number(po.grandTotal).toLocaleString('en-IN')}
                          </td>
                          <td className="p-2">
                            <StatusBadge status={po.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="modal-actions pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedSupplier(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

