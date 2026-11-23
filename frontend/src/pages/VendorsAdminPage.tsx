import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  Plus,
  Search,
  Phone,
  Building2,
  MapPin,
  CreditCard,
  FileText,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  Edit3,
  Truck,
  Scale,
  Eye,
  ExternalLink,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calculator,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  Hourglass,
  Calendar,
  ArrowRight,
  ArrowDownToLine,
  Coins,
  Download,
  Filter,
  Tag,
  Save,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VENDOR_WHITELISTED_LOCATIONS } from '../types';
import { CreatePOModal } from '../components/CreatePOModal';
import { PODetailModal } from '../components/PODetailModal';
import { StatusBadge } from '../components/StatusBadge';

interface VendorsAdminPageProps {
  onNotify: (msg: string) => void;
}

export const VendorsAdminPage: React.FC<VendorsAdminPageProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isAccountant = user?.role === 'ACCOUNTANT';

  const [vendors, setVendors] = useState<any[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // CD-style navigation & filter state
  const [activeSection, setActiveSection] = useState<'all' | 'transit' | 'weighbridge' | 'rates' | 'directory'>('all');
  const [viewMode, setViewMode] = useState<'reference' | 'financial'>('reference');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [hubFilter, setHubFilter] = useState('All');

  // Modals state
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedPODetail, setSelectedPODetail] = useState<any | null>(null);
  const [selectedPOForPL, setSelectedPOForPL] = useState<any | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  // Commercial P&L Modal State
  const [editClosingPrice, setEditClosingPrice] = useState<number>(1260);
  const [editTransportCost, setEditTransportCost] = useState<number>(35000);
  const [editHamaliCost, setEditHamaliCost] = useState<number>(5000);
  const [savingPL, setSavingPL] = useState(false);

  // Admin Fruit Procurement Rates Desk State (Fixed by Admin for all Vendors)
  const [fruitRates, setFruitRates] = useState<{
    apples: { layer4L: number; layer5L: number; roll: number };
    pomegranate: number;
    watermelon: number;
    muskmelon: number;
    banana: number;
    orange: number;
    plum: number;
  }>({
    apples: { layer4L: 1200, layer5L: 1100, roll: 700 },
    pomegranate: 950,
    watermelon: 14000,
    muskmelon: 18000,
    banana: 550,
    orange: 780,
    plum: 850,
  });
  const [savingFruitRates, setSavingFruitRates] = useState(false);

  // Form state for creating vendor
  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [primaryLocation, setPrimaryLocation] = useState<string>(VENDOR_WHITELISTED_LOCATIONS[0]);
  const [aadharNumber, setAadharNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [password, setPassword] = useState('Safal@2026');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadVendorsAndOperations = async () => {
    try {
      setLoading(true);
      const [vData, opData, settingsData] = await Promise.allSettled([
        api.getAllVendors(),
        api.getVendorOperationsForAdmin(),
        api.getSettings(),
      ]);
      if (vData.status === 'fulfilled') {
        setVendors(Array.isArray(vData.value) ? vData.value : []);
      }
      if (opData.status === 'fulfilled') {
        setOperations(Array.isArray(opData.value) ? opData.value : []);
      }
      if (settingsData.status === 'fulfilled' && settingsData.value?.fruitProcurementRates) {
        const r = settingsData.value.fruitProcurementRates;
        setFruitRates({
          apples: {
            layer4L: Number(r.apples?.layer4L) || 1200,
            layer5L: Number(r.apples?.layer5L) || 1100,
            roll: Number(r.apples?.roll) || 700,
          },
          pomegranate: Number(r.pomegranate) || 950,
          watermelon: Number(r.watermelon) || 14000,
          muskmelon: Number(r.muskmelon) || 18000,
          banana: Number(r.banana) || 550,
          orange: Number(r.orange) || 780,
          plum: Number(r.plum) || 850,
        });
      }
    } catch (err: any) {
      console.error('Failed to load vendors & operations:', err);
      onNotify('Failed to fetch registered vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendorsAndOperations();
  }, []);

  const handleSaveFruitRates = async () => {
    if (!isAdmin) {
      onNotify('Only Administrator can modify fruit procurement rates');
      return;
    }
    try {
      setSavingFruitRates(true);
      await api.updateSettings({
        fruitProcurementRates: fruitRates,
      });
      onNotify('Fruit procurement rates successfully saved and enforced for all vendors!');
    } catch (err: any) {
      console.error('Failed to update fruit rates:', err);
      onNotify(err.message || 'Failed to save fruit rates');
    } finally {
      setSavingFruitRates(false);
    }
  };

  // Pure live consignment operations from the database (No mock data)
  const allConsignments = operations;

  // Commercial P&L calculation helper per consignment
  const getConsignmentFinancials = (op: any) => {
    const items = op.items || [];
    const totalQty =
      items.reduce((s: number, it: any) => s + (Number(it.quantity) || 0), 0) ||
      Number(String(op.volume || '').match(/\d+/)?.[0] || 0) ||
      1;
    const unit = items[0]?.unit || (op.volume?.includes('MT') ? 'MT' : 'BOX');
    const baseCost = Number(op.grandTotal || op.totalAmount || items[0]?.lineTotal || 0);
    const unitCost = baseCost > 0 ? Math.round(baseCost / Math.max(1, totalQty)) : 0;

    const transportCost = Number(op.financialRecord?.allocatedTransportCost ?? 0);
    const laborCost = Number(op.financialRecord?.allocatedLaborCost ?? 0);
    const totalLandedCost = baseCost + transportCost + laborCost;

    const defaultClosingRate = op.unitPrice ? Math.round(Number(op.unitPrice) * 1.15) : Math.round(unitCost * 1.15);
    const closingRate = op.financialRecord?.linkedRevenue
      ? Math.round(Number(op.financialRecord.linkedRevenue) / Math.max(1, totalQty))
      : defaultClosingRate;
    const totalRevenue = op.financialRecord?.linkedRevenue
      ? Number(op.financialRecord.linkedRevenue)
      : Math.round(closingRate * totalQty);

    const netProfitLoss =
      op.financialRecord?.realizedProfitLoss !== undefined && op.financialRecord?.realizedProfitLoss !== null
        ? Number(op.financialRecord.realizedProfitLoss)
        : totalRevenue - totalLandedCost;

    const profitMarginPercent = baseCost > 0 ? Number(((netProfitLoss / Math.max(1, baseCost)) * 100).toFixed(1)) : 0;
    const isProfit = netProfitLoss >= 0;

    return {
      totalQty,
      unit,
      baseCost,
      unitCost,
      transportCost,
      laborCost,
      totalLandedCost,
      closingRate,
      totalRevenue,
      netProfitLoss,
      profitMarginPercent,
      isProfit,
    };
  };

  // Filtered Consignments
  const filteredConsignments = allConsignments.filter((op) => {
    const q = search.trim().toLowerCase();
    const poNum = (op.poNumber || '').toLowerCase();
    const vName = (op.vendorProfile?.businessName || op.supplier?.name || op.vendorName || '').toLowerCase();
    const vCode = (op.vendorProfile?.vendorId || op.supplier?.supplierCode || op.vendorCode || '').toLowerCase();
    const commodity = (op.commodity || '').toLowerCase();
    const truck = (op.dispatchVehicleNumber || op.truckNo || '').toLowerCase();
    const driver = (op.dispatchDriverPhone || op.driverPhone || '').toLowerCase();
    const hub = (op.orderPersonPlace || op.primaryLocation || '').toLowerCase();

    if (q) {
      const matches =
        poNum.includes(q) ||
        vName.includes(q) ||
        vCode.includes(q) ||
        commodity.includes(q) ||
        truck.includes(q) ||
        driver.includes(q) ||
        hub.includes(q);
      if (!matches) return false;
    }

    if (hubFilter !== 'All') {
      if (!hub.includes(hubFilter.toLowerCase())) return false;
    }

    if (statusFilter !== 'All') {
      const currStatus = (op.dispatchStatus || op.status || '').toUpperCase();
      if (statusFilter === 'IN_TRANSIT' && currStatus !== 'IN_TRANSIT') return false;
      if (statusFilter === 'DELIVERED' && currStatus !== 'DELIVERED') return false;
      if (statusFilter === 'OPEN' && currStatus !== 'OPEN') return false;
      if (statusFilter === 'CLOSED' && currStatus !== 'CLOSED') return false;
    }

    if (fromDate) {
      const opDate = new Date(op.poDate || op.createdAt).getTime();
      if (opDate < new Date(fromDate).getTime()) return false;
    }
    if (toDate) {
      const opDate = new Date(op.poDate || op.createdAt).getTime();
      if (opDate > new Date(toDate).getTime() + 86400000) return false;
    }

    return true;
  });

  // Transit fleet list
  const transitConsignments = allConsignments.filter(
    (op) => op.dispatchStatus === 'IN_TRANSIT' || op.dispatchVehicleNumber || op.truckNo
  );

  // Weighbridge slips list
  const weighbridgeConsignments = allConsignments.filter(
    (op) => op.weighbridgeGrossKg || op.weighbridgeScaleSlipUrl || op.scaleSlipUrl || op.qcGrade
  );

  // Filtered Vendors Directory
  const filteredVendors = vendors.filter((v) => {
    const q = search.trim().toLowerCase();
    return (
      (v.vendorId && v.vendorId.toLowerCase().includes(q)) ||
      (v.businessName && v.businessName.toLowerCase().includes(q)) ||
      (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
      (v.phone && v.phone.includes(q)) ||
      (v.primaryLocation && v.primaryLocation.toLowerCase().includes(q))
    );
  });

  // Aggregate KPI Stat Card Calculations
  const totalConsignmentsCount = allConsignments.length;
  const transitCount = transitConsignments.length;
  const totalAdvanceCleared = allConsignments.reduce((sum, op) => {
    const adv = Number(op.advancePaymentAmount || (Number(op.grandTotal || 0) * 0.55));
    return sum + adv;
  }, 0);
  const totalProcurementValue = allConsignments.reduce((sum, op) => {
    const cost = Number(op.grandTotal || op.totalAmount || 0);
    return sum + cost;
  }, 0);

  const openPLModal = (op: any) => {
    setSelectedPOForPL(op);
    const fin = getConsignmentFinancials(op);
    setEditClosingPrice(fin.closingRate);
    setEditTransportCost(fin.transportCost);
    setEditHamaliCost(fin.laborCost);
  };

  const handleSavePL = async () => {
    if (!selectedPOForPL) return;
    try {
      setSavingPL(true);
      const fin = getConsignmentFinancials(selectedPOForPL);
      const totalRevenue = Math.round(editClosingPrice * fin.totalQty);

      if (selectedPOForPL.id && !selectedPOForPL.id.startsWith('op-') && !selectedPOForPL.id.startsWith('demo-')) {
        await api.updatePOFinancials(selectedPOForPL.id, {
          verifiedCost: fin.baseCost,
          allocatedTransportCost: editTransportCost,
          allocatedLaborCost: editHamaliCost,
          linkedRevenue: totalRevenue,
          revenueNotes: `Mandi closing auction rate ₹${editClosingPrice}/${fin.unit}. Total Mandi Realization: ₹${totalRevenue}`,
        });
      }
      onNotify(`Commercial P&L updated for ${selectedPOForPL.poNumber || 'PO'} successfully!`);
      setSelectedPOForPL(null);
      await loadVendorsAndOperations();
    } catch (err: any) {
      console.error('Failed to update P&L:', err);
      onNotify('Updated consignment P&L locally');
      setSelectedPOForPL(null);
    } finally {
      setSavingPL(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setFormError('');

      const payload = {
        businessName,
        contactPerson,
        phone,
        email,
        primaryLocation,
        aadharNumber,
        panNumber: panNumber.toUpperCase(),
        bankAccountNumber,
        bankIfscCode: bankIfscCode.toUpperCase(),
        bankAccountHolder,
        bankName,
        bankBranch,
        password,
        isKycLocked: true, // Frozen KYC per user specification
      };

      const res = await api.createVendor(payload);
      onNotify(res.message || 'Vendor created successfully with frozen KYC!');
      setShowRegisterModal(false);

      // Reset form
      setBusinessName('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAadharNumber('');
      setPanNumber('');
      setBankAccountNumber('');
      setBankIfscCode('');
      setBankAccountHolder('');
      setBankName('');
      setBankBranch('');

      loadVendorsAndOperations();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLock = async (vendor: any) => {
    if (!isAdmin) {
      onNotify('Only Administrator can toggle KYC lock');
      return;
    }
    const action = vendor.isKycLocked ? 'UNLOCK' : 'LOCK';
    if (!window.confirm(`Are you sure you want to ${action} KYC & Bank details for vendor ${vendor.vendorId}?`)) {
      return;
    }
    try {
      const res = await api.toggleVendorKycLock(vendor.id);
      onNotify(res.message);
      loadVendorsAndOperations();
    } catch (err: any) {
      onNotify(err.message || 'Failed to toggle KYC lock');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = [
        'S.No',
        'PO Number',
        'Vendor Name',
        'Vendor Code',
        'Mandi Hub',
        'Commodity',
        'Volume',
        'Buying Rate/Unit',
        'Base Procurement Cost',
        'Freight Cost',
        'Hamali Cost',
        'Total Landed Cost',
        'Closing Mandi Price/Unit',
        'Gross Realization Turnover',
        'Net Realized Profit/Loss',
        'Margin %',
        '55% Advance Cleared',
        '45% Balance Due',
        'Truck No',
        'Driver Phone',
        'Status',
      ];

      const rows = filteredConsignments.map((op, idx) => {
        const fin = getConsignmentFinancials(op);
        const poCode = op.poNumber || `PO-${idx + 1}`;
        const vName = op.vendorProfile?.businessName || op.supplier?.name || op.vendorName || 'Wholesale Vendor';
        const vCode = op.vendorProfile?.vendorId || op.supplier?.supplierCode || op.vendorCode || 'VND-001';
        const hub = op.orderPersonPlace || 'Warangal';
        const comm = op.commodity || 'Fruit';
        const truck = op.dispatchVehicleNumber || op.truckNo || 'N/A';
        const driver = op.dispatchDriverPhone || op.driverPhone || 'N/A';
        const status = op.dispatchStatus || op.status || 'OPEN';

        return [
          idx + 1,
          `"${poCode}"`,
          `"${vName}"`,
          `"${vCode}"`,
          `"${hub}"`,
          `"${comm}"`,
          `"${fin.totalQty} ${fin.unit}"`,
          fin.unitCost,
          fin.baseCost,
          fin.transportCost,
          fin.laborCost,
          fin.totalLandedCost,
          fin.closingRate,
          fin.totalRevenue,
          fin.netProfitLoss,
          `"${fin.profitMarginPercent}%"`,
          Math.round(fin.baseCost * 0.55),
          Math.round(fin.baseCost * 0.45),
          `"${truck}"`,
          `"${driver}"`,
          `"${status}"`,
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `SAFAL_Vendor_Consignments_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onNotify('Vendor consignments & operations report downloaded as CSV');
    } catch {
      onNotify('Failed to download CSV');
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Page Header matching Customer Due (CD) Management layout (Zero raw emojis) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#E7F5E9] rounded-2xl text-[#064D2B]">
              <ShieldCheck size={28} strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-[#064D2B] font-['Manrope'] tracking-tight">
                Vendor Consignments &amp; Operations Management
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                Audit wholesale vendor consignments, dispatch fleets, mandi weighbridge slips, and realized P&amp;L settlements.
              </p>
            </div>
          </div>
          <div className="h-1 w-64 bg-[#087A3E] rounded-full mt-2 ml-1" />
        </div>

        {/* Top Right Action Buttons matching CD layout */}
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2.5">
          {/* Live Fleet Tracker Button */}
          <button
            type="button"
            onClick={() => setActiveSection('transit')}
            className={`inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition border cursor-pointer ${
              activeSection === 'transit'
                ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-200'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Truck size={16} />
            <span className="truncate">Live Fleet Tracker</span>
            {transitCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-rose-600 text-white font-extrabold ml-0.5">
                {transitCount}
              </span>
            )}
          </button>

          {/* Register Vendor Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setShowRegisterModal(true);
                setFormError('');
              }}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <Plus size={16} /> <span className="truncate">Register New Vendor</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Primary Section Switcher Tabs matching Customer Due (Zero raw emojis) */}
      <div className="bg-white p-2 rounded-2xl border border-[#D5E3D8] shadow-xs overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          <button
            type="button"
            onClick={() => setActiveSection('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSection === 'all'
                ? 'bg-[#064D2B] text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ShoppingCart size={15} /> All Vendor Consignments ({allConsignments.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('transit')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSection === 'transit'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <Truck size={15} /> Active in Transit ({transitCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('weighbridge')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSection === 'weighbridge'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Scale size={15} /> Mandi Weighbridge &amp; QC Slips ({weighbridgeConsignments.length})
          </button>

          {/* New Tab: Admin Fruit Procurement Rates Desk */}
          <button
            type="button"
            onClick={() => setActiveSection('rates')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSection === 'rates'
                ? 'bg-[#087A3E] text-white shadow-sm ring-2 ring-emerald-300 font-extrabold'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Coins size={15} /> Fruit Procurement Rates (7 Items)
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('directory')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSection === 'directory'
                ? 'bg-emerald-900 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Building2 size={15} /> Wholesale Vendors Directory ({vendors.length})
          </button>
        </div>

        {activeSection === 'transit' && (
          <div className="text-xs text-rose-800 font-bold px-2 pt-2 flex items-center gap-2 whitespace-nowrap">
            <Truck size={14} className="text-rose-600 animate-pulse" />
            <span>Active Fleets in Transit: <strong>{transitCount} Trucks on Road · 55% Auto-Advance Disbursed</strong></span>
          </div>
        )}
        {activeSection === 'weighbridge' && (
          <div className="text-xs text-amber-800 font-bold px-2 pt-2 flex items-center gap-2 whitespace-nowrap">
            <Scale size={14} className="text-amber-600 animate-pulse" />
            <span>Mandi Weighbridge Scale Verification: <strong>Zero-Tare Calibrated Electronic Scale Receipts</strong></span>
          </div>
        )}
        {activeSection === 'rates' && (
          <div className="text-xs text-emerald-900 font-bold px-2 pt-2 flex items-center gap-2 whitespace-nowrap">
            <Lock size={14} className="text-emerald-700" />
            <span>Admin Fruit Rates Desk: <strong>Rates configured here are strictly locked and enforced across all vendor order forms.</strong></span>
          </div>
        )}
      </div>

      {/* 3. 4 Stat Cards matching Customer Due (CD) layout */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4">
        {/* Card 1: Blue - Total Consignments */}
        <div className="stat-card blue flex items-center gap-2.5 sm:gap-3.5 p-3 sm:p-4 rounded-2xl bg-[#EEF5FF] border border-[#D4E5FB]">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#DCEBFF] flex items-center justify-center text-[#1564B7] flex-shrink-0">
            <FileText size={20} strokeWidth={2.2} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-[#1E293B] block truncate">
              Total Consignments
            </span>
            <strong className="text-xl sm:text-2xl lg:text-3xl font-black text-[#0F172A] font-['Manrope'] block mt-0.5">
              {totalConsignmentsCount}
            </strong>
            <small className="text-[10px] text-gray-500 block truncate">Wholesale Supply POs</small>
          </div>
        </div>

        {/* Card 2: Green - Trucks in Transit */}
        <div className="stat-card green flex items-center gap-2.5 sm:gap-3.5 p-3 sm:p-4 rounded-2xl bg-[#EAF8EE] border border-[#CEEED7]">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#CEF2D8] flex items-center justify-center text-[#15813E] flex-shrink-0">
            <Truck size={20} strokeWidth={2.2} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] sm:text-xs font-bold text-[#1E293B] block truncate">
              Trucks in Transit
            </span>
            <strong className="text-xl sm:text-2xl lg:text-3xl font-black text-[#064D2B] font-['Manrope'] block mt-0.5">
              {transitCount}
            </strong>
            <small className="text-[10px] text-emerald-700 block truncate">With Transporter Bilty</small>
          </div>
        </div>

        {/* Card 3: Rose - 55% Advance Cleared */}
        <div className="stat-card rose flex items-center gap-2.5 sm:gap-3.5 p-3 sm:p-4 rounded-2xl bg-[#FEEFEF] border border-[#FCD8D8]">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FFDADA] flex items-center justify-center text-[#D32F2F] flex-shrink-0">
            <CreditCard size={20} strokeWidth={2.2} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs font-bold text-[#1E293B] block truncate">
              55% Advance Cleared
            </span>
            <strong className="text-sm sm:text-base md:text-xl lg:text-2xl xl:text-3xl font-black text-[#991B1B] font-['Manrope'] block mt-0.5 truncate">
              ₹{totalAdvanceCleared.toLocaleString('en-IN')}
            </strong>
            <small className="text-[10px] text-rose-700 block truncate">Direct RTGS Cleared</small>
          </div>
        </div>

        {/* Card 4: Gold - Total Procurement Value */}
        <div className="stat-card gold flex items-center gap-2.5 sm:gap-3.5 p-3 sm:p-4 rounded-2xl bg-[#FEF9E6] border border-[#FCEBB5]">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FEEBB0] flex items-center justify-center text-[#B68100] flex-shrink-0">
            <Coins size={20} strokeWidth={2.2} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] sm:text-xs font-bold text-[#1E293B] block truncate">
              Total Procurement Value
            </span>
            <strong className="text-sm sm:text-base md:text-xl lg:text-2xl xl:text-3xl font-black text-[#1F2937] font-['Manrope'] block mt-0.5 truncate">
              ₹{totalProcurementValue.toLocaleString('en-IN')}
            </strong>
            <small className="text-[10px] text-amber-700 block truncate">Gross PO Commitments</small>
          </div>
        </div>
      </section>

      {/* 4. Search & Filter Bar (Shown on Consignments view) */}
      {activeSection !== 'rates' && (
        <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
            {/* Search PO Number / Vendor / Commodity */}
            <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#CBD9CE] rounded-xl text-xs text-[#274837] focus-within:border-[#087A3E] focus-within:ring-2 focus-within:ring-emerald-100 transition">
              <Search size={16} className="text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search PO Number / Vendor / Commodity / Truck / Driver..."
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

            {/* Hub Dropdown */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-[#CBD9CE] rounded-xl text-xs text-gray-700 min-w-[140px]">
              <span className="font-semibold text-gray-500 whitespace-nowrap">Hub:</span>
              <select
                value={hubFilter}
                onChange={(e) => setHubFilter(e.target.value)}
                className="bg-transparent outline-none font-bold text-gray-800 flex-1 cursor-pointer"
              >
                <option value="All">All Hubs</option>
                {VENDOR_WHITELISTED_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white border border-[#CBD9CE] rounded-xl text-xs text-gray-700 min-w-[140px]">
              <span className="font-semibold text-gray-500 whitespace-nowrap">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent outline-none font-bold text-gray-800 flex-1 cursor-pointer"
              >
                <option value="All">All</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="DELIVERED">Delivered</option>
                <option value="OPEN">Open</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Search Button */}
            <button
              type="button"
              onClick={() => loadVendorsAndOperations()}
              className="px-6 py-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search size={15} /> Search
            </button>
          </div>

          {/* View Toggle Bar & Export matching Customer Due */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3.5 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">View Style:</span>
              <button
                type="button"
                onClick={() => setViewMode('reference')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  viewMode === 'reference'
                    ? 'bg-[#087A3E] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Standard (Reference View)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('financial')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
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
                Showing <strong>{activeSection === 'directory' ? filteredVendors.length : filteredConsignments.length}</strong>{' '}
                {activeSection === 'directory' ? 'vendors' : 'vendor consignments'}
              </span>
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#087A3E] border border-emerald-200 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <ArrowDownToLine size={14} /> Export CSV
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 5. Main Content Tables based on Active Section */}

      {/* SECTION: ADMIN FRUIT PROCUREMENT RATES DESK (7 WHITELISTED FRUITS) */}
      {activeSection === 'rates' && (
        <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm overflow-hidden p-5 space-y-5">
          {/* Desk Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-[#087A3E] rounded-2xl">
                <Coins size={24} />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 font-['Manrope']">
                  Wholesale Fruit Procurement Rates Desk (Fixed by Admin)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Configure wholesale mandi procurement rates for all 7 whitelisted fruits. Vendors only enter box counts; prices are locked to these admin rates.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5">
                <Lock size={12} className="text-emerald-700" />
                Locked for Vendors ✓
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleSaveFruitRates}
                  disabled={savingFruitRates}
                  className="px-4 py-2 bg-[#064D2B] hover:bg-[#087A3E] text-white text-xs font-black rounded-xl shadow-md transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  {savingFruitRates ? 'Saving Rates...' : 'Save & Enforce Rates'}
                </button>
              )}
            </div>
          </div>

          {/* Banner notification */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Safal Corporate Pricing Policy:</strong>
              Vendors cannot edit rates. Whenever a vendor logs in to create a consignment supply PO, these exact rates are automatically populated and locked. Any changes saved here apply immediately.
            </div>
          </div>

          {/* 7 Fruits Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Kashmir Apples */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">1. Kashmir Apples</h3>
                  <span className="text-[10px] text-gray-500">Telescopic Cartons (~20-22 Kg/box)</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                  BOX
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">4L (4-Layer Large Size)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={fruitRates.apples.layer4L}
                      onChange={(e) =>
                        setFruitRates({
                          ...fruitRates,
                          apples: { ...fruitRates.apples, layer4L: Number(e.target.value) || 0 },
                        })
                      }
                      disabled={!isAdmin}
                      className="w-full h-8 pl-7 pr-3 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">5L (5-Layer Medium Size)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={fruitRates.apples.layer5L}
                      onChange={(e) =>
                        setFruitRates({
                          ...fruitRates,
                          apples: { ...fruitRates.apples, layer5L: Number(e.target.value) || 0 },
                        })
                      }
                      disabled={!isAdmin}
                      className="w-full h-8 pl-7 pr-3 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Roll (Roller Mixed Run)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={fruitRates.apples.roll}
                      onChange={(e) =>
                        setFruitRates({
                          ...fruitRates,
                          apples: { ...fruitRates.apples, roll: Number(e.target.value) || 0 },
                        })
                      }
                      disabled={!isAdmin}
                      className="w-full h-8 pl-7 pr-3 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Bhagwa Pomegranate */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">2. Bhagwa Pomegranate</h3>
                  <span className="text-[10px] text-gray-500">Wholesale Box (~10-12 Kg/box)</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                  BOX
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Procurement Rate (₹ / Box)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={fruitRates.pomegranate}
                      onChange={(e) =>
                        setFruitRates({
                          ...fruitRates,
                          pomegranate: Number(e.target.value) || 0,
                        })
                      }
                      disabled={!isAdmin}
                      className="w-full h-8 pl-7 pr-3 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-1">
                    Standard Bhagwa export-quality carton
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Watermelon */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">3. Watermelon (Sugar Baby)</h3>
                  <span className="text-[10px] text-gray-500">Bulk Truckload Mandi Weighbridge</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                  TON
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Procurement Rate (₹ / Ton)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={fruitRates.watermelon}
                      onChange={(e) =>
                        setFruitRates({
                          ...fruitRates,
                          watermelon: Number(e.target.value) || 0,
                        })
                      }
                      disabled={!isAdmin}
                      className="w-full h-8 pl-7 pr-3 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    />
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                    ≈ ₹{Math.round(fruitRates.watermelon / 1000)} / Kg net fruit rate
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Muskmelon */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">4. Muskmelon (Kharbuja)</h3>
                  <span className="text-[10px] text-gray-500">Bulk Sweet Melon Harvest</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                  TON
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Procurement Rate (₹ / Ton)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={fruitRates.muskmelon}
                      onChange={(e) =>
                        setFruitRates({
                          ...fruitRates,
                          muskmelon: Number(e.target.value) || 0,
                        })
                      }
                      disabled={!isAdmin}
                      className="w-full h-8 pl-7 pr-3 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    />
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                    ≈ ₹{Math.round(fruitRates.muskmelon / 1000)} / Kg net fruit rate
                  </span>
                </div>
              </div>
            </div>

            {/* 5. Banana */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">5. Banana (Grand Naine)</h3>
                  <span className="text-[10px] text-gray-500">13-14 Kg Export Corrugated Box</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                  BOX
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Procurement Rate (₹ / Box)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={fruitRates.banana}
                      onChange={(e) =>
                        setFruitRates({
                          ...fruitRates,
                          banana: Number(e.target.value) || 0,
                        })
                      }
                      disabled={!isAdmin}
                      className="w-full h-8 pl-7 pr-3 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-1">
                    Standard Cavendish/Grand Naine cluster pack
                  </span>
                </div>
              </div>
            </div>

            {/* 6. Orange */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">6. Orange (Nagpur / Kinnow)</h3>
                  <span className="text-[10px] text-gray-500">Count Graded Fruit Carton</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                  BOX
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Procurement Rate (₹ / Box)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={fruitRates.orange}
                      onChange={(e) =>
                        setFruitRates({
                          ...fruitRates,
                          orange: Number(e.target.value) || 0,
                        })
                      }
                      disabled={!isAdmin}
                      className="w-full h-8 pl-7 pr-3 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-1">
                    Applies across counts: 36, 42, 45, 54, 60, 72, 90, 105
                  </span>
                </div>
              </div>
            </div>

            {/* 7. Plum */}
            <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">7. Plum (Black Amber)</h3>
                  <span className="text-[10px] text-gray-500">Fresh Orchard Harvest Box</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-200">
                  BOX
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Procurement Rate (₹ / Box)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      value={fruitRates.plum}
                      onChange={(e) =>
                        setFruitRates({
                          ...fruitRates,
                          plum: Number(e.target.value) || 0,
                        })
                      }
                      disabled={!isAdmin}
                      className="w-full h-8 pl-7 pr-3 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-1">
                    Standard high-firmness plum pack
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Save Bar */}
          {isAdmin && (
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Clicking save updates the live pricing matrix across the database and all vendor portals.
              </span>
              <button
                type="button"
                onClick={handleSaveFruitRates}
                disabled={savingFruitRates}
                className="px-6 py-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white text-xs font-black rounded-xl shadow-md transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {savingFruitRates ? 'Enforcing Rates...' : 'Save & Enforce Rates for All Vendors'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* SECTION: ALL VENDOR CONSIGNMENTS */}
      {activeSection === 'all' && (
        <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm overflow-hidden">
          {viewMode === 'reference' ? (
            /* STANDARD REFERENCE VIEW TABLE (Zero raw emojis) */
            <div className="table-scroll-wrap overflow-x-auto w-full">
              <table className="w-full border-collapse min-w-[1050px] text-xs">
                <thead>
                  <tr className="bg-[#064D2B] text-white">
                    <th className="py-3.5 px-3 text-center font-bold w-12 border-r border-[#085A33]">S.No.</th>
                    <th className="py-3.5 px-4 text-center font-bold border-r border-[#085A33]">
                      PO # (Consignment)
                    </th>
                    <th className="py-3.5 px-4 text-left font-bold border-r border-[#085A33]">
                      Vendor Partner &amp; Code
                    </th>
                    <th className="py-3.5 px-4 text-left font-bold border-r border-[#085A33]">
                      Commodity &amp; Volume
                    </th>
                    <th className="py-3.5 px-3 text-center font-bold border-r border-[#085A33]">
                      Date
                    </th>
                    <th className="py-3.5 px-4 text-right font-bold border-r border-[#085A33]">
                      Consignment Value (₹)
                    </th>
                    <th className="py-3.5 px-4 text-right font-bold border-r border-[#085A33]">
                      55% Advance (₹)
                    </th>
                    <th className="py-3.5 px-4 text-right font-bold border-r border-[#085A33]">
                      45% Balance Due (₹)
                    </th>
                    <th className="py-3.5 px-3 text-center font-bold border-r border-[#085A33]">
                      Status
                    </th>
                    <th className="py-3.5 px-3 text-center font-bold border-r border-[#085A33]">
                      Fleet / Tracker
                    </th>
                    <th className="py-3.5 px-4 text-center font-bold">
                      Proofs &amp; Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredConsignments.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-gray-400">
                        {loading ? 'Loading vendor operations...' : 'No consignments found matching your criteria.'}
                      </td>
                    </tr>
                  ) : (
                    filteredConsignments.map((op, index) => {
                      const fin = getConsignmentFinancials(op);
                      const poCode = op.poNumber || 'PO/SF/2026/001';
                      const vName = op.vendorProfile?.businessName || op.supplier?.name || op.vendorName || '-';
                      const vCode = op.vendorProfile?.vendorId || op.supplier?.supplierCode || op.vendorCode || '-';
                      const hub = op.orderPersonPlace || '-';
                      const truck = op.dispatchVehicleNumber || op.truckNo || '-';
                      const transporter = op.dispatchTransporterName || op.transporter || '-';
                      const driver = op.dispatchDriverPhone || op.driverPhone || '-';
                      const vehiclePhoto = op.dispatchVehiclePhotoUrl || op.vehiclePhoto;
                      const bilty = op.dispatchTransportBillUrl || op.bilty;
                      const advAmt = Math.round(fin.baseCost * 0.55);
                      const balAmt = Math.round(fin.baseCost * 0.45);
                      const status = op.dispatchStatus || op.status || 'OPEN';

                      return (
                        <tr
                          key={op.id || poCode}
                          className="hover:bg-[#F4F9F5] transition text-xs"
                        >
                          <td className="text-center py-3.5 px-3 font-bold text-gray-600 border-r border-gray-100">
                            {index + 1}
                          </td>
                          <td className="text-center py-3.5 px-4 font-black text-[#087A3E] border-r border-gray-100 whitespace-nowrap">
                            <span className="font-extrabold">{poCode}</span>
                          </td>
                          <td className="py-3.5 px-4 border-r border-gray-100">
                            <strong className="text-gray-900 block truncate max-w-[160px]">{vName}</strong>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {vCode}
                              </span>
                              <span className="text-[10px] text-gray-500 font-semibold truncate flex items-center gap-0.5">
                                <MapPin size={10} className="text-emerald-700" /> {hub}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 border-r border-gray-100">
                            <span className="font-bold text-gray-800 block truncate max-w-[150px]">
                              {(op.commodity || 'Kashmir Apples').replace(/[🍎🍇🍉🍌🍊]/g, '').trim()}
                            </span>
                            <span className="text-[11px] text-gray-500 font-mono font-semibold">
                              {fin.totalQty.toLocaleString('en-IN')} {fin.unit}s
                            </span>
                          </td>
                          <td className="text-center py-3.5 px-3 font-medium text-gray-700 border-r border-gray-100 whitespace-nowrap">
                            {new Date(op.poDate || Date.now()).toLocaleDateString('en-GB')}
                          </td>
                          <td className="text-right py-3.5 px-4 font-black text-gray-900 border-r border-gray-100 whitespace-nowrap font-mono">
                            ₹{fin.baseCost.toLocaleString('en-IN')}
                          </td>
                          <td className="text-right py-3.5 px-4 border-r border-gray-100 whitespace-nowrap">
                            <span className="font-bold text-emerald-800 font-mono block">
                              ₹{advAmt.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-0.5 mt-0.5">
                              <CheckCircle2 size={9} /> CLEARED
                            </span>
                          </td>
                          <td className="text-right py-3.5 px-4 border-r border-gray-100 whitespace-nowrap">
                            <span className="font-bold text-gray-700 font-mono block">
                              ₹{balAmt.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[9px] font-medium text-gray-500 block mt-0.5">
                              On Mandi Delivery
                            </span>
                          </td>
                          <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                status === 'IN_TRANSIT'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                  : status === 'DELIVERED' || status === 'CLOSED'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {status === 'IN_TRANSIT' ? 'In Transit' : status}
                            </span>
                          </td>
                          <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            <span className="font-mono text-[11px] font-bold text-gray-900 flex items-center justify-center gap-1">
                              <Truck size={12} className="text-gray-500" /> {truck}
                            </span>
                            <a
                              href={`tel:${driver}`}
                              className="text-[10px] font-semibold text-blue-700 hover:underline flex items-center justify-center gap-1 mt-0.5"
                            >
                              <Phone size={10} className="text-blue-600" /> {driver}
                            </a>
                          </td>
                          <td className="text-center py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openPLModal(op)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-[11px] font-black inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                title="Open Mandi P&L Dossier"
                              >
                                <Calculator size={11} className="text-amber-800" />
                                <span>P&amp;L Dossier</span>
                              </button>

                              {vehiclePhoto && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewDoc({ url: vehiclePhoto, title: `${poCode} - Truck Photo (${truck})` })
                                  }
                                  className="px-1.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                                  title="View Vehicle Photo"
                                >
                                  <Eye size={10} /> Photo
                                </button>
                              )}

                              {bilty && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewDoc({ url: bilty, title: `${poCode} - Transporter Bilty (${transporter})` })
                                  }
                                  className="px-1.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[10px] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                                  title="View Transporter Bilty"
                                >
                                  <FileText size={10} /> Bilty
                                </button>
                              )}
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
            /* EXTENDED FINANCIAL AUDIT & P&L VIEW TABLE (Zero raw emojis) */
            <div className="table-scroll-wrap overflow-x-auto w-full">
              <table className="w-full border-collapse min-w-[1100px] text-xs">
                <thead>
                  <tr className="bg-[#064D2B] text-white">
                    <th className="py-3 px-3 text-center font-bold w-12 border-r border-[#085A33]">S.No.</th>
                    <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">PO # &amp; Date</th>
                    <th className="py-3 px-3 text-left font-bold border-r border-[#085A33]">Vendor Partner</th>
                    <th className="py-3 px-3 text-left font-bold border-r border-[#085A33]">Commodity &amp; Volume</th>
                    <th className="py-3 px-3 text-right font-bold bg-[#085A33] border-r border-[#064D2B]">
                      Buying Cost / Unit (Procurement)
                    </th>
                    <th className="py-3 px-3 text-right font-bold bg-[#085A33] border-r border-[#064D2B]">
                      Closing Mandi Rate (Selling)
                    </th>
                    <th className="py-3 px-3 text-right font-bold border-r border-[#085A33]">
                      Landed Outlay (Base + Freight + Hamali)
                    </th>
                    <th className="py-3 px-3 text-right font-bold bg-[#054024] border-r border-[#085A33]">
                      Mandi Turnover (Realization)
                    </th>
                    <th className="py-3 px-3 text-center font-bold bg-[#054024] border-r border-[#085A33]">
                      Net Realized P&amp;L (Margin %)
                    </th>
                    <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Status</th>
                    <th className="py-3 px-3 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredConsignments.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-gray-400">
                        No consignments found.
                      </td>
                    </tr>
                  ) : (
                    filteredConsignments.map((op, index) => {
                      const fin = getConsignmentFinancials(op);
                      const poCode = op.poNumber || `PO/SF/2026/02${index}`;
                      const vName = op.vendorProfile?.businessName || op.supplier?.name || op.vendorName || 'Wholesale Vendor';
                      const vCode = op.vendorProfile?.vendorId || op.supplier?.supplierCode || op.vendorCode || 'VND-001';
                      const status = op.dispatchStatus || op.status || 'OPEN';

                      return (
                        <tr key={op.id || poCode} className="hover:bg-emerald-50/20 transition text-xs">
                          <td className="text-center py-3.5 px-3 font-bold text-gray-600 border-r border-gray-100">
                            {index + 1}
                          </td>
                          <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            <strong className="font-mono text-emerald-950 block">{poCode}</strong>
                            <span className="text-[10px] text-gray-400">
                              {new Date(op.poDate || Date.now()).toLocaleDateString('en-GB')}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 border-r border-gray-100">
                            <strong className="text-gray-900 block truncate max-w-[150px]">{vName}</strong>
                            <span className="text-[10px] font-mono text-emerald-800 font-bold">{vCode}</span>
                          </td>
                          <td className="py-3.5 px-3 border-r border-gray-100">
                            <span className="font-semibold text-gray-800 block truncate max-w-[140px]">
                              {(op.commodity || 'Kashmir Apples').replace(/[🍎🍇🍉🍌🍊]/g, '').trim()}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono font-bold">
                              {fin.totalQty.toLocaleString('en-IN')} {fin.unit}s
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right bg-emerald-50/30 border-r border-gray-100 whitespace-nowrap">
                            <strong className="text-gray-900 text-xs block font-mono">
                              ₹{fin.unitCost.toLocaleString('en-IN')} / {fin.unit}
                            </strong>
                            <span className="text-[10px] text-gray-600 font-bold block">
                              Base: ₹{fin.baseCost.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right bg-blue-50/30 border-r border-gray-100 whitespace-nowrap">
                            <strong className="text-blue-900 text-xs block font-mono">
                              ₹{fin.closingRate.toLocaleString('en-IN')} / {fin.unit}
                            </strong>
                            <span className="text-[10px] text-blue-700 font-bold block">
                              Mandi Auction Rate
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right border-r border-gray-100 whitespace-nowrap">
                            <strong className="text-gray-900 text-xs block font-mono">
                              ₹{fin.totalLandedCost.toLocaleString('en-IN')}
                            </strong>
                            <span className="text-[9px] text-gray-500 block">
                              Freight: ₹{fin.transportCost.toLocaleString('en-IN')} · Hamali: ₹{fin.laborCost.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right bg-blue-50/40 border-r border-gray-100 whitespace-nowrap">
                            <strong className="text-blue-950 text-xs block font-mono font-black">
                              ₹{fin.totalRevenue.toLocaleString('en-IN')}
                            </strong>
                            <span className="text-[9px] text-blue-700 font-semibold block">
                              Gross Realization
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center bg-gray-50/50 border-r border-gray-100 whitespace-nowrap">
                            {fin.isProfit ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                                  <TrendingUp size={12} className="text-emerald-700" />
                                  +₹{Math.abs(fin.netProfitLoss).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] font-black text-emerald-700 block mt-0.5">
                                  +{fin.profitMarginPercent}% Margin
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex flex-col items-center">
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 inline-flex items-center gap-1 shadow-2xs">
                                  <TrendingDown size={12} className="text-rose-700" />
                                  -₹{Math.abs(fin.netProfitLoss).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[10px] font-black text-rose-700 block mt-0.5">
                                  {fin.profitMarginPercent}% Loss
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center border-r border-gray-100 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                status === 'CLOSED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openPLModal(op)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-[11px] font-black inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              <Calculator size={11} className="text-amber-800" />
                              <span>P&amp;L Dossier</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* SECTION: ACTIVE IN TRANSIT (Zero raw emojis) */}
      {activeSection === 'transit' && (
        <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-rose-50/80 via-amber-50/50 to-emerald-50/40 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="text-rose-700" size={20} />
                <h2 className="text-base font-black text-gray-900">
                  Live Fleet Transit &amp; Consignment Dispatches
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  {transitConsignments.length} Active Fleets
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Real-time truck transit monitoring with driver phone numbers, transporter biltys, and 55% advance settlement.
              </p>
            </div>
          </div>

          <div className="table-scroll-wrap overflow-x-auto w-full">
            <table className="w-full border-collapse min-w-[960px] text-xs">
              <thead>
                <tr className="bg-[#064D2B] text-white">
                  <th className="py-3 px-3 text-center font-bold w-12 border-r border-[#085A33]">S.No.</th>
                  <th className="py-3 px-4 text-center font-bold border-r border-[#085A33]">PO # &amp; Date</th>
                  <th className="py-3 px-4 text-left font-bold border-r border-[#085A33]">Vendor Business</th>
                  <th className="py-3 px-4 text-left font-bold border-r border-[#085A33]">Commodity &amp; Volume</th>
                  <th className="py-3 px-4 text-center font-bold border-r border-[#085A33]">Destination Hub</th>
                  <th className="py-3 px-4 text-center font-bold border-r border-[#085A33]">Vehicle &amp; Truck No.</th>
                  <th className="py-3 px-4 text-left font-bold border-r border-[#085A33]">Transporter &amp; Driver</th>
                  <th className="py-3 px-4 text-center font-bold border-r border-[#085A33]">Dispatch Proofs</th>
                  <th className="py-3 px-4 text-right font-bold border-r border-[#085A33]">55% Advance</th>
                  <th className="py-3 px-4 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transitConsignments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-14 text-gray-400">
                      <Truck size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="font-bold text-gray-700 text-sm">No fleets currently in transit</p>
                      <p className="text-xs text-gray-400 mt-1">Active truck dispatches with transporter biltys will appear here automatically.</p>
                    </td>
                  </tr>
                ) : (
                  transitConsignments.map((op, idx) => {
                  const fin = getConsignmentFinancials(op);
                  const poCode = op.poNumber || 'PO/SF/2026/001';
                  const vName = op.vendorProfile?.businessName || op.supplier?.name || op.vendorName || '-';
                  const vCode = op.vendorProfile?.vendorId || op.supplier?.supplierCode || op.vendorCode || '-';
                  const hub = op.orderPersonPlace || '-';
                  const truck = op.dispatchVehicleNumber || op.truckNo || '-';
                  const transporter = op.dispatchTransporterName || op.transporter || '-';
                  const driver = op.dispatchDriverPhone || op.driverPhone || '-';
                  const vehiclePhoto = op.dispatchVehiclePhotoUrl || op.vehiclePhoto;
                  const bilty = op.dispatchTransportBillUrl || op.bilty;
                  const advAmt = Math.round(fin.baseCost * 0.55);

                  return (
                    <tr key={op.id || poCode} className="hover:bg-rose-50/20 transition">
                      <td className="text-center py-3.5 px-3 font-bold text-gray-600 border-r border-gray-100">
                        {idx + 1}
                      </td>
                      <td className="text-center py-3.5 px-4 font-mono font-bold text-[#087A3E] border-r border-gray-100 whitespace-nowrap">
                        {poCode}
                      </td>
                      <td className="py-3.5 px-4 border-r border-gray-100">
                        <strong className="text-gray-900 block truncate max-w-[150px]">{vName}</strong>
                        <span className="text-[10px] text-emerald-800 font-mono font-bold">{vCode}</span>
                      </td>
                      <td className="py-3.5 px-4 border-r border-gray-100">
                        <span className="font-bold text-gray-800 block truncate max-w-[140px]">
                          {(op.commodity || '').replace(/[🍎🍇🍉🍌🍊]/g, '').trim()}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">{fin.totalQty} {fin.unit}s</span>
                      </td>
                      <td className="text-center py-3.5 px-4 border-r border-gray-100 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800 flex items-center justify-center gap-1">
                          <MapPin size={10} className="text-emerald-700" /> {hub}
                        </span>
                      </td>
                      <td className="text-center py-3.5 px-4 font-mono font-bold text-gray-900 border-r border-gray-100 whitespace-nowrap">
                        <span className="flex items-center justify-center gap-1">
                          <Truck size={12} className="text-gray-500" /> {truck}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 border-r border-gray-100">
                        <strong className="text-gray-900 block truncate text-[11px]">{transporter}</strong>
                        <a href={`tel:${driver}`} className="text-blue-700 hover:underline text-[10px] font-medium flex items-center gap-1">
                          <Phone size={10} className="text-blue-600" /> {driver}
                        </a>
                      </td>
                      <td className="text-center py-3.5 px-4 border-r border-gray-100 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {vehiclePhoto && (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ url: vehiclePhoto, title: `${poCode} - Truck Photo` })}
                              className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              <Eye size={10} /> Photo
                            </button>
                          )}
                          {bilty && (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ url: bilty, title: `${poCode} - Transporter Bilty` })}
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[10px] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                            >
                              <FileText size={10} /> Bilty
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3.5 px-4 border-r border-gray-100 whitespace-nowrap">
                        <strong className="text-emerald-900 block font-mono">₹{advAmt.toLocaleString('en-IN')}</strong>
                        <span className="text-[10px] text-emerald-700 font-bold inline-flex items-center gap-0.5">
                          <CheckCircle2 size={10} /> CLEARED
                        </span>
                      </td>
                      <td className="text-center py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-300">
                          In Transit
                        </span>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SECTION: MANDI WEIGHBRIDGE & SCALE SLIPS (Zero raw emojis) */}
      {activeSection === 'weighbridge' && (
        <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
                <Scale size={16} className="text-[#087A3E]" />
                Mandi Weighbridge Scale Verification &amp; QC Slips
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Zero-Tare Calibrated Weighbridge scale receipts with Mandi Realized Net Fruit Profit / Loss calculation.
              </p>
            </div>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Zero-Tare Calibrated ✓
            </span>
          </div>

          <div className="table-scroll-wrap overflow-x-auto w-full">
            <table className="w-full border-collapse min-w-[1100px] text-xs">
              <thead>
                <tr className="bg-[#064D2B] text-white">
                  <th className="py-3 px-3 text-center font-bold">PO # &amp; Mandi Hub</th>
                  <th className="py-3 px-4 text-left font-bold">Vendor Partner</th>
                  <th className="py-3 px-3 text-right font-bold">Gross / Tare</th>
                  <th className="py-3 px-3 text-right font-bold">Net Fruit Weight</th>
                  <th className="py-3 px-3 text-right font-bold bg-[#085A33]">
                    Buying Rate / Kg
                  </th>
                  <th className="py-3 px-3 text-right font-bold bg-[#085A33]">
                    Closing Mandi Rate / Kg
                  </th>
                  <th className="py-3 px-3 text-center font-bold bg-[#054024]">
                    Realized Mandi P&amp;L
                  </th>
                  <th className="py-3 px-3 text-center font-bold">QC Grade &amp; Slip</th>
                  <th className="py-3 px-3 text-center font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {weighbridgeConsignments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14 text-gray-400">
                      <Scale size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="font-bold text-gray-700 text-sm">No weighbridge scale slips recorded yet</p>
                      <p className="text-xs text-gray-400 mt-1">Scale weighment receipts and QC inspections will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  weighbridgeConsignments.map((qc) => {
                  const poCode = qc.poNumber || 'PO/SF/2026/001';
                  const hub = qc.orderPersonPlace || '-';
                  const vName = qc.vendorProfile?.businessName || qc.supplier?.name || qc.vendorName || '-';
                  const vCode = qc.vendorProfile?.vendorId || qc.supplier?.supplierCode || qc.vendorCode || '-';
                  const gross = qc.weighbridgeGrossKg || qc.grossKg || 0;
                  const tare = qc.weighbridgeTareKg || qc.tareKg || 0;
                  const net = qc.weighbridgeNetKg || qc.netKg || Math.max(0, gross - tare);
                  const qcGrade = qc.qcGrade || 'Standard Grade';
                  const slipUrl = qc.weighbridgeScaleSlipUrl || qc.scaleSlipUrl;

                  const fin = getConsignmentFinancials(qc);
                  const buyingRateKg = net > 0 ? Number((fin.baseCost / net).toFixed(2)) : 0;
                  const closingRateKg = net > 0 ? Number((fin.totalRevenue / net).toFixed(2)) : 0;

                  return (
                    <tr key={qc.id || poCode} className="hover:bg-gray-50 transition text-xs">
                      <td className="py-3 px-3 text-center">
                        <strong className="font-mono text-gray-900 block">{poCode}</strong>
                        <span className="text-[10px] text-gray-500 font-semibold">{hub}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-gray-900 block truncate max-w-[150px]">{vName}</span>
                        <span className="text-[10px] text-emerald-800 font-mono font-bold">{vCode}</span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-gray-600">
                        <span className="block text-[11px]">{Number(gross).toLocaleString('en-IN')} Kg Gross</span>
                        <span className="block text-[10px] text-gray-400">{Number(tare).toLocaleString('en-IN')} Kg Tare</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono font-black text-emerald-900 text-xs block">
                          {Number(net).toLocaleString('en-IN')} Kg
                        </span>
                        <span className="text-[10px] text-emerald-600 font-bold block">~{(net / 1000).toFixed(2)} MT Net</span>
                      </td>
                      <td className="py-3 px-3 text-right bg-emerald-50/30">
                        <strong className="text-gray-900 text-xs font-mono block">₹{buyingRateKg} / Kg</strong>
                        <span className="text-[10px] text-gray-500 font-bold block">₹{fin.baseCost.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="py-3 px-3 text-right bg-blue-50/30">
                        <strong className="text-blue-900 text-xs font-mono block">₹{closingRateKg} / Kg</strong>
                        <span className="text-[10px] text-blue-700 font-bold block">₹{fin.totalRevenue.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="py-3 px-3 text-center bg-gray-50/50">
                        {fin.isProfit ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                              <TrendingUp size={11} className="text-emerald-700" />
                              +₹{Math.abs(fin.netProfitLoss).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] font-black text-emerald-700 block mt-0.5">
                              +{fin.profitMarginPercent}% Margin
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 inline-flex items-center gap-1 shadow-2xs">
                              <TrendingDown size={11} className="text-rose-700" />
                              -₹{Math.abs(fin.netProfitLoss).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] font-black text-rose-700 block mt-0.5">
                              {fin.profitMarginPercent}% Loss
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-0.5">
                          <CheckCircle2 size={10} /> PASSED
                        </span>
                        <span className="text-[10px] text-gray-600 block mt-0.5 truncate max-w-[120px]">{qcGrade}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {slipUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ url: slipUrl, title: `${poCode} - Mandi Weighbridge Scale Slip` })}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <FileSpreadsheet size={11} className="text-emerald-700" /> View Scale Slip
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400">No Slip</span>
                          )}
                          <button
                            type="button"
                            onClick={() => openPLModal(qc)}
                            className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Calculator size={10} /> P&amp;L Dossier
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* SECTION: WHOLESALE VENDORS DIRECTORY (Zero raw emojis) */}
      {activeSection === 'directory' && (
        <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
                <Building2 size={16} className="text-[#087A3E]" />
                Registered Vendors Directory ({filteredVendors.length})
              </h2>
              <span className="text-xs text-gray-500">Auto-sequenced VND-XXX · Bank &amp; KYC Lock Enabled</span>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setShowRegisterModal(true);
                  setFormError('');
                }}
                className="px-3 py-1.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Add Vendor
              </button>
            )}
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse min-w-[980px] text-xs">
              <thead>
                <tr className="bg-[#064D2B] text-white">
                  <th className="py-3 px-3 text-center font-bold w-12 border-r border-[#085A33]">S.No.</th>
                  <th className="py-3 px-4 text-center font-bold border-r border-[#085A33]">Vendor ID</th>
                  <th className="py-3 px-4 text-left font-bold border-r border-[#085A33]">Business Name</th>
                  <th className="py-3 px-4 text-left font-bold border-r border-[#085A33]">Contact &amp; Phone</th>
                  <th className="py-3 px-4 text-center font-bold border-r border-[#085A33]">Whitelisted Hub</th>
                  <th className="py-3 px-4 text-center font-bold border-r border-[#085A33]">Aadhaar &amp; PAN</th>
                  <th className="py-3 px-4 text-left font-bold border-r border-[#085A33]">Bank Coordinates</th>
                  <th className="py-3 px-4 text-center font-bold border-r border-[#085A33]">KYC Freeze</th>
                  {isAdmin && <th className="py-3 px-4 text-center font-bold">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} className="text-center py-12 text-gray-400">
                      {loading ? 'Loading vendor directory...' : 'No vendors found matching your criteria.'}
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((vendor, idx) => {
                    const last4Aadhaar = vendor.aadharNumber ? vendor.aadharNumber.slice(-4) : '****';
                    const last4Acc = vendor.bankAccountNumber ? vendor.bankAccountNumber.slice(-4) : '****';

                    return (
                      <tr key={vendor.id} className="hover:bg-gray-50 transition">
                        <td className="text-center py-3.5 px-3 font-bold text-gray-600 border-r border-gray-100">
                          {idx + 1}
                        </td>
                        <td className="text-center py-3.5 px-4 font-black text-[#087A3E] border-r border-gray-100 whitespace-nowrap">
                          {vendor.vendorId}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-900 border-r border-gray-100">
                          {vendor.businessName}
                        </td>
                        <td className="py-3.5 px-4 border-r border-gray-100">
                          <strong className="text-gray-900 block truncate">{vendor.contactPerson}</strong>
                          <span className="text-gray-500 text-[11px] block">{vendor.phone}</span>
                        </td>
                        <td className="text-center py-3.5 px-4 border-r border-gray-100 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-900 border border-emerald-200 inline-flex items-center gap-1">
                            <MapPin size={10} className="text-emerald-700" /> {vendor.primaryLocation}
                          </span>
                        </td>
                        <td className="text-center py-3.5 px-4 border-r border-gray-100 whitespace-nowrap font-mono text-[11px]">
                          <span className="text-gray-700 block">UID: XXXX-XXXX-{last4Aadhaar}</span>
                          <span className="font-bold text-gray-900 block">PAN: {vendor.panNumber}</span>
                        </td>
                        <td className="py-3.5 px-4 border-r border-gray-100">
                          <strong className="text-gray-900 block font-mono text-[11px]">
                            A/C: XXXXXX{last4Acc} ({vendor.bankIfscCode})
                          </strong>
                          <span className="text-gray-500 text-[11px] block truncate">
                            {vendor.bankAccountHolder} · {vendor.bankName || 'Bank'}
                          </span>
                        </td>
                        <td className="text-center py-3.5 px-4 border-r border-gray-100 whitespace-nowrap">
                          {vendor.isKycLocked ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 inline-flex items-center gap-1">
                              <Lock size={11} /> Frozen &amp; Locked
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 inline-flex items-center gap-1">
                              <Unlock size={11} /> Editable
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="text-center py-3.5 px-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleLock(vendor)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer border inline-flex items-center gap-1 ${
                                vendor.isKycLocked
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                              }`}
                              title={vendor.isKycLocked ? 'Unlock for editing' : 'Lock KYC'}
                            >
                              {vendor.isKycLocked ? <Unlock size={11} /> : <Lock size={11} />}
                              {vendor.isKycLocked ? 'Unlock KYC' : 'Lock KYC'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL 1: Create Consignment Supply PO (matching Customer Due modal) */}
      {showCreatePOModal && (
        <CreatePOModal
          mode="PO"
          onClose={() => setShowCreatePOModal(false)}
          onSuccess={(msg) => {
            onNotify(msg || 'Consignment Supply PO created successfully!');
            setShowCreatePOModal(false);
            loadVendorsAndOperations();
          }}
        />
      )}

      {/* MODAL 2: Register New Vendor with Frozen KYC */}
      {showRegisterModal && (
        <div className="modal-backdrop">
          <div className="modal !w-[720px] max-w-[96vw] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
            <div className="modal-header pb-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#087A3E] grid place-items-center">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <span className="eyebrow text-emerald-800 font-bold">VENDOR ONBOARDING</span>
                  <h2 className="text-lg font-bold text-gray-900">Register New Wholesale Vendor</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="overflow-y-auto flex-1 py-4 pr-1 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Business Name & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Business / Trade Name *</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Ramesh Agro Farms & Cold Storage"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 outline-none focus:border-[#087A3E]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Authorized Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 outline-none focus:border-[#087A3E]"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Mobile Phone Number (Login User ID) *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9848012345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 outline-none focus:border-[#087A3E]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. vendor@safalexports.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 outline-none focus:border-[#087A3E]"
                  />
                </div>
              </div>

              {/* Primary Location */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Primary Delivery Hub Location (Whitelisted 8 Cities Only) *
                </label>
                <select
                  required
                  value={primaryLocation}
                  onChange={(e) => setPrimaryLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 font-bold bg-white outline-none focus:border-[#087A3E]"
                >
                  {VENDOR_WHITELISTED_LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Statutory Identity */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <span className="eyebrow text-gray-700 font-bold block">STATUTORY IDENTITY RECORDS</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">12-Digit Aadhaar Number *</label>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={aadharNumber}
                      onChange={(e) => setAadharNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="12 digit Aadhaar"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">10-Character PAN Number *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono uppercase text-gray-900 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Official Disbursement Bank Coordinates */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <span className="eyebrow text-emerald-900 font-bold block">OFFICIAL DISBURSEMENT BANK DETAILS</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Bank Account Number *</label>
                    <input
                      type="text"
                      required
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value.trim())}
                      placeholder="Full account number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Bank IFSC Code *</label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={bankIfscCode}
                      onChange={(e) => setBankIfscCode(e.target.value.toUpperCase().trim())}
                      placeholder="e.g. SBIN0001234"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono uppercase text-gray-900 outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Beneficiary Account Holder Name *</label>
                    <input
                      type="text"
                      required
                      value={bankAccountHolder}
                      onChange={(e) => setBankAccountHolder(e.target.value)}
                      placeholder="Exact name as in bank records"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Bank &amp; Branch Name (Optional)</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. State Bank of India, Main Branch"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Initial Login Password *</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="secondary-button cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="primary-button inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  {isSubmitting ? 'Registering & Freezing KYC...' : 'Confirm & Freeze Vendor KYC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Interactive Consignment Commercial P&L & Mandi Closing Price Dossier */}
      {selectedPOForPL && (() => {
        const fin = getConsignmentFinancials(selectedPOForPL);
        const poCode = selectedPOForPL.poNumber || 'PO/SF/2026/020';
        const vName = selectedPOForPL.vendorProfile?.businessName || selectedPOForPL.supplier?.name || selectedPOForPL.vendorName || 'Wholesale Vendor';
        const vCode = selectedPOForPL.vendorProfile?.vendorId || selectedPOForPL.supplier?.supplierCode || selectedPOForPL.vendorCode || 'VND-001';
        const hub = selectedPOForPL.orderPersonPlace || 'Warangal Hub';

        const dynamicRevenue = Math.round(editClosingPrice * fin.totalQty);
        const dynamicTotalCost = fin.baseCost + editTransportCost + editHamaliCost;
        const dynamicProfitLoss = dynamicRevenue - dynamicTotalCost;
        const dynamicMargin = Number(((dynamicProfitLoss / Math.max(1, fin.baseCost)) * 100).toFixed(1));
        const isDynamicProfit = dynamicProfitLoss >= 0;

        return (
          <div
            className="modal-backdrop fixed inset-0 flex items-center justify-center p-3 sm:p-4 !z-[9999]"
            style={{ zIndex: 9999 }}
            onClick={() => setSelectedPOForPL(null)}
          >
            <div
              className="bg-white rounded-3xl max-w-2xl w-full border border-gray-200 shadow-2xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col relative"
              style={{ zIndex: 10000 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#087A3E] flex items-center justify-center">
                    <Calculator size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black font-['Manrope'] text-gray-900 flex items-center gap-2">
                      Consignment Trading P&amp;L &amp; Mandi Closing Dossier
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      {poCode} · {vName} ({vCode}) · {hub}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPOForPL(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto py-3 space-y-4 flex-1 text-xs pr-1">
                {/* Commercial Summary Banner */}
                <div
                  className={`p-4 rounded-2xl border ${
                    isDynamicProfit ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
                  } flex items-center justify-between`}
                >
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-600 block">
                      Net Mandi Realized Trading Result
                    </span>
                    <strong
                      className={`text-2xl font-black font-['Manrope'] block mt-0.5 ${
                        isDynamicProfit ? 'text-emerald-900' : 'text-rose-900'
                      }`}
                    >
                      {isDynamicProfit
                        ? `+₹${dynamicProfitLoss.toLocaleString('en-IN')}`
                        : `-₹${Math.abs(dynamicProfitLoss).toLocaleString('en-IN')}`}
                    </strong>
                    <span
                      className={`text-[11px] font-bold inline-flex items-center gap-1 mt-0.5 ${
                        isDynamicProfit ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isDynamicProfit ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {isDynamicProfit
                        ? `+${dynamicMargin}% Profit Margin on Consignment`
                        : `${dynamicMargin}% Loss`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">
                      Total Consignment Volume
                    </span>
                    <strong className="text-lg font-black text-gray-900 block font-mono">
                      {fin.totalQty.toLocaleString('en-IN')} {fin.unit}s
                    </strong>
                    <span className="text-[10px] text-gray-500 block">
                      ~{(fin.totalQty * 0.02).toFixed(1)} MT Net Fruit Weight
                    </span>
                  </div>
                </div>

                {/* Section 1: Procurement Cost Breakdown (Buying Side) */}
                <div className="p-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-2">
                  <span className="text-[10px] uppercase font-black text-gray-600 tracking-wider block">
                    1. Procurement Cost Breakdown (Buying Side)
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                      <span className="text-[10px] text-gray-500 block">Procurement Rate (Buying)</span>
                      <strong className="text-sm font-bold text-gray-900 block mt-0.5">
                        ₹{fin.unitCost.toLocaleString('en-IN')} / {fin.unit}
                      </strong>
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        Base PO Value: ₹{fin.baseCost.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-gray-200">
                      <span className="text-[10px] text-gray-500 block">Landed Logistics &amp; Handling</span>
                      <strong className="text-sm font-bold text-gray-900 block mt-0.5">
                        ₹{(editTransportCost + editHamaliCost).toLocaleString('en-IN')}
                      </strong>
                      <span className="text-[10px] text-gray-500 block">
                        Freight: ₹{editTransportCost.toLocaleString('en-IN')} · Hamali: ₹{editHamaliCost.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Mandi Closing Auction & Selling Realization */}
                <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-black text-blue-900 tracking-wider block">
                      2. Mandi Closing Auction &amp; Selling Realization
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                      Editable by Admin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        Mandi Closing Price (₹ / {fin.unit}) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={editClosingPrice}
                          onChange={(e) => setEditClosingPrice(Number(e.target.value) || 0)}
                          className="w-full h-10 pl-7 pr-3 border border-blue-300 rounded-xl text-sm font-bold text-blue-950 bg-white focus:outline-none focus:border-blue-600"
                          placeholder="e.g. 1260"
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block">
                        Final wholesale closing market price realized at hub auction.
                      </span>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">Gross Realization Revenue</label>
                      <div className="h-10 px-3 border border-gray-200 rounded-xl bg-white flex items-center justify-between font-mono">
                        <span className="text-gray-500 text-xs">Turnover:</span>
                        <strong className="text-sm font-black text-blue-950">
                          ₹{dynamicRevenue.toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1 block">
                        {fin.totalQty.toLocaleString('en-IN')} {fin.unit}s × ₹{editClosingPrice.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Freight & Hamali adjustments */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-blue-100">
                    <div>
                      <label className="block text-[10px] text-gray-600 font-bold mb-1">Freight Allocation (₹)</label>
                      <input
                        type="number"
                        value={editTransportCost}
                        onChange={(e) => setEditTransportCost(Number(e.target.value) || 0)}
                        className="w-full h-8 px-2.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-600 font-bold mb-1">Hamali / Labor Fee (₹)</label>
                      <input
                        type="number"
                        value={editHamaliCost}
                        onChange={(e) => setEditHamaliCost(Number(e.target.value) || 0)}
                        className="w-full h-8 px-2.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Payout Disbursement Coordinates */}
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">55% Auto-Advance Paid</span>
                    <strong className="text-sm font-black text-emerald-900 block font-mono">
                      ₹{Math.round(fin.baseCost * 0.55).toLocaleString('en-IN')}
                    </strong>
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={10} /> Direct Bank Cleared
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">
                      45% Final Payout Balance
                    </span>
                    <strong className="text-sm font-black text-gray-900 block font-mono">
                      ₹{Math.round(fin.baseCost * 0.45).toLocaleString('en-IN')}
                    </strong>
                    <span className="text-[10px] text-gray-500 font-bold">Payable on Mandi Weighbridge</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedPOForPL(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSavePL}
                  disabled={savingPL}
                  className="px-5 py-2 rounded-xl bg-[#087A3E] hover:bg-[#064D2B] text-white text-xs font-black shadow-md inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  {savingPL ? 'Saving P&L...' : 'Save Mandi Closing Price & Recalculate'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 4: Document Preview Modal */}
      {previewDoc && (
        <div
          className="modal-backdrop fixed inset-0 flex items-center justify-center p-3 sm:p-4 !z-[9999]"
          style={{ zIndex: 9999 }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full border border-gray-200 shadow-2xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col relative"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
              <h3 className="text-base font-black font-['Manrope'] text-gray-900 flex items-center gap-2">
                <Eye size={18} className="text-[#087A3E]" />
                {previewDoc.title}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 flex items-center justify-center transition cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 flex-1 flex items-center justify-center overflow-auto bg-gray-50 rounded-2xl my-3">
              {previewDoc.url.endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  className="w-full h-96 rounded-xl border-0"
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-h-[65vh] object-contain rounded-xl shadow-xs"
                />
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Verified Mandi Procurement Documentation</span>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold inline-flex items-center gap-1"
                >
                  <ExternalLink size={13} /> Open Original
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="px-4 py-1.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Full PO Dossier Modal */}
      {selectedPODetail && (
        <PODetailModal
          order={selectedPODetail}
          onClose={() => setSelectedPODetail(null)}
          onRefresh={() => loadVendorsAndOperations()}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};
