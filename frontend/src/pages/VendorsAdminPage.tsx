import React, { useState, useEffect, useRef } from 'react';
import { getCommodityGradeDetails } from '../utils/pricingHelper';
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
  Camera,
  Upload,
  Clock,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VENDOR_WHITELISTED_LOCATIONS } from '../types';
import { CreatePOModal } from '../components/CreatePOModal';
import { PODetailModal } from '../components/PODetailModal';
import { StatusBadge } from '../components/StatusBadge';
import { VendorPhotoCaptureModal } from '../components/VendorPhotoCaptureModal';
import { resolvePhotoUrl } from '../utils/imageUtils';

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
  const [activeSection, setActiveSection] = useState<'all' | 'allotment' | 'transit' | 'weighbridge' | 'rates' | 'directory'>('all');
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
  const [verifyApprovalPO, setVerifyApprovalPO] = useState<any | null>(null);
  const [isApprovingPO, setIsApprovingPO] = useState(false);

  // Vehicle Allotment & Approval Modal State (Admin Fleet Assignment)
  const [selectedPOForAllot, setSelectedPOForAllot] = useState<any | null>(null);
  const [allotVehicleNumber, setAllotVehicleNumber] = useState('');
  const [allotTransporter, setAllotTransporter] = useState('SAFAL Cold-Chain Express');
  const [allotDriverPhone, setAllotDriverPhone] = useState('');
  const [allotNotes, setAllotNotes] = useState('');
  const [allotBiltyFile, setAllotBiltyFile] = useState<File | null>(null);
  const [allotBiltyPreview, setAllotBiltyPreview] = useState<string>('');
  const [isSubmittingAllot, setIsSubmittingAllot] = useState(false);
  const [allotError, setAllotError] = useState('');

  // Advance Disbursement Modal State
  const [selectedPOForAdvance, setSelectedPOForAdvance] = useState<any | null>(null);
  const [advanceAmountInput, setAdvanceAmountInput] = useState<number | string>('');
  const [advancePaymentMode, setAdvancePaymentMode] = useState<string>('Bank Transfer (RTGS / NEFT)');
  const [advancePaymentUtr, setAdvancePaymentUtr] = useState<string>('');
  const [advancePaymentDate, setAdvancePaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [advancePayingHub, setAdvancePayingHub] = useState<string>('Warangal Hub');
  const [advanceNotes, setAdvanceNotes] = useState<string>('');
  const [advanceProofFile, setAdvanceProofFile] = useState<File | null>(null);
  const [advanceProofPreview, setAdvanceProofPreview] = useState<string | null>(null);
  const [isSubmittingAdvance, setIsSubmittingAdvance] = useState<boolean>(false);

  // Final Mandi Settlement Modal State (5% Admin Share + 1% APMC Cess)
  const [selectedPOForSettlement, setSelectedPOForSettlement] = useState<any | null>(null);
  const [settlementFinalPaidInput, setSettlementFinalPaidInput] = useState<number | string>('');
  const [settlementPaymentMode, setSettlementPaymentMode] = useState<string>('Bank Transfer (RTGS / NEFT)');
  const [settlementPaymentUtr, setSettlementPaymentUtr] = useState<string>('');
  const [settlementPaymentDate, setSettlementPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [settlementHub, setSettlementHub] = useState<string>('Warangal Hub');
  const [settlementNotes, setSettlementNotes] = useState<string>('');
  const [settlementProofFile, setSettlementProofFile] = useState<File | null>(null);
  const [settlementProofPreview, setSettlementProofPreview] = useState<string | null>(null);
  const [settlementClosingPrice, setSettlementClosingPrice] = useState<number | string>('');
  const [settlementTransport, setSettlementTransport] = useState<number | string>('');
  const [settlementLabor, setSettlementLabor] = useState<number | string>('');
  const [isSubmittingSettlement, setIsSubmittingSettlement] = useState<boolean>(false);

  // Camera modal state for admin uploads
  const [activeCameraTarget, setActiveCameraTarget] = useState<'advance' | 'settlement' | null>(null);

  const advanceFileInputRef = useRef<HTMLInputElement | null>(null);
  const settlementFileInputRef = useRef<HTMLInputElement | null>(null);

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
    apples: { layer4L: 1300, layer5L: 1400, roll: 600 },
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
  const [primaryLocation, setPrimaryLocation] = useState<string>('');
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

  // Form state for editing vendor by Admin
  const [editingVendor, setEditingVendor] = useState<any | null>(null);
  const [editVendorId, setEditVendorId] = useState('');
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPrimaryLocation, setEditPrimaryLocation] = useState('');
  const [editAadharNumber, setEditAadharNumber] = useState('');
  const [editPanNumber, setEditPanNumber] = useState('');
  const [editBankAccountNumber, setEditBankAccountNumber] = useState('');
  const [editBankIfscCode, setEditBankIfscCode] = useState('');
  const [editBankAccountHolder, setEditBankAccountHolder] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editBankBranch, setEditBankBranch] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editIsKycLocked, setEditIsKycLocked] = useState(false);
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState('');

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
            layer4L: Number(r.apples?.layer4L) || 1300,
            layer5L: Number(r.apples?.layer5L) || 1400,
            roll: Number(r.apples?.roll) || 600,
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
      localStorage.setItem('safal_fruit_rates', JSON.stringify(fruitRates));
      window.dispatchEvent(new CustomEvent('safal_fruit_rates_updated', { detail: fruitRates }));
      onNotify('Fruit procurement rates successfully saved and enforced for all vendors!');
      await loadVendorsAndOperations();
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

  // Consignment POs awaiting Admin Vehicle Allotment & Approval
  const pendingAllotmentPOs = allConsignments.filter((op) => {
    const hasVehicle = Boolean(
      op.dispatchVehicleNumber &&
      op.dispatchVehicleNumber !== '-' &&
      op.dispatchVehicleNumber.trim() !== ''
    );
    const isPending = op.status === 'PENDING_APPROVAL' || op.dispatchStatus === 'PENDING_DISPATCH' || !op.dispatchStatus;
    const isClosed = op.status === 'CLOSED' || op.status === 'CANCELLED' || op.status === 'REJECTED';
    return !hasVehicle && isPending && !isClosed;
  });

  // Displayed consignments based on active section
  const displayedConsignments = activeSection === 'allotment'
    ? pendingAllotmentPOs.filter((op) => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const poNum = (op.poNumber || '').toLowerCase();
        const vName = (op.vendorProfile?.businessName || op.supplier?.name || op.vendorName || '').toLowerCase();
        const vCode = (op.vendorProfile?.vendorId || op.supplier?.supplierCode || op.vendorCode || '').toLowerCase();
        const comm = (op.commodity || '').toLowerCase();
        return poNum.includes(q) || vName.includes(q) || vCode.includes(q) || comm.includes(q);
      })
    : filteredConsignments;

  // Transit fleet list
  const transitConsignments = allConsignments.filter(
    (op) => op.dispatchStatus === 'IN_TRANSIT' || (op.dispatchVehicleNumber && op.dispatchVehicleNumber !== '-') || op.truckNo
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

  const openAllotModal = (po: any) => {
    setSelectedPOForAllot(po);
    setAllotVehicleNumber(po.dispatchVehicleNumber && po.dispatchVehicleNumber !== '-' ? po.dispatchVehicleNumber : '');
    setAllotTransporter(po.transporterName && po.transporterName !== '-' ? po.transporterName : 'SAFAL Cold-Chain Express');
    setAllotDriverPhone(po.driverPhone && po.driverPhone !== '-' ? po.driverPhone : '');
    setAllotNotes(po.allotmentNotes || '');
    setAllotBiltyFile(null);
    setAllotBiltyPreview(po.transportBillUrl ? (po.transportBillUrl.startsWith('/') ? `/api${po.transportBillUrl}` : po.transportBillUrl) : '');
    setAllotError('');
  };

  const handleAllotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOForAllot) return;
    if (!allotVehicleNumber.trim()) {
      setAllotError('Please enter a valid Vehicle Registration Number (e.g. TS09UB4521).');
      return;
    }
    try {
      setIsSubmittingAllot(true);
      setAllotError('');

      const formData = new FormData();
      formData.append('dispatchVehicleNumber', allotVehicleNumber.trim().toUpperCase());
      formData.append('transporterName', allotTransporter.trim() || 'SAFAL Cold-Chain Express');
      formData.append('driverPhone', allotDriverPhone.trim() || '-');
      formData.append('allotmentNotes', allotNotes.trim());
      if (allotBiltyFile) {
        formData.append('biltyFile', allotBiltyFile);
      }

      await api.allotVendorPOVehicle(selectedPOForAllot.id, formData);
      onNotify(`Vehicle ${allotVehicleNumber.trim().toUpperCase()} allotted with Transporter Bilty to ${selectedPOForAllot.poNumber || 'PO'}! Consignment approved.`);
      setSelectedPOForAllot(null);
      await loadVendorsAndOperations();
    } catch (err: any) {
      console.error('Failed to allot vehicle:', err);
      setAllotError(err.message || 'Failed to allot vehicle. Please try again.');
    } finally {
      setIsSubmittingAllot(false);
    }
  };

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

  const handleDeletePO = async (op: any) => {
    const poCode = op.poNumber || `PO #${op.id}`;
    if (
      !window.confirm(
        `Are you sure you want to permanently delete Purchase Order "${poCode}"? This action will remove the consignment from both Admin and Vendor portals.`
      )
    ) {
      return;
    }
    try {
      if (op.id && !op.id.startsWith('demo-') && !op.id.startsWith('op-')) {
        await api.deletePurchaseOrder(op.id);
      }
      onNotify(`Purchase Order ${poCode} deleted successfully.`);
      await loadVendorsAndOperations();
    } catch (err: any) {
      console.error('Failed to delete PO:', err);
      alert(err?.response?.data?.error || err.message || 'Failed to delete Purchase Order');
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

  const handleOpenEditVendor = (vendor: any) => {
    setEditingVendor(vendor);
    setEditVendorId(vendor.vendorId || '');
    setEditBusinessName(vendor.businessName || '');
    setEditContactPerson(vendor.contactPerson || '');
    setEditPhone(vendor.phone || '');
    setEditEmail(vendor.email || '');
    setEditPrimaryLocation(vendor.primaryLocation || '');
    setEditAadharNumber(vendor.aadharNumber || '');
    setEditPanNumber(vendor.panNumber || '');
    setEditBankAccountNumber(vendor.bankAccountNumber || '');
    setEditBankIfscCode(vendor.bankIfscCode || '');
    setEditBankAccountHolder(vendor.bankAccountHolder || '');
    setEditBankName(vendor.bankName || '');
    setEditBankBranch(vendor.bankBranch || '');
    setEditPassword('');
    setEditIsKycLocked(Boolean(vendor.isKycLocked));
    setEditStatus(vendor.status || 'ACTIVE');
    setEditFormError('');
  };

  const handleSaveVendorEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor) return;
    try {
      setIsEditingSubmitting(true);
      setEditFormError('');

      const payload: any = {
        vendorId: editVendorId.trim().toUpperCase(),
        businessName: editBusinessName.trim(),
        contactPerson: editContactPerson.trim(),
        phone: editPhone.trim(),
        email: editEmail ? editEmail.trim() : null,
        primaryLocation: editPrimaryLocation.trim(),
        aadharNumber: editAadharNumber.trim(),
        panNumber: editPanNumber.trim().toUpperCase(),
        bankAccountNumber: editBankAccountNumber.trim(),
        bankIfscCode: editBankIfscCode.trim().toUpperCase(),
        bankAccountHolder: editBankAccountHolder.trim(),
        bankName: editBankName ? editBankName.trim() : null,
        bankBranch: editBankBranch ? editBankBranch.trim() : null,
        isKycLocked: editIsKycLocked,
        status: editStatus,
      };

      if (editPassword && editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await api.updateVendorByAdmin(editingVendor.id, payload);
      onNotify(res.message || `Vendor ${editingVendor.vendorId} updated successfully!`);
      setEditingVendor(null);
      await loadVendorsAndOperations();
    } catch (err: any) {
      setEditFormError(err.message || 'Failed to update vendor');
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  const handleClearVendorPO = (op: any) => {
    setVerifyApprovalPO(op);
  };

  const handleConfirmApproveAndClear = async (op: any) => {
    if (!op || !op.id) return;
    try {
      setIsApprovingPO(true);
      await api.closePurchaseOrder(op.id);
      onNotify(`Consignment ${op.poNumber || 'PO'} verified! Marked as Vehicle Reached Hub · Ready for Sell.`);
      setVerifyApprovalPO(null);
      await loadVendorsAndOperations();
    } catch (err: any) {
      onNotify(err.message || 'Failed to verify consignment delivery');
    } finally {
      setIsApprovingPO(false);
    }
  };

  const openAdvanceModal = (op: any) => {
    setSelectedPOForAdvance(op);
    const grand = Number(op.grandTotal || 0);
    const defaultAdv = Number(op.advanceAmount) > 0 ? Number(op.advanceAmount) : Math.round(grand * 0.55);
    setAdvanceAmountInput(defaultAdv);
    setAdvancePaymentMode('Bank Transfer (RTGS / NEFT)');
    setAdvancePaymentUtr(op.settlementDetails?.advancePaymentUtr && op.settlementDetails.advancePaymentUtr !== 'RTGS-MANDI-ADV' ? op.settlementDetails.advancePaymentUtr : '');
    setAdvancePaymentDate(new Date().toISOString().split('T')[0]);
    setAdvancePayingHub(op.orderPersonPlace || op.vendorProfile?.primaryLocation || 'Warangal Hub');
    setAdvanceNotes(op.settlementDetails?.advanceNotes || '');
    setAdvanceProofFile(null);
    setAdvanceProofPreview(op.settlementDetails?.advanceProofUrl || null);
  };

  const handleSubmitAdvance = async () => {
    if (!selectedPOForAdvance) return;
    if (!advancePaymentUtr.trim()) {
      onNotify('Please enter the bank transfer UTR or Reference Number');
      return;
    }
    if (!advanceProofFile && !advanceProofPreview) {
      onNotify('Mandatory: Please upload or capture the Advance Payment bank receipt proof (RTGS / NEFT receipt).');
      return;
    }
    try {
      setIsSubmittingAdvance(true);
      const fd = new FormData();
      fd.append('advanceAmount', String(advanceAmountInput));
      fd.append('paymentMode', advancePaymentMode);
      fd.append('utrNumber', advancePaymentUtr.trim());
      fd.append('paymentDate', advancePaymentDate);
      fd.append('payingHub', advancePayingHub);
      fd.append('notes', advanceNotes);
      if (advanceProofFile) {
        fd.append('advanceProof', advanceProofFile);
      }
      await api.disburseVendorAdvance(selectedPOForAdvance.id, fd);
      onNotify(`Advance of ₹${Number(advanceAmountInput).toLocaleString('en-IN')} disbursed by ${advancePayingHub}! Vendor dashboard updated with receipt proof.`);
      setSelectedPOForAdvance(null);
      await loadVendorsAndOperations();
    } catch (err: any) {
      onNotify(err.message || 'Failed to disburse advance');
    } finally {
      setIsSubmittingAdvance(false);
    }
  };

  const openSettlementModal = (op: any) => {
    setSelectedPOForSettlement(op);
    const grand = Number(op.grandTotal || 0);
    const adv = Number(op.advanceAmount) > 0 ? Number(op.advanceAmount) : Math.round(grand * 0.55);
    const adminShare = Math.round(grand * 0.05);
    const apmcShare = Math.round(grand * 0.01);
    const netPayable = Math.max(0, grand - (adminShare + apmcShare));
    const balDue = Math.max(0, netPayable - adv);

    setSettlementFinalPaidInput(balDue);
    setSettlementPaymentMode('Bank Transfer (RTGS / NEFT)');
    setSettlementPaymentUtr('');
    setSettlementPaymentDate(new Date().toISOString().split('T')[0]);
    setSettlementHub(op.orderPersonPlace || op.vendorProfile?.primaryLocation || 'Warangal Hub');
    setSettlementNotes(`Cleared after 5% Admin Share (₹${adminShare.toLocaleString('en-IN')}) and 1% APMC Mandi Cess (₹${apmcShare.toLocaleString('en-IN')})`);
    setSettlementProofFile(null);
    setSettlementProofPreview(null);

    const fin = getConsignmentFinancials(op);
    setSettlementClosingPrice(op.financialRecord?.linkedRevenue ? Math.round(Number(op.financialRecord.linkedRevenue) / Math.max(1, fin.totalQty)) : fin.closingRate);
    setSettlementTransport(op.financialRecord?.allocatedTransportCost ? Number(op.financialRecord.allocatedTransportCost) : fin.transportCost);
    setSettlementLabor(op.financialRecord?.allocatedLaborCost ? Number(op.financialRecord.allocatedLaborCost) : fin.laborCost);
  };

  const handleSubmitSettlement = async () => {
    if (!selectedPOForSettlement) return;
    if (!settlementPaymentUtr.trim()) {
      onNotify('Please enter the settlement UTR or transaction reference number');
      return;
    }
    if (!settlementProofFile && !settlementProofPreview) {
      onNotify('Mandatory: Please upload or capture the Final Mandi Settlement receipt proof.');
      return;
    }
    try {
      setIsSubmittingSettlement(true);
      const fd = new FormData();
      fd.append('finalBalancePaid', String(settlementFinalPaidInput));
      fd.append('paymentMode', settlementPaymentMode);
      fd.append('utrNumber', settlementPaymentUtr.trim());
      fd.append('settlingHub', settlementHub);
      fd.append('paymentDate', settlementPaymentDate);
      fd.append('notes', settlementNotes);
      if (settlementClosingPrice !== '') {
        fd.append('closingPrice', String(settlementClosingPrice));
      }
      if (settlementTransport !== '') {
        fd.append('allocatedTransportCost', String(settlementTransport));
      }
      if (settlementLabor !== '') {
        fd.append('allocatedLaborCost', String(settlementLabor));
      }
      if (settlementProofFile) {
        fd.append('settlementProof', settlementProofFile);
      }
      await api.settleVendorBalance(selectedPOForSettlement.id, fd);
      onNotify(`Consignment ${selectedPOForSettlement.poNumber} settled and marked as CLEARED ✓! 5% Admin Share & 1% APMC Cess deducted.`);
      setSelectedPOForSettlement(null);
      await loadVendorsAndOperations();
    } catch (err: any) {
      onNotify(err.message || 'Failed to settle consignment');
    } finally {
      setIsSubmittingSettlement(false);
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
        'Advance Cleared',
        'Net Balance Due',
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

      {/* Alert Banner: Vehicle Allotment Approval Queue */}
      {pendingAllotmentPOs.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-50 to-emerald-50 border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
              <Truck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-300">
                  Action Required
                </span>
                <strong className="text-sm font-black text-amber-950 font-['Manrope']">
                  {pendingAllotmentPOs.length} Vendor Consignment PO(s) Awaiting Vehicle Allotment &amp; Approval
                </strong>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Wholesale vendors requested consignment supply. Review loading origin farms, allot authorized cold-chain fleets, and approve to unlock carton loading and digital signing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSection('allotment')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto active:scale-95"
          >
            <Truck size={14} /> Review &amp; Allot Vehicles ({pendingAllotmentPOs.length})
          </button>
        </div>
      )}

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

          {/* New Tab: Awaiting Vehicle Allotment */}
          <button
            type="button"
            onClick={() => setActiveSection('allotment')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeSection === 'allotment'
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300 font-extrabold'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Truck size={15} /> Awaiting Vehicle Allotment ({pendingAllotmentPOs.length})
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

        {activeSection === 'allotment' && (
          <div className="text-xs text-amber-900 font-bold px-2 pt-2 flex items-center gap-2 whitespace-nowrap">
            <Clock size={14} className="text-amber-700 animate-spin" />
            <span>Consignments Queue: <strong>{pendingAllotmentPOs.length} PO(s) waiting for Admin fleet assignment &amp; dispatch approval</strong></span>
          </div>
        )}
        {activeSection === 'transit' && (
          <div className="text-xs text-rose-800 font-bold px-2 pt-2 flex items-center gap-2 whitespace-nowrap">
            <Truck size={14} className="text-rose-600 animate-pulse" />
            <span>Active Fleets in Transit: <strong>{transitCount} Trucks on Road · Advance Disbursed</strong></span>
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
              Advance Cleared
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
      {(activeSection === 'all' || activeSection === 'allotment') && (
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
                      Advance Paid (₹)
                    </th>
                    <th className="py-3.5 px-4 text-right font-bold border-r border-[#085A33]">
                      Net Balance Due (₹)
                    </th>
                    <th className="py-3.5 px-3 text-center font-bold border-r border-[#085A33]">
                      Status
                    </th>
                    <th className="py-3.5 px-3 text-center font-bold border-r border-[#085A33]">
                      Fleet / Tracker
                    </th>
                    <th className="py-3.5 px-3 text-center font-bold border-r border-[#085A33]">
                      Dispatch Proofs
                    </th>
                    <th className="py-3.5 px-4 text-center font-bold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedConsignments.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-12 text-gray-400">
                        {loading ? 'Loading vendor operations...' : (activeSection === 'allotment' ? 'No consignments awaiting vehicle allotment.' : 'No consignments found matching your criteria.')}
                      </td>
                    </tr>
                  ) : (
                    displayedConsignments.map((op, index) => {
                      const fin = getConsignmentFinancials(op);
                      const settle = op.settlementDetails || {
                        advanceDisbursed: Boolean(op.advanceAmount > 0 || op.paymentProofUrl),
                        advanceAmount: Math.round(fin.baseCost * 0.55),
                        advancePayingHub: op.orderPersonPlace || 'Warangal Hub',
                        advanceProofUrl: op.paymentProofUrl || null,
                        finalBalanceDue: Math.max(0, Math.round(fin.baseCost * 0.94) - Math.round(fin.baseCost * 0.55)),
                        finalBalancePaid: Math.max(0, Math.round(fin.baseCost * 0.94) - Math.round(fin.baseCost * 0.55)),
                        finalSettlementProofUrl: op.paymentProofUrl || null,
                      };
                      const poCode = op.poNumber || 'PO/SF/2026/001';
                      const vName = op.vendorProfile?.businessName || op.supplier?.name || op.vendorName || '-';
                      const vCode = op.vendorProfile?.vendorId || op.supplier?.supplierCode || op.vendorCode || '-';
                      const hub = op.orderPersonPlace || '-';
                      const truck = op.dispatchVehicleNumber || op.truckNo || '-';
                      const transporter = op.transporterName || op.dispatchTransporterName || op.transporter || '-';
                      const driver = op.driverPhone || op.dispatchDriverPhone || '-';
                      const vehiclePhoto = op.vehiclePhotoUrl || op.dispatchVehiclePhotoUrl || op.vehiclePhoto;
                      const bilty = op.transportBillUrl || op.dispatchTransportBillUrl || op.bilty;
                      const scaleSlip = op.weighbridgeSlipUrl || op.weighbridgeScaleSlipUrl || op.scaleSlipUrl;
                      const commodity = op.items?.map((it: any) => it.fruitName).filter(Boolean).join(', ') || op.commodity || op.fruitName || 'Fresh Fruits';
                      const status = op.status === 'CLOSED' ? 'CLOSED' : op.dispatchStatus || op.status || 'OPEN';
                      const isAwaitingAllotment = (!op.dispatchVehicleNumber || op.dispatchVehicleNumber === '-') &&
                        (op.status === 'PENDING_APPROVAL' || op.dispatchStatus === 'PENDING_DISPATCH' || !op.dispatchStatus);

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
                              {commodity.replace(/[🍎🍇🍉🍌🍊]/g, '').trim()}
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
                              ₹{settle.advanceAmount.toLocaleString('en-IN')}
                            </span>
                            {settle.advanceProofUrl ? (
                              <div className="flex items-center justify-end gap-1 mt-0.5 flex-wrap">
                                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-0.5">
                                  <CheckCircle2 size={9} /> PAID ({settle.advancePayingHub || hub})
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewDoc({
                                        url: resolvePhotoUrl(settle.advanceProofUrl!),
                                        title: `${poCode} - Advance Payment Receipt (${settle.advancePayingHub || hub})`,
                                      })
                                    }
                                    className="px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[9px] font-extrabold inline-flex items-center gap-0.5 cursor-pointer shadow-2xs"
                                    title="View Advance Bank Receipt Slip"
                                  >
                                    <Eye size={9} /> Slip
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openAdvanceModal(op)}
                                    className="px-1 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-[9px] font-bold cursor-pointer"
                                    title="Edit or replace advance receipt slip"
                                  >
                                    Edit
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1 mt-0.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => openAdvanceModal(op)}
                                  className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-extrabold inline-flex items-center gap-0.5 cursor-pointer shadow-2xs active:scale-95"
                                  title="Upload Advance Bank Payment Slip to verify payout"
                                >
                                  <Upload size={9} /> Upload Slip
                                </button>
                              </div>
                            )}
                          </td>
                          {/* Net Balance Due */}
                          <td className="text-right py-3.5 px-4 border-r border-gray-100 whitespace-nowrap">
                            {(() => {
                              const isReallySettled = Boolean(
                                settle.settlementCompleted &&
                                Number(settle.finalBalanceDue ?? 0) === 0 &&
                                (Number(settle.finalBalancePaid ?? 0) > 0 || status === 'CLOSED')
                              );
                              const potentialDue = settle.finalBalanceDue > 0
                                ? settle.finalBalanceDue
                                : (settle.calculatedPotentialDue || Math.max(0, fin.baseCost - Math.round(fin.baseCost * 0.06) - settle.advanceAmount));

                              return (
                                <div>
                                  <span className="font-bold text-gray-900 font-mono block">
                                    ₹{(isReallySettled ? settle.finalBalancePaid : potentialDue).toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[9px] font-medium text-gray-500 block mt-0.5">
                                    {isReallySettled ? 'Settled (5% Admin & 1% APMC) ✓' : 'Net Due (Less 5% Admin + 1% APMC)'}
                                  </span>
                                  {isReallySettled && settle.finalSettlementProofUrl && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewDoc({
                                          url: settle.finalSettlementProofUrl!,
                                          title: `${poCode} - Final Mandi Settlement Receipt (${settle.finalSettlingHub || hub})`,
                                        })
                                      }
                                      className="text-[9px] font-bold text-blue-700 hover:underline inline-flex items-center gap-0.5 mt-0.5 cursor-pointer"
                                    >
                                      <Eye size={9} /> Settlement Slip ↗
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
                          </td>

                          {/* Commercial Settlement Status */}
                          <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            {(() => {
                              const isReallySettled = Boolean(
                                settle.settlementCompleted &&
                                Number(settle.finalBalanceDue ?? 0) === 0 &&
                                (Number(settle.finalBalancePaid ?? 0) > 0 || status === 'CLOSED')
                              );

                              if (isReallySettled) {
                                return (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                                    <CheckCircle2 size={11} className="text-emerald-700" /> Cleared ✓
                                  </span>
                                );
                              }
                              if (isAwaitingAllotment) {
                                return (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300 inline-flex items-center gap-1 shadow-2xs animate-pulse">
                                    <Clock size={11} className="text-amber-700" /> Awaiting Allotment
                                  </span>
                                );
                              }
                              if (status === 'DELIVERED_AT_HUB' || op.dispatchStatus === 'DELIVERED_AT_HUB') {
                                return (
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-100 text-teal-950 border border-teal-300 inline-flex items-center gap-1 shadow-2xs">
                                    <MapPin size={11} className="text-teal-700" /> Reached Hub (Ready for Sell)
                                  </span>
                                );
                              }
                              if (settle.advanceDisbursed) {
                                return (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200 inline-flex items-center gap-1">
                                    <Clock size={10} className="text-blue-700" /> Advance Paid · Due Awaiting
                                  </span>
                                );
                              }
                              return (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  Pending Advance
                                </span>
                              );
                            })()}
                          </td>

                          {/* Fleet & Driver */}
                          <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            {truck && truck !== '-' ? (
                              <>
                                <span className="font-mono text-[11px] font-bold text-gray-900 flex items-center justify-center gap-1">
                                  <Truck size={12} className="text-gray-500" /> {truck}
                                </span>
                                <a
                                  href={`tel:${driver}`}
                                  className="text-[10px] font-semibold text-blue-700 hover:underline flex items-center justify-center gap-1 mt-0.5"
                                >
                                  <Phone size={10} className="text-blue-600" /> {driver}
                                </a>
                              </>
                            ) : (
                              <div>
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 block">
                                  No Vehicle Allotted
                                </span>
                                <span className="text-[9px] text-gray-400 block mt-0.5">Awaiting Hub Action</span>
                              </div>
                            )}
                          </td>

                          {/* Dispatch Proofs */}
                          <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-[150px] mx-auto">
                              {vehiclePhoto ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewDoc({
                                      url: resolvePhotoUrl(vehiclePhoto),
                                      title: `${poCode} - Truck Photo (${truck})`,
                                    })
                                  }
                                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                  title="View Vehicle Photo"
                                >
                                  <Camera size={10} className="text-emerald-700" /> Photo
                                </button>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[9px]">No Photo</span>
                              )}

                              {bilty ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewDoc({
                                      url: resolvePhotoUrl(bilty),
                                      title: `${poCode} - Transporter Bilty (${transporter})`,
                                    })
                                  }
                                  className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                  title="View Transporter Bilty"
                                >
                                  <FileText size={10} className="text-blue-700" /> Bilty
                                </button>
                              ) : (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 rounded text-[9px]">No Bilty</span>
                              )}

                              {scaleSlip && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewDoc({
                                      url: resolvePhotoUrl(scaleSlip),
                                      title: `${poCode} - Weighbridge Scale Slip`,
                                    })
                                  }
                                  className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 rounded-md text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                  title="View Scale Slip"
                                >
                                  <Scale size={10} className="text-purple-700" /> Slip
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="text-center py-3.5 px-3 whitespace-nowrap min-w-[210px]">
                            {(() => {
                              const isReallySettled = Boolean(
                                settle.settlementCompleted &&
                                Number(settle.finalBalanceDue ?? 0) === 0 &&
                                (Number(settle.finalBalancePaid ?? 0) > 0 || status === 'CLOSED')
                              );

                              return (
                                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                  {/* Action 1: Allot Vehicle & Approve (for un-allotted POs) */}
                                  {(!truck || truck === '-' || isAwaitingAllotment) && (
                                    <button
                                      type="button"
                                      onClick={() => openAllotModal(op)}
                                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black inline-flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95"
                                      title="Allot Vehicle Registration & Transporter to approve PO and unlock vendor loading"
                                    >
                                      <Truck size={11} />
                                      <span>Allot Vehicle</span>
                                    </button>
                                  )}

                                  {/* Action: Confirm Hub Arrival (when truck is in transit/dispatched and not yet marked reached) */}
                                  {!isReallySettled &&
                                    (op.dispatchStatus === 'LOADED_AND_DISPATCHED' ||
                                      op.dispatchStatus === 'IN_TRANSIT' ||
                                      Boolean(truck && truck !== '-' && (vehiclePhoto || bilty))) &&
                                    op.dispatchStatus !== 'DELIVERED_AT_HUB' && (
                                      <button
                                        type="button"
                                        onClick={() => handleClearVendorPO(op)}
                                        className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-black inline-flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95 ring-1 ring-emerald-400"
                                        title="Confirm truck arrival at Hub - marks consignment as Reached Hub & Ready for Sell"
                                      >
                                        <MapPin size={11} className="text-emerald-200" />
                                        <span>Reached Hub</span>
                                      </button>
                                    )}

                                  {/* Badge: Vehicle Reached Hub (Ready for Sell) */}
                                  {!isReallySettled && op.dispatchStatus === 'DELIVERED_AT_HUB' && (
                                    <span className="px-2 py-1 bg-teal-50 text-teal-900 border border-teal-300 rounded-lg text-[10px] font-black inline-flex items-center gap-1 shadow-2xs">
                                      <MapPin size={10} className="text-teal-700" /> Reached Hub (Ready for Sell)
                                    </span>
                                  )}

                                  {isReallySettled ? (
                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-black inline-flex items-center gap-1 shadow-2xs">
                                      <CheckCircle2 size={11} className="text-emerald-700" /> Cleared ✓
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openSettlementModal(op)}
                                      className="px-2 py-1 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-lg text-[10px] font-black inline-flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95 ring-1 ring-emerald-300"
                                      title="Settle balance with 5% Admin Share & 1% APMC Cess deduction, and clear PO"
                                    >
                                      <ShieldCheck size={11} className="text-emerald-300" />
                                      <span>Settle &amp; Clear</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => openPLModal(op)}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                    title="Open Mandi P&L Dossier"
                                  >
                                    <Calculator size={11} className="text-amber-800" />
                                    <span>P&amp;L</span>
                                  </button>

                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePO(op)}
                                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs transition cursor-pointer active:scale-95"
                                      title="Delete this Purchase Order permanently"
                                    >
                                      <Trash2 size={11} className="text-rose-600" />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
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
              <table className="w-full border-collapse min-w-[1250px] text-xs">
                <thead>
                  <tr className="bg-[#064D2B] text-white">
                    <th className="py-3 px-3 text-center font-bold w-12 border-r border-[#085A33]">S.No.</th>
                    <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">PO # &amp; Date</th>
                    <th className="py-3 px-3 text-left font-bold border-r border-[#085A33]">Vendor Partner</th>
                    <th className="py-3 px-3 text-left font-bold border-r border-[#085A33]">Commodity &amp; Volume</th>
                    <th className="py-3 px-3 text-right font-bold bg-[#085A33] border-r border-[#064D2B]">
                      Procurement Base
                    </th>
                    <th className="py-3 px-3 text-right font-bold bg-[#085A33] border-r border-[#064D2B]">
                      Closing Mandi Rate
                    </th>
                    <th className="py-3 px-3 text-right font-bold border-r border-[#085A33]">
                      5% Safal + 1% APMC
                    </th>
                    <th className="py-3 px-3 text-right font-bold border-r border-[#085A33]">
                      Landed Outlay (Freight+Hamali)
                    </th>
                    <th className="py-3 px-3 text-right font-bold bg-[#054024] border-r border-[#085A33]">
                      Mandi Turnover
                    </th>
                    <th className="py-3 px-3 text-center font-bold bg-[#054024] border-r border-[#085A33]">
                      Net Realized P&amp;L (Margin %)
                    </th>
                    <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Settlement</th>
                    <th className="py-3 px-3 text-center font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {displayedConsignments.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="text-center py-12 text-gray-400">
                        {loading ? 'Loading vendor operations...' : (activeSection === 'allotment' ? 'No consignments awaiting vehicle allotment.' : 'No consignments found.')}
                      </td>
                    </tr>
                  ) : (
                    displayedConsignments.map((op, index) => {
                      const fin = getConsignmentFinancials(op);
                      const settle = op.settlementDetails || {
                        advanceDisbursed: Boolean(op.advanceAmount > 0 || op.paymentProofUrl),
                        advanceAmount: Math.round(fin.baseCost * 0.55),
                        adminShareAmount: Math.round(fin.baseCost * 0.05),
                        apmcShareAmount: Math.round(fin.baseCost * 0.01),
                        finalBalanceDue: Math.max(0, Math.round(fin.baseCost * 0.94) - Math.round(fin.baseCost * 0.55)),
                        finalBalancePaid: Math.max(0, Math.round(fin.baseCost * 0.94) - Math.round(fin.baseCost * 0.55)),
                        settlementCompleted: op.status === 'CLOSED',
                      };
                      const poCode = op.poNumber || `PO/SF/2026/02${index}`;
                      const vName = op.vendorProfile?.businessName || op.supplier?.name || op.vendorName || 'Wholesale Vendor';
                      const vCode = op.vendorProfile?.vendorId || op.supplier?.supplierCode || op.vendorCode || 'VND-001';
                      const status = op.status === 'CLOSED' ? 'CLOSED' : (op.dispatchStatus || op.status || 'OPEN');
                      const isReallySettled = Boolean(
                        settle.settlementCompleted &&
                        Number(settle.finalBalanceDue ?? 0) === 0 &&
                        (Number(settle.finalBalancePaid ?? 0) > 0 || status === 'CLOSED')
                      );
                      const safalShare = Number(settle.adminShareAmount ?? Math.round(fin.baseCost * 0.05));
                      const apmcShare = Number(settle.apmcShareAmount ?? Math.round(fin.baseCost * 0.01));
                      const gradeInfo = getCommodityGradeDetails(op, fruitRates);

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
                            <strong className="text-gray-900 block font-bold text-xs truncate max-w-[150px]">
                              {gradeInfo.fruitName}
                            </strong>
                            {gradeInfo.hasMultipleGrades && gradeInfo.gradedItems.some((g) => g.quantity > 0) ? (
                              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                {gradeInfo.gradedItems
                                  .filter((g) => g.quantity > 0)
                                  .map((g, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 font-mono font-bold border border-emerald-200"
                                    >
                                      {g.shortGrade}: {g.quantity.toLocaleString('en-IN')}
                                    </span>
                                  ))}
                              </div>
                            ) : null}
                            <span className="text-[10px] text-gray-500 font-mono font-bold block mt-0.5">
                              Total: {fin.totalQty.toLocaleString('en-IN')} {fin.unit}s
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right bg-emerald-50/30 border-r border-gray-100">
                            {gradeInfo.hasMultipleGrades ? (
                              <div className="space-y-1">
                                <div className="flex flex-col items-end gap-0.5">
                                  {gradeInfo.gradedItems.map((g, idx) => (
                                    <div key={idx} className="flex items-center justify-end gap-1 text-right">
                                      <span className="text-[10px] text-emerald-800 font-extrabold uppercase">{g.shortGrade}:</span>
                                      <strong className="text-gray-900 text-xs font-mono font-bold">
                                        ₹{g.ratePerUnit.toLocaleString('en-IN')}/{g.unit}
                                      </strong>
                                    </div>
                                  ))}
                                </div>
                                <div className="pt-1 border-t border-emerald-100/80">
                                  <span className="text-[10px] text-gray-600 font-bold block">
                                    Base: ₹{fin.baseCost.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <strong className="text-gray-900 text-xs block font-mono font-bold">
                                  ₹{gradeInfo.singleRate.toLocaleString('en-IN')} / {fin.unit}
                                </strong>
                                <span className="text-[10px] text-gray-600 font-bold block">
                                  Base: ₹{fin.baseCost.toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}
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
                            {isReallySettled ? (
                              <div>
                                <span className="text-rose-600 font-bold font-mono block text-xs">
                                  -₹{(safalShare + apmcShare).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[9px] text-gray-500 block">
                                  5% (₹{safalShare.toLocaleString('en-IN')}) + 1% (₹{apmcShare.toLocaleString('en-IN')})
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-gray-900 font-bold font-mono block text-xs">₹0.00</span>
                                <span className="text-[9px] text-gray-400 block">Pending Realization</span>
                              </div>
                            )}
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
                            {isReallySettled ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Cleared ✓
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                Due Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              {(!op.dispatchVehicleNumber || op.dispatchVehicleNumber === '-') && (
                                <button
                                  type="button"
                                  onClick={() => openAllotModal(op)}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black inline-flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95"
                                  title="Allot Vehicle Registration & Transporter to approve PO and unlock vendor loading"
                                >
                                  <Truck size={11} />
                                  <span>Allot Vehicle</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openPLModal(op)}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                                title="Edit Mandi Auction Selling Rate, Freight, and Hamali"
                              >
                                <Calculator size={11} className="text-amber-800" />
                                <span>Edit P&amp;L</span>
                              </button>
                              {!isReallySettled && (
                                <button
                                  type="button"
                                  onClick={() => openSettlementModal(op)}
                                  className="px-2 py-1 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-lg text-[10px] font-black inline-flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95"
                                  title="Settle Mandi Balance & Clear PO"
                                >
                                  <ShieldCheck size={11} className="text-emerald-300" />
                                  <span>Settle</span>
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
                  <th className="py-3 px-4 text-right font-bold border-r border-[#085A33]">Advance Cleared</th>
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
                  const transporter = op.transporterName || op.dispatchTransporterName || op.transporter || '-';
                  const driver = op.driverPhone || op.dispatchDriverPhone || '-';
                  const vehiclePhoto = op.vehiclePhotoUrl || op.dispatchVehiclePhotoUrl || op.vehiclePhoto;
                  const bilty = op.transportBillUrl || op.dispatchTransportBillUrl || op.bilty;
                  const scaleSlip = op.weighbridgeSlipUrl || op.weighbridgeScaleSlipUrl || op.scaleSlipUrl;
                  const commodity = op.items?.map((it: any) => it.fruitName).filter(Boolean).join(', ') || op.commodity || op.fruitName || 'Fresh Fruits';
                  const advAmt = Math.round(fin.baseCost * 0.55);

                  return (
                    <tr key={op.id || poCode} className="hover:bg-rose-50/20 transition text-xs">
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
                          {commodity.replace(/[🍎🍇🍉🍌🍊]/g, '').trim()}
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
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {vehiclePhoto ? (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ url: vehiclePhoto, title: `${poCode} - Truck Photo (${truck})` })}
                              className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-black inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                              title="View Stamped Vehicle Photo"
                            >
                              <Eye size={11} className="text-emerald-700" /> Photo Attached
                            </button>
                          ) : null}
                          {bilty ? (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ url: bilty, title: `${poCode} - Transporter Bilty (${transporter})` })}
                              className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 rounded-lg text-[10px] font-black inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                              title="View Transporter Bilty"
                            >
                              <FileText size={11} className="text-blue-700" /> Bilty Attached
                            </button>
                          ) : null}
                          {scaleSlip ? (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ url: scaleSlip, title: `${poCode} - Weighbridge Scale Slip` })}
                              className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-lg text-[10px] font-black inline-flex items-center gap-1 shadow-2xs transition cursor-pointer"
                              title="View Scale Slip"
                            >
                              <Scale size={11} className="text-purple-700" /> Scale Slip
                            </button>
                          ) : null}
                          {!vehiclePhoto && !bilty && !scaleSlip && (
                            <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Proof Pending
                            </span>
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
                        {op.status === 'CLOSED' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-700" /> Cleared ✓
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                              In Transit
                            </span>
                            <button
                              type="button"
                              onClick={() => handleClearVendorPO(op)}
                              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[10px] font-extrabold inline-flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95"
                              title="Verify truck arrival at Hub"
                            >
                              <CheckCircle2 size={11} className="text-emerald-300" />
                              <span>Verify Hub Arrival</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openSettlementModal(op)}
                              className="px-2 py-1 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-lg text-[10px] font-black inline-flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95 ring-1 ring-emerald-300"
                              title="Settle commercial balance with 5% Admin Share & 1% APMC Cess deduction"
                            >
                              <ShieldCheck size={11} className="text-emerald-300" />
                              <span>Settle &amp; Clear ✓</span>
                            </button>
                          </div>
                        )}
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
                        <td className={`text-center py-3.5 px-4 font-black border-r border-gray-100 whitespace-nowrap ${vendor.status === 'SUSPENDED' ? 'text-rose-600' : 'text-[#087A3E]'}`}>
                          {vendor.vendorId}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-900 border-r border-gray-100">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{vendor.businessName}</span>
                            {vendor.status === 'SUSPENDED' && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                Suspended · Maint. Active
                              </span>
                            )}
                          </div>
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
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditVendor(vendor)}
                                className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer border bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300 inline-flex items-center gap-1 shadow-2xs active:scale-95"
                                title={`Edit ${vendor.vendorId} details, bank coordinates, and location`}
                              >
                                <Edit3 size={11} className="text-blue-700" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleLock(vendor)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer border inline-flex items-center gap-1 active:scale-95 ${
                                  vendor.isKycLocked
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                                }`}
                                title={vendor.isKycLocked ? 'Unlock for editing' : 'Lock KYC'}
                              >
                                {vendor.isKycLocked ? <Unlock size={11} /> : <Lock size={11} />}
                                {vendor.isKycLocked ? 'Unlock KYC' : 'Lock KYC'}
                              </button>
                            </div>
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

              {/* Vendor Location (Manual Text Entry) */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Vendor Location *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={primaryLocation}
                    onChange={(e) => setPrimaryLocation(e.target.value)}
                    placeholder="Enter vendor location (e.g. Kashmir, Shimla, Varanasi)"
                    list="vendor-locations-list"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 font-bold bg-white outline-none focus:border-[#087A3E]"
                  />
                  <datalist id="vendor-locations-list">
                    {VENDOR_WHITELISTED_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Enter the vendor's farm, orchard, or regional procurement origin location manually.
                </span>
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

      {/* MODAL 2.5: Edit Vendor Details (Admin Full Override) */}
      {editingVendor && (
        <div className="modal-backdrop">
          <div className="modal !w-[760px] max-w-[96vw] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
            <div className="modal-header pb-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 grid place-items-center">
                  <Edit3 size={20} />
                </div>
                <div>
                  <span className="eyebrow text-blue-800 font-bold">ADMIN VENDOR DIRECTORY</span>
                  <h2 className="text-lg font-bold text-gray-900">
                    Edit Vendor Details · {editingVendor.vendorId}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingVendor(null)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveVendorEdit} className="overflow-y-auto flex-1 py-4 pr-1 space-y-4 text-xs">
              {editFormError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{editFormError}</span>
                </div>
              )}

              {/* Vendor Identification Pill */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-blue-700 font-bold block uppercase tracking-wider">Vendor System ID</span>
                  <strong className="text-blue-950 font-mono text-sm">{editingVendor.vendorId}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-blue-700 font-bold block uppercase tracking-wider">Linked Account User</span>
                  <span className="text-blue-900 font-semibold">{editingVendor.phone}</span>
                </div>
              </div>

              {/* Vendor System ID (Reverse Sequence Code e.g. VND-599, VND-598) */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-1">
                <label className="block text-emerald-950 font-black text-xs">
                  Vendor ID Sequence Code *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={editVendorId}
                    onChange={(e) => setEditVendorId(e.target.value.toUpperCase())}
                    placeholder="e.g. VND-599"
                    className="w-full px-3 py-2 border border-emerald-300 rounded-xl text-xs font-mono font-black text-[#087A3E] uppercase bg-white outline-none focus:border-[#087A3E]"
                  />
                  <span className="text-[10px] text-emerald-800 font-bold bg-white px-2 py-1.5 rounded-lg border border-emerald-200 shrink-0">
                    Auto Reverse
                  </span>
                </div>
                <span className="text-[10px] text-emerald-800 block">
                  Reverse countdown sequence (e.g. VND-599, VND-598, VND-597...). Editable by Admin.
                </span>
              </div>

              {/* Business Name & Contact Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Business / Trade Name *</label>
                  <input
                    type="text"
                    required
                    value={editBusinessName}
                    onChange={(e) => setEditBusinessName(e.target.value)}
                    placeholder="e.g. Ramesh Agro Farms & Cold Storage"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 outline-none focus:border-[#087A3E]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Authorized Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={editContactPerson}
                    onChange={(e) => setEditContactPerson(e.target.value)}
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
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. 9848012345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 font-mono outline-none focus:border-[#087A3E]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="e.g. vendor@safalexports.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 outline-none focus:border-[#087A3E]"
                  />
                </div>
              </div>

              {/* Vendor Location (Manual Text Entry) */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Vendor Location *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={editPrimaryLocation}
                    onChange={(e) => setEditPrimaryLocation(e.target.value)}
                    placeholder="Enter vendor location (e.g. Kashmir, Shimla, Varanasi)"
                    list="vendor-edit-locations-list"
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 font-bold bg-white outline-none focus:border-[#087A3E]"
                  />
                  <datalist id="vendor-edit-locations-list">
                    {VENDOR_WHITELISTED_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc} />
                    ))}
                  </datalist>
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Origin farm, orchard, or regional procurement location.
                </span>
              </div>

              {/* Statutory Identity Records */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <span className="eyebrow text-gray-700 font-bold block">STATUTORY IDENTITY RECORDS</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">12-Digit Aadhaar Number *</label>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={editAadharNumber}
                      onChange={(e) => setEditAadharNumber(e.target.value.replace(/\D/g, ''))}
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
                      value={editPanNumber}
                      onChange={(e) => setEditPanNumber(e.target.value.toUpperCase())}
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
                      value={editBankAccountNumber}
                      onChange={(e) => setEditBankAccountNumber(e.target.value.trim())}
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
                      value={editBankIfscCode}
                      onChange={(e) => setEditBankIfscCode(e.target.value.toUpperCase().trim())}
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
                      value={editBankAccountHolder}
                      onChange={(e) => setEditBankAccountHolder(e.target.value)}
                      placeholder="Exact name as in bank records"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Bank &amp; Branch Name (Optional)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editBankName}
                        onChange={(e) => setEditBankName(e.target.value)}
                        placeholder="e.g. SBI, HDFC"
                        className="w-full px-2.5 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 outline-none bg-white"
                      />
                      <input
                        type="text"
                        value={editBankBranch}
                        onChange={(e) => setEditBankBranch(e.target.value)}
                        placeholder="e.g. Pulwama"
                        className="w-full px-2.5 py-2 border border-gray-300 rounded-xl text-xs text-gray-900 outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Security & KYC Controls */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                <span className="eyebrow text-amber-900 font-bold block">SECURITY &amp; KYC CONTROLS</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Reset Login Password</label>
                    <input
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Leave blank to keep current"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 outline-none bg-white"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Only enter if resetting password</span>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">KYC Lock Status</label>
                    <select
                      value={editIsKycLocked ? 'locked' : 'editable'}
                      onChange={(e) => setEditIsKycLocked(e.target.value === 'locked')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 outline-none bg-white"
                    >
                      <option value="locked">🔒 Frozen &amp; Locked</option>
                      <option value="editable">🔓 Editable by Vendor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Account Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 outline-none bg-white"
                    >
                      <option value="ACTIVE">Active Partner</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingVendor(null)}
                  className="secondary-button cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditingSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#064D2B] hover:bg-[#087A3E] text-white font-extrabold text-xs shadow-md transition inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  <CheckCircle2 size={15} />
                  {isEditingSubmitting ? 'Saving Changes...' : 'Save Vendor Changes ✓'}
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
                      <span className="text-[10px] text-gray-500 block font-bold uppercase tracking-wider">Procurement Rate (Buying)</span>
                      {selectedPOForPL && (() => {
                        const modalGradeInfo = getCommodityGradeDetails(selectedPOForPL, fruitRates);
                        return modalGradeInfo.hasMultipleGrades ? (
                          <div className="space-y-1 mt-1">
                            {modalGradeInfo.gradedItems.map((g, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px] font-mono bg-gray-50/80 px-2 py-0.5 rounded border border-gray-100">
                                <span className="text-gray-700 font-bold">{g.shortGrade} ({g.quantity > 0 ? `${g.quantity} ` : ''}{g.unit}):</span>
                                <strong className="text-emerald-950 font-black">₹{g.ratePerUnit.toLocaleString('en-IN')}/{g.unit}</strong>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <strong className="text-sm font-bold text-gray-900 block mt-0.5 font-mono">
                            ₹{modalGradeInfo.singleRate.toLocaleString('en-IN')} / {fin.unit}
                          </strong>
                        );
                      })()}
                      <span className="text-[10px] text-emerald-700 font-bold block mt-1.5 pt-1 border-t border-gray-100">
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
                      Final Payout Balance
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
                  src={resolvePhotoUrl(previewDoc.url)}
                  title={previewDoc.title}
                  className="w-full h-96 rounded-xl border-0"
                />
              ) : (
                <img
                  src={resolvePhotoUrl(previewDoc.url)}
                  alt={previewDoc.title}
                  className="max-h-[65vh] object-contain rounded-xl shadow-xs"
                />
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Verified Mandi Procurement Documentation</span>
              <div className="flex items-center gap-2">
                <a
                  href={resolvePhotoUrl(previewDoc.url)}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold inline-flex items-center gap-1.5 shadow-xs transition"
                >
                  <Download size={13} /> Download Document
                </a>
                <a
                  href={resolvePhotoUrl(previewDoc.url)}
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

      {/* MODAL 6: Verify & Approve Consignment PO Modal */}
      {verifyApprovalPO && (
        <div
          className="modal-backdrop fixed inset-0 flex items-center justify-center p-3 sm:p-4 !z-[9999]"
          style={{ zIndex: 9999 }}
          onClick={() => setVerifyApprovalPO(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full border border-emerald-900/20 shadow-2xl p-5 sm:p-6 my-auto max-h-[92vh] flex flex-col relative"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={22} className="text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900 font-['Manrope']">
                    Verify Consignment Hub Arrival &amp; Mark Ready for Sell
                  </h3>
                  <p className="text-xs text-gray-500 font-mono">
                    {verifyApprovalPO.poNumber} · {verifyApprovalPO.vendorProfile?.businessName || verifyApprovalPO.supplier?.name} ({verifyApprovalPO.vendorProfile?.vendorId || verifyApprovalPO.supplier?.supplierCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifyApprovalPO(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content Body */}
            <div className="py-4 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Consignment Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-center">
                <div>
                  <span className="text-[10px] text-gray-500 block font-bold">Destination Hub</span>
                  <strong className="text-gray-900">{verifyApprovalPO.orderPersonPlace || 'Warangal'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block font-bold">Vehicle / Truck</span>
                  <strong className="text-gray-900 font-mono">{verifyApprovalPO.dispatchVehicleNumber || 'N/A'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block font-bold">Transporter</span>
                  <strong className="text-gray-900 truncate block">{verifyApprovalPO.transporterName || 'Direct Logistics'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block font-bold">Consignment Value</span>
                  <strong className="text-emerald-900 font-mono">₹{Number(verifyApprovalPO.grandTotal || 0).toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {/* Uploaded Evidence Proofs Inspection */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-gray-800 text-xs flex items-center gap-1.5">
                  <Eye size={14} className="text-emerald-700" />
                  Submitted Dispatch Evidence &amp; Proofs
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Proof 1: Vehicle Photo */}
                  <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800 text-[11px] flex items-center gap-1">
                        <Truck size={12} className="text-emerald-700" /> 1. Vehicle Photo
                      </span>
                      {verifyApprovalPO.vehiclePhotoUrl ? (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Attached ✓
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Pending
                        </span>
                      )}
                    </div>
                    {verifyApprovalPO.vehiclePhotoUrl ? (
                      <div
                        className="relative group cursor-pointer"
                        onClick={() =>
                          setPreviewDoc({
                            url: resolvePhotoUrl(verifyApprovalPO.vehiclePhotoUrl),
                            title: `${verifyApprovalPO.poNumber} - Vehicle Photo`,
                          })
                        }
                      >
                        <img
                          src={resolvePhotoUrl(verifyApprovalPO.vehiclePhotoUrl)}
                          alt="Vehicle Dispatch Proof"
                          className="w-full h-36 object-contain rounded-xl bg-black/5 border border-gray-100"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye size={14} /> Click to Enlarge
                        </div>
                      </div>
                    ) : (
                      <div className="h-36 rounded-xl bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                        No vehicle photo attached
                      </div>
                    )}
                  </div>

                  {/* Proof 2: Transporter Bilty */}
                  <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800 text-[11px] flex items-center gap-1">
                        <FileText size={12} className="text-blue-700" /> 2. Transporter Bilty (LR)
                      </span>
                      {verifyApprovalPO.transportBillUrl ? (
                        <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Attached ✓
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Pending
                        </span>
                      )}
                    </div>
                    {verifyApprovalPO.transportBillUrl ? (
                      <div
                        className="relative group cursor-pointer"
                        onClick={() =>
                          setPreviewDoc({
                            url: resolvePhotoUrl(verifyApprovalPO.transportBillUrl),
                            title: `${verifyApprovalPO.poNumber} - Transporter Bilty`,
                          })
                        }
                      >
                        {verifyApprovalPO.transportBillUrl.endsWith('.pdf') ? (
                          <div className="w-full h-36 rounded-xl bg-blue-50 border border-blue-200 flex flex-col items-center justify-center text-blue-700">
                            <FileText size={32} />
                            <span className="text-[11px] font-bold mt-1">PDF Consignment Note</span>
                            <span className="text-[10px] text-blue-500">Click to preview</span>
                          </div>
                        ) : (
                          <img
                            src={resolvePhotoUrl(verifyApprovalPO.transportBillUrl)}
                            alt="Transport Bilty Proof"
                            className="w-full h-36 object-contain rounded-xl bg-black/5 border border-gray-100"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition rounded-xl flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye size={14} /> Click to Enlarge
                        </div>
                      </div>
                    ) : (
                      <div className="h-36 rounded-xl bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                        No transport bilty attached
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Quality & Weighbridge Slip note if present */}
              {verifyApprovalPO.weighbridgeSlipUrl && (
                <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale size={16} className="text-purple-700" />
                    <div>
                      <strong className="text-purple-950 block">Weighbridge Scale Slip Attached</strong>
                      <span className="text-[11px] text-purple-700">
                        Net Weight: {Number(verifyApprovalPO.weighbridgeNetKg || 0).toLocaleString('en-IN')} KG verified
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewDoc({
                        url: resolvePhotoUrl(verifyApprovalPO.weighbridgeSlipUrl),
                        title: `${verifyApprovalPO.poNumber} - Weighbridge Slip`,
                      })
                    }
                    className="px-2.5 py-1 bg-white hover:bg-purple-100 text-purple-800 rounded-lg font-bold text-xs border border-purple-300 cursor-pointer"
                  >
                    View Slip
                  </button>
                </div>
              )}

              {/* Verification statement */}
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 text-[11px] leading-relaxed">
                <span className="font-bold block mb-0.5">Hub Delivery Arrival Confirmation &amp; Ready for Sell:</span>
                I have inspected the submitted photographic evidence, truck number plate, and delivery bilty. Verifying this consignment confirms truck arrival at <strong>{verifyApprovalPO.orderPersonPlace || 'Hub'}</strong> (Status: <strong>DELIVERED AT HUB · Ready for Sell</strong>). The consignment is received at destination hub and ready for wholesale Mandi sale / auction. The vendor dashboard will now display: <strong>Vehicle Reached Location · Ready for Sell</strong>.
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setVerifyApprovalPO(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmApproveAndClear(verifyApprovalPO)}
                disabled={isApprovingPO}
                className="px-5 py-2.5 rounded-xl bg-[#064D2B] hover:bg-[#087A3E] text-white font-extrabold text-xs shadow-md transition inline-flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <CheckCircle2 size={15} className="text-emerald-300" />
                <span>{isApprovingPO ? 'Verifying Arrival...' : 'Confirm Hub Arrival · Ready for Sell ✓'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADVANCE DISBURSEMENT MODAL WITH PROOF */}
      {selectedPOForAdvance && (() => {
        const op = selectedPOForAdvance;
        const grand = Number(op.grandTotal || 0);
        const vBank = op.vendorProfile || {};
        const vName = op.vendorProfile?.businessName || op.supplier?.name || 'Vendor Partner';
        const vCode = op.vendorProfile?.vendorId || op.supplier?.supplierCode || 'VND';
        const hub = advancePayingHub || op.orderPersonPlace || 'Warangal Hub';

        return (
          <div
            className="modal-backdrop fixed inset-0 flex items-center justify-center p-3 sm:p-4 !z-[9999]"
            style={{ zIndex: 9999 }}
            onClick={() => setSelectedPOForAdvance(null)}
          >
            <div
              className="bg-white rounded-3xl max-w-2xl w-full border border-gray-200 shadow-2xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col relative"
              style={{ zIndex: 10000 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#064D2B] flex items-center justify-center">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold tracking-wider text-emerald-800 uppercase block">
                      ADVANCE DISBURSEMENT WITH PAYMENT PROOF
                    </span>
                    <h3 className="text-base font-black font-['Manrope'] text-gray-900">
                      Disburse Advance: {op.poNumber}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPOForAdvance(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 py-4 space-y-4 text-xs pr-1">
                {/* Vendor Bank Coordinates Banner */}
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-[#087A3E]" />
                      <strong className="text-gray-900 text-xs">{vName} ({vCode})</strong>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                      🔒 Verified Bank Account
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div>
                      <span className="text-gray-500 block text-[10px]">Bank Name</span>
                      <strong className="text-gray-900">{vBank.bankName || 'HDFC Bank'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Account Number</span>
                      <strong className="text-gray-900 font-mono font-bold">{vBank.bankAccountNumber || '382901239840'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">IFSC Code</span>
                      <strong className="text-gray-900 font-mono font-bold">{vBank.bankIfscCode || 'HDFC0001234'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Account Holder</span>
                      <strong className="text-gray-900">{vBank.bankAccountHolder || vName}</strong>
                    </div>
                  </div>
                </div>

                {/* Amount breakdown banner */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-200 text-center">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Gross PO Consignment</span>
                    <strong className="text-sm font-black text-gray-900 font-mono">
                      ₹{grand.toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 font-bold block">55% Recommended Advance</span>
                    <strong className="text-sm font-black text-emerald-800 font-mono">
                      ₹{Math.round(grand * 0.55).toLocaleString('en-IN')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Balance Payable on Delivery</span>
                    <strong className="text-sm font-black text-gray-700 font-mono">
                      ₹{Math.round(grand * 0.45).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                {/* Form Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Advance Amount to Disburse (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={advanceAmountInput}
                        onChange={(e) => setAdvanceAmountInput(e.target.value)}
                        className="w-full h-9 pl-7 pr-3 border border-emerald-300 rounded-xl text-xs font-black text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                        required
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      Default is 55% of total order value (₹{Math.round(grand * 0.55).toLocaleString('en-IN')})
                    </span>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Paying Regional Hub *
                    </label>
                    <select
                      value={advancePayingHub}
                      onChange={(e) => setAdvancePayingHub(e.target.value)}
                      className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    >
                      {VENDOR_WHITELISTED_LOCATIONS.map((loc) => (
                        <option key={loc} value={`${loc} Hub`}>
                          {loc} Hub (Regional Accounts Desk)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Payment Mode *
                    </label>
                    <select
                      value={advancePaymentMode}
                      onChange={(e) => setAdvancePaymentMode(e.target.value)}
                      className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    >
                      <option value="Bank Transfer (RTGS / NEFT)">Bank Transfer (RTGS / NEFT)</option>
                      <option value="IMPS Immediate Transfer">IMPS Immediate Transfer</option>
                      <option value="UPI Direct Transfer">UPI Direct Transfer</option>
                      <option value="NetBanking Counterfoil">NetBanking Counterfoil</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Bank Transfer UTR / Ref No *
                    </label>
                    <input
                      type="text"
                      value={advancePaymentUtr}
                      onChange={(e) => setAdvancePaymentUtr(e.target.value)}
                      placeholder="e.g. UTR182930491823"
                      className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Disbursement Date *
                    </label>
                    <input
                      type="date"
                      value={advancePaymentDate}
                      onChange={(e) => setAdvancePaymentDate(e.target.value)}
                      className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Advance Payment Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    value={advanceNotes}
                    onChange={(e) => setAdvanceNotes(e.target.value)}
                    placeholder="e.g. Cleared via Warangal Mandi HDFC Treasury Account"
                    className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                  />
                </div>

                {/* Upload Payment Receipt / RTGS Counterfoil */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-gray-900 text-xs block">
                          Upload Advance Payment Receipt / Bank Counterfoil Photo
                        </strong>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                          Mandatory *
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500">
                        Take a photo or upload screenshot of the bank transfer slip. Stamped automatically with time &amp; GPS.
                      </span>
                    </div>
                    {advanceProofPreview && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        Receipt Attached ✓
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveCameraTarget('advance')}
                      className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Camera size={14} /> Open Camera (Live Capture)
                    </button>
                    <button
                      type="button"
                      onClick={() => advanceFileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Upload size={14} /> Choose from Files
                    </button>
                  </div>

                  {advanceProofPreview && (
                    <div className="relative rounded-xl border border-gray-200 bg-white p-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={advanceProofPreview}
                          alt="Receipt Preview"
                          className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0 cursor-pointer"
                          onClick={() => setPreviewDoc({ url: advanceProofPreview, title: 'Advance Payment Receipt Proof' })}
                        />
                        <div className="min-w-0">
                          <strong className="text-xs text-gray-900 block truncate">
                            Advance Payment Proof Attached
                          </strong>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ url: advanceProofPreview, title: 'Advance Payment Receipt Proof' })}
                            className="text-[10px] text-emerald-700 font-bold hover:underline inline-flex items-center gap-0.5"
                          >
                            <Eye size={10} /> View Fullscreen
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAdvanceProofFile(null);
                          setAdvanceProofPreview(null);
                        }}
                        className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                <span className="text-[11px] text-gray-500">
                  Vendor dashboard will immediately display advance paid by {hub}.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPOForAdvance(null)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitAdvance}
                    disabled={isSubmittingAdvance}
                    className="px-5 py-2.5 rounded-xl bg-[#064D2B] hover:bg-[#087A3E] text-white font-black text-xs shadow-md transition inline-flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 size={15} className="text-emerald-300" />
                    <span>{isSubmittingAdvance ? 'Disbursing...' : 'Submit Advance & Notify Vendor'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: FINAL COMMERCIAL SETTLEMENT & CLEARANCE MODAL (5% Admin Share + 1% APMC Cess) */}
      {selectedPOForSettlement && (() => {
        const op = selectedPOForSettlement;
        const grand = Number(op.grandTotal || 0);
        const adv = Number(op.advanceAmount || 0);
        const vBank = op.vendorProfile || {};
        const vName = op.vendorProfile?.businessName || op.supplier?.name || 'Vendor Partner';
        const vCode = op.vendorProfile?.vendorId || op.supplier?.supplierCode || 'VND';

        // Precise Mandi Deductions
        const adminShareAmount = Math.round(grand * 0.05);
        const apmcShareAmount = Math.round(grand * 0.01);
        const totalDeductions = adminShareAmount + apmcShareAmount; // 6%
        const netVendorPayable = Math.max(0, grand - totalDeductions);
        const balanceDue = Math.max(0, netVendorPayable - adv);
        const hub = settlementHub || op.orderPersonPlace || 'Warangal Hub';
        const fin = getConsignmentFinancials(op);

        return (
          <div
            className="modal-backdrop fixed inset-0 flex items-center justify-center p-3 sm:p-4 !z-[9999]"
            style={{ zIndex: 9999 }}
            onClick={() => setSelectedPOForSettlement(null)}
          >
            <div
              className="bg-white rounded-3xl max-w-2xl w-full border border-gray-200 shadow-2xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col relative"
              style={{ zIndex: 10000 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold tracking-wider text-emerald-800 uppercase block">
                      COMMERCIAL SETTLEMENT &amp; MANDI CLEARANCE
                    </span>
                    <h3 className="text-base font-black font-['Manrope'] text-gray-900">
                      Final Settlement: {op.poNumber}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPOForSettlement(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 py-4 space-y-4 text-xs pr-1">
                {/* COMMERCIAL DEDUCTION MATRIX */}
                <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-b from-emerald-50/60 to-white overflow-hidden shadow-xs">
                  <div className="bg-[#064D2B] text-white px-4 py-2.5 flex items-center justify-between">
                    <strong className="text-xs uppercase tracking-wide font-black flex items-center gap-1.5">
                      <Calculator size={14} /> Official Mandi Settlement Statement (Safal ERP)
                    </strong>
                    <span className="text-[10px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
                      {vCode} · {hub}
                    </span>
                  </div>

                  <div className="p-4 space-y-2 text-xs">
                    {/* Gross PO Value */}
                    <div className="flex items-center justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-700 font-bold">1. Gross PO Consignment Value</span>
                      <strong className="font-mono text-gray-900 text-sm font-black">
                        ₹{grand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    {/* 5% Admin Share */}
                    <div className="flex items-center justify-between py-1 text-rose-800">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        <span>Less 5% Safal Platform Admin Share / Commission</span>
                      </div>
                      <strong className="font-mono font-bold">
                        -₹{adminShareAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    {/* 1% APMC Market Cess */}
                    <div className="flex items-center justify-between py-1 text-rose-800 border-b border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                        <span>Less 1% APMC Mandi Market Cess Fee</span>
                      </div>
                      <strong className="font-mono font-bold">
                        -₹{apmcShareAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    {/* Total Mandi Deductions */}
                    <div className="flex items-center justify-between py-1 bg-rose-50/50 px-2.5 rounded-lg text-rose-900 font-bold">
                      <span>Total Mandi Deductions (6%)</span>
                      <span className="font-mono font-black">
                        -₹{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Net Vendor Payable */}
                    <div className="flex items-center justify-between py-1.5 bg-emerald-50 px-2.5 rounded-lg text-emerald-950 font-black border border-emerald-200">
                      <span>Net Realized Payable to Vendor</span>
                      <span className="font-mono text-sm">
                        ₹{netVendorPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* Less Advance Already Paid */}
                    <div className="flex items-center justify-between py-1 text-gray-600">
                      <span>Less Advance Already Paid ({hub})</span>
                      <strong className="font-mono text-gray-900">
                        -₹{adv.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    {/* Net Final Balance Due */}
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-950">
                      <div>
                        <strong className="text-xs uppercase font-black block">Net Final Balance Due to Vendor</strong>
                        <span className="text-[10px] text-amber-800">Clear full due amount to close consignment</span>
                      </div>
                      <strong className="text-base sm:text-lg font-black font-mono text-amber-900">
                        ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Vendor Bank Coordinates Banner */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between text-[11px]">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Beneficiary Bank Account</span>
                    <strong className="text-gray-900 font-mono">
                      {vBank.bankName || 'Verified Bank'} · A/C: {vBank.bankAccountNumber || '-'} · IFSC: {vBank.bankIfscCode || '-'}
                    </strong>
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">
                    {vBank.bankAccountHolder || vName}
                  </span>
                </div>

                {/* Settlement Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Final Settlement Amount Paid (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={settlementFinalPaidInput}
                        onChange={(e) => setSettlementFinalPaidInput(e.target.value)}
                        className="w-full h-9 pl-7 pr-3 border border-emerald-300 rounded-xl text-xs font-black text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Settling Regional Hub *
                    </label>
                    <select
                      value={settlementHub}
                      onChange={(e) => setSettlementHub(e.target.value)}
                      className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    >
                      {VENDOR_WHITELISTED_LOCATIONS.map((loc) => (
                        <option key={loc} value={`${loc} Hub`}>
                          {loc} Hub (Mandi Receiving Desk)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Payment Mode *
                    </label>
                    <select
                      value={settlementPaymentMode}
                      onChange={(e) => setSettlementPaymentMode(e.target.value)}
                      className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    >
                      <option value="Bank Transfer (RTGS / NEFT)">Bank Transfer (RTGS / NEFT)</option>
                      <option value="IMPS Immediate Transfer">IMPS Immediate Transfer</option>
                      <option value="UPI Direct Transfer">UPI Direct Transfer</option>
                      <option value="NetBanking Counterfoil">NetBanking Counterfoil</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Settlement UTR / Ref No *
                    </label>
                    <input
                      type="text"
                      value={settlementPaymentUtr}
                      onChange={(e) => setSettlementPaymentUtr(e.target.value)}
                      placeholder="e.g. UTR998877665544"
                      className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Settlement Date *
                    </label>
                    <input
                      type="date"
                      value={settlementPaymentDate}
                      onChange={(e) => setSettlementPaymentDate(e.target.value)}
                      className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    />
                  </div>
                </div>

                {/* Mandi Realization Auction Rate & Realized P&L (Reflects in Vendor Ledger) */}
                <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <strong className="text-blue-950 text-xs flex items-center gap-1.5 font-bold">
                      <TrendingUp size={14} className="text-blue-700" />
                      Mandi Sales Auction Rate &amp; Realized P&amp;L (Reflects in Vendor Ledger)
                    </strong>
                    <span className="text-[10px] text-blue-700 font-bold bg-white px-2 py-0.5 rounded border border-blue-200">
                      Editable by Admin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] text-gray-700 font-bold mb-1">
                        Auction Rate (₹ / {fin.unit || 'BOX'})
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-gray-400 font-bold text-xs">₹</span>
                        <input
                          type="number"
                          value={settlementClosingPrice}
                          onChange={(e) => setSettlementClosingPrice(e.target.value)}
                          placeholder="e.g. 1480"
                          className="w-full h-8 pl-6 pr-2 border border-blue-300 rounded-xl text-xs font-bold text-blue-950 bg-white focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <span className="text-[9px] text-gray-500 block mt-0.5">
                        Turnover: ₹{Math.round((Number(settlementClosingPrice) || 0) * fin.totalQty).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-700 font-bold mb-1">
                        Freight Cost (₹)
                      </label>
                      <input
                        type="number"
                        value={settlementTransport}
                        onChange={(e) => setSettlementTransport(e.target.value)}
                        className="w-full h-8 px-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-gray-700 font-bold mb-1">
                        Hamali / Labor (₹)
                      </label>
                      <input
                        type="number"
                        value={settlementLabor}
                        onChange={(e) => setSettlementLabor(e.target.value)}
                        className="w-full h-8 px-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white"
                      />
                    </div>
                  </div>

                  {/* Real-time P&L Outcome Preview */}
                  {(() => {
                    const rate = Number(settlementClosingPrice) || 0;
                    if (rate <= 0) return null;
                    const estRev = Math.round(rate * fin.totalQty);
                    const estCost = fin.baseCost + (Number(settlementTransport) || 0) + (Number(settlementLabor) || 0);
                    const estPL = estRev - estCost;
                    const isP = estPL >= 0;
                    return (
                      <div className={`p-2 rounded-xl border flex items-center justify-between text-xs ${isP ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-rose-50 border-rose-300 text-rose-950'}`}>
                        <span className="font-semibold">Calculated Mandi Profit / Loss:</span>
                        <strong className="font-mono text-xs font-black">
                          {isP ? `+₹${estPL.toLocaleString('en-IN')} (Net Profit)` : `-₹${Math.abs(estPL).toLocaleString('en-IN')} (Loss)`}
                        </strong>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Settlement Notes &amp; Commercial Remarks
                  </label>
                  <input
                    type="text"
                    value={settlementNotes}
                    onChange={(e) => setSettlementNotes(e.target.value)}
                    placeholder="e.g. Consignment accepted at mandi scale; 5% Admin share and 1% APMC cess deducted"
                    className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                  />
                </div>

                {/* Upload Final Settlement Receipt / RTGS Slip */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-gray-900 text-xs block">
                          Upload Final Settlement Payment Slip / Bank Transfer Proof
                        </strong>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                          Mandatory *
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500">
                        Take a photo or upload screenshot of final settlement transfer receipt. Stamped with time &amp; GPS.
                      </span>
                    </div>
                    {settlementProofPreview && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        Receipt Attached ✓
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveCameraTarget('settlement')}
                      className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Camera size={14} /> Open Camera (Live Capture)
                    </button>
                    <button
                      type="button"
                      onClick={() => settlementFileInputRef.current?.click()}
                      className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Upload size={14} /> Choose from Files
                    </button>
                  </div>

                  {settlementProofPreview && (
                    <div className="relative rounded-xl border border-gray-200 bg-white p-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={settlementProofPreview}
                          alt="Settlement Receipt Preview"
                          className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0 cursor-pointer"
                          onClick={() => setPreviewDoc({ url: settlementProofPreview, title: 'Final Settlement Receipt Proof' })}
                        />
                        <div className="min-w-0">
                          <strong className="text-xs text-gray-900 block truncate">
                            Final Settlement Proof Attached
                          </strong>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ url: settlementProofPreview, title: 'Final Settlement Receipt Proof' })}
                            className="text-[10px] text-emerald-700 font-bold hover:underline inline-flex items-center gap-0.5"
                          >
                            <Eye size={10} /> View Fullscreen
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSettlementProofFile(null);
                          setSettlementProofPreview(null);
                        }}
                        className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                <span className="text-[11px] text-gray-500">
                  Consignment will be marked as <strong>CLEARED ✓</strong> in Vendor Dashboard.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPOForSettlement(null)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitSettlement}
                    disabled={isSubmittingSettlement}
                    className="px-5 py-2.5 rounded-xl bg-[#064D2B] hover:bg-[#087A3E] text-white font-black text-xs shadow-md transition inline-flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 size={15} className="text-emerald-300" />
                    <span>{isSubmittingSettlement ? 'Settling...' : 'Confirm Settlement & Clear PO ✓'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: ADMIN VEHICLE ALLOTMENT & APPROVAL MODAL */}
      {selectedPOForAllot && (() => {
        const op = selectedPOForAllot;
        const fin = getConsignmentFinancials(op);
        const poCode = op.poNumber || 'PO/SF/2026/001';
        const vName = op.vendorProfile?.businessName || op.supplier?.name || op.vendorName || 'Wholesale Vendor';
        const vCode = op.vendorProfile?.vendorId || op.supplier?.supplierCode || op.vendorCode || 'VND-001';
        const originFarm = op.orderPersonPlace || op.vendorProfile?.primaryLocation || 'Farm Origin';
        const destinationHub = op.deliveryAddress || op.hubName || 'Warangal Regional Hub';
        const commodity = op.items?.map((it: any) => it.fruitName).filter(Boolean).join(', ') || op.commodity || op.fruitName || 'Kashmir Apples';

        return (
          <div
            className="modal-backdrop fixed inset-0 flex items-center justify-center p-3 sm:p-4 !z-[9999]"
            style={{ zIndex: 9999 }}
            onClick={() => setSelectedPOForAllot(null)}
          >
            <div
              className="bg-white rounded-3xl max-w-xl w-full border border-emerald-900/20 shadow-2xl p-5 sm:p-6 my-auto max-h-[92vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="pb-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 grid place-items-center">
                    <Truck size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-black text-amber-800 tracking-wider">
                        Logistics Fleet Assignment
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-300">
                        Admin Approval
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-gray-900 font-['Manrope'] mt-0.5">
                      Allot Vehicle: {poCode}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPOForAllot(null)}
                  className="text-gray-400 hover:text-gray-700 p-1.5 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleAllotSubmit} className="space-y-4 py-3 overflow-y-auto pr-1 flex-1">
                {allotError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-bold flex items-center gap-2">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    <span>{allotError}</span>
                  </div>
                )}

                {/* Consignment Request Overview */}
                <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 via-gray-50/50 to-white border border-emerald-200/80 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">
                      Consignment Specifications
                    </span>
                    <strong className="text-gray-900 font-mono">₹{fin.baseCost.toLocaleString('en-IN')}</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-500 block">Vendor Partner:</span>
                      <strong className="text-gray-900 block truncate">{vName} ({vCode})</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Commodity &amp; Volume:</span>
                      <strong className="text-emerald-900 block truncate">{commodity} · {fin.totalQty} {fin.unit}s</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Farm Origin (Starting Point):</span>
                      <strong className="text-gray-900 block truncate flex items-center gap-1">
                        <MapPin size={11} className="text-amber-600" /> {originFarm}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Destination Regional Hub:</span>
                      <strong className="text-emerald-900 block truncate flex items-center gap-1">
                        <Building2 size={11} className="text-emerald-700" /> {destinationHub}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Field 1: Vehicle Registration Number */}
                <div>
                  <label className="block text-xs text-gray-800 font-bold mb-1">
                    Vehicle Registration Number *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400">
                      <Truck size={14} />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TS09UB4521 / JK01AB9876"
                      value={allotVehicleNumber}
                      onChange={(e) => setAllotVehicleNumber(e.target.value.toUpperCase())}
                      className="w-full h-9 pl-9 pr-3 uppercase border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E] focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-1">
                    Enter the authorized cold-chain reefer truck registration plate allotted to this consignment.
                  </span>
                </div>

                {/* Field 2: Transporter / Fleet Agency Name */}
                <div>
                  <label className="block text-xs text-gray-800 font-bold mb-1">
                    Transporter / Fleet Agency Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SAFAL Cold-Chain Express / New Golden Roadways"
                    value={allotTransporter}
                    onChange={(e) => setAllotTransporter(e.target.value)}
                    className="w-full h-9 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                  />
                </div>

                {/* Field 3: Driver Contact Phone */}
                <div>
                  <label className="block text-xs text-gray-800 font-bold mb-1">
                    Driver Contact Phone Number *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400">
                      <Phone size={14} />
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9848012345"
                      value={allotDriverPhone}
                      onChange={(e) => setAllotDriverPhone(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white focus:outline-none focus:border-[#087A3E]"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-1">
                    Vendor will receive driver phone number for farm loading coordination.
                  </span>
                </div>

                {/* Field 4: Transporter Bilty (LR) / Gate Pass Upload */}
                <div>
                  <label className="block text-xs text-gray-800 font-bold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileText size={13} className="text-blue-700" />
                      <span>Upload Transporter Bilty (LR) / Consignment Note *</span>
                    </span>
                    <span className="text-[10px] text-blue-700 font-bold">
                      {allotBiltyFile || allotBiltyPreview ? 'Bilty Attached ✓' : 'Required for Approval'}
                    </span>
                  </label>

                  <div className={`p-3 rounded-xl border transition ${
                    allotBiltyFile || allotBiltyPreview
                      ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-200'
                      : 'bg-gray-50 border-gray-300 border-dashed'
                  }`}>
                    {allotBiltyFile || allotBiltyPreview ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center flex-shrink-0">
                            <FileText size={16} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-gray-900 block truncate">
                              {allotBiltyFile ? allotBiltyFile.name : 'Transporter Bilty Document'}
                            </span>
                            <span className="text-[10px] text-emerald-700 font-bold block">
                              Ready for dispatch authorization
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {allotBiltyPreview && (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ url: allotBiltyPreview, title: `${poCode} - Transporter Bilty` })}
                              className="px-2 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-[10px] font-bold transition shadow-xs cursor-pointer"
                            >
                              Preview
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setAllotBiltyFile(null);
                              setAllotBiltyPreview('');
                            }}
                            className="px-2 py-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-bold transition shadow-xs cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          id="admin-bilty-file-input"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setAllotBiltyFile(file);
                              const reader = new FileReader();
                              reader.onload = (ev) => setAllotBiltyPreview(ev.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                        <label
                          htmlFor="admin-bilty-file-input"
                          className="flex flex-col items-center justify-center py-2 cursor-pointer text-center"
                        >
                          <Upload size={20} className="text-blue-600 mb-1" />
                          <span className="text-xs font-bold text-gray-800">
                            Click to Upload Signed Transporter Bilty / LR Slip *
                          </span>
                          <span className="text-[10px] text-gray-400 mt-0.5">
                            Supports PNG, JPG, or PDF scanned document (Max 10MB)
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Field 5: Optional Notes / Gate Pass Instructions */}
                <div>
                  <label className="block text-xs text-gray-800 font-bold mb-1">
                    Allotment Notes &amp; Loading Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Driver dispatched to Shopian Farm Gate 1. Temperature set to +2.5°C pre-cooled."
                    value={allotNotes}
                    onChange={(e) => setAllotNotes(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-800 bg-white focus:outline-none focus:border-[#087A3E]"
                  />
                </div>

                {/* Notice */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-[11px] leading-relaxed">
                  <span className="font-bold block mb-0.5">Workflow Progression Notice:</span>
                  Confirming this allotment will mark PO <strong>{poCode}</strong> as approved and assign vehicle <strong>{allotVehicleNumber || 'TS09UB4521'}</strong>. The vendor partner will be immediately notified and the loading proof submission and digital signature will be unlocked.
                </div>

                {/* Modal Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedPOForAllot(null)}
                    className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAllot}
                    className="px-5 py-2.5 rounded-xl bg-[#064D2B] hover:bg-[#087A3E] text-white font-black text-xs shadow-md transition inline-flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Truck size={15} className="text-emerald-300" />
                    <span>{isSubmittingAllot ? 'Allotting Vehicle & Notifying Vendor...' : 'Confirm Allotment & Dispatch Vehicle'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* CAMERA CAPTURE MODAL */}
      {activeCameraTarget && (
        <VendorPhotoCaptureModal
          isOpen={true}
          onClose={() => setActiveCameraTarget(null)}
          title={
            activeCameraTarget === 'advance'
              ? 'Capture Bank Advance Payment Receipt'
              : 'Capture Final Mandi Settlement Receipt'
          }
          documentType={
            activeCameraTarget === 'advance'
              ? 'Bank Advance Receipt'
              : 'Final Settlement Slip'
          }
          poNumber={
            activeCameraTarget === 'advance'
              ? selectedPOForAdvance?.poNumber
              : selectedPOForSettlement?.poNumber
          }
          onCapture={(file, previewUrl) => {
            if (activeCameraTarget === 'advance') {
              setAdvanceProofFile(file);
              setAdvanceProofPreview(previewUrl);
            } else {
              setSettlementProofFile(file);
              setSettlementProofPreview(previewUrl);
            }
            setActiveCameraTarget(null);
          }}
        />
      )}

      {/* Hidden file inputs for admin uploads */}
      <input
        ref={advanceFileInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setAdvanceProofFile(file);
            setAdvanceProofPreview(URL.createObjectURL(file));
          }
        }}
      />
      <input
        ref={settlementFileInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setSettlementProofFile(file);
            setSettlementProofPreview(URL.createObjectURL(file));
          }
        }}
      />
    </div>
  );
};
