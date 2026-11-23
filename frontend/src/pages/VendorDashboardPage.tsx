import React, { useState, useEffect } from 'react';
import {
  Truck,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  Lock,
  Building2,
  Calendar,
  DollarSign,
  Phone,
  User,
  ShieldCheck,
  Eye,
  X,
  ArrowRight,
  Download,
  Coins,
  MapPin,
  Sparkles,
  ShoppingCart,
  Plus,
  Trash2,
  Scale,
  ExternalLink,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Search,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PurchaseOrder, VENDOR_WHITELISTED_LOCATIONS, VENDOR_WHITELISTED_FRUITS } from '../types';

interface VendorDashboardPageProps {
  onNotify: (msg: string) => void;
  onCreatePO?: () => void;
  activePage?: string;
  onNavigate?: (page: string) => void;
}

export const VendorDashboardPage: React.FC<VendorDashboardPageProps> = ({
  onNotify,
  onCreatePO,
  activePage,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({
    totalPOs: 0,
    inTransitPOs: 0,
    pendingDispatchPOs: 0,
    deliveredPOs: 0,
    totalOrderValue: 0,
    totalAdvanceReceived: 0,
    totalPendingBalance: 0,
  });
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'dispatch' | 'qc' | 'kyc'>('orders');
  const [viewSlipModalUrl, setViewSlipModalUrl] = useState<string | null>(null);

  // Consignments Search, Filter, Expand & Media Preview State
  const [consignmentFilter, setConsignmentFilter] = useState<'ALL' | 'PENDING' | 'IN_TRANSIT' | 'DELIVERED'>('ALL');
  const [consignmentSearch, setConsignmentSearch] = useState('');
  const [expandedPOId, setExpandedPOId] = useState<string | null>(null);
  const [previewMediaModal, setPreviewMediaModal] = useState<{ url: string; title: string } | null>(null);

  // Dispatch Modal state
  const [selectedPOForDispatch, setSelectedPOForDispatch] = useState<PurchaseOrder | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehiclePhotoFile, setVehiclePhotoFile] = useState<File | null>(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState<string>('');
  const [transportBillFile, setTransportBillFile] = useState<File | null>(null);
  const [transportBillPreview, setTransportBillPreview] = useState<string>('');
  const [isSubmittingDispatch, setIsSubmittingDispatch] = useState(false);
  const [dispatchError, setDispatchError] = useState('');

  // Vendor Supply PO Creation State
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [targetHub, setTargetHub] = useState<string>('Warangal');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [poNotes, setPoNotes] = useState('');

  // Selected Fruit & Layer Breakdown
  const [selectedFruit, setSelectedFruit] = useState<string>('Kashmir Apples');
  // Dynamic Apple Layer Sizing (4L, 5L, Roll, Total, Amount)
  const [layer4LBoxes, setLayer4LBoxes] = useState<string>('200');
  const [layer4LRate, setLayer4LRate] = useState<string>('1200');
  const [layer5LBoxes, setLayer5LBoxes] = useState<string>('250');
  const [layer5LRate, setLayer5LRate] = useState<string>('1100');
  const [rollBoxes, setRollBoxes] = useState<string>('50');
  const [rollRate, setRollRate] = useState<string>('700');

  // Other Fruit Sizing
  const [otherQuantity, setOtherQuantity] = useState<string>('500');
  const [otherUnit, setOtherUnit] = useState<string>('BOX');
  const [otherRate, setOtherRate] = useState<string>('950');
  const [otherGrade, setOtherGrade] = useState<string>('Grade A Export Quality');

  // Supply Creation Direct Dispatch Proof Uploads
  const [supplyVehicleNumber, setSupplyVehicleNumber] = useState<string>('');
  const [supplyTransporterName, setSupplyTransporterName] = useState<string>('');
  const [supplyDriverPhone, setSupplyDriverPhone] = useState<string>('');
  const [supplyVehiclePhotoFile, setSupplyVehiclePhotoFile] = useState<File | null>(null);
  const [supplyVehiclePhotoPreview, setSupplyVehiclePhotoPreview] = useState<string>('');
  const [supplyTransportBillFile, setSupplyTransportBillFile] = useState<File | null>(null);
  const [supplyTransportBillPreview, setSupplyTransportBillPreview] = useState<string>('');

  const [isSubmittingPO, setIsSubmittingPO] = useState(false);
  const [createPOError, setCreatePOError] = useState('');

  // Dynamic calculations for Fruit Supply
  const isApple = selectedFruit === 'Kashmir Apples' || selectedFruit.toLowerCase().includes('apple');
  const apple4LAmount = (Number(layer4LBoxes) || 0) * (Number(layer4LRate) || 0);
  const apple5LAmount = (Number(layer5LBoxes) || 0) * (Number(layer5LRate) || 0);
  const appleRollAmount = (Number(rollBoxes) || 0) * (Number(rollRate) || 0);
  const totalAppleBoxes = (Number(layer4LBoxes) || 0) + (Number(layer5LBoxes) || 0) + (Number(rollBoxes) || 0);
  const totalAppleAmount = apple4LAmount + apple5LAmount + appleRollAmount;

  const otherTotalAmount = (Number(otherQuantity) || 0) * (Number(otherRate) || 0);
  const grandSupplyTotal = isApple ? totalAppleAmount : otherTotalAmount;
  const autoAdvanceAmount = Math.round(grandSupplyTotal * 0.55);
  const pendingBalanceAmount = Math.max(0, grandSupplyTotal - autoAdvanceAmount);

  // Synchronize activeTab when navigation changes from the left sidebar
  useEffect(() => {
    if (activePage === 'Weighbridge & QC Slips') {
      setActiveTab('qc');
    } else if (activePage === 'Ready for Dispatch') {
      setActiveTab('dispatch');
    } else if (activePage === 'Supply Consignments') {
      setActiveTab('orders');
    }
  }, [activePage]);

  // Global Escape key listener to close any open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreatePOModal(false);
        setSelectedPOForDispatch(null);
        setViewSlipModalUrl(null);
        setPreviewMediaModal(null);
      }
    };
    if (showCreatePOModal || selectedPOForDispatch || viewSlipModalUrl || previewMediaModal) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showCreatePOModal, selectedPOForDispatch, viewSlipModalUrl]);

  const handleTabClick = (tab: 'orders' | 'dispatch' | 'qc' | 'kyc') => {
    setActiveTab(tab);
    if (onNavigate) {
      if (tab === 'qc') {
        onNavigate('Weighbridge & QC Slips');
      } else if (tab === 'dispatch') {
        onNavigate('Ready for Dispatch');
      } else if (tab === 'orders') {
        onNavigate('Supply Consignments');
      } else {
        onNavigate('Dashboard');
      }
    }
  };

  const handleSupplyVehiclePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSupplyVehiclePhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSupplyVehiclePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSupplyTransportBillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSupplyTransportBillFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSupplyTransportBillPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFruitSelect = (fruit: string) => {
    setSelectedFruit(fruit);
    if (fruit === 'Kashmir Apples' || fruit.toLowerCase().includes('apple')) {
      if (!layer4LBoxes) setLayer4LBoxes('200');
      if (!layer4LRate) setLayer4LRate('1200');
      if (!layer5LBoxes) setLayer5LBoxes('250');
      if (!layer5LRate) setLayer5LRate('1100');
      if (!rollBoxes) setRollBoxes('50');
      if (!rollRate) setRollRate('700');
    } else {
      if (!otherQuantity) setOtherQuantity('500');
      if (!otherRate) setOtherRate('950');
    }
  };

  const handleSubmitVendorPO = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatePOError('');

    if (grandSupplyTotal <= 0) {
      setCreatePOError('Total consignment value must be greater than ₹0.');
      return;
    }

    try {
      setIsSubmittingPO(true);
      const formData = new FormData();
      formData.append('destinationHub', targetHub);
      if (expectedDeliveryDate) {
        formData.append('expectedDeliveryDate', expectedDeliveryDate);
      }
      formData.append('fruitName', selectedFruit);
      formData.append('notes', poNotes);

      if (isApple) {
        formData.append('layer4LBoxes', String(Number(layer4LBoxes) || 0));
        formData.append('layer4LRate', String(Number(layer4LRate) || 0));
        formData.append('layer5LBoxes', String(Number(layer5LBoxes) || 0));
        formData.append('layer5LRate', String(Number(layer5LRate) || 0));
        formData.append('rollBoxes', String(Number(rollBoxes) || 0));
        formData.append('rollRate', String(Number(rollRate) || 0));
      } else {
        const items = [
          {
            fruitName: selectedFruit,
            category: 'Fresh Fruits',
            varietyGrade: otherGrade || 'Grade A Export Quality',
            quantity: Number(otherQuantity) || 1,
            unit: otherUnit || 'BOX',
            ratePerUnit: Number(otherRate) || 0,
            lineTotal: otherTotalAmount,
          },
        ];
        formData.append('items', JSON.stringify(items));
      }

      if (supplyVehicleNumber.trim()) {
        formData.append('dispatchVehicleNumber', supplyVehicleNumber.trim().toUpperCase());
      }
      if (supplyTransporterName.trim()) {
        formData.append('transporterName', supplyTransporterName.trim());
      }
      if (supplyDriverPhone.trim()) {
        formData.append('driverPhone', supplyDriverPhone.trim());
      }
      if (supplyVehiclePhotoFile) {
        formData.append('vehiclePhoto', supplyVehiclePhotoFile);
      }
      if (supplyTransportBillFile) {
        formData.append('transportBill', supplyTransportBillFile);
      }

      const res = await api.createVendorSupplyPO(formData);
      setShowCreatePOModal(false);
      onNotify(res.message || 'Consignment Supply PO submitted successfully with 55% Auto-Advance Guarantee!');

      // Reset form fields
      setSupplyVehicleNumber('');
      setSupplyTransporterName('');
      setSupplyDriverPhone('');
      setSupplyVehiclePhotoFile(null);
      setSupplyVehiclePhotoPreview('');
      setSupplyTransportBillFile(null);
      setSupplyTransportBillPreview('');

      await loadData();
      setActiveTab('orders');
    } catch (err: any) {
      setCreatePOError(err.message || 'Failed to submit consignment PO');
    } finally {
      setIsSubmittingPO(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, profileRes, poRes] = await Promise.all([
        api.getVendorDashboardStats().catch(() => null),
        api.getVendorProfile().catch(() => null),
        api.getVendorPOs().catch(() => []),
      ]);

      if (statsRes && statsRes.stats) {
        setStats(statsRes.stats);
      }
      if (profileRes && profileRes.vendor) {
        setVendorProfile(profileRes.vendor);
      }
      if (Array.isArray(poRes)) {
        setOrders(poRes);
      }
    } catch (err: any) {
      console.error('Vendor data load error:', err);
      onNotify('Failed to load vendor portal records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVehiclePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVehiclePhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setVehiclePhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTransportBillChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTransportBillFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTransportBillPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOForDispatch) return;

    if (!vehicleNumber.trim()) {
      setDispatchError('Vehicle Registration Number is mandatory');
      return;
    }

    if (!vehiclePhotoFile) {
      setDispatchError('Please upload a clear photo of the vehicle showing the number plate');
      return;
    }

    if (!transportBillFile) {
      setDispatchError('Please upload the Transport Bill / Bilty (LR Copy)');
      return;
    }

    try {
      setIsSubmittingDispatch(true);
      setDispatchError('');

      const formData = new FormData();
      formData.append('poId', selectedPOForDispatch.id);
      formData.append('dispatchVehicleNumber', vehicleNumber.trim().toUpperCase());
      formData.append('transporterName', transporterName.trim());
      formData.append('driverPhone', driverPhone.trim());
      formData.append('vehiclePhoto', vehiclePhotoFile);
      formData.append('transportBill', transportBillFile);

      const res = await api.submitPODispatch(formData);
      onNotify(res.message || 'Consignment dispatch submitted successfully! Safal Admin notified.');

      // Reset modal state
      setSelectedPOForDispatch(null);
      setVehicleNumber('');
      setTransporterName('');
      setDriverPhone('');
      setVehiclePhotoFile(null);
      setVehiclePhotoPreview('');
      setTransportBillFile(null);
      setTransportBillPreview('');

      // Reload data
      loadData();
    } catch (err: any) {
      setDispatchError(err.message || 'Failed to submit dispatch details');
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  const pendingDispatchOrders = orders.filter(
    (o) =>
      (!o.dispatchStatus || o.dispatchStatus === 'PENDING_DISPATCH') &&
      o.status !== 'CLOSED' &&
      o.status !== 'CANCELLED' &&
      o.status !== 'REJECTED'
  );

  const inTransitOrders = orders.filter(
    (o) => o.dispatchStatus === 'LOADED_AND_DISPATCHED' || o.dispatchStatus === 'IN_TRANSIT'
  );

  const deliveredAndVerifiedOrders = orders.filter(
    (o) => o.dispatchStatus === 'DELIVERED_AT_HUB' || o.status === 'CLOSED'
  );

  const filteredOrders = orders.filter((po) => {
    if (consignmentFilter === 'PENDING') {
      if (
        po.dispatchStatus === 'LOADED_AND_DISPATCHED' ||
        po.dispatchStatus === 'IN_TRANSIT' ||
        po.dispatchStatus === 'DELIVERED_AT_HUB' ||
        po.status === 'CLOSED'
      ) {
        return false;
      }
    } else if (consignmentFilter === 'IN_TRANSIT') {
      if (po.dispatchStatus !== 'LOADED_AND_DISPATCHED' && po.dispatchStatus !== 'IN_TRANSIT') {
        return false;
      }
    } else if (consignmentFilter === 'DELIVERED') {
      if (po.dispatchStatus !== 'DELIVERED_AT_HUB' && po.status !== 'CLOSED') {
        return false;
      }
    }

    if (consignmentSearch.trim()) {
      const q = consignmentSearch.toLowerCase();
      const matchPO = po.poNumber?.toLowerCase().includes(q);
      const matchHub = po.orderPersonPlace?.toLowerCase().includes(q);
      const matchFruit =
        po.fruitName?.toLowerCase().includes(q) ||
        po.items?.some((it) => it.fruitName.toLowerCase().includes(q));
      const matchTruck = po.dispatchVehicleNumber?.toLowerCase().includes(q);
      return matchPO || matchHub || matchFruit || matchTruck;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Corporate Vendor Header */}
      <div className="bg-gradient-to-r from-[#064D2B] via-[#086337] to-[#0A7B44] text-white p-5 sm:p-7 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-400/30 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
              <Building2 size={13} />
              <span>Wholesale Procurement &amp; Logistics Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Manrope'] tracking-tight">
              {vendorProfile?.businessName || user?.name || 'Vendor Operations Portal'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-2xl">
              Vendor Code:{' '}
              <strong className="text-white underline decoration-emerald-300">
                {vendorProfile?.vendorId || 'VND-001'}
              </strong>{' '}
              · Primary Delivery Hub: <strong>{vendorProfile?.primaryLocation || 'Warangal'}</strong> · Hub 1 Live
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-300/40 text-emerald-100 text-xs font-extrabold inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-300" /> Verified Partner
            </span>
            <button
              onClick={() => setShowCreatePOModal(true)}
              className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-gray-950 text-xs font-black transition shadow-md inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus size={15} /> + Create Supply PO
            </button>
            <button
              onClick={() => handleTabClick('kyc')}
              className="px-3.5 py-1.5 rounded-xl bg-white text-[#064D2B] hover:bg-emerald-50 text-xs font-extrabold transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Lock size={13} /> View Frozen KYC
            </button>
          </div>
        </div>

        {/* Ambient background watermark icon */}
        <Truck className="absolute -right-6 -bottom-8 text-white/5 w-48 h-48 pointer-events-none" />
      </div>

      {/* 2. Navigation Tab Pills */}
      <div className="bg-white p-2 rounded-2xl border border-[#D5E3D8] shadow-xs flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleTabClick('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#064D2B] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ShoppingCart size={15} /> Supply Consignments ({orders.length})
        </button>

        <button
          onClick={() => handleTabClick('dispatch')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'dispatch'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <Truck size={15} /> Ready for Dispatch ({pendingDispatchOrders.length})
        </button>

        <button
          onClick={() => handleTabClick('qc')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'qc'
              ? 'bg-[#087A3E] text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <Scale size={15} /> Weighbridge &amp; QC Slips ({orders.filter((o) => o.weighbridgeNetKg || o.dispatchStatus === 'IN_TRANSIT' || o.dispatchStatus === 'LOADED_AND_DISPATCHED').length})
        </button>

        <button
          onClick={() => handleTabClick('kyc')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'kyc'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <Lock size={15} /> Frozen KYC &amp; Bank Profile
        </button>
      </div>

      {/* 3. Stat Cards (Side-by-Side: 2 Columns on Mobile, 4 on Desktop) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4">
        {/* Card 1: Total POs */}
        <div className="stat-card blue flex items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#EEF5FF] border border-[#D4E5FB]">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#DCEBFF] flex items-center justify-center text-[#1564B7] flex-shrink-0">
            <FileText size={20} strokeWidth={2.2} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs font-bold text-gray-700 block truncate">My Total Orders</span>
            <strong className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 font-['Manrope'] block mt-0.5">
              {stats.totalPOs}
            </strong>
            <small className="text-[10px] text-gray-500 hidden sm:block truncate">Procurement contracts</small>
          </div>
        </div>

        {/* Card 2: In-Transit Trucks */}
        <div className="stat-card green flex items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#EAF8EE] border border-[#CEEED7]">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#CEF2D8] flex items-center justify-center text-[#15813E] flex-shrink-0">
            <Truck size={20} strokeWidth={2.2} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-900 block truncate">Trucks in Transit</span>
            <strong className="text-xl sm:text-2xl lg:text-3xl font-black text-[#064D2B] font-['Manrope'] block mt-0.5">
              {stats.inTransitPOs}
            </strong>
            <small className="text-[10px] text-emerald-700 hidden sm:block truncate">Dispatched on road</small>
          </div>
        </div>

        {/* Card 3: Total Order Value */}
        <div className="stat-card gold flex items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#FEF9E6] border border-[#FCEBB5]">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FEEBB0] flex items-center justify-center text-[#B68100] flex-shrink-0">
            <Coins size={20} strokeWidth={2.2} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs font-bold text-gray-800 block truncate">Total Contract Value</span>
            <strong className="text-sm sm:text-base md:text-xl lg:text-2xl font-black text-gray-900 font-['Manrope'] block mt-0.5 truncate">
              ₹{Number(stats.totalOrderValue || 0).toLocaleString('en-IN')}
            </strong>
            <small className="text-[10px] text-gray-500 hidden sm:block truncate">Gross order commitments</small>
          </div>
        </div>

        {/* Card 4: Advance Cleared */}
        <div className="stat-card rose flex items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-emerald-700 flex-shrink-0">
            <CreditCard size={20} strokeWidth={2.2} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-950 block truncate">Advance Received</span>
            <strong className="text-sm sm:text-base md:text-xl lg:text-2xl font-black text-emerald-800 font-['Manrope'] block mt-0.5 truncate">
              ₹{Number(stats.totalAdvanceReceived || 0).toLocaleString('en-IN')}
            </strong>
            <small className="text-[10px] text-emerald-700 hidden sm:block truncate">Cleared via bank transfer</small>
          </div>
        </div>
      </section>

      {/* 4. Tab Content: Dispatch Queue */}
      {activeTab === 'dispatch' && (
        <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm overflow-hidden p-5 space-y-4">
          <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Truck className="text-amber-600" size={20} />
                Orders Pending Dispatch Proof Submission
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Upload clear vehicle photo showing registration number plate and transport bill (bilty) to notify Safal logistics.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black self-start sm:self-auto">
              {pendingDispatchOrders.length} Ready for Loading
            </span>
          </div>

          {pendingDispatchOrders.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2" />
              <p className="font-bold text-gray-800 text-sm">All Active Consignments Dispatched!</p>
              <p className="text-xs text-gray-500 mt-1">There are no pending purchase orders waiting for truck dispatch.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingDispatchOrders.map((order) => {
                const advance = Number(order.advanceAmount || 0);
                const total = Number(order.grandTotal || 0);
                const balance = Number(order.pendingAmount ?? Math.max(0, total - advance));

                return (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/80 transition flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-base font-extrabold text-[#087A3E]">{order.poNumber}</strong>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 uppercase">
                          Awaiting Dispatch
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5">
                        <MapPin size={13} className="text-gray-400" /> Delivery Hub:{' '}
                        <strong>{order.orderPersonPlace || vendorProfile?.primaryLocation || 'Warangal'}</strong>
                      </p>

                      {/* Items */}
                      <div className="mt-2.5 pt-2 border-t border-amber-200/60 text-xs">
                        <span className="font-bold text-gray-700 block mb-1">Items for Transit:</span>
                        {order.items && order.items.length > 0 ? (
                          <ul className="space-y-0.5">
                            {order.items.map((it, idx) => (
                              <li key={idx} className="text-gray-600 text-[11px] flex justify-between">
                                <span>🍏 {it.fruitName} ({it.varietyGrade})</span>
                                <strong>{it.quantity} {it.unit}</strong>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Commodity items specified in PO</span>
                        )}
                      </div>

                      {/* Financial info */}
                      <div className="mt-3 grid grid-cols-3 gap-2 p-2 bg-white rounded-xl border border-amber-200/80 text-center">
                        <div>
                          <span className="text-[10px] text-gray-500 block">Total Value</span>
                          <strong className="text-xs font-bold text-gray-900">₹{total.toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-700 block">Advance Cleared</span>
                          <strong className="text-xs font-bold text-emerald-700">₹{advance.toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-800 block">Balance Due</span>
                          <strong className="text-xs font-bold text-amber-900">₹{balance.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPOForDispatch(order);
                        setDispatchError('');
                      }}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Upload size={14} /> Submit Vehicle Photo &amp; Bilty
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 5. Tab Content: Fruit Supply Consignments */}
      {activeTab === 'orders' && (
        <section className="bg-white rounded-3xl border border-[#D5E3D8] shadow-sm overflow-hidden space-y-0">
          {/* Header Banner */}
          <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/80 via-white to-white">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#064D2B] text-white flex items-center justify-center font-black shadow-xs flex-shrink-0">
                <ShoppingCart size={22} />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider block">
                  Wholesale Procurement Supply Desk
                </span>
                <h2 className="text-base sm:text-lg font-black text-gray-900 font-['Manrope']">
                  Fruit Supply Consignments (పండ్ల సప్లై కన్సైన్‌మెంట్లు)
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Direct fruit supply dispatches to SAFAL Regional Hubs with 55% Auto-Advance Guarantee.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setShowCreatePOModal(true)}
                className="px-4 py-2.5 rounded-xl bg-[#087A3E] hover:bg-[#064D2B] text-white text-xs font-black transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus size={15} /> + Create Supply Consignment
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-3.5 bg-gray-50/80 border-b border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setConsignmentFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  consignmentFilter === 'ALL'
                    ? 'bg-[#064D2B] text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                All Consignments ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setConsignmentFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  consignmentFilter === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Pending Dispatch ({pendingDispatchOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setConsignmentFilter('IN_TRANSIT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  consignmentFilter === 'IN_TRANSIT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                In Transit ({inTransitOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setConsignmentFilter('DELIVERED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  consignmentFilter === 'DELIVERED'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Delivered &amp; QC Verified ({deliveredAndVerifiedOrders.length})
              </button>
            </div>

            <div className="relative sm:w-72">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={consignmentSearch}
                onChange={(e) => setConsignmentSearch(e.target.value)}
                placeholder="Search PO #, Hub, Fruit, Truck..."
                className="w-full h-8 pl-8 pr-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Consignments Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse min-w-[950px] text-xs">
              <thead>
                <tr className="bg-[#064D2B] text-white">
                  <th className="py-3 px-3 text-center font-bold w-12 border-r border-[#085A33]">S.No.</th>
                  <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Consignment PO #</th>
                  <th className="py-3 px-3 text-left font-bold border-r border-[#085A33]">Fruit &amp; Layer Breakdown</th>
                  <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Destination Hub</th>
                  <th className="py-3 px-3 text-right font-bold border-r border-[#085A33]">Consignment Value</th>
                  <th className="py-3 px-3 text-right font-bold border-r border-[#085A33]">55% Auto-Advance</th>
                  <th className="py-3 px-3 text-right font-bold border-r border-[#085A33]">45% Balance Due</th>
                  <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Logistics &amp; Proof</th>
                  <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Status</th>
                  <th className="py-3 px-3 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-gray-400">
                      <ShoppingCart size={32} className="mx-auto mb-2 text-gray-300" />
                      No supply consignments found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((po, idx) => {
                    const total = Number(po.grandTotal || 0);
                    const advance = Number(po.advanceAmount || Math.round(total * 0.55));
                    const balance = Number(po.pendingAmount ?? Math.max(0, total - advance));
                    const isExpanded = expandedPOId === po.id;

                    // Compute fruit summary & layer counts
                    const appleItems = po.items?.filter((it) => it.fruitName.toLowerCase().includes('apple')) || [];
                    const isAppleConsignment = appleItems.length > 0 || po.fruitName?.toLowerCase().includes('apple');
                    const totalBoxes = po.items?.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) || 0;

                    return (
                      <React.Fragment key={po.id}>
                        <tr
                          className="hover:bg-emerald-50/20 transition cursor-pointer"
                          onClick={() => setExpandedPOId(isExpanded ? null : po.id)}
                        >
                          <td className="text-center py-3.5 px-3 font-bold text-gray-600 border-r border-gray-100">
                            {idx + 1}
                          </td>

                          {/* Consignment PO Number */}
                          <td className="text-center py-3.5 px-3 font-black text-[#087A3E] border-r border-gray-100 whitespace-nowrap">
                            <span>{po.poNumber}</span>
                            <span className="text-[10px] text-gray-400 block font-normal">
                              {po.poDate ? new Date(po.poDate).toLocaleDateString('en-IN') : '-'}
                            </span>
                          </td>

                          {/* Fruit & Layer Breakdown */}
                          <td className="py-3.5 px-3 border-r border-gray-100">
                            <div className="font-extrabold text-gray-900 flex items-center gap-1">
                              {isAppleConsignment ? '🍎 Kashmir Apples' : `🍏 ${po.fruitName || 'Fresh Fruits'}`}
                            </div>
                            {po.items && po.items.length > 0 ? (
                              <div className="mt-0.5 text-[10px] text-gray-600 font-semibold flex flex-wrap gap-1">
                                {isAppleConsignment ? (
                                  <>
                                    {po.items.map((it, i) => (
                                      <span key={i} className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">
                                        {it.varietyGrade?.includes('4-Layer') || it.fruitName.includes('4L') ? '4L' : it.varietyGrade?.includes('5-Layer') || it.fruitName.includes('5L') ? '5L' : it.varietyGrade?.includes('Roller') || it.fruitName.includes('Roll') ? 'Roll' : it.varietyGrade}: <strong>{it.quantity}</strong>
                                      </span>
                                    ))}
                                    <span className="text-emerald-800 font-black">({totalBoxes} Boxes)</span>
                                  </>
                                ) : (
                                  <span>
                                    {totalBoxes} {po.items[0]?.unit || 'BOX'} ({po.items[0]?.varietyGrade || 'Grade A'})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400">{po.fruitName || 'Standard Fruit Consignment'}</span>
                            )}
                          </td>

                          {/* Destination Hub */}
                          <td className="text-center py-3.5 px-3 text-gray-800 border-r border-gray-100 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-bold text-gray-900">
                              📍 {po.orderPersonPlace || vendorProfile?.primaryLocation || 'Warangal Hub'}
                            </span>
                          </td>

                          {/* Consignment Value */}
                          <td className="text-right py-3.5 px-3 font-black text-gray-900 border-r border-gray-100 whitespace-nowrap">
                            ₹{total.toLocaleString('en-IN')}
                          </td>

                          {/* 55% Auto-Advance */}
                          <td className="text-right py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            <strong className="text-emerald-700 font-black block">₹{advance.toLocaleString('en-IN')}</strong>
                            <span className="text-[9px] text-emerald-800 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              ✓ 55% Guaranteed
                            </span>
                          </td>

                          {/* 45% Balance Due */}
                          <td className="text-right py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            <strong className="text-amber-900 font-black block">₹{balance.toLocaleString('en-IN')}</strong>
                            <span className="text-[9px] text-gray-500 font-medium">45% on delivery</span>
                          </td>

                          {/* Logistics & Proof */}
                          <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            {po.dispatchVehicleNumber ? (
                              <div className="space-y-1">
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 font-black text-[10px] block">
                                  🚚 {po.dispatchVehicleNumber}
                                </span>
                                <div className="flex items-center justify-center gap-1">
                                  {po.vehiclePhotoUrl && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewMediaModal({ url: po.vehiclePhotoUrl!, title: `Vehicle Photo: ${po.dispatchVehicleNumber}` });
                                      }}
                                      className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                                      title="View vehicle photo"
                                    >
                                      📸 Photo
                                    </button>
                                  )}
                                  {po.transportBillUrl && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewMediaModal({ url: po.transportBillUrl!, title: `Transport Bill (Bilty): ${po.poNumber}` });
                                      }}
                                      className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                                      title="View transport bill"
                                    >
                                      🧾 Bilty
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Proof Pending
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            {po.dispatchStatus === 'LOADED_AND_DISPATCHED' || po.dispatchStatus === 'IN_TRANSIT' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 inline-flex items-center gap-1">
                                <Truck size={12} /> In Transit
                              </span>
                            ) : po.dispatchStatus === 'DELIVERED_AT_HUB' || po.status === 'CLOSED' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 inline-flex items-center gap-1">
                                <CheckCircle2 size={12} /> Delivered &amp; Verified
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 inline-flex items-center gap-1">
                                <Clock size={12} /> Pending Dispatch
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="text-center py-3.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5">
                              {po.dispatchStatus === 'LOADED_AND_DISPATCHED' || po.dispatchStatus === 'IN_TRANSIT' ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPOForDispatch(po)}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg font-bold text-[10px] border border-blue-200 cursor-pointer"
                                  title="Update or re-upload dispatch proof"
                                >
                                  Update Proof
                                </button>
                              ) : po.dispatchStatus === 'DELIVERED_AT_HUB' || po.weighbridgeScaleSlipUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setViewSlipModalUrl(po.weighbridgeScaleSlipUrl || null)}
                                  className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-[10px] shadow-xs cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Scale size={11} /> Scale Slip
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedPOForDispatch(po)}
                                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Upload size={12} /> Dispatch
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setExpandedPOId(isExpanded ? null : po.id)}
                                className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center cursor-pointer transition"
                                title="Toggle item details breakdown"
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Item Breakdown Sub-Row */}
                        {isExpanded && (
                          <tr className="bg-emerald-50/40 border-b-2 border-emerald-300">
                            <td colSpan={10} className="p-4">
                              <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-xs space-y-3">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-gray-900">
                                      Consignment Breakdown: {po.poNumber}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-bold">
                                      Destination: {po.orderPersonPlace || 'Warangal Hub'}
                                    </span>
                                  </div>
                                  <span className="text-xs font-black text-emerald-800">
                                    Total: ₹{total.toLocaleString('en-IN')} (55% Adv: ₹{advance.toLocaleString('en-IN')} | 45% Due: ₹{balance.toLocaleString('en-IN')})
                                  </span>
                                </div>

                                {po.items && po.items.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-gray-500 text-[10px] uppercase border-b border-gray-100">
                                          <th className="py-1 px-2 text-left">Item Name / Grade</th>
                                          <th className="py-1 px-2 text-right">Quantity</th>
                                          <th className="py-1 px-2 text-center">Unit</th>
                                          <th className="py-1 px-2 text-right">Rate (₹)</th>
                                          <th className="py-1 px-2 text-right">Subtotal (₹)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-50 font-medium">
                                        {po.items.map((it, i) => (
                                          <tr key={i}>
                                            <td className="py-1.5 px-2 font-bold text-gray-800">
                                              {it.fruitName} <span className="text-gray-500 font-normal">({it.varietyGrade})</span>
                                            </td>
                                            <td className="py-1.5 px-2 text-right font-black text-gray-900">{it.quantity}</td>
                                            <td className="py-1.5 px-2 text-center text-gray-500">{it.unit}</td>
                                            <td className="py-1.5 px-2 text-right text-gray-700">₹{Number(it.ratePerUnit || 0).toLocaleString('en-IN')}</td>
                                            <td className="py-1.5 px-2 text-right font-black text-emerald-800">₹{Number(it.lineTotal || 0).toLocaleString('en-IN')}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500">No individual line items recorded.</p>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-gray-100 text-xs">
                                  <div className="p-2 bg-gray-50 rounded-xl">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Vehicle &amp; Transporter</span>
                                    <strong className="text-gray-900 block mt-0.5">{po.dispatchVehicleNumber || 'Pending'} {po.transporterName ? `(${po.transporterName})` : ''}</strong>
                                    {po.driverPhone && <span className="text-[10px] text-gray-600 block">Driver: {po.driverPhone}</span>}
                                  </div>

                                  <div className="p-2 bg-gray-50 rounded-xl">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Weighbridge &amp; QC Verification</span>
                                    <strong className="text-gray-900 block mt-0.5">
                                      {po.weighbridgeNetKg ? `${Number(po.weighbridgeNetKg).toLocaleString('en-IN')} KG Verified` : 'Pending Hub Weighing'}
                                    </strong>
                                    {po.qcInspectionStatus && <span className="text-[10px] text-emerald-700 font-bold block">Status: {po.qcInspectionStatus}</span>}
                                  </div>

                                  <div className="p-2 bg-gray-50 rounded-xl">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Attached Documents</span>
                                    <div className="flex items-center gap-2 mt-1">
                                      {po.vehiclePhotoUrl ? (
                                        <button
                                          type="button"
                                          onClick={() => setPreviewMediaModal({ url: po.vehiclePhotoUrl!, title: `Truck Photo: ${po.dispatchVehicleNumber}` })}
                                          className="text-[10px] font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                          <ImageIcon size={12} /> Truck Photo ✓
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-gray-400">No Photo</span>
                                      )}
                                      {po.transportBillUrl ? (
                                        <button
                                          type="button"
                                          onClick={() => setPreviewMediaModal({ url: po.transportBillUrl!, title: `Transport Bill: ${po.poNumber}` })}
                                          className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                          <FileText size={12} /> Bilty / LR ✓
                                        </button>
                                      ) : (
                                        <span className="text-[10px] text-gray-400">No Bilty</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. Tab Content: Frozen KYC & Bank Profile */}
      {activeTab === 'kyc' && (
        <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-700" size={24} />
                <h2 className="text-xl font-extrabold text-gray-900">Vendor Verification &amp; Banking Dossier</h2>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Official financial registration details recorded with Safal Export and Import Pvt Ltd.
              </p>
            </div>
            <div className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black inline-flex items-center gap-2 self-start sm:self-auto">
              <Lock size={14} className="text-emerald-800" />
              <span>KYC Profile Permanently Frozen</span>
            </div>
          </div>

          {/* Locked Profile Alert */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
            <Lock className="text-amber-700 flex-shrink-0 mt-0.5" size={16} />
            <div>
              <strong className="block font-bold">Immutability &amp; Financial Security Protocol:</strong>
              <span>
                To protect against unauthorized account modifications and divertment of payment funds, your bank account details, Aadhaar, and PAN records are permanently locked.
                If you need to update your registered bank account, please submit a physical letter with cancelled cheque to the Safal Corporate Finance Desk.
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Business Identity */}
            <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200 space-y-3">
              <span className="eyebrow text-emerald-800 font-bold block">COMMERCIAL ENTITY DETAILS</span>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Vendor ID:</span>
                  <strong className="text-emerald-900 font-black">{vendorProfile?.vendorId || 'VND-001'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Business / Trade Name:</span>
                  <strong className="text-gray-900 font-bold">{vendorProfile?.businessName || '-'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Authorized Contact Person:</span>
                  <strong className="text-gray-900 font-bold">{vendorProfile?.contactPerson || '-'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Primary Hub Location:</span>
                  <strong className="text-gray-900 font-bold">📍 {vendorProfile?.primaryLocation || 'Warangal'}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Phone Number:</span>
                  <strong className="text-gray-900 font-bold">{vendorProfile?.phone || '-'}</strong>
                </div>
              </div>
            </div>

            {/* KYC & Identity */}
            <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200 space-y-3">
              <span className="eyebrow text-emerald-800 font-bold block">STATUTORY TAX &amp; IDENTITY RECORDS</span>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Aadhaar Number:</span>
                  <strong className="text-gray-900 font-mono font-bold">
                    {vendorProfile?.aadharNumberMasked || 'XXXX-XXXX-1098'}
                  </strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Permanent Account Number (PAN):</span>
                  <strong className="text-gray-900 font-mono font-bold">
                    {vendorProfile?.panNumber || 'ABCDE1234F'}
                  </strong>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200">
                  <span className="text-gray-500 font-medium">Account Status:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900">
                    Active &amp; Approved
                  </span>
                </div>
              </div>
            </div>

            {/* Banking Coordinates */}
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="eyebrow text-emerald-900 font-black block">OFFICIAL DISBURSEMENT BANK COORDINATES</span>
                <span className="text-[10px] text-emerald-800 font-extrabold bg-white px-2.5 py-0.5 rounded-md border border-emerald-300">
                  Locked for Direct NEFT/RTGS
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-gray-500 block">Bank Account Number</span>
                  <strong className="font-mono text-xs font-bold text-gray-900 block mt-0.5">
                    {vendorProfile?.bankAccountNumberMasked || 'XXXXXX6789'}
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-gray-500 block">IFSC Code</span>
                  <strong className="font-mono text-xs font-bold text-gray-900 block mt-0.5">
                    {vendorProfile?.bankIfscCode || 'SBIN0001234'}
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-gray-500 block">Beneficiary Name</span>
                  <strong className="text-xs font-bold text-gray-900 block mt-0.5 truncate">
                    {vendorProfile?.bankAccountHolder || vendorProfile?.businessName || '-'}
                  </strong>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-gray-500 block">Bank &amp; Branch</span>
                  <strong className="text-xs font-bold text-gray-900 block mt-0.5 truncate">
                    {vendorProfile?.bankName ? `${vendorProfile.bankName} (${vendorProfile.bankBranch || ''})` : 'State Bank of India'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. Tab Content: Digital Weighbridge & QC Inspection Slips */}
      {activeTab === 'qc' && (
        <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm p-4 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Scale className="text-emerald-700" size={24} />
                <h2 className="text-xl font-extrabold text-gray-900">
                  Digital Weighbridge Scale &amp; Quality Control (QC) Slips
                </h2>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Official electronic mandi scale weight receipts (Gross, Tare, Net Fruit KG) and QC grading acceptance reports.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black inline-flex items-center gap-1.5">
                <BadgeCheck size={14} className="text-emerald-700" />
                <span>Mandi Scale Verified</span>
              </span>
            </div>
          </div>

          {/* QC Cards List */}
          {(() => {
            const qcOrders = orders.filter(
              (o) =>
                o.weighbridgeNetKg ||
                o.qcInspectionStatus ||
                o.dispatchStatus === 'LOADED_AND_DISPATCHED' ||
                o.dispatchStatus === 'IN_TRANSIT' ||
                o.dispatchStatus === 'DELIVERED_AT_HUB'
            );

            if (qcOrders.length === 0) {
              return (
                <div className="py-12 text-center text-gray-400">
                  <Scale size={44} className="mx-auto text-emerald-600 mb-2 opacity-60" />
                  <p className="font-bold text-gray-800 text-sm">No Weighbridge Slips Recorded Yet</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    Once your dispatch vehicle reaches the destination regional hub, the mandi weighbridge incharge will weigh the truck (Gross &amp; Tare) and upload the digital scale slip here.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {qcOrders.map((order) => {
                  const hasWeighbridge = Boolean(order.weighbridgeNetKg);
                  const gross = Number(order.weighbridgeGrossKg || 0);
                  const tare = Number(order.weighbridgeTareKg || 0);
                  const net = Number(order.weighbridgeNetKg || 0);
                  const gradeA = Number(order.qcGradeARatio || 95);
                  const gradeB = Number(order.qcGradeBRatio || 5);
                  const wastage = Number(order.qcWastageKg || 0);

                  return (
                    <div
                      key={order.id}
                      className="p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 hover:bg-emerald-50/40 transition space-y-4"
                    >
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <strong className="text-base font-black text-[#087A3E] font-mono">
                            {order.poNumber}
                          </strong>
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <MapPin size={13} className="text-gray-400" />
                            <strong>{order.orderPersonPlace || vendorProfile?.primaryLocation || 'Warangal'} Hub</strong>
                          </span>
                          {order.dispatchVehicleNumber && (
                            <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-800 text-[11px] font-mono font-bold">
                              🚚 {order.dispatchVehicleNumber}
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div>
                          {order.qcInspectionStatus === 'ACCEPTED' ? (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-emerald-700" />
                              QC ACCEPTED (100% Verified)
                            </span>
                          ) : order.qcInspectionStatus === 'CONDITIONAL_ACCEPTANCE' ? (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1.5">
                              <AlertCircle size={13} className="text-amber-700" />
                              CONDITIONAL ACCEPTANCE
                            </span>
                          ) : order.qcInspectionStatus === 'REJECTED' ? (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 inline-flex items-center gap-1.5">
                              <X size={13} className="text-rose-700" />
                              QC REJECTED
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200 inline-flex items-center gap-1.5">
                              <Clock size={13} className="text-blue-700" />
                              Truck in Transit / Scale Weigh-in Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Weight Breakdown */}
                      {hasWeighbridge ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="bg-white p-3 rounded-xl border border-emerald-200">
                              <span className="text-[10px] uppercase font-bold text-gray-500 block">
                                Gross Truck Weight (భారీ ట్రక్ బరువు)
                              </span>
                              <strong className="text-base sm:text-lg font-black text-gray-900 block mt-0.5">
                                {gross.toLocaleString('en-IN')} KG
                              </strong>
                              <span className="text-[10px] text-gray-400 block">
                                {(gross / 1000).toFixed(2)} Metric Tonnes
                              </span>
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-emerald-200">
                              <span className="text-[10px] uppercase font-bold text-gray-500 block">
                                Empty Tare Weight (ఖాళీ ట్రక్ బరువు)
                              </span>
                              <strong className="text-base sm:text-lg font-black text-gray-900 block mt-0.5">
                                {tare.toLocaleString('en-IN')} KG
                              </strong>
                              <span className="text-[10px] text-gray-400 block">
                                {(tare / 1000).toFixed(2)} Metric Tonnes
                              </span>
                            </div>

                            <div className="bg-white p-3 rounded-xl border-2 border-emerald-500 shadow-xs">
                              <span className="text-[10px] uppercase font-black text-emerald-800 block">
                                Net Fruit Weight (నికర పండ్ల బరువు)
                              </span>
                              <strong className="text-base sm:text-lg font-black text-emerald-700 block mt-0.5">
                                {net.toLocaleString('en-IN')} KG
                              </strong>
                              <span className="text-[10px] text-emerald-600 font-bold block">
                                {(net / 1000).toFixed(2)} Metric Tonnes Net
                              </span>
                            </div>
                          </div>

                          {/* Quality Grading & Remarks */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-white p-3 rounded-xl border border-emerald-200 space-y-1.5">
                              <span className="text-[10px] uppercase font-bold text-gray-500 block">
                                Quality Grading Ratios
                              </span>
                              <div className="flex items-center gap-3 pt-0.5">
                                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 font-bold border border-emerald-200">
                                  Grade A: <strong>{gradeA}%</strong>
                                </span>
                                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold border border-amber-200">
                                  Grade B: <strong>{gradeB}%</strong>
                                </span>
                              </div>
                              {wastage > 0 && (
                                <p className="text-[11px] text-rose-600 font-bold mt-1">
                                  ⚠️ Wastage / Spoilage Deduction: <strong>{wastage} KG</strong>
                                </p>
                              )}
                              <p className="text-[11px] text-gray-600 mt-1">
                                QC Inspector: <strong>{order.qcInspectorName || 'Hub QC Officer'}</strong>
                                {order.qcInspectionDate && (
                                  <span> · Date: {new Date(order.qcInspectionDate).toLocaleDateString('en-IN')}</span>
                                )}
                              </p>
                            </div>

                            {/* Digital Slip preview or button */}
                            <div className="bg-white p-3 rounded-xl border border-emerald-200 flex flex-col justify-between gap-2">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-gray-500 block">
                                  Electronic Weighbridge Slip
                                </span>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                  {order.qcInspectionRemarks || 'Standard export quality certified at hub weighbridge.'}
                                </p>
                              </div>

                              {order.weighbridgeSlipUrl ? (
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                                  <button
                                    type="button"
                                    onClick={() => setViewSlipModalUrl(order.weighbridgeSlipUrl || null)}
                                    className="px-3 py-1.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                                  >
                                    <Eye size={13} /> View Scale Slip (కాంటా రసీదు)
                                  </button>
                                  <a
                                    href={order.weighbridgeSlipUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-emerald-700 font-bold hover:underline inline-flex items-center gap-1"
                                  >
                                    <ExternalLink size={12} /> Open Full Size
                                  </a>
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-400 italic">
                                  Digital scale slip pending Hub document scanner upload.
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                          <Clock size={16} className="text-blue-600 flex-shrink-0" />
                          <span>
                            Truck dispatched ({order.dispatchVehicleNumber || 'In Transit'}). Official weighbridge scale gross and empty tare weights will be recorded automatically when the truck enters the destination hub yard.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>
      )}

      {/* 6. Modal: Submit Vehicle Photo & Transport Bill */}
      {selectedPOForDispatch && (
        <div
          className="modal-backdrop !z-[9999] fixed inset-0 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPOForDispatch(null);
          }}
        >
          <div
            className="modal !w-[680px] max-w-[96vw] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden relative"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header pb-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 grid place-items-center">
                  <Truck size={22} />
                </div>
                <div>
                  <span className="eyebrow text-amber-800 font-bold">LOGISTICS &amp; DISPATCH PROOF</span>
                  <h2 className="text-lg font-bold text-gray-900">
                    Dispatch Order: {selectedPOForDispatch.poNumber}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedPOForDispatch(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 flex items-center justify-center transition cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleDispatchSubmit} className="overflow-y-auto flex-1 py-4 pr-1 space-y-4 text-xs">
              {dispatchError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{dispatchError}</span>
                </div>
              )}

              {/* Vehicle Registration Number */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Vehicle Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. AP 39 TB 1234 or TS 08 UB 5678"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl font-mono text-xs font-bold text-gray-900 focus:border-[#087A3E] focus:ring-2 focus:ring-emerald-100 outline-none uppercase"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Enter the exact registration number matching the truck number plate.
                </span>
              </div>

              {/* Transporter Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Transporter / Agency Name</label>
                  <input
                    type="text"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    placeholder="e.g. VRL Logistics / Sharma Roadlines"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Driver Contact Phone</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-xs text-gray-800 outline-none"
                  />
                </div>
              </div>

              {/* File 1: Vehicle Photo with Number Plate Clearly Visible */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                <label className="block text-amber-950 font-bold">
                  1. Vehicle Photo (Number Plate MUST be clearly visible) *
                </label>
                <p className="text-[11px] text-gray-600">
                  Take a photo of the truck where the number plate and loaded fruit boxes/crates are clearly visible.
                </p>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  capture="environment"
                  required
                  onChange={handleVehiclePhotoChange}
                  className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#064D2B] file:text-white hover:file:bg-[#087A3E] file:cursor-pointer"
                />

                {vehiclePhotoPreview && (
                  <div className="mt-2 p-2 bg-white rounded-xl border border-gray-200 inline-block">
                    <img
                      src={vehiclePhotoPreview}
                      alt="Vehicle Preview"
                      className="h-32 object-contain rounded-lg"
                    />
                    <span className="text-[10px] text-emerald-700 font-bold block mt-1">Vehicle Photo Attached ✓</span>
                  </div>
                )}
              </div>

              {/* File 2: Transport Bill / Bilty Upload */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                <label className="block text-blue-950 font-bold">
                  2. Transport Bill / Bilty / LR (Lorry Receipt) *
                </label>
                <p className="text-[11px] text-gray-600">
                  Upload clear photo or PDF document of the transporter's consignment note or freight receipt.
                </p>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  required
                  onChange={handleTransportBillChange}
                  className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#064D2B] file:text-white hover:file:bg-[#087A3E] file:cursor-pointer"
                />

                {transportBillPreview && (
                  <div className="mt-2 p-2 bg-white rounded-xl border border-gray-200 inline-block">
                    {transportBillFile?.type === 'application/pdf' ? (
                      <span className="text-xs text-blue-800 font-bold">📄 PDF Document Attached ({transportBillFile.name})</span>
                    ) : (
                      <img
                        src={transportBillPreview}
                        alt="Bilty Preview"
                        className="h-32 object-contain rounded-lg"
                      />
                    )}
                    <span className="text-[10px] text-emerald-700 font-bold block mt-1">Transport Bill Attached ✓</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedPOForDispatch(null)}
                  className="secondary-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispatch}
                  className="primary-button !bg-[#064D2B] hover:!bg-[#087A3E] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  {isSubmittingDispatch ? 'Uploading Evidence...' : 'Submit Dispatch Proof'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Create Supply PO Modal */}
      {showCreatePOModal && (
        <div
          className="modal-backdrop !z-[9999] fixed inset-0 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreatePOModal(false);
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full border border-gray-200 shadow-2xl p-5 sm:p-6 my-auto max-h-[92vh] flex flex-col relative"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider block">
                  Wholesale Procurement Supply
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-0.5 font-['Manrope']">
                  Create Consignment Supply PO
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Vendor Partner: <strong className="text-emerald-800">{vendorProfile?.businessName || user?.name}</strong> ({vendorProfile?.vendorId || 'VND-001'})
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCreatePOModal(false);
                }}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 flex items-center justify-center transition cursor-pointer"
                title="Close modal (Esc)"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {createPOError && (
              <div className="p-3 my-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-200">
                {createPOError}
              </div>
            )}

            <form onSubmit={handleSubmitVendorPO} className="overflow-y-auto flex-1 pr-1 py-3 space-y-4 text-xs">
              {/* Destination Hub and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Destination Regional Hub *
                  </label>
                  <select
                    value={targetHub}
                    onChange={(e) => setTargetHub(e.target.value)}
                    className="w-full h-10 px-3 border border-emerald-300 rounded-xl text-xs font-bold text-gray-900 bg-emerald-50/20 focus:border-emerald-600 focus:outline-none"
                    required
                  >
                    {VENDOR_WHITELISTED_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc} Hub
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    Strictly restricted to 8 whitelisted hubs.
                  </span>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Expected Dispatch / Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* 7 Whitelisted Fruits Selection Chips */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-[#064D2B] tracking-wider block mb-1.5 flex items-center justify-between">
                  <span>Select Fruit Commodity (Whitelisted)</span>
                  <span className="text-emerald-700 font-bold">7 Allowed Varieties</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {VENDOR_WHITELISTED_FRUITS.map((fruit) => (
                    <button
                      key={fruit}
                      type="button"
                      onClick={() => handleFruitSelect(fruit)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        selectedFruit === fruit
                          ? 'bg-[#064D2B] text-white shadow-sm ring-2 ring-emerald-500'
                          : 'bg-white hover:bg-emerald-100 text-[#064D2B] border border-emerald-300'
                      }`}
                    >
                      {fruit === 'Kashmir Apples' ? '🍎' : fruit === 'Pomegranate' ? '🍇' : fruit === 'Banana' ? '🍌' : fruit === 'Orange' ? '🍊' : '🍉'} {fruit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Fruit Sizing & Pricing */}
              {isApple ? (
                /* Apple Mandi Layer Grading Box Matrix (4L, 5L, Roll, Total, Amount) */
                <div className="p-3.5 bg-gradient-to-br from-red-50/60 via-amber-50/30 to-emerald-50/40 border border-amber-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-red-700 tracking-wider block">
                        🍎 Apple Mandi Layer Box Grading (4L / 5L / Roll)
                      </span>
                      <p className="text-[11px] text-gray-600">
                        Standard wholesale apple telescopic cartons (~20-22 Kg/box). Enter box count and per-box mandi rate.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-lg text-[11px] font-black">
                      Kashmir Apples
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-amber-200/60 text-gray-600 font-black text-[10px] uppercase">
                          <th className="py-2 px-2">Layer Grade</th>
                          <th className="py-2 px-2 text-right">No. of Boxes</th>
                          <th className="py-2 px-2 text-right">Rate (₹ / Box)</th>
                          <th className="py-2 px-2 text-right">Subtotal (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-bold">
                        {/* 4L */}
                        <tr className="hover:bg-white/60">
                          <td className="py-2 px-2">
                            <div className="font-extrabold text-gray-900">4L (4-Layer Large Size)</div>
                            <span className="text-[10px] text-gray-500">Premium large size</span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={layer4LBoxes}
                              onChange={(e) => setLayer4LBoxes(e.target.value)}
                              placeholder="0"
                              className="w-24 h-8 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-right focus:border-emerald-600 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={layer4LRate}
                              onChange={(e) => setLayer4LRate(e.target.value)}
                              placeholder="₹"
                              className="w-24 h-8 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-right focus:border-emerald-600 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-2 text-right text-emerald-800 font-black">
                            ₹{apple4LAmount.toLocaleString('en-IN')}
                          </td>
                        </tr>

                        {/* 5L */}
                        <tr className="hover:bg-white/60">
                          <td className="py-2 px-2">
                            <div className="font-extrabold text-gray-900">5L (5-Layer Medium Size)</div>
                            <span className="text-[10px] text-gray-500">Standard market volume</span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={layer5LBoxes}
                              onChange={(e) => setLayer5LBoxes(e.target.value)}
                              placeholder="0"
                              className="w-24 h-8 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-right focus:border-emerald-600 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={layer5LRate}
                              onChange={(e) => setLayer5LRate(e.target.value)}
                              placeholder="₹"
                              className="w-24 h-8 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-right focus:border-emerald-600 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-2 text-right text-emerald-800 font-black">
                            ₹{apple5LAmount.toLocaleString('en-IN')}
                          </td>
                        </tr>

                        {/* Roll */}
                        <tr className="hover:bg-white/60">
                          <td className="py-2 px-2">
                            <div className="font-extrabold text-gray-900">Roll (Roller Mixed Running)</div>
                            <span className="text-[10px] text-gray-500">Mandi roller bulk pack</span>
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={rollBoxes}
                              onChange={(e) => setRollBoxes(e.target.value)}
                              placeholder="0"
                              className="w-24 h-8 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-right focus:border-emerald-600 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              value={rollRate}
                              onChange={(e) => setRollRate(e.target.value)}
                              placeholder="₹"
                              className="w-24 h-8 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-right focus:border-emerald-600 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-2 text-right text-emerald-800 font-black">
                            ₹{appleRollAmount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-emerald-300 bg-emerald-100/40">
                          <td className="py-2.5 px-2 text-gray-900 font-black uppercase text-[11px]">
                            Total Consignment
                          </td>
                          <td className="py-2.5 px-2 text-right font-black text-gray-900">
                            {totalAppleBoxes.toLocaleString('en-IN')} Boxes
                          </td>
                          <td className="py-2.5 px-2 text-right text-gray-500 text-[10px]">
                            Combined Total
                          </td>
                          <td className="py-2.5 px-2 text-right text-base font-black text-emerald-800">
                            ₹{totalAppleAmount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                /* Other Fruit Sizing Form */
                <div className="p-3.5 bg-emerald-50/40 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-emerald-800 tracking-wider block">
                        Fruit Commodity Sizing &amp; Pricing
                      </span>
                      <p className="text-[11px] text-gray-600">
                        Enter quantity, billing unit, and wholesale mandi rate per unit.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-black">
                      {selectedFruit}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Grade / Variety</label>
                      <input
                        type="text"
                        value={otherGrade}
                        onChange={(e) => setOtherGrade(e.target.value)}
                        placeholder="e.g. Export Grade A"
                        className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={otherQuantity}
                        onChange={(e) => setOtherQuantity(e.target.value)}
                        placeholder="Qty"
                        className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-right"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Unit</label>
                      <select
                        value={otherUnit}
                        onChange={(e) => setOtherUnit(e.target.value)}
                        className="w-full h-9 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white"
                      >
                        <option value="BOX">BOX</option>
                        <option value="CRATE">CRATE</option>
                        <option value="TON">TON</option>
                        <option value="KG">KG</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Rate (₹ / {otherUnit})</label>
                      <input
                        type="number"
                        min="1"
                        value={otherRate}
                        onChange={(e) => setOtherRate(e.target.value)}
                        placeholder="Rate ₹"
                        className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-right"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Calculated Consignment Value:</span>
                    <span className="text-sm font-black text-emerald-800">₹{otherTotalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              {/* Dispatch & Transport Proof Details (Vehicle photo, Transport bill photo, vehicle number, driver) */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3">
                <span className="text-[10px] uppercase font-black text-blue-900 tracking-wider block flex items-center gap-1.5">
                  <Truck size={14} className="text-blue-700" /> Dispatch &amp; Logistics Proof (Upload now for instant 55% advance release)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Vehicle / Truck Number</label>
                    <input
                      type="text"
                      value={supplyVehicleNumber}
                      onChange={(e) => setSupplyVehicleNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. TS09UB4521"
                      className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Transporter Name</label>
                    <input
                      type="text"
                      value={supplyTransporterName}
                      onChange={(e) => setSupplyTransporterName(e.target.value)}
                      placeholder="e.g. New Golden Roadways"
                      className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Driver Contact Number</label>
                    <input
                      type="tel"
                      value={supplyDriverPhone}
                      onChange={(e) => setSupplyDriverPhone(e.target.value)}
                      placeholder="e.g. 9848012345"
                      className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Vehicle Photo Upload */}
                  <div className="p-2.5 bg-white border border-gray-200 rounded-xl space-y-1.5">
                    <label className="block text-[11px] font-bold text-gray-800">
                      📸 Dispatch Photo (Vehicle &amp; Loaded Cartons)
                    </label>
                    <p className="text-[10px] text-gray-500">
                      Clear photo showing vehicle with loaded fruit boxes and number plate.
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      onChange={handleSupplyVehiclePhotoChange}
                      className="w-full text-[11px] text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 file:cursor-pointer"
                    />
                    {supplyVehiclePhotoPreview && (
                      <div className="mt-1.5 p-1.5 bg-gray-50 rounded-lg border border-gray-200 inline-block">
                        <img
                          src={supplyVehiclePhotoPreview}
                          alt="Vehicle Preview"
                          className="h-24 w-auto object-contain rounded"
                        />
                        <span className="text-[9px] text-emerald-700 font-bold block mt-0.5">Vehicle Photo Attached ✓</span>
                      </div>
                    )}
                  </div>

                  {/* Transport Bill Photo Upload */}
                  <div className="p-2.5 bg-white border border-gray-200 rounded-xl space-y-1.5">
                    <label className="block text-[11px] font-bold text-gray-800">
                      🧾 Transport Bill Photo (Bilty / LR Receipt)
                    </label>
                    <p className="text-[10px] text-gray-500">
                      Clear photo or PDF receipt from transporter / consignment note.
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      onChange={handleSupplyTransportBillChange}
                      className="w-full text-[11px] text-gray-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-blue-700 file:text-white hover:file:bg-blue-800 file:cursor-pointer"
                    />
                    {supplyTransportBillPreview && (
                      <div className="mt-1.5 p-1.5 bg-gray-50 rounded-lg border border-gray-200 inline-block">
                        {supplyTransportBillFile?.type === 'application/pdf' ? (
                          <span className="text-xs text-blue-800 font-bold">📄 PDF Document ({supplyTransportBillFile.name})</span>
                        ) : (
                          <img
                            src={supplyTransportBillPreview}
                            alt="Bilty Preview"
                            className="h-24 w-auto object-contain rounded"
                          />
                        )}
                        <span className="text-[9px] text-blue-700 font-bold block mt-0.5">Transport Bill Attached ✓</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 55% Auto-Advance Policy Settlement Breakdown */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-2xl space-y-2">
                <span className="text-[10px] uppercase font-black text-[#064D2B] tracking-wider block flex items-center gap-1.5">
                  <Sparkles size={13} className="text-emerald-700" /> 55% Automatic Advance Settlement Guarantee
                </span>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white p-2 rounded-xl border border-emerald-200">
                    <span className="text-[9px] text-gray-500 uppercase font-bold block">Total Consignment</span>
                    <strong className="text-sm font-black text-gray-900 block mt-0.5">
                      ₹{grandSupplyTotal.toLocaleString('en-IN')}
                    </strong>
                    <span className="text-[8px] text-gray-400 block">
                      {isApple ? `${totalAppleBoxes} Boxes` : `${otherQuantity} ${otherUnit}`}
                    </span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-emerald-300 shadow-2xs">
                    <span className="text-[9px] text-emerald-800 uppercase font-extrabold block">55% Auto Advance</span>
                    <strong className="text-sm font-black text-emerald-700 block mt-0.5">
                      ₹{autoAdvanceAmount.toLocaleString('en-IN')}
                    </strong>
                    <span className="text-[8px] text-emerald-600 block">Released on Dispatch Proof</span>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-gray-200">
                    <span className="text-[9px] text-gray-500 uppercase font-bold block">45% Balance Due</span>
                    <strong className="text-sm font-black text-gray-700 block mt-0.5">
                      ₹{pendingBalanceAmount.toLocaleString('en-IN')}
                    </strong>
                    <span className="text-[8px] text-gray-400 block">Settled on Mandi Delivery</span>
                  </div>
                </div>
              </div>

              {/* Consignment Remarks */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Consignment &amp; Transport Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="e.g. Cold storage packed Grade A Apples for delivery to Warangal mandi"
                  className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCreatePOModal(false);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPO}
                  className="px-5 py-2.5 rounded-xl bg-[#087A3E] hover:bg-[#064D2B] text-white font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ShoppingCart size={15} />
                  {isSubmittingPO ? 'Submitting Supply PO...' : 'Submit Consignment PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal: View Weighbridge Scale Slip Document / Photo */}
      {viewSlipModalUrl && (
        <div
          className="modal-backdrop !z-[9999] fixed inset-0 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewSlipModalUrl(null);
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full border border-gray-200 shadow-2xl p-4 sm:p-5 my-auto max-h-[92vh] flex flex-col relative"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Scale className="text-emerald-800" size={20} />
                <h3 className="text-base font-black text-gray-900">
                  Digital Weighbridge Scale Slip (కాంటా రసీదు)
                </h3>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setViewSlipModalUrl(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 flex items-center justify-center transition cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-2 my-2 flex items-center justify-center bg-gray-50 rounded-2xl border border-gray-200">
              {viewSlipModalUrl.endsWith('.pdf') ? (
                <iframe
                  src={viewSlipModalUrl}
                  title="Weighbridge PDF"
                  className="w-full h-96 rounded-xl border-0"
                />
              ) : (
                <img
                  src={viewSlipModalUrl}
                  alt="Weighbridge Scale Slip"
                  className="max-h-[70vh] object-contain rounded-xl shadow-xs"
                />
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between flex-shrink-0 text-xs">
              <span className="text-gray-500 font-medium">Official mandi weighbridge printout</span>
              <div className="flex items-center gap-2">
                <a
                  href={viewSlipModalUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold inline-flex items-center gap-1"
                >
                  <ExternalLink size={13} /> Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setViewSlipModalUrl(null)}
                  className="px-4 py-1.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal: Preview Media Photo / Bilty Document */}
      {previewMediaModal && (
        <div
          className="modal-backdrop !z-[9999] fixed inset-0 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewMediaModal(null);
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full border border-gray-200 shadow-2xl p-4 sm:p-5 my-auto max-h-[92vh] flex flex-col relative"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-black text-gray-900">{previewMediaModal.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewMediaModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 flex items-center justify-center transition cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-2 my-2 flex items-center justify-center bg-gray-50 rounded-2xl border border-gray-200">
              {previewMediaModal.url.endsWith('.pdf') ? (
                <iframe
                  src={previewMediaModal.url}
                  title={previewMediaModal.title}
                  className="w-full h-96 rounded-xl border-0"
                />
              ) : (
                <img
                  src={previewMediaModal.url}
                  alt={previewMediaModal.title}
                  className="max-h-[70vh] object-contain rounded-xl shadow-xs"
                />
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between flex-shrink-0 text-xs">
              <span className="text-gray-500 font-medium">Verified Consignment Dispatch Proof</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewMediaModal.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold inline-flex items-center gap-1"
                >
                  <ExternalLink size={13} /> Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewMediaModal(null)}
                  className="px-4 py-1.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
