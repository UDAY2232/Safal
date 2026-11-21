import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ShoppingCart, DollarSign, Calendar, Truck, FileText } from 'lucide-react';
import { api } from '../services/api';
import { Supplier } from '../types';
import { useAuth } from '../context/AuthContext';

interface CreatePOModalProps {
  onClose: () => void;
  onSuccess: (message?: string) => void;
  mode?: 'PO' | 'CD';
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({ onClose, onSuccess, mode }) => {
  const { user } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE';
  const isCD = mode === 'CD' || isEmployee;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierName, setSupplierName] = useState('');
  const [poDate, setPoDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('3-4-693/5/1/A/1, Raipura, Kakatiya colony, Hanamkonda, Telangana, 506011');
  const [orderPersonPlace, setOrderPersonPlace] = useState('Hyderabad');
  const [fruitDescription, setFruitDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState<string>('0');
  const [pendingAmount, setPendingAmount] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  const currentTotal = Number(totalAmount) || 0;
  const currentAdvance = Number(advanceAmount) || 0;
  const computedPending =
    pendingAmount !== '' ? Number(pendingAmount) : Math.max(0, currentTotal - currentAdvance);

  const handleSubmit = async (submitForApproval: boolean) => {
    if (!supplierName.trim()) {
      setError(isCD ? 'Please enter Customer Name' : 'Please enter or select a supplier name');
      return;
    }
    if (!totalAmount || Number(totalAmount) <= 0) {
      setError(isCD ? 'Please enter a valid Total CD Amount greater than 0' : 'Please enter a valid Total PO Amount greater than 0');
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

      await api.createPurchaseOrder({
        supplierId: finalSupplierId,
        poDate: poDate || new Date().toISOString(),
        expectedDeliveryDate: expectedDeliveryDate || null,
        deliveryAddress,
        orderPersonPlace: orderPersonPlace.trim() || 'Hyderabad',
        grandTotal: currentTotal,
        totalAmount: currentTotal,
        advanceAmount: currentAdvance,
        pendingAmount: computedPending,
        fruitName: fruitDescription.trim() || 'Wholesale Fruit Procurement',
        notes,
        isCD: isCD,
        type: isCD ? 'CD' : 'PO',
        items: [
          {
            fruitName: fruitDescription.trim() || 'Wholesale Fruit Procurement',
            category: 'Fresh Fruits',
            varietyGrade: 'Standard Procurement',
            quantity: 1,
            unit: 'CONSIGNMENT',
            ratePerUnit: currentTotal,
            discountPercent: 0,
            taxPercent: 0,
            lineTotal: currentTotal,
          },
        ],
        submitForApproval,
      });

      onSuccess(
        submitForApproval
          ? isCD
            ? 'Customer Due (CD) submitted for approval successfully'
            : 'Purchase order submitted for approval successfully'
          : isCD
          ? 'Customer Due (CD) draft saved successfully'
          : 'Purchase order draft saved successfully'
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
      <div className="modal !w-[820px] max-w-[96vw] max-h-[92vh] flex flex-col p-6 overflow-hidden">
        {/* Modal Header */}
        <div className="modal-header pb-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <span className="eyebrow flex items-center gap-1.5 text-emerald-700 font-bold">
              <ShoppingCart size={14} /> {isCD ? 'NEW CUSTOMER DUE (CD)' : 'NEW PURCHASE ORDER'}
            </span>
            <h2 className="text-xl font-bold text-gray-900 mt-1">
              {isCD ? 'Create Customer Due (CD)' : 'Create Fruit Procurement Order'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition"
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
          {/* Row 1: Customer/Supplier Name, CD/PO Date, Expected Delivery Date (omitted for customer due CD) */}
          <div className={`grid grid-cols-1 ${isCD ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-3`}>
            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                <span>{isCD ? 'Customer Name *' : 'Supplier Name *'}</span>
              </label>
              <input
                type="text"
                autoComplete="off"
                {...(!isCD ? { list: 'suppliers-datalist' } : {})}
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder={isCD ? 'e.g. Balaji Fruit Shop' : 'e.g. Royal Fruit Traders'}
                className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:border-emerald-600 focus:outline-none"
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

            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                <span>{isCD ? 'CD Date *' : 'PO Initiation Date *'}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Order Date</span>
              </label>
              <input
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:border-emerald-600 focus:outline-none"
                required
              />
            </div>

            {!isCD && (
              <div>
                <label className="block text-gray-700 font-bold mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Row 2: Financial Amounts (Total Amount, Payed/Advance, Pending) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                <span>{isCD ? 'TOTAL CD AMOUNT (₹) *' : 'TOTAL PO AMOUNT (₹) *'}</span>
                <span className="text-[10px] text-emerald-800 font-bold">Total payable</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={totalAmount}
                onChange={(e) => {
                  setTotalAmount(e.target.value);
                  setPendingAmount('');
                }}
                placeholder="0.00"
                className="w-full h-11 px-3 border-2 border-emerald-500 rounded-xl text-base font-black text-emerald-950 bg-white focus:border-emerald-700 focus:outline-none shadow-xs"
                required
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                {currentTotal > 0
                  ? `₹${currentTotal.toLocaleString('en-IN')}`
                  : isCD
                  ? 'Enter customer due contract amount'
                  : 'Enter procurement contract amount'}
              </span>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                <span>{isCD ? 'Payed Amount (₹)' : 'Advance Amount (₹)'}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">
                  {isCD ? 'Initial Payment' : 'Initial Advance'}
                </span>
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
                {currentAdvance > 0
                  ? `₹${currentAdvance.toLocaleString('en-IN')} paid upfront`
                  : isCD
                  ? 'No initial payment'
                  : 'No initial advance'}
              </span>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                <span>Pending Balance (₹)</span>
                <span className="text-[10px] text-amber-700 font-bold">Remaining Due</span>
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={pendingAmount !== '' ? pendingAmount : Math.max(0, currentTotal - currentAdvance)}
                onChange={(e) => setPendingAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 px-3 border-2 border-amber-400 rounded-xl text-sm font-black text-amber-900 bg-white focus:border-amber-600 focus:outline-none shadow-xs"
              />
              <span className="text-[10px] text-amber-800 font-semibold mt-1 block">
                ₹{computedPending.toLocaleString('en-IN')} {isCD ? 'pending customer due' : 'due upon delivery clearance'}
              </span>
            </div>
          </div>

          {/* Row 3: Order Person Location & Delivery / Shop Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                <span>{isCD ? 'Customer Area / City *' : 'Order Person Place / City *'}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">City / Location</span>
              </label>
              <input
                type="text"
                autoComplete="off"
                value={orderPersonPlace}
                onChange={(e) => setOrderPersonPlace(e.target.value)}
                placeholder="e.g. Hyderabad, Warangal, Vijayawada"
                className="w-full h-10 px-3 border border-emerald-300 rounded-xl text-xs font-semibold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                required
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                Region where order is placed (e.g. Hyderabad, Warangal)
              </span>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">
                {isCD ? 'Shop Address' : 'Delivery Destination Address'}
              </label>
              <input
                type="text"
                autoComplete="off"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder={isCD ? 'Enter retail shop address / area' : 'Delivery destination address'}
                className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Fruit / Item Description */}
          <div>
            <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
              <span>Fruit / Consignment Description</span>
              <span className="text-[10px] text-gray-400 font-normal">Optional details</span>
            </label>
            <input
              type="text"
              autoComplete="off"
              value={fruitDescription}
              onChange={(e) => setFruitDescription(e.target.value)}
              placeholder="e.g. Shimla Royal Apples (Export AAA), Nagpur Oranges"
              className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs text-gray-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Row 5: Procurement Notes or Customer Due Notes */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">
              {isCD ? 'Customer Due Notes' : 'Procurement Notes / Quality Instructions'}
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isCD
                  ? 'e.g. Customer due terms, payment schedule, or retailer contact notes.'
                  : 'e.g. Temperature must be kept at 2-4°C; Pre-shipment batch inspection certificate required; Cold chain verified.'
              }
              className="w-full p-3 border border-gray-300 rounded-xl text-xs focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5 flex-shrink-0">
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
            className="primary-button !py-2.5 !px-5"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Approval'} <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
