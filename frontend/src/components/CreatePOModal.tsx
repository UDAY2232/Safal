import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRight,
  ShoppingCart,
  DollarSign,
  Calendar,
  Truck,
  FileText,
  Plus,
  Trash2,
  Phone,
  User,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Supplier } from '../types';
import { useAuth } from '../context/AuthContext';

interface CreatePOModalProps {
  onClose: () => void;
  onSuccess: (message?: string) => void;
  mode?: 'PO' | 'CD';
}

export interface CDLineItem {
  id: string;
  fruitName: string;
  varietyGrade: string;
  quantity: string | number;
  unit: string;
  ratePerUnit: string | number;
  lineTotal: number;
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({ onClose, onSuccess, mode }) => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE';
  const isCD = mode === 'CD' || isEmployee;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderPersonName, setOrderPersonName] = useState(() => {
    if (user?.name) {
      return user.role === 'ADMIN' ? `${user.name} (Admin)` : user.name;
    }
    return 'Shanker (Admin)';
  });
  const [poDate, setPoDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderPersonPlace, setOrderPersonPlace] = useState('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState<string>('0');
  const [pendingAmount, setPendingAmount] = useState<string>('');
  const [manualTotalOverride, setManualTotalOverride] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Multi-Item rows support for employee CD creation: starts with 1 item by default, employee adds more via + button
  const [items, setItems] = useState<CDLineItem[]>([
    { id: '1', fruitName: '', varietyGrade: 'Grade A', quantity: '', unit: 'BOX', ratePerUnit: '', lineTotal: 0 },
  ]);

  useEffect(() => {
    async function loadSuppliers() {
      try {
        const list = await api.getSuppliers();
        setSuppliers(list);
        if (list.length > 0 && !supplierName && !isCD) setSupplierName(list[0].name);
      } catch {}
    }
    loadSuppliers();
  }, [isCD]);

  // Handle item updates and auto-compute line totals and totalAmount
  const handleItemChange = (index: number, field: keyof CDLineItem, val: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: val };

      const qty = Number(item.quantity) || 0;
      const rate = Number(item.ratePerUnit) || 0;
      item.lineTotal = qty * rate;
      updated[index] = item;

      // Auto-compute totalAmount from items sum unless manually overridden
      const itemsSum = updated.reduce((sum, it) => sum + (it.lineTotal > 0 ? it.lineTotal : 0), 0);
      if (!manualTotalOverride && itemsSum > 0) {
        setTotalAmount(String(itemsSum));
      }

      return updated;
    });
  };

  const addItemRow = () => {
    const nextId = String(items.length + 1);
    setItems((prev) => [
      ...prev,
      { id: nextId, fruitName: '', varietyGrade: 'Grade A', quantity: '', unit: 'BOX', ratePerUnit: '', lineTotal: 0 },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      const itemsSum = updated.reduce((sum, it) => sum + (it.lineTotal > 0 ? it.lineTotal : 0), 0);
      if (!manualTotalOverride && itemsSum > 0) {
        setTotalAmount(String(itemsSum));
      }
      return updated;
    });
  };

  const currentTotal = Number(totalAmount) || 0;
  const currentAdvance = Number(advanceAmount) || 0;
  const computedPending =
    pendingAmount !== '' ? Number(pendingAmount) : Math.max(0, currentTotal - currentAdvance);

  const handleSubmit = async (submitForApproval: boolean) => {
    if (!supplierName.trim()) {
      setError(isCD ? 'Please enter Customer / Shop Name' : 'Please enter or select a supplier name');
      return;
    }

    // Filter valid items
    const validItems = items.filter((it) => it.fruitName.trim().length > 0);
    const finalItemsTotal = validItems.reduce((sum, it) => sum + it.lineTotal, 0);
    const finalGrandTotal = currentTotal > 0 ? currentTotal : finalItemsTotal;

    if (finalGrandTotal <= 0) {
      setError(isCD ? 'Please enter fruit items or a valid Total CD Value greater than 0' : 'Please enter a valid Total PO Amount greater than 0');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // Find matching supplier or pass manual name
      const matched = suppliers.find(
        (s) => s.id === supplierName || s.name.toLowerCase() === supplierName.trim().toLowerCase()
      );
      const finalSupplierId = matched ? matched.id : supplierName.trim();

      // Format payload items
      const payloadItems =
        validItems.length > 0
          ? validItems.map((it) => ({
              fruitName: it.fruitName.trim(),
              category: 'Fresh Fruits',
              varietyGrade: it.varietyGrade || 'Grade A',
              quantity: Number(it.quantity) || 1,
              unit: it.unit || 'BOX',
              ratePerUnit: Number(it.ratePerUnit) || (finalGrandTotal / (Number(it.quantity) || 1)),
              discountPercent: 0,
              taxPercent: 0,
              lineTotal: it.lineTotal > 0 ? it.lineTotal : finalGrandTotal,
            }))
          : [
              {
                fruitName: 'Assorted Fruits Consignment',
                category: 'Fresh Fruits',
                varietyGrade: 'Grade A',
                quantity: 1,
                unit: 'LOT',
                ratePerUnit: finalGrandTotal,
                discountPercent: 0,
                taxPercent: 0,
                lineTotal: finalGrandTotal,
              },
            ];

      const fruitSummary =
        validItems.length > 0
          ? validItems.map((it) => `${it.fruitName} (${it.quantity} ${it.unit})`).join(', ')
          : 'Wholesale Fruit Procurement';

      await api.createPurchaseOrder({
        supplierId: finalSupplierId,
        customerPhone: customerPhone.trim(),
        orderPersonName: orderPersonName.trim(),
        poDate: poDate || new Date().toISOString(),
        expectedDeliveryDate: expectedDeliveryDate || null,
        deliveryAddress: deliveryAddress.trim(),
        orderPersonPlace: orderPersonPlace.trim() || 'Hanamkonda',
        grandTotal: finalGrandTotal,
        totalAmount: finalGrandTotal,
        advanceAmount: currentAdvance,
        pendingAmount: computedPending,
        fruitName: fruitSummary,
        notes: notes.trim(),
        isCD: isCD,
        type: isCD ? 'CD' : 'PO',
        items: payloadItems,
        submitForApproval,
      });

      onSuccess(
        submitForApproval
          ? isCD
            ? 'Customer Due (CD) created and submitted successfully!'
            : 'Purchase order submitted for approval successfully!'
          : isCD
          ? 'Customer Due (CD) draft saved successfully!'
          : 'Purchase order draft saved successfully!'
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create customer due record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal !w-[920px] max-w-[96vw] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-3xl shadow-2xl my-auto">
        {/* Modal Header */}
        <div className="modal-header pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <span className="eyebrow flex items-center gap-1.5 text-emerald-700 font-bold uppercase tracking-wider text-xs">
              <ShoppingCart size={15} /> {isCD ? 'NEW CUSTOMER DUE (CD)' : 'NEW PURCHASE ORDER'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 mt-1 font-['Manrope']">
              {isCD ? 'Create CD [Customer Due]' : 'Create Fruit Procurement Order'}
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {isCD
                ? 'Enter customer details, order fruit items, and upfront payment. Due is given 1-day settlement window.'
                : 'Procurement details and supplier order items.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="my-2 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="overflow-y-auto flex-1 pr-1 py-3 space-y-4 text-xs">
          {/* Section 1: Customer & Shop Details */}
          <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl space-y-3">
            <h3 className="font-extrabold text-xs text-[#064D2B] uppercase tracking-wider flex items-center gap-2">
              <User size={15} /> {isCD ? 'Customer / Buyer & Shop Details' : 'Customer & Shop Details'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Customer / Shop Name */}
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-bold mb-1">
                  Buyer Name *
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  {...(!isCD ? { list: 'suppliers-datalist' } : {})}
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder={isCD ? 'e.g. Balaji Fruit Shop / Retailer / Buyer Name' : 'e.g. Royal Fruit Traders / Buyer Name'}
                  className="w-full h-10 px-3 border border-emerald-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none shadow-2xs"
                  required
                />
                {!isCD && (
                  <datalist id="suppliers-datalist">
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.category}
                      </option>
                    ))}
                  </datalist>
                )}
              </div>

              {/* Customer Phone */}
              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                  <Phone size={12} className="text-emerald-700" />
                  <span>{isCD ? 'Buyer Phone / Contact' : 'Customer Phone / Contact'}</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98..."
                  className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-emerald-600 focus:outline-none shadow-2xs"
                />
              </div>

              {/* Order Date */}
              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-emerald-700" />
                  <span>{isCD ? 'CD Order Date *' : 'PO Date *'}</span>
                </label>
                <input
                  type="date"
                  value={poDate}
                  onChange={(e) => setPoDate(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none shadow-2xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Employee (Staff) / Created By */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Order Taken By (Staff / Admin) *
                </label>
                <input
                  type="text"
                  value={orderPersonName}
                  onChange={(e) => setOrderPersonName(e.target.value)}
                  placeholder="e.g. Shanker (Admin)"
                  className="w-full h-10 px-3 border border-emerald-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none shadow-2xs"
                  required
                />
              </div>

              {/* Customer Area / City */}
              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1">
                  <MapPin size={12} className="text-emerald-700" />
                  <span>{isCD ? 'Buyer Area / City *' : 'Delivery Hub Location *'}</span>
                </label>
                <input
                  type="text"
                  list="whitelisted-hubs"
                  value={orderPersonPlace}
                  onChange={(e) => setOrderPersonPlace(e.target.value)}
                  placeholder={isCD ? "e.g. Warangal, Hanamkonda, Hyderabad" : "Select one of 8 Whitelisted Hubs (e.g. Warangal)"}
                  className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none shadow-2xs"
                  required
                />
                <datalist id="whitelisted-hubs">
                  <option value="Chennai" />
                  <option value="Madurai" />
                  <option value="Varanasi" />
                  <option value="Siliguri" />
                  <option value="Bengaluru" />
                  <option value="Hyderabad" />
                  <option value="Warangal" />
                  <option value="Vijayawada" />
                </datalist>
              </div>
            </div>
          </div>

          {/* Section 2: Order Fruit Items */}
          <div className="p-4 bg-white border-2 border-emerald-500/30 rounded-2xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-xs text-[#064D2B] uppercase tracking-wider flex items-center gap-2">
                  <ShoppingCart size={15} /> Order Fruit Items ({items.length} {items.length === 1 ? 'Item' : 'Items'})
                </h3>
                <p className="text-[10px] text-gray-500">
                  {isCD
                    ? 'Enter details for fruit item (fruit name, variety, quantity, rate). Click "+ Add Item" for more.'
                    : 'Wholesale procurement items (Whitelisted: Kashmir Apples, Pomegranate, Watermelon, Muskmelon, Banana, Orange, Plum).'}
                </p>
              </div>

              <button
                type="button"
                onClick={addItemRow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#064D2B] hover:bg-[#087A3E] text-white text-xs font-bold rounded-xl shadow-xs transition"
              >
                <Plus size={14} /> + Add Item
              </button>
            </div>

            {/* Datalist for fast fruit suggestions */}
            <datalist id="popular-fruits-list">
              <option value="Kashmir Apples" />
              <option value="Pomegranate" />
              <option value="Watermelon" />
              <option value="Muskmelon" />
              <option value="Banana" />
              <option value="Orange" />
              <option value="Plum" />
              <option value="Shimla Royal Apples" />
              <option value="Kashmir Golden Apples" />
              <option value="Nagpur Oranges" />
              <option value="Bhagwa Pomegranate" />
              <option value="Alphonso Mango" />
              <option value="Banganapalli Mango" />
              <option value="Robusta Banana" />
              <option value="Yelakki Banana" />
              <option value="Anab-e-Shahi Grapes" />
              <option value="Sonaka Seedless Grapes" />
              <option value="Taiwan Red Papaya" />
              <option value="Queen Pineapple" />
              <option value="Dragon Fruit" />
              <option value="Mosambi (Sweet Lime)" />
              <option value="Custard Apple (Sitaphal)" />
              <option value="Watermelon" />
            </datalist>

            {/* Items Table / Responsive Rows */}
            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 bg-gray-50/80 hover:bg-emerald-50/40 border border-gray-200 rounded-xl transition flex flex-col md:flex-row items-stretch md:items-center gap-2.5"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px] grid place-items-center flex-shrink-0">
                    {idx + 1}
                  </div>

                  {/* Fruit Name */}
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 md:hidden">
                      Fruit Name
                    </label>
                    <input
                      type="text"
                      list="popular-fruits-list"
                      value={item.fruitName}
                      onChange={(e) => handleItemChange(idx, 'fruitName', e.target.value)}
                      placeholder={`Fruit #${idx + 1} (e.g. Apples, Oranges)`}
                      className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  {/* Variety / Grade */}
                  <div className="w-full md:w-32 flex-shrink-0">
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 md:hidden">
                      Variety / Grade
                    </label>
                    <input
                      type="text"
                      value={item.varietyGrade}
                      onChange={(e) => handleItemChange(idx, 'varietyGrade', e.target.value)}
                      placeholder="Grade A / Box 10kg"
                      className="w-full h-9 px-2 border border-gray-300 rounded-lg text-xs text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  {/* Quantity & Unit */}
                  <div className="flex items-center gap-1.5 w-full md:w-36 flex-shrink-0">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5 md:hidden">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-full h-9 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-center focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div className="w-16">
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5 md:hidden">
                        Unit
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full h-9 px-1 border border-gray-300 rounded-lg text-[11px] font-bold text-gray-700 bg-white focus:border-emerald-600 focus:outline-none"
                      >
                        <option value="BOX">BOX</option>
                        <option value="KG">KG</option>
                        <option value="CRATE">CRATE</option>
                        <option value="TON">TON</option>
                        <option value="LOT">LOT</option>
                      </select>
                    </div>
                  </div>

                  {/* Rate Per Unit */}
                  <div className="w-full md:w-28 flex-shrink-0">
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 md:hidden">
                      Rate (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={item.ratePerUnit}
                      onChange={(e) => handleItemChange(idx, 'ratePerUnit', e.target.value)}
                      placeholder="Rate ₹"
                      className="w-full h-9 px-2 border border-gray-300 rounded-lg text-xs font-bold text-emerald-900 bg-white text-right focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  {/* Item Line Total */}
                  <div className="w-full md:w-28 flex-shrink-0 text-right">
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 md:hidden">
                      Total
                    </label>
                    <div className="h-9 px-2 bg-emerald-100/60 rounded-lg flex items-center justify-end font-black text-xs text-emerald-950 border border-emerald-200">
                      ₹{item.lineTotal.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Delete button */}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition self-end md:self-auto"
                      title="Remove Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs font-bold text-[#064D2B] hover:text-[#087A3E] flex items-center gap-1"
              >
                <Plus size={14} /> + Add Another Item (Item #{items.length + 1})
              </button>
              <span className="text-xs font-bold text-gray-600">
                Items Total:{' '}
                <strong className="text-sm font-black text-emerald-900">
                  ₹{items.reduce((s, it) => s + it.lineTotal, 0).toLocaleString('en-IN')}
                </strong>
              </span>
            </div>
          </div>

          {/* Section 3: Financial Settlement Breakdown */}
          <div className="p-4 bg-emerald-50/80 border-2 border-emerald-400/50 rounded-2xl space-y-3">
            <h3 className="font-extrabold text-xs text-[#064D2B] uppercase tracking-wider flex items-center gap-2">
              <DollarSign size={15} /> Financial Settlement Breakdown
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Total CD Value */}
              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                  <span>{isCD ? 'Total CD Value (₹) *' : 'Total PO Value (₹) *'}</span>
                  <span className="text-[10px] text-emerald-800 font-bold">Total Order</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={totalAmount}
                  onChange={(e) => {
                    setTotalAmount(e.target.value);
                    setManualTotalOverride(true);
                    setPendingAmount('');
                  }}
                  placeholder="0.00"
                  className="w-full h-11 px-3 border-2 border-emerald-500 rounded-xl text-base font-black text-emerald-950 bg-white focus:border-emerald-700 focus:outline-none shadow-xs"
                  required
                />
                <span className="text-[10px] text-gray-500 mt-1 block font-semibold">
                  {currentTotal > 0 ? `₹${currentTotal.toLocaleString('en-IN')}` : 'Enter or auto-calculated from items'}
                </span>
              </div>

              {/* Payed Amount Upfront */}
              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                  <span>{isCD ? 'Payed Amount (₹)' : 'Advance Amount (₹)'}</span>
                  <span className="text-[10px] text-emerald-700 font-bold">Paid upfront</span>
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
                  className="w-full h-11 px-3 border border-emerald-400 rounded-xl text-sm font-bold text-emerald-900 bg-white focus:border-emerald-600 focus:outline-none shadow-xs"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {currentAdvance > 0 ? `₹${currentAdvance.toLocaleString('en-IN')} collected today` : '₹0 (No upfront payment)'}
                </span>
                {!isCD && currentTotal > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const adv = Math.round(currentTotal * 0.70);
                      setAdvanceAmount(String(adv));
                      setPendingAmount(String(currentTotal - adv));
                    }}
                    className="mt-1.5 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-[#064D2B] rounded-lg text-[10px] font-black transition cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles size={11} /> Apply 70% Vendor Advance (₹{Math.round(currentTotal * 0.70).toLocaleString('en-IN')})
                  </button>
                )}
              </div>

              {/* Pending Due Balance */}
              <div>
                <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                  <span>Pending Due Balance (₹)</span>
                  <span className="text-[10px] text-rose-700 font-bold">1-Day Window</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={pendingAmount !== '' ? pendingAmount : Math.max(0, currentTotal - currentAdvance)}
                  onChange={(e) => setPendingAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-11 px-3 border-2 border-rose-400 rounded-xl text-sm font-black text-rose-900 bg-white focus:border-rose-600 focus:outline-none shadow-xs"
                />
                <span className="text-[10px] text-rose-800 font-bold mt-1 block">
                  ₹{computedPending.toLocaleString('en-IN')} pending · 1-day grace period
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Notes / Remarks */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">
              {isCD ? 'Customer Due Notes / Remarks' : 'Procurement Instructions'}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isCD
                  ? 'e.g. Retailer promises settlement by tomorrow evening; shop located near main chowrasta.'
                  : 'Quality guidelines or delivery details.'
              }
              className="w-full p-2.5 border border-gray-300 rounded-xl text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5 flex-shrink-0">
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
            className="secondary-button !border-emerald-700 !text-emerald-800 hover:!bg-emerald-50"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
          >
            Save Draft
          </button>
          <button
            type="button"
            className="primary-button !py-2.5 !px-6"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting CD...' : isCD ? 'Create & Submit CD' : 'Submit for Approval'} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
