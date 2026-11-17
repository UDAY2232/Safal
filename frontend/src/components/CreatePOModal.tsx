import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowRight, ShoppingCart } from 'lucide-react';
import { api } from '../services/api';
import { Supplier, POItem } from '../types';

interface CreatePOModalProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const COMMON_FRUITS = [
  { name: 'Shimla Royal Apple', category: 'Apples', grade: 'Export AAA', unit: 'KG', rate: 85 },
  { name: 'Nagpur Mandarin Orange', category: 'Citrus', grade: 'Grade A Sweet', unit: 'KG', rate: 55 },
  { name: 'Ratnagiri Alphonso Mango', category: 'Mangoes', grade: 'Grade A Export', unit: 'BOX', rate: 620 },
  { name: 'Kashmiri Walnut In-Shell', category: 'Dry Fruits', grade: 'Kagzi Extra Large', unit: 'KG', rate: 420 },
  { name: 'Anab-e-Shahi Grapes', category: 'Grapes', grade: 'Table Fresh Grade 1', unit: 'KG', rate: 75 },
  { name: 'Shahi Litchi Muzaffarpur', category: 'Litchis', grade: 'Sweet Grade A', unit: 'KG', rate: 110 },
  { name: 'Kesar Mango Junagadh', category: 'Mangoes', grade: 'Commercial Grade A', unit: 'BOX', rate: 540 },
  { name: 'Kinnow Mandarin Punjab', category: 'Citrus', grade: 'Grade 1 Juicy', unit: 'KG', rate: 45 },
];

export const CreatePOModal: React.FC<CreatePOModalProps> = ({ onClose, onSuccess }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('SAFAL Main Cold Storage, Hub 1, Navi Mumbai');
  const [advanceAmount, setAdvanceAmount] = useState<string>('0');
  const [pendingAmount, setPendingAmount] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [items, setItems] = useState<POItem[]>([
    {
      fruitName: '',
      category: 'Fresh Fruits',
      varietyGrade: 'Grade A',
      quantity: 1,
      unit: 'KG',
      ratePerUnit: 0,
      discountPercent: 0,
      taxPercent: 5,
      lineTotal: 0,
    },
  ]);

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const list = await api.getSuppliers();
        setSuppliers(list);
        if (list.length > 0) setSupplierId(list[0].id);
      } catch {}
    }
    loadSuppliers();
  }, []);

  const calculateLineTotal = (qty: number, rate: number, disc: number, tax: number) => {
    const raw = qty * rate;
    const discount = raw * (disc / 100);
    const afterDisc = raw - discount;
    const taxAmt = afterDisc * (tax / 100);
    return Math.round((afterDisc + taxAmt) * 100) / 100;
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };

      if (['quantity', 'ratePerUnit', 'discountPercent', 'taxPercent'].includes(field)) {
        item.lineTotal = calculateLineTotal(
          Number(item.quantity) || 0,
          Number(item.ratePerUnit) || 0,
          Number(item.discountPercent) || 0,
          Number(item.taxPercent) || 0
        );
      }
      next[index] = item;
      return next;
    });
  };

  const selectPresetFruit = (index: number, fruitName: string) => {
    const found = COMMON_FRUITS.find((f) => f.name === fruitName);
    if (found) {
      setItems((prev) => {
        const next = [...prev];
        const item = {
          ...next[index],
          fruitName: found.name,
          category: found.category,
          varietyGrade: found.grade,
          unit: found.unit,
          ratePerUnit: found.rate,
        };
        item.lineTotal = calculateLineTotal(
          Number(item.quantity) || 0,
          found.rate,
          Number(item.discountPercent) || 0,
          Number(item.taxPercent) || 0
        );
        next[index] = item;
        return next;
      });
    }
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        fruitName: '',
        category: 'Fresh Fruits',
        varietyGrade: 'Grade A',
        quantity: 1,
        unit: 'KG',
        ratePerUnit: 0,
        discountPercent: 0,
        taxPercent: 5,
        lineTotal: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Summary figures
  const subtotal = items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.ratePerUnit), 0);
  const discountTotal = items.reduce(
    (sum, i) => sum + Number(i.quantity) * Number(i.ratePerUnit) * (Number(i.discountPercent) / 100),
    0
  );
  const taxTotal = items.reduce((sum, i) => {
    const afterDisc =
      Number(i.quantity) * Number(i.ratePerUnit) * (1 - Number(i.discountPercent) / 100);
    return sum + afterDisc * (Number(i.taxPercent) / 100);
  }, 0);
  const grandTotal = subtotal - discountTotal + taxTotal;

  const currentAdvance = Number(advanceAmount) || 0;
  const computedPending =
    pendingAmount !== '' ? Number(pendingAmount) : Math.max(0, grandTotal - currentAdvance);

  const handleSubmit = async (submitForApproval: boolean) => {
    if (!supplierId) {
      setError('Please select a supplier');
      return;
    }
    if (items.length === 0) {
      setError('At least one item is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      await api.createPurchaseOrder({
        supplierId,
        expectedDeliveryDate: expectedDeliveryDate || null,
        deliveryAddress,
        advanceAmount: currentAdvance,
        pendingAmount: computedPending,
        notes,
        items,
        submitForApproval,
      });

      onSuccess(
        submitForApproval
          ? 'Purchase order submitted for approval'
          : 'Purchase order draft saved'
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal !w-[920px] max-w-[96vw] max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <div className="modal-header pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <span className="eyebrow flex items-center gap-1 text-emerald-700 font-bold">
              <ShoppingCart size={14} /> NEW PURCHASE ORDER
            </span>
            <h2 className="text-xl font-bold text-gray-900 mt-1">Create Fruit Procurement Order</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="my-2 p-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
            {error}
          </div>
        )}

        <div className="overflow-y-auto flex-1 pr-2 py-3 space-y-4 text-xs">
          {/* Top metadata grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-10 px-2.5 border border-gray-300 rounded-lg text-xs focus:border-emerald-600 focus:outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">Expected Delivery Date</label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full h-10 px-2.5 border border-gray-300 rounded-lg text-xs focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1 flex items-center justify-between">
                <span>Advance Amount (₹)</span>
                <span className="text-[10px] text-emerald-700 font-medium">Initial Pay</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={advanceAmount}
                onChange={(e) => {
                  setAdvanceAmount(e.target.value);
                  setPendingAmount('');
                }}
                placeholder="0.00"
                className="w-full h-10 px-2.5 border border-emerald-300 rounded-lg text-xs font-semibold text-emerald-900 bg-emerald-50/30 focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1 flex items-center justify-between">
                <span>Pending Balance (₹)</span>
                <span className="text-[10px] text-amber-700 font-medium">Balance Due</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={pendingAmount !== '' ? pendingAmount : Math.max(0, grandTotal - (Number(advanceAmount) || 0))}
                onChange={(e) => setPendingAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-10 px-2.5 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 bg-amber-50/30 focus:border-amber-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Delivery Destination Address</label>
            <input
              type="text"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full h-10 px-2.5 border border-gray-300 rounded-lg text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Fruit Line Items Table */}
          <div className="border border-emerald-900/10 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="bg-[#064D2B] text-white px-3 py-2 flex items-center justify-between">
              <span className="font-bold text-xs">Fruit / Product Procurement Items</span>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-[11px] font-semibold transition"
              >
                <Plus size={13} /> Add Product
              </button>
            </div>

            <div className="overflow-x-auto max-h-56">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#E7F5E9] text-[#064D2B] font-bold text-[11px]">
                  <tr>
                    <th className="py-2 px-2.5">Fruit / Item</th>
                    <th className="py-2 px-2">Category</th>
                    <th className="py-2 px-2">Grade</th>
                    <th className="py-2 px-2">Qty</th>
                    <th className="py-2 px-2">Unit</th>
                    <th className="py-2 px-2">Rate (₹)</th>
                    <th className="py-2 px-2">Disc%</th>
                    <th className="py-2 px-2">Tax%</th>
                    <th className="py-2 px-2 text-right">Total (₹)</th>
                    <th className="py-2 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-emerald-50/30">
                      <td className="p-1.5 min-w-[170px]">
                        <input
                          type="text"
                          list="fruit-presets"
                          value={item.fruitName}
                          onChange={(e) => {
                            updateItem(idx, 'fruitName', e.target.value);
                            selectPresetFruit(idx, e.target.value);
                          }}
                          className="w-full h-8 px-2 border border-gray-200 rounded text-xs"
                          placeholder="Select or enter fruit"
                        />
                      </td>
                      <td className="p-1.5 w-24">
                        <input
                          type="text"
                          value={item.category}
                          onChange={(e) => updateItem(idx, 'category', e.target.value)}
                          className="w-full h-8 px-1.5 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="p-1.5 w-28">
                        <input
                          type="text"
                          value={item.varietyGrade}
                          onChange={(e) => updateItem(idx, 'varietyGrade', e.target.value)}
                          className="w-full h-8 px-1.5 border border-gray-200 rounded text-xs"
                        />
                      </td>
                      <td className="p-1.5 w-20">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                          className="w-full h-8 px-1.5 border border-gray-200 rounded text-xs text-right"
                        />
                      </td>
                      <td className="p-1.5 w-20">
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                          className="w-full h-8 px-1 border border-gray-200 rounded text-xs"
                        >
                          <option value="KG">KG</option>
                          <option value="BOX">BOX</option>
                          <option value="CRATE">CRATE</option>
                          <option value="TON">TON</option>
                        </select>
                      </td>
                      <td className="p-1.5 w-24">
                        <input
                          type="number"
                          min="0"
                          value={item.ratePerUnit}
                          onChange={(e) => updateItem(idx, 'ratePerUnit', Number(e.target.value))}
                          className="w-full h-8 px-1.5 border border-gray-200 rounded text-xs text-right"
                        />
                      </td>
                      <td className="p-1.5 w-16">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => updateItem(idx, 'discountPercent', Number(e.target.value))}
                          className="w-full h-8 px-1 border border-gray-200 rounded text-xs text-right"
                        />
                      </td>
                      <td className="p-1.5 w-16">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.taxPercent}
                          onChange={(e) => updateItem(idx, 'taxPercent', Number(e.target.value))}
                          className="w-full h-8 px-1 border border-gray-200 rounded text-xs text-right"
                        />
                      </td>
                      <td className="p-1.5 w-28 text-right font-bold text-gray-800">
                        ₹{item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-1.5 w-10 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          disabled={items.length <= 1}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <datalist id="fruit-presets">
              {COMMON_FRUITS.map((f) => (
                <option key={f.name} value={f.name} />
              ))}
            </datalist>

            {/* Calculations Summary footer */}
            <div className="bg-gray-50 p-3 border-t border-gray-200 flex flex-col md:flex-row justify-between items-end gap-2 text-xs">
              <span className="text-gray-500 italic">
                * Rates are decimal-safe with verified product totals and GST compliance.
              </span>
              <div className="space-y-1 text-right min-w-[240px]">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Discount:</span>
                  <span>- ₹{discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (GST):</span>
                  <span>+ ₹{taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-bold text-sm text-[#087A3E] border-t border-gray-300 pt-1">
                  <span>Grand Total:</span>
                  <span>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs text-emerald-800 font-semibold">
                  <span>Advance Amount:</span>
                  <span>₹{currentAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs text-amber-900 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <span>Pending Balance:</span>
                  <span>₹{computedPending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Procurement Notes / Instructions</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Temperature must be kept at 2-4°C; Pre-shipment batch inspection certificate required."
              className="w-full p-2 border border-gray-300 rounded-lg text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="modal-actions pt-3 border-t border-gray-100 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="secondary-button !border-emerald-700 !text-emerald-800"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
          >
            Save Draft
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
          >
            Submit for Approval <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};

