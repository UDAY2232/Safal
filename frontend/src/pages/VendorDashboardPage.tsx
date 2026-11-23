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
  MessageSquare,
  Share2,
  ExternalLink,
  BadgeCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PurchaseOrder, VENDOR_WHITELISTED_LOCATIONS, VENDOR_WHITELISTED_FRUITS } from '../types';

export const VENDOR_HUB_DIRECTORY = [
  {
    city: 'Warangal',
    state: 'Telangana',
    name: 'Warangal Central Hub & Weighbridge',
    manager: 'T. Ramesh Rao',
    phone: '919848012345',
    displayPhone: '+91 98480 12345',
    address: 'Plot 12-14, Laxmipuram Wholesale Fruit Market Yard, Enumamula, Warangal, TG 506006',
    scaleCapacity: '50 Ton Electronic Weighbridge',
    hours: '05:00 AM - 08:00 PM (Scale 24x7)',
  },
  {
    city: 'Hyderabad',
    state: 'Telangana',
    name: 'Hyderabad Mega Hub & Cold Storage',
    manager: 'G. Srinivas',
    phone: '919849067890',
    displayPhone: '+91 98490 67890',
    address: 'Batasingaram Logistic Park, NH-65 / Kothapet Fruit Market Annex, Hyderabad, TG 501511',
    scaleCapacity: '60 Ton Pitless Digital Weighbridge',
    hours: '04:30 AM - 09:00 PM (Scale 24x7)',
  },
  {
    city: 'Vijayawada',
    state: 'Andhra Pradesh',
    name: 'Vijayawada Regional Transit Hub',
    manager: 'K. Narayana',
    phone: '919848198765',
    displayPhone: '+91 98481 98765',
    address: 'Nunna Mango & Fruit Market Complex, Inner Ring Rd, Vijayawada, AP 521212',
    scaleCapacity: '50 Ton Pitless Weighbridge',
    hours: '05:00 AM - 08:00 PM',
  },
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    name: 'Bengaluru Agro Procurement Hub',
    manager: 'K. Venkatesh',
    phone: '919845034567',
    displayPhone: '+91 98450 34567',
    address: 'Gate 4, APMC Market Yard, Yeshwanthpur, Bengaluru, KA 560022',
    scaleCapacity: '60 Ton Electronic Weighbridge',
    hours: '05:00 AM - 08:30 PM',
  },
  {
    city: 'Chennai',
    state: 'Tamil Nadu',
    name: 'Chennai Port Transit Hub',
    manager: 'R. Sundaram',
    phone: '919444012891',
    displayPhone: '+91 94440 12891',
    address: 'Block C, Koyambedu Wholesale Market Complex, Chennai, TN 600092',
    scaleCapacity: '60 Ton Weighbridge Scale',
    hours: '04:00 AM - 08:00 PM',
  },
  {
    city: 'Madurai',
    state: 'Tamil Nadu',
    name: 'Madurai South Hub',
    manager: 'M. Selvam',
    phone: '919443187654',
    displayPhone: '+91 94431 87654',
    address: 'Mattuthavani Central Vegetable & Fruit Market, Madurai, TN 625007',
    scaleCapacity: '40 Ton Digital Weighbridge',
    hours: '05:30 AM - 07:30 PM',
  },
  {
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    name: 'Varanasi North Hub',
    manager: 'Rajesh Pandey',
    phone: '919450023145',
    displayPhone: '+91 94500 23145',
    address: 'Chandpur Mandi Complex, GT Road, Varanasi, UP 221106',
    scaleCapacity: '50 Ton Electronic Scale',
    hours: '05:00 AM - 08:00 PM',
  },
  {
    city: 'Siliguri',
    state: 'West Bengal',
    name: 'Siliguri North-East Gate Hub',
    manager: 'Anirban Roy',
    phone: '919434076512',
    displayPhone: '+91 94340 76512',
    address: 'Regulated Market Complex, Champasari, Siliguri, WB 734003',
    scaleCapacity: '50 Ton Digital Scale',
    hours: '05:00 AM - 07:30 PM',
  },
];

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
  const [activeTab, setActiveTab] = useState<'orders' | 'dispatch' | 'qc' | 'support' | 'kyc'>('orders');
  const [viewSlipModalUrl, setViewSlipModalUrl] = useState<string | null>(null);
  const [selectedSupportPOId, setSelectedSupportPOId] = useState<string>('');

  // Synchronize activeTab when navigation changes from the left sidebar
  useEffect(() => {
    if (activePage === 'Weighbridge & QC Slips') {
      setActiveTab('qc');
    } else if (activePage === 'WhatsApp Helpdesk & Hubs') {
      setActiveTab('support');
    }
  }, [activePage]);

  // Global Escape key listener to close any open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreatePOModal(false);
        setSelectedPOForDispatch(null);
        setViewSlipModalUrl(null);
      }
    };
    if (showCreatePOModal || selectedPOForDispatch || viewSlipModalUrl) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showCreatePOModal, selectedPOForDispatch, viewSlipModalUrl]);

  const handleTabClick = (tab: 'orders' | 'dispatch' | 'qc' | 'support' | 'kyc') => {
    setActiveTab(tab);
    if (onNavigate) {
      if (tab === 'qc') {
        onNavigate('Weighbridge & QC Slips');
      } else if (tab === 'support') {
        onNavigate('WhatsApp Helpdesk & Hubs');
      } else {
        onNavigate('Dashboard');
      }
    }
  };

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

  // Vendor PO Creation Modal State
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [targetHub, setTargetHub] = useState<string>('Warangal');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<Array<{
    id: string;
    fruitName: string;
    varietyGrade: string;
    quantity: number | string;
    unit: string;
    ratePerUnit: number | string;
    lineTotal: number;
  }>>([
    {
      id: '1',
      fruitName: 'Kashmir Apples',
      varietyGrade: 'Grade A Export Quality',
      quantity: 500,
      unit: 'BOX',
      ratePerUnit: 1100,
      lineTotal: 550000,
    },
  ]);
  const [isSubmittingPO, setIsSubmittingPO] = useState(false);
  const [createPOError, setCreatePOError] = useState('');

  const handleAddFruitChip = (fruit: string) => {
    setPoItems((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
        fruitName: fruit,
        varietyGrade: 'Grade A Export Quality',
        quantity: 100,
        unit: 'BOX',
        ratePerUnit: 1000,
        lineTotal: 100000,
      },
    ]);
  };

  const handlePoItemChange = (index: number, field: string, val: any) => {
    setPoItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: val };
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.ratePerUnit) || 0;
      item.lineTotal = qty * rate;
      updated[index] = item;
      return updated;
    });
  };

  const handleRemovePoItem = (index: number) => {
    if (poItems.length <= 1) return;
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitVendorPO = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatePOError('');
    if (poItems.length === 0) {
      setCreatePOError('Please add at least one fruit consignment item.');
      return;
    }
    const invalidFruit = poItems.find(
      (it) => !VENDOR_WHITELISTED_FRUITS.includes(it.fruitName as any)
    );
    if (invalidFruit) {
      setCreatePOError(`Fruit "${invalidFruit.fruitName}" is not allowed. Vendors can only supply whitelisted fruits.`);
      return;
    }
    const grandTotal = poItems.reduce((sum, it) => sum + (it.lineTotal > 0 ? it.lineTotal : 0), 0);
    if (grandTotal <= 0) {
      setCreatePOError('Total consignment value must be greater than 0.');
      return;
    }

    try {
      setIsSubmittingPO(true);
      const advance = Math.round(grandTotal * 0.70);
      const pending = grandTotal - advance;

      await api.createPurchaseOrder({
        supplierId: vendorProfile?.vendorId || 'VND-001',
        isVendor: true,
        orderPersonName: vendorProfile?.contactPerson || user?.name || 'Authorized Vendor',
        orderPersonPlace: targetHub,
        deliveryAddress: `${targetHub} Regional Hub Receiving Desk`,
        poDate: new Date().toISOString(),
        expectedDeliveryDate: expectedDeliveryDate || null,
        grandTotal,
        totalAmount: grandTotal,
        advanceAmount: advance,
        pendingAmount: pending,
        fruitName: poItems.map((i) => `${i.fruitName} (${i.quantity} ${i.unit})`).join(', '),
        notes: poNotes ? `Vendor Consignment: ${poNotes}` : `Vendor consignment supply for ${targetHub} Hub (70% Auto-Advance Policy)`,
        items: poItems.map((it) => ({
          fruitName: it.fruitName,
          category: 'Fresh Fruits',
          varietyGrade: it.varietyGrade || 'Grade A Export Quality',
          quantity: Number(it.quantity) || 1,
          unit: it.unit || 'BOX',
          ratePerUnit: Number(it.ratePerUnit) || 0,
          discountPercent: 0,
          taxPercent: 0,
          lineTotal: it.lineTotal,
        })),
        submitForApproval: true,
      });

      setShowCreatePOModal(false);
      onNotify('Supply PO submitted successfully! Safal Operations Desk has been notified.');
      await loadData();
      setActiveTab('orders');
    } catch (err: any) {
      setCreatePOError(err.message || 'Failed to submit supply PO.');
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
          <ShoppingCart size={15} /> My Purchase Orders ({orders.length})
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
          onClick={() => handleTabClick('support')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'support'
              ? 'bg-[#1564B7] text-white shadow-xs'
              : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200'
          }`}
        >
          <MessageSquare size={15} /> WhatsApp Helpdesk &amp; Hubs
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

      {/* 5. Tab Content: My Purchase Orders */}
      {activeTab === 'orders' && (
        <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-gray-900">Assigned Purchase Orders (PO) Dossier</h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Official procurement orders issued by SAFAL Export &amp; Import Pvt Ltd.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-gray-500">
                Showing <strong>{orders.length}</strong> orders
              </span>
              <button
                type="button"
                onClick={() => setShowCreatePOModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-[#087A3E] hover:bg-[#064D2B] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> + Create Supply PO
              </button>
            </div>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse min-w-[850px] text-xs">
              <thead>
                <tr className="bg-[#064D2B] text-white">
                  <th className="py-3 px-3 text-center font-bold w-12 border-r border-[#085A33]">S.No.</th>
                  <th className="py-3 px-4 text-center font-bold border-r border-[#085A33]">PO Number</th>
                  <th className="py-3 px-4 text-center font-bold border-r border-[#085A33]">Destination Hub</th>
                  <th className="py-3 px-4 text-center font-bold border-r border-[#085A33]">Order Date</th>
                  <th className="py-3 px-4 text-right font-bold border-r border-[#085A33]">Total Value</th>
                  <th className="py-3 px-4 text-right font-bold border-r border-[#085A33]">Advance Paid</th>
                  <th className="py-3 px-4 text-right font-bold border-r border-[#085A33]">Balance Due</th>
                  <th className="py-3 px-4 text-center font-bold border-r border-[#085A33]">Dispatch Status</th>
                  <th className="py-3 px-4 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      No purchase orders assigned to this vendor account yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((po, idx) => {
                    const total = Number(po.grandTotal || 0);
                    const advance = Number(po.advanceAmount || 0);
                    const balance = Number(po.pendingAmount ?? Math.max(0, total - advance));

                    return (
                      <tr key={po.id} className="hover:bg-gray-50 transition">
                        <td className="text-center py-3.5 px-3 font-bold text-gray-600 border-r border-gray-100">
                          {idx + 1}
                        </td>
                        <td className="text-center py-3.5 px-4 font-black text-[#087A3E] border-r border-gray-100 whitespace-nowrap">
                          {po.poNumber}
                        </td>
                        <td className="text-center py-3.5 px-4 text-gray-800 border-r border-gray-100">
                          <span className="inline-flex items-center gap-1 font-bold text-gray-900">
                            📍 {po.orderPersonPlace || vendorProfile?.primaryLocation || 'Warangal'}
                          </span>
                        </td>
                        <td className="text-center py-3.5 px-4 text-gray-600 border-r border-gray-100 whitespace-nowrap">
                          {po.poDate ? new Date(po.poDate).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="text-right py-3.5 px-4 font-extrabold text-gray-900 border-r border-gray-100">
                          ₹{total.toLocaleString('en-IN')}
                        </td>
                        <td className="text-right py-3.5 px-4 font-bold text-emerald-700 border-r border-gray-100">
                          ₹{advance.toLocaleString('en-IN')}
                        </td>
                        <td className="text-right py-3.5 px-4 font-bold text-amber-900 border-r border-gray-100">
                          ₹{balance.toLocaleString('en-IN')}
                        </td>
                        <td className="text-center py-3.5 px-4 border-r border-gray-100">
                          {po.dispatchStatus === 'LOADED_AND_DISPATCHED' || po.dispatchStatus === 'IN_TRANSIT' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 inline-flex items-center gap-1">
                              <Truck size={12} /> {po.dispatchVehicleNumber || 'In Transit'}
                            </span>
                          ) : po.dispatchStatus === 'DELIVERED_AT_HUB' || po.status === 'CLOSED' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 inline-flex items-center gap-1">
                              <CheckCircle2 size={12} /> Delivered
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 inline-flex items-center gap-1">
                              <Clock size={12} /> Pending Dispatch
                            </span>
                          )}
                        </td>
                        <td className="text-center py-3.5 px-4 whitespace-nowrap">
                          {po.dispatchStatus === 'LOADED_AND_DISPATCHED' || po.dispatchStatus === 'IN_TRANSIT' ? (
                            <span className="text-[11px] font-bold text-blue-700">Proof Submitted ✓</span>
                          ) : (
                            <button
                              onClick={() => setSelectedPOForDispatch(po)}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                            >
                              <Upload size={12} /> Dispatch
                            </button>
                          )}
                        </td>
                      </tr>
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

      {/* 7. Tab Content: 1-Click WhatsApp Support Desk & 8 Regional Hub Directory */}
      {activeTab === 'support' && (
        <section className="space-y-6">
          {/* Top Card: 1-Click WhatsApp Action Desk */}
          <div className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm p-4 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    💬
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900">
                    1-Click WhatsApp Support Desk (డైరెక్ట్ వాట్సాప్ సపోర్ట్)
                  </h2>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Instant pre-filled WhatsApp templates to share live truck transit location, inquire 70% advance bank transfer UTR, or check mandi scale weight.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold self-start sm:self-auto">
                Direct Corporate Helpdesk: +91 98480 12345
              </span>
            </div>

            {/* PO Selector for dynamic templates */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-bold text-gray-700 block">Select Consignment PO for WhatsApp Action:</span>
                <span className="text-gray-500 text-[11px]">Selecting a PO automatically inserts order number, vehicle number, and advance amounts.</span>
              </div>
              <select
                value={selectedSupportPOId}
                onChange={(e) => setSelectedSupportPOId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
              >
                <option value="">-- General Inquiry (No specific PO) --</option>
                {orders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber} — {po.orderPersonPlace || 'Hub'} (₹{Number(po.grandTotal || 0).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Cards */}
            {(() => {
              const activePO = orders.find((o) => o.id === selectedSupportPOId) || orders[0];
              const poNum = activePO?.poNumber || 'PO/SF/2026/020';
              const truckNo = activePO?.dispatchVehicleNumber || 'AP 39 TB 1234';
              const hubName = activePO?.orderPersonPlace || vendorProfile?.primaryLocation || 'Warangal';
              const driverContact = (activePO as any)?.dispatchDriverPhone || vendorProfile?.phone || '+91 98480 12345';
              const orderTotal = Number(activePO?.grandTotal || 1320000);
              const advanceAmt = Math.round(orderTotal * 0.70);
              const vendorName = vendorProfile?.businessName || user?.name || 'Authorized Vendor';
              const vendorId = vendorProfile?.vendorId || 'VND-001';
              const bankAcc = vendorProfile?.bankAccountNumberMasked || 'XXXXXX6789';
              const ifsc = vendorProfile?.bankIfscCode || 'SBIN0001234';

              // Pre-filled WhatsApp URLs
              const locationMsg = `🚚 *SAFAL TRUCK LOCATION UPDATE*\n• PO Number: ${poNum}\n• Vendor: ${vendorName} (${vendorId})\n• Vehicle No: ${truckNo}\n• Destination Hub: ${hubName}\n• Driver Contact: ${driverContact}\n\nSir, our loaded vehicle is currently moving to the hub. Here is our live transit update.`;
              const locationWaUrl = `https://wa.me/919848012345?text=${encodeURIComponent(locationMsg)}`;

              const advanceMsg = `💰 *SAFAL 70% ADVANCE PAYMENT INQUIRY*\n• PO Number: ${poNum}\n• Vendor: ${vendorName} (${vendorId})\n• Total PO Value: ₹${orderTotal.toLocaleString('en-IN')}\n• 70% Advance Amount: ₹${advanceAmt.toLocaleString('en-IN')}\n• Bank Account: ${bankAcc} (${ifsc})\n\nSir, dispatch proof has been submitted. Kindly share the 70% advance payment bank transfer UTR number.`;
              const advanceWaUrl = `https://wa.me/919848012345?text=${encodeURIComponent(advanceMsg)}`;

              const qcMsg = `⚖️ *SAFAL WEIGHBRIDGE & QC STATUS*\n• PO Number: ${poNum}\n• Vendor: ${vendorName} (${vendorId})\n• Vehicle: ${truckNo}\n• Destination: ${hubName} Hub\n\nSir, please verify the Weighbridge Gross/Tare weight slip and QC grading certificate for this consignment.`;
              const qcWaUrl = `https://wa.me/919848012345?text=${encodeURIComponent(qcMsg)}`;

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Live Truck Location */}
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between gap-3">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-2">
                        <Truck size={20} />
                      </div>
                      <h3 className="font-extrabold text-sm text-emerald-950">
                        1. Share Live Truck Location
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Send real-time GPS location and driver details directly to Safal Hub Logistics Team.
                      </p>
                      <div className="mt-2.5 p-2 bg-white rounded-lg border border-emerald-100 text-[10px] text-gray-500 font-mono">
                        PO: <strong>{poNum}</strong> · Vehicle: <strong>{truckNo}</strong>
                      </div>
                    </div>

                    <a
                      href={locationWaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Share2 size={14} /> Share Location on WhatsApp
                    </a>
                  </div>

                  {/* Card 2: 70% Advance Inquiry */}
                  <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col justify-between gap-3">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-2">
                        <CreditCard size={20} />
                      </div>
                      <h3 className="font-extrabold text-sm text-amber-950">
                        2. Inquire 70% Advance / Bank UTR
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Ask Corporate Accounts Desk for NEFT/RTGS transaction receipt and bank reference.
                      </p>
                      <div className="mt-2.5 p-2 bg-white rounded-lg border border-amber-100 text-[10px] text-gray-500 font-mono">
                        Adv: <strong>₹{advanceAmt.toLocaleString('en-IN')}</strong> · A/C: <strong>{bankAcc}</strong>
                      </div>
                    </div>

                    <a
                      href={advanceWaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <CreditCard size={14} /> Inquire 70% Advance on WhatsApp
                    </a>
                  </div>

                  {/* Card 3: Weighbridge & QC Status */}
                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 flex flex-col justify-between gap-3">
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center mb-2">
                        <Scale size={20} />
                      </div>
                      <h3 className="font-extrabold text-sm text-blue-950">
                        3. Weighbridge &amp; QC Query
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        Inquire regarding truck tare weight completion and quality inspection acceptance.
                      </p>
                      <div className="mt-2.5 p-2 bg-white rounded-lg border border-blue-100 text-[10px] text-gray-500 font-mono">
                        Destination: <strong>{hubName} Hub Yard</strong>
                      </div>
                    </div>

                    <a
                      href={qcWaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 bg-[#1564B7] hover:bg-[#0E4F94] text-white rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Scale size={14} /> Inquire Weighbridge on WhatsApp
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Bottom Section: 8 Regional Hubs Directory */}
          <div className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm p-4 sm:p-6 space-y-4">
            <div className="border-b border-gray-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <MapPin className="text-emerald-700" size={20} />
                  Official 8 Regional Hubs Directory &amp; Mandi Incharges
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Direct contacts for all Safal whitelisted regional procurement hubs with electronic weighbridge facilities.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black self-start sm:self-auto">
                8 Whitelisted Hubs Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {VENDOR_HUB_DIRECTORY.map((hub) => {
                const waUrl = `https://wa.me/${hub.phone}?text=${encodeURIComponent(
                  `Hello ${hub.manager} Sir, this is ${vendorProfile?.businessName || user?.name} (${vendorProfile?.vendorId || 'Vendor'}). Inquiring about delivery to ${hub.city} Hub.`
                )}`;

                return (
                  <div
                    key={hub.city}
                    className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-emerald-50/30 hover:border-emerald-300 transition flex flex-col justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <strong className="text-sm font-black text-gray-900 flex items-center gap-1">
                          📍 {hub.city}
                        </strong>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                          {hub.state}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-gray-800 mt-1">
                        Incharge: <span className="text-emerald-900">{hub.manager}</span>
                      </p>

                      <div className="mt-2 space-y-1 text-[11px] text-gray-600">
                        <p className="line-clamp-2" title={hub.address}>
                          🏢 {hub.address}
                        </p>
                        <p className="text-emerald-800 font-semibold flex items-center gap-1 mt-1">
                          ⚖️ {hub.scaleCapacity}
                        </p>
                        <p className="text-gray-500 text-[10px]">
                          🕒 {hub.hours}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200/80 flex items-center gap-2">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-1.5 px-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg text-[11px] font-black text-center transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <MessageSquare size={12} /> WhatsApp
                      </a>
                      <a
                        href={`tel:+${hub.phone}`}
                        className="py-1.5 px-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-[11px] font-bold text-center transition flex items-center justify-center gap-1 cursor-pointer"
                        title={`Call ${hub.displayPhone}`}
                      >
                        <Phone size={12} /> Call
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 7. Modal: Submit Vehicle Photo & Transport Bill */}
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

              {/* 7 Whitelisted Fruits Quick Selection Chips */}
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl">
                <span className="text-[10px] uppercase font-bold text-[#064D2B] tracking-wider block mb-1.5 flex items-center justify-between">
                  <span>Quick Add Whitelisted Fruits (Tap to Add)</span>
                  <span className="text-emerald-700 font-bold">7 Allowed Varieties</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {VENDOR_WHITELISTED_FRUITS.map((fruit) => (
                    <button
                      key={fruit}
                      type="button"
                      onClick={() => handleAddFruitChip(fruit)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-[#064D2B] border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={11} /> {fruit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Consignment Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-gray-900 uppercase tracking-wider">
                    Consignment Items ({poItems.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleAddFruitChip('Kashmir Apples')}
                    className="text-xs text-[#087A3E] font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus size={13} /> + Add Item Row
                  </button>
                </div>

                {poItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                  >
                    <div className="sm:col-span-4">
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Fruit Variety *</label>
                      <select
                        value={item.fruitName}
                        onChange={(e) => handlePoItemChange(idx, 'fruitName', e.target.value)}
                        className="w-full h-8 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white"
                        required
                      >
                        {VENDOR_WHITELISTED_FRUITS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Grade / Variety</label>
                      <input
                        type="text"
                        value={item.varietyGrade}
                        onChange={(e) => handlePoItemChange(idx, 'varietyGrade', e.target.value)}
                        placeholder="Grade A / Export"
                        className="w-full h-8 px-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-900 bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handlePoItemChange(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className="w-full h-8 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-right"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Rate (₹)</label>
                      <input
                        type="number"
                        min="1"
                        value={item.ratePerUnit}
                        onChange={(e) => handlePoItemChange(idx, 'ratePerUnit', e.target.value)}
                        placeholder="Rate ₹"
                        className="w-full h-8 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-right"
                        required
                      />
                    </div>

                    <div className="sm:col-span-1 flex items-center justify-center">
                      {poItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePoItem(idx)}
                          className="w-8 h-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center cursor-pointer transition"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 70% Auto-Advance Policy Settlement Breakdown */}
              {(() => {
                const totalVal = poItems.reduce((sum, it) => sum + (it.lineTotal > 0 ? it.lineTotal : 0), 0);
                const advanceVal = Math.round(totalVal * 0.70);
                const pendingVal = Math.max(0, totalVal - advanceVal);

                return (
                  <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-400 rounded-2xl space-y-2">
                    <span className="text-[10px] uppercase font-black text-[#064D2B] tracking-wider block flex items-center gap-1.5">
                      <Sparkles size={13} className="text-emerald-700" /> 70% Automatic Advance Settlement Guarantee
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="bg-white p-2 rounded-xl border border-emerald-200">
                        <span className="text-[9px] text-gray-500 uppercase font-bold block">Total Consignment</span>
                        <strong className="text-sm font-black text-gray-900 block mt-0.5">
                          ₹{totalVal.toLocaleString('en-IN')}
                        </strong>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-emerald-300 shadow-2xs">
                        <span className="text-[9px] text-emerald-800 uppercase font-extrabold block">70% Auto Advance</span>
                        <strong className="text-sm font-black text-emerald-700 block mt-0.5">
                          ₹{advanceVal.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[8px] text-emerald-600 block">Paid on Dispatch</span>
                      </div>

                      <div className="bg-white p-2 rounded-xl border border-gray-200">
                        <span className="text-[9px] text-gray-500 uppercase font-bold block">30% Balance Due</span>
                        <strong className="text-sm font-black text-gray-700 block mt-0.5">
                          ₹{pendingVal.toLocaleString('en-IN')}
                        </strong>
                        <span className="text-[8px] text-gray-400 block">Settled on Delivery</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
    </div>
  );
};
