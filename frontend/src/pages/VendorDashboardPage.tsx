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
  Edit3,
  Pencil,
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  Layers,
  Package,
  Camera,
  ReceiptText,
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'dispatch' | 'qc' | 'kyc'>('dashboard');
  const [viewSlipModalUrl, setViewSlipModalUrl] = useState<string | null>(null);

  // Weighbridge & QC Slip Entry Modal State
  const [showRecordQCModal, setShowRecordQCModal] = useState(false);
  const [qcSelectedPOId, setQcSelectedPOId] = useState<string>('');
  const [qcGrossKg, setQcGrossKg] = useState<string>('24500');
  const [qcTareKg, setQcTareKg] = useState<string>('10200');
  const [qcStatus, setQcStatus] = useState<string>('PASSED');
  const [qcGradeA, setQcGradeA] = useState<string>('96');
  const [qcGradeB, setQcGradeB] = useState<string>('4');
  const [qcWastage, setQcWastage] = useState<string>('150');
  const [qcInspector, setQcInspector] = useState<string>('Mandi Scale Officer / QC Incharge');
  const [qcRemarks, setQcRemarks] = useState<string>('Electronic tare verified. Grade A quality approved for cold storage.');
  const [qcSlipFile, setQcSlipFile] = useState<File | null>(null);
  const [qcSlipPreview, setQcSlipPreview] = useState<string>('');
  const [isSubmittingQC, setIsSubmittingQC] = useState(false);
  const [qcError, setQcError] = useState('');

  // Selected KPI Card Modal State for In-depth Insights & Quick Navigation
  const [selectedKpiModal, setSelectedKpiModal] = useState<'orders' | 'advance' | 'due' | 'volume' | 'transit' | 'qc' | null>(null);

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

  // Selected Fruit & Commodity States
  const [selectedFruit, setSelectedFruit] = useState<string>('Kashmir Apples');

  // 1. Kashmir Apples Layer Breakdown (4L, 5L, Roll, Total, Amount)
  const [layer4LBoxes, setLayer4LBoxes] = useState<string>('200');
  const [layer4LRate, setLayer4LRate] = useState<string>('1200');
  const [layer5LBoxes, setLayer5LBoxes] = useState<string>('250');
  const [layer5LRate, setLayer5LRate] = useState<string>('1100');
  const [rollBoxes, setRollBoxes] = useState<string>('50');
  const [rollRate, setRollRate] = useState<string>('700');

  // 2. Pomegranate (No. Of boxes, Total amount)
  const [pomegranateBoxes, setPomegranateBoxes] = useState<string>('300');
  const [pomegranateRate, setPomegranateRate] = useState<string>('950');

  // 3. Watermelon (Total weight in Ton/Kg, Total amount)
  const [watermelonWeight, setWatermelonWeight] = useState<string>('15');
  const [watermelonUnit, setWatermelonUnit] = useState<'TON' | 'KG'>('TON');
  const [watermelonRate, setWatermelonRate] = useState<string>('14000');

  // 4. Muskmelon (Total weight in Ton/Kg, Total amount)
  const [muskmelonWeight, setMuskmelonWeight] = useState<string>('8');
  const [muskmelonUnit, setMuskmelonUnit] = useState<'TON' | 'KG'>('TON');
  const [muskmelonRate, setMuskmelonRate] = useState<string>('18000');

  // 5. Banana (Total boxes, Total amount)
  const [bananaBoxes, setBananaBoxes] = useState<string>('400');
  const [bananaRate, setBananaRate] = useState<string>('550');

  // 6. Orange (Total box, Counts 36/42/45/54/60/72/74/90/105, Total amount)
  const ORANGE_COUNTS = ['36', '42', '45', '54', '60', '72', '74', '90', '105'] as const;
  const [orangeCount, setOrangeCount] = useState<string>('54');
  const [orangeBoxes, setOrangeBoxes] = useState<string>('350');
  const [orangeRate, setOrangeRate] = useState<string>('780');

  // 7. Plum (Total box, Total amount)
  const [plumBoxes, setPlumBoxes] = useState<string>('200');
  const [plumRate, setPlumRate] = useState<string>('850');

  // Other Fruit Sizing Fallback
  const [otherQuantity, setOtherQuantity] = useState<string>('500');
  const [otherUnit, setOtherUnit] = useState<string>('BOX');
  const [otherRate, setOtherRate] = useState<string>('950');
  const [otherGrade, setOtherGrade] = useState<string>('Grade A Export Quality');

  // Profile Edit State
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editBusinessName, setEditBusinessName] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPrimaryLocation, setEditPrimaryLocation] = useState('Warangal');
  const [editBankAccountNumber, setEditBankAccountNumber] = useState('');
  const [editBankIfscCode, setEditBankIfscCode] = useState('');
  const [editBankAccountHolder, setEditBankAccountHolder] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editBankBranch, setEditBankBranch] = useState('');
  const [editPanNumber, setEditPanNumber] = useState('');
  const [editAadharNumber, setEditAadharNumber] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState('');

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
  const isPomegranate = selectedFruit === 'Pomegranate';
  const isWatermelon = selectedFruit === 'Watermelon';
  const isMuskmelon = selectedFruit === 'Muskmelon';
  const isBanana = selectedFruit === 'Banana';
  const isOrange = selectedFruit === 'Orange';
  const isPlum = selectedFruit === 'Plum';

  const apple4LAmount = (Number(layer4LBoxes) || 0) * (Number(layer4LRate) || 0);
  const apple5LAmount = (Number(layer5LBoxes) || 0) * (Number(layer5LRate) || 0);
  const appleRollAmount = (Number(rollBoxes) || 0) * (Number(rollRate) || 0);
  const totalAppleBoxes = (Number(layer4LBoxes) || 0) + (Number(layer5LBoxes) || 0) + (Number(rollBoxes) || 0);
  const totalAppleAmount = apple4LAmount + apple5LAmount + appleRollAmount;

  const pomegranateTotalAmount = (Number(pomegranateBoxes) || 0) * (Number(pomegranateRate) || 0);
  const watermelonTotalAmount = (Number(watermelonWeight) || 0) * (Number(watermelonRate) || 0);
  const muskmelonTotalAmount = (Number(muskmelonWeight) || 0) * (Number(muskmelonRate) || 0);
  const bananaTotalAmount = (Number(bananaBoxes) || 0) * (Number(bananaRate) || 0);
  const orangeTotalAmount = (Number(orangeBoxes) || 0) * (Number(orangeRate) || 0);
  const plumTotalAmount = (Number(plumBoxes) || 0) * (Number(plumRate) || 0);
  const otherTotalAmount = (Number(otherQuantity) || 0) * (Number(otherRate) || 0);

  const grandSupplyTotal = isApple
    ? totalAppleAmount
    : isPomegranate
    ? pomegranateTotalAmount
    : isWatermelon
    ? watermelonTotalAmount
    : isMuskmelon
    ? muskmelonTotalAmount
    : isBanana
    ? bananaTotalAmount
    : isOrange
    ? orangeTotalAmount
    : isPlum
    ? plumTotalAmount
    : otherTotalAmount;

  const autoAdvanceAmount = Math.round(grandSupplyTotal * 0.55);
  const pendingBalanceAmount = Math.max(0, grandSupplyTotal - autoAdvanceAmount);

  const qcNetKg = Math.max(0, (Number(qcGrossKg) || 0) - (Number(qcTareKg) || 0));

  // Compute Fruit Commodity Breakdown for Donut Chart
  const fruitBreakdown = React.useMemo(() => {
    if (orders.length === 0) {
      return [];
    }

    const map: Record<string, { count: number; boxes: number; amount: number; color: string }> = {
      'Kashmir Apples': { count: 0, boxes: 0, amount: 0, color: '#DC2626' },
      'Pomegranate': { count: 0, boxes: 0, amount: 0, color: '#E11D48' },
      'Watermelon': { count: 0, boxes: 0, amount: 0, color: '#059669' },
      'Muskmelon': { count: 0, boxes: 0, amount: 0, color: '#D97706' },
      'Banana': { count: 0, boxes: 0, amount: 0, color: '#EAB308' },
      'Orange': { count: 0, boxes: 0, amount: 0, color: '#F97316' },
      'Plum': { count: 0, boxes: 0, amount: 0, color: '#9333EA' },
    };

    orders.forEach((po) => {
      const poFruit = po.fruitName || 'Kashmir Apples';
      let matchedKey = 'Kashmir Apples';
      if (poFruit.toLowerCase().includes('apple')) matchedKey = 'Kashmir Apples';
      else if (poFruit.toLowerCase().includes('pomegranate')) matchedKey = 'Pomegranate';
      else if (poFruit.toLowerCase().includes('watermelon')) matchedKey = 'Watermelon';
      else if (poFruit.toLowerCase().includes('muskmelon')) matchedKey = 'Muskmelon';
      else if (poFruit.toLowerCase().includes('banana')) matchedKey = 'Banana';
      else if (poFruit.toLowerCase().includes('orange')) matchedKey = 'Orange';
      else if (poFruit.toLowerCase().includes('plum')) matchedKey = 'Plum';

      const boxes = po.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
      const amount = Number(po.grandTotal || po.totalAmount || 0);

      map[matchedKey].count += 1;
      map[matchedKey].boxes += boxes;
      map[matchedKey].amount += amount;
    });

    const active = Object.entries(map).filter(([_, v]) => v.amount > 0 || v.boxes > 0);
    if (active.length === 0) {
      return [];
    }

    const totalAmt = active.reduce((sum, [_, v]) => sum + v.amount, 0) || 1;
    return active.map(([k, v]) => ({
      fruit: k,
      boxes: v.boxes,
      amount: v.amount,
      percent: Math.round((v.amount / totalAmt) * 100) || 1,
      color: v.color,
    }));
  }, [orders]);

  // Compute Total Volume in Boxes
  const totalVolumeBoxes = React.useMemo(() => {
    return orders.reduce((sum, po) => {
      const poBoxes = po.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0;
      return sum + poBoxes;
    }, 0);
  }, [orders]);

  // Compute Bar Chart Data (Comparison of Consignments / Orders)
  const barChartData = React.useMemo(() => {
    if (orders.length === 0) {
      return [];
    }
    return orders.slice(0, 3).map((po, idx) => {
      const total = Number(po.grandTotal || po.totalAmount || po.totalOrderValue || 0);
      const adv = Number(po.advancePaymentAmount || po.advancePaid || po.advanceAmount || Math.round(total * 0.55));
      const due = Number(po.pendingPaymentAmount || po.balanceDue || po.pendingAmount || Math.max(0, total - adv));
      const shortCode = po.poNumber ? po.poNumber.split('/').pop() || `PO #${idx + 1}` : `PO #${idx + 1}`;
      return {
        label: shortCode,
        sublabel: po.orderPersonPlace ? `${po.orderPersonPlace} Hub` : 'Regional Hub',
        total,
        advance: adv,
        due,
      };
    });
  }, [orders]);

  // Synchronize activeTab when navigation changes from the left sidebar
  useEffect(() => {
    if (activePage === 'Dashboard') {
      setActiveTab('dashboard');
    } else if (activePage === 'Weighbridge & QC Slips') {
      setActiveTab('qc');
    } else if (activePage === 'Ready for Dispatch') {
      setActiveTab('dispatch');
    } else if (activePage === 'Supply Consignments') {
      setActiveTab('orders');
    } else if (activePage === 'Profile' || activePage === 'Vendor Profile') {
      setActiveTab('kyc');
    }
  }, [activePage]);

  // Load Admin-Fixed Fruit Procurement Rates from application settings
  useEffect(() => {
    const fetchAdminRates = async () => {
      try {
        const settings = await api.getSettings();
        if (settings && settings.fruitProcurementRates) {
          const r = settings.fruitProcurementRates;
          if (r.apples) {
            if (r.apples.layer4L) setLayer4LRate(String(r.apples.layer4L));
            if (r.apples.layer5L) setLayer5LRate(String(r.apples.layer5L));
            if (r.apples.roll) setRollRate(String(r.apples.roll));
          }
          if (r.pomegranate) setPomegranateRate(String(r.pomegranate));
          if (r.watermelon) setWatermelonRate(String(r.watermelon));
          if (r.muskmelon) setMuskmelonRate(String(r.muskmelon));
          if (r.banana) setBananaRate(String(r.banana));
          if (r.orange) setOrangeRate(String(r.orange));
          if (r.plum) setPlumRate(String(r.plum));
        }
      } catch (err) {
        console.warn('Could not load fruit procurement rates from settings:', err);
      }
    };
    fetchAdminRates();
  }, []);

  // Global Escape key listener to close any open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCreatePOModal(false);
        setSelectedPOForDispatch(null);
        setViewSlipModalUrl(null);
        setPreviewMediaModal(null);
        setShowEditProfileModal(false);
        setShowRecordQCModal(false);
        setSelectedKpiModal(null);
      }
    };
    if (showCreatePOModal || selectedPOForDispatch || viewSlipModalUrl || previewMediaModal || showEditProfileModal || showRecordQCModal || selectedKpiModal) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [showCreatePOModal, selectedPOForDispatch, viewSlipModalUrl, previewMediaModal, showEditProfileModal, showRecordQCModal, selectedKpiModal]);

  const handleTabClick = (tab: 'dashboard' | 'orders' | 'dispatch' | 'qc' | 'kyc') => {
    setActiveTab(tab);
    if (onNavigate) {
      if (tab === 'dashboard') {
        onNavigate('Dashboard');
      } else if (tab === 'qc') {
        onNavigate('Weighbridge & QC Slips');
      } else if (tab === 'dispatch') {
        onNavigate('Ready for Dispatch');
      } else if (tab === 'orders') {
        onNavigate('Supply Consignments');
      } else if (tab === 'kyc') {
        onNavigate('Profile');
      } else {
        onNavigate('Dashboard');
      }
    }
  };

  const openRecordQCModal = (poIdOrOrder?: string | any) => {
    if (typeof poIdOrOrder === 'string') {
      setQcSelectedPOId(poIdOrOrder);
    } else if (poIdOrOrder && poIdOrOrder.id) {
      setQcSelectedPOId(poIdOrOrder.id);
    } else if (orders.length > 0) {
      const unweighed = orders.find((o) => !o.weighbridgeNetKg);
      setQcSelectedPOId(unweighed ? unweighed.id : orders[0].id);
    }
    setQcError('');
    setShowRecordQCModal(true);
  };

  const handleQCSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQcSlipFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setQcSlipPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setQcSlipPreview('');
      }
    }
  };

  const handleSubmitQCRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcSelectedPOId) {
      setQcError('Please select a consignment PO.');
      return;
    }
    if ((Number(qcGrossKg) || 0) <= 0 || (Number(qcTareKg) || 0) <= 0) {
      setQcError('Please enter valid Gross and Tare scale weights in KG.');
      return;
    }
    if (qcNetKg <= 0) {
      setQcError('Gross weight must exceed empty Tare weight.');
      return;
    }

    try {
      setIsSubmittingQC(true);
      setQcError('');
      const formData = new FormData();
      formData.append('weighbridgeGrossKg', qcGrossKg);
      formData.append('weighbridgeTareKg', qcTareKg);
      formData.append('qcInspectionStatus', qcStatus);
      if (qcGradeA) formData.append('qcGradeARatio', qcGradeA);
      if (qcGradeB) formData.append('qcGradeBRatio', qcGradeB);
      if (qcWastage) formData.append('qcWastageKg', qcWastage);
      if (qcInspector) formData.append('qcInspectorName', qcInspector);
      if (qcRemarks) formData.append('qcInspectionRemarks', qcRemarks);
      if (qcSlipFile) formData.append('weighbridgeSlip', qcSlipFile);

      const res = await api.submitHubQCInspection(qcSelectedPOId, formData);
      setShowRecordQCModal(false);
      onNotify(res.message || 'Weighbridge Scale Slip & QC Grading recorded successfully!');
      setQcSlipFile(null);
      setQcSlipPreview('');
      await loadData();
      setActiveTab('qc');
    } catch (err: any) {
      setQcError(err.message || 'Failed to record weighbridge inspection');
    } finally {
      setIsSubmittingQC(false);
    }
  };

  const openEditProfileModal = () => {
    if (vendorProfile) {
      setEditBusinessName(vendorProfile.businessName || '');
      setEditContactPerson(vendorProfile.contactPerson || '');
      setEditPhone(vendorProfile.phone || '');
      setEditEmail(vendorProfile.email || '');
      setEditPrimaryLocation(vendorProfile.primaryLocation || 'Warangal');
      setEditBankAccountNumber(vendorProfile.bankAccountNumber || '');
      setEditBankIfscCode(vendorProfile.bankIfscCode || '');
      setEditBankAccountHolder(vendorProfile.bankAccountHolder || vendorProfile.businessName || '');
      setEditBankName(vendorProfile.bankName || '');
      setEditBankBranch(vendorProfile.bankBranch || '');
      setEditPanNumber(vendorProfile.panNumber || '');
      setEditAadharNumber(vendorProfile.aadharNumber || '');
    }
    setProfileUpdateError('');
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileUpdateError('');
    if (!editBusinessName.trim()) {
      setProfileUpdateError('Business Name is required');
      return;
    }
    if (!editContactPerson.trim()) {
      setProfileUpdateError('Contact Person Name is required');
      return;
    }
    if (!editPhone.trim()) {
      setProfileUpdateError('Phone Number is required');
      return;
    }
    try {
      setIsUpdatingProfile(true);
      const res = await api.updateVendorProfile({
        businessName: editBusinessName.trim(),
        contactPerson: editContactPerson.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        primaryLocation: editPrimaryLocation,
        bankAccountNumber: editBankAccountNumber.trim(),
        bankIfscCode: editBankIfscCode.trim(),
        bankAccountHolder: editBankAccountHolder.trim(),
        bankName: editBankName.trim(),
        bankBranch: editBankBranch.trim(),
        panNumber: editPanNumber.trim(),
        aadharNumber: editAadharNumber.trim(),
      });
      setShowEditProfileModal(false);
      onNotify(res.message || 'Vendor Profile updated successfully!');
      await loadData();
    } catch (err: any) {
      setProfileUpdateError(err.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
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
    } else if (fruit === 'Pomegranate') {
      if (!pomegranateBoxes) setPomegranateBoxes('300');
      if (!pomegranateRate) setPomegranateRate('950');
    } else if (fruit === 'Watermelon') {
      if (!watermelonWeight) setWatermelonWeight('15');
      if (!watermelonRate) setWatermelonRate('14000');
    } else if (fruit === 'Muskmelon') {
      if (!muskmelonWeight) setMuskmelonWeight('8');
      if (!muskmelonRate) setMuskmelonRate('18000');
    } else if (fruit === 'Banana') {
      if (!bananaBoxes) setBananaBoxes('400');
      if (!bananaRate) setBananaRate('550');
    } else if (fruit === 'Orange') {
      if (!orangeBoxes) setOrangeBoxes('350');
      if (!orangeRate) setOrangeRate('780');
      if (!orangeCount) setOrangeCount('54');
    } else if (fruit === 'Plum') {
      if (!plumBoxes) setPlumBoxes('200');
      if (!plumRate) setPlumRate('850');
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
      } else if (isPomegranate) {
        const items = [
          {
            fruitName: 'Pomegranate',
            category: 'Fresh Fruits',
            varietyGrade: 'Wholesale Mandi Crates',
            quantity: Number(pomegranateBoxes) || 0,
            unit: 'BOX',
            ratePerUnit: Number(pomegranateRate) || 0,
            lineTotal: pomegranateTotalAmount,
          },
        ];
        formData.append('items', JSON.stringify(items));
      } else if (isWatermelon) {
        const items = [
          {
            fruitName: 'Watermelon',
            category: 'Fresh Fruits',
            varietyGrade: 'Farm Harvest Bulk Weighment',
            quantity: Number(watermelonWeight) || 0,
            unit: watermelonUnit,
            ratePerUnit: Number(watermelonRate) || 0,
            lineTotal: watermelonTotalAmount,
          },
        ];
        formData.append('items', JSON.stringify(items));
      } else if (isMuskmelon) {
        const items = [
          {
            fruitName: 'Muskmelon',
            category: 'Fresh Fruits',
            varietyGrade: 'Fresh Sweet Melon Bulk Load',
            quantity: Number(muskmelonWeight) || 0,
            unit: muskmelonUnit,
            ratePerUnit: Number(muskmelonRate) || 0,
            lineTotal: muskmelonTotalAmount,
          },
        ];
        formData.append('items', JSON.stringify(items));
      } else if (isBanana) {
        const items = [
          {
            fruitName: 'Banana',
            category: 'Fresh Fruits',
            varietyGrade: 'Green Cavendish Wholesale Crates',
            quantity: Number(bananaBoxes) || 0,
            unit: 'BOX',
            ratePerUnit: Number(bananaRate) || 0,
            lineTotal: bananaTotalAmount,
          },
        ];
        formData.append('items', JSON.stringify(items));
      } else if (isOrange) {
        const items = [
          {
            fruitName: 'Orange',
            category: 'Fresh Fruits',
            varietyGrade: `Count ${orangeCount} Caliber Grade`,
            quantity: Number(orangeBoxes) || 0,
            unit: 'BOX',
            ratePerUnit: Number(orangeRate) || 0,
            lineTotal: orangeTotalAmount,
          },
        ];
        formData.append('items', JSON.stringify(items));
      } else if (isPlum) {
        const items = [
          {
            fruitName: 'Plum',
            category: 'Fresh Fruits',
            varietyGrade: 'Wholesale Farm Packed Boxes',
            quantity: Number(plumBoxes) || 0,
            unit: 'BOX',
            ratePerUnit: Number(plumRate) || 0,
            lineTotal: plumTotalAmount,
          },
        ];
        formData.append('items', JSON.stringify(items));
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
      onNotify(res.message || 'Consignment Supply PO submitted successfully!');

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
              · Authorized Wholesale Vendor Partner · Hub 1 Live
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
              <User size={13} /> Vendor Profile &amp; KYC
            </button>
          </div>
        </div>

        {/* Ambient background watermark icon */}
        <Truck className="absolute -right-6 -bottom-8 text-white/5 w-48 h-48 pointer-events-none" />
      </div>

      {/* 2. Navigation Tab Pills */}
      <div className="bg-white p-2 rounded-2xl border border-[#D5E3D8] shadow-xs flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleTabClick('dashboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-[#064D2B] text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <BarChart3 size={15} /> Dashboard &amp; Analytics
        </button>

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
          <Scale size={15} /> Weighbridge &amp; QC Slips ({orders.filter((o) => o.weighbridgeNetKg || o.dispatchStatus === 'IN_TRANSIT' || o.dispatchStatus === 'LOADED_AND_DISPATCHED' || o.dispatchStatus === 'DELIVERED_AT_HUB').length})
        </button>

        <button
          onClick={() => handleTabClick('kyc')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'kyc'
              ? 'bg-[#064D2B] text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <User size={15} /> Vendor Profile &amp; KYC
        </button>
      </div>

      {/* Compact Stat Cards (Visible on secondary tabs: orders, dispatch, qc, kyc) */}
      {activeTab !== 'dashboard' && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 lg:gap-4">
          {/* Card 1: Total POs */}
          <div
            onClick={() => setSelectedKpiModal('orders')}
            className="stat-card blue flex items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#EEF5FF] border border-[#D4E5FB] hover:border-blue-400 hover:shadow-md cursor-pointer transition-all active:scale-95 group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#DCEBFF] flex items-center justify-center text-[#1564B7] flex-shrink-0">
              <FileText size={20} strokeWidth={2.2} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs font-bold text-gray-700 block truncate">My Total Orders</span>
              <strong className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 font-['Manrope'] block mt-0.5">
                {stats.totalPOs}
              </strong>
              <small className="text-[10px] text-gray-500 hidden sm:block truncate">Procurement contracts · Tap for info</small>
            </div>
          </div>

          {/* Card 2: In-Transit Trucks */}
          <div
            onClick={() => setSelectedKpiModal('transit')}
            className="stat-card green flex items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#EAF8EE] border border-[#CEEED7] hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all active:scale-95 group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#CEF2D8] flex items-center justify-center text-[#15813E] flex-shrink-0">
              <Truck size={20} strokeWidth={2.2} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-900 block truncate">Trucks in Transit</span>
              <strong className="text-xl sm:text-2xl lg:text-3xl font-black text-[#064D2B] font-['Manrope'] block mt-0.5">
                {stats.inTransitPOs}
              </strong>
              <small className="text-[10px] text-emerald-700 hidden sm:block truncate">Dispatched on road · Tap for info</small>
            </div>
          </div>

          {/* Card 3: Total Order Value */}
          <div
            onClick={() => setSelectedKpiModal('orders')}
            className="stat-card gold flex items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#FEF9E6] border border-[#FCEBB5] hover:border-amber-400 hover:shadow-md cursor-pointer transition-all active:scale-95 group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FEEBB0] flex items-center justify-center text-[#B68100] flex-shrink-0">
              <Coins size={20} strokeWidth={2.2} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs font-bold text-gray-800 block truncate">Total Contract Value</span>
              <strong className="text-sm sm:text-base md:text-xl lg:text-2xl font-black text-gray-900 font-['Manrope'] block mt-0.5 truncate">
                ₹{Number(stats.totalOrderValue || 0).toLocaleString('en-IN')}
              </strong>
              <small className="text-[10px] text-gray-500 hidden sm:block truncate">Gross commitments · Tap for info</small>
            </div>
          </div>

          {/* Card 4: Advance Cleared */}
          <div
            onClick={() => setSelectedKpiModal('advance')}
            className="stat-card rose flex items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all active:scale-95 group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#DCFCE7] flex items-center justify-center text-emerald-700 flex-shrink-0">
              <CreditCard size={20} strokeWidth={2.2} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-950 block truncate">Advance Received</span>
              <strong className="text-sm sm:text-base md:text-xl lg:text-2xl font-black text-emerald-800 font-['Manrope'] block mt-0.5 truncate">
                ₹{Number(stats.totalAdvanceReceived || 0).toLocaleString('en-IN')}
              </strong>
              <small className="text-[10px] text-emerald-700 hidden sm:block truncate">Cleared via bank · Tap for info</small>
            </div>
          </div>
        </section>
      )}

      {/* 3. Primary Tab Content: Dashboard Analytics & Operations Command Center */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Executive 6 KPI Cards Grid */}
          <section className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-3.5">
            {/* KPI 1: Total Contract Value */}
            <div
              onClick={() => setSelectedKpiModal('orders')}
              className="p-4 rounded-2xl bg-white border border-[#D5E3D8] shadow-xs flex flex-col justify-between hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Gross Orders</span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-100 transition">
                  <Coins size={16} />
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold text-gray-600 block">Total Contract Value</span>
                <strong className="text-lg sm:text-xl font-black text-gray-900 font-['Manrope'] block mt-0.5">
                  ₹{Number(stats.totalOrderValue || 0).toLocaleString('en-IN')}
                </strong>
                <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                  ✓ {stats.totalPOs || 0} Active PO Contracts
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-emerald-800 font-bold group-hover:text-emerald-950">
                <span>Click for details</span>
                <ArrowRight size={11} className="transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* KPI 2: Advance Collected */}
            <div
              onClick={() => setSelectedKpiModal('advance')}
              className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs flex flex-col justify-between hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black text-emerald-700 tracking-wider">Advance Cleared</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-50 text-[#087A3E] flex items-center justify-center group-hover:bg-emerald-100 transition">
                  <CreditCard size={16} />
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold text-gray-600 block">Bank Advance Received</span>
                <strong className="text-lg sm:text-xl font-black text-[#087A3E] font-['Manrope'] block mt-0.5">
                  ₹{Number(stats.totalAdvanceReceived || 0).toLocaleString('en-IN')}
                </strong>
                <span className="text-[10px] text-emerald-800 font-bold block mt-1">
                  Direct NEFT/RTGS Cleared
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-emerald-800 font-bold group-hover:text-emerald-950">
                <span>Click for details</span>
                <ArrowRight size={11} className="transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* KPI 3: Balance Due */}
            <div
              onClick={() => setSelectedKpiModal('due')}
              className="p-4 rounded-2xl bg-white border border-teal-200 shadow-xs flex flex-col justify-between hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black text-teal-700 tracking-wider">Balance Due</span>
                <span className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-100 transition">
                  <Clock size={16} />
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold text-gray-600 block">Pending Mandi Due</span>
                <strong className="text-lg sm:text-xl font-black text-teal-800 font-['Manrope'] block mt-0.5">
                  ₹{Number(stats.totalPendingBalance || Math.max(0, (stats.totalOrderValue || 0) - (stats.totalAdvanceReceived || 0))).toLocaleString('en-IN')}
                </strong>
                <span className="text-[10px] text-teal-700 font-bold block mt-1">
                  Settled on Mandi Delivery
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-emerald-800 font-bold group-hover:text-emerald-950">
                <span>Click for details</span>
                <ArrowRight size={11} className="transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* KPI 4: Total Volume */}
            <div
              onClick={() => setSelectedKpiModal('volume')}
              className="p-4 rounded-2xl bg-white border border-[#D5E3D8] shadow-xs flex flex-col justify-between hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Volume Supplied</span>
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-100 transition">
                  <ShoppingCart size={16} />
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold text-gray-600 block">Total Fruit Boxes</span>
                <strong className="text-lg sm:text-xl font-black text-gray-900 font-['Manrope'] block mt-0.5">
                  {totalVolumeBoxes.toLocaleString('en-IN')} Boxes
                </strong>
                <span className="text-[10px] text-gray-500 font-bold block mt-1">
                  ~{(totalVolumeBoxes * 0.02).toFixed(1)} MT Net Fruit Weight
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-emerald-800 font-bold group-hover:text-emerald-950">
                <span>Click for details</span>
                <ArrowRight size={11} className="transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* KPI 5: Active Trucks */}
            <div
              onClick={() => setSelectedKpiModal('transit')}
              className="p-4 rounded-2xl bg-white border border-[#D5E3D8] shadow-xs flex flex-col justify-between hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Transit Fleet</span>
                <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition">
                  <Truck size={16} />
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold text-gray-600 block">Trucks in Transit</span>
                <strong className="text-lg sm:text-xl font-black text-amber-700 font-['Manrope'] block mt-0.5">
                  {stats.inTransitPOs || 0} on Road
                </strong>
                <span className="text-[10px] text-gray-500 font-bold block mt-1">
                  With Transporter Bilty
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-emerald-800 font-bold group-hover:text-emerald-950">
                <span>Click for details</span>
                <ArrowRight size={11} className="transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* KPI 6: Mandi QC Acceptance */}
            <div
              onClick={() => setSelectedKpiModal('qc')}
              className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-xs flex flex-col justify-between hover:border-emerald-500 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider">QC Grade A</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:bg-emerald-200 transition">
                  <ShieldCheck size={16} />
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold text-gray-600 block">Mandi Acceptance</span>
                <strong className="text-lg sm:text-xl font-black text-[#087A3E] font-['Manrope'] block mt-0.5">
                  99.4%
                </strong>
                <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                  Scale &amp; Grade Verified
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-emerald-800 font-bold group-hover:text-emerald-950">
                <span>Click for details</span>
                <ArrowRight size={11} className="transform group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </section>

          {/* Visual Analytics Grid: Donut Chart & Revenue Bar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Chart 1: Fruit Commodity Breakdown Donut Chart (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-[#D5E3D8] shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider block">
                    COMMODITY VOLUME BREAKDOWN
                  </span>
                  <h3 className="text-base font-black text-gray-900 font-['Manrope'] flex items-center gap-2 mt-0.5">
                    <PieChart size={18} className="text-[#087A3E]" /> Fruit Variety Distribution
                  </h3>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200">
                  7 Allowed Varieties
                </span>
              </div>

              {/* SVG Donut Chart */}
              {fruitBreakdown.length === 0 ? (
                <div className="py-14 text-center text-gray-400">
                  <PieChart size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="font-bold text-gray-700 text-sm">No commodity consignments recorded</p>
                  <p className="text-xs text-gray-400 mt-1">Dispatched fruit variety volume breakdown will appear here.</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-5 justify-center py-2">
                  <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex-shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 320 320" className="w-full h-full transform -rotate-90">
                      {(() => {
                        const radius = 90;
                        const circumference = 2 * Math.PI * radius; // ~565.48
                        let accumulatedPercent = 0;
                        return fruitBreakdown.map((item, idx) => {
                          const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
                          const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                          accumulatedPercent += item.percent;
                          return (
                            <circle
                              key={idx}
                              cx="160"
                              cy="160"
                              r={radius}
                              fill="transparent"
                              stroke={item.color}
                              strokeWidth="36"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-500 hover:opacity-85 cursor-pointer"
                            />
                          );
                        });
                      })()}
                    </svg>
                    {/* Center Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider block">Total Volume</span>
                      <strong className="text-xl font-black text-gray-900 font-['Manrope'] block">
                        {totalVolumeBoxes.toLocaleString('en-IN')}
                      </strong>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-0.5">
                        Boxes Supplied
                      </span>
                    </div>
                  </div>

                  {/* Donut Legend */}
                  <div className="flex-1 w-full space-y-2 text-xs">
                    {fruitBreakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-gray-50/80 hover:bg-emerald-50/50 border border-gray-200/60 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-bold text-gray-800 truncate">{item.fruit}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 text-right">
                          <span className="text-[11px] font-bold text-gray-600">{item.boxes.toLocaleString('en-IN')} Bx</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-white border border-gray-200 text-gray-700">
                            {item.percent}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chart 2: Revenue & Payouts Bar Chart (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#D5E3D8] shadow-sm p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div>
                  <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider block">
                    REVENUE &amp; DISBURSEMENT FLOW
                  </span>
                  <h3 className="text-base font-black text-gray-900 font-['Manrope'] flex items-center gap-2 mt-0.5">
                    <BarChart3 size={18} className="text-[#087A3E]" /> Consignment Payout Analytics
                  </h3>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#087A3E]" />
                    <span className="text-[11px] font-bold text-gray-700">Total Value</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-teal-500" />
                    <span className="text-[11px] font-bold text-gray-700">Advance Paid</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-amber-500" />
                    <span className="text-[11px] font-bold text-gray-700">Balance Due</span>
                  </div>
                </div>
              </div>

              {/* SVG Bar Chart */}
              {barChartData.length === 0 ? (
                <div className="py-14 text-center text-gray-400">
                  <BarChart3 size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="font-bold text-gray-700 text-sm">No consignment payouts to compare</p>
                  <p className="text-xs text-gray-400 mt-1">PO total value, 55% advance, and balance due metrics will plot here.</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto pt-2">
                  <svg viewBox="0 0 520 220" className="w-full h-56 select-none font-sans">
                    {/* Grid Lines */}
                    <line x1="45" y1="20" x2="505" y2="20" stroke="#F3F4F6" strokeDasharray="3 3" />
                    <line x1="45" y1="70" x2="505" y2="70" stroke="#F3F4F6" strokeDasharray="3 3" />
                    <line x1="45" y1="120" x2="505" y2="120" stroke="#F3F4F6" strokeDasharray="3 3" />
                    <line x1="45" y1="170" x2="505" y2="170" stroke="#D1D5DB" strokeWidth="1.5" />

                    {/* Y-Axis Labels */}
                    <text x="40" y="24" textAnchor="end" fontSize="10" fill="#9CA3AF" fontWeight="600">₹15L</text>
                    <text x="40" y="74" textAnchor="end" fontSize="10" fill="#9CA3AF" fontWeight="600">₹10L</text>
                    <text x="40" y="124" textAnchor="end" fontSize="10" fill="#9CA3AF" fontWeight="600">₹5L</text>
                    <text x="40" y="174" textAnchor="end" fontSize="10" fill="#9CA3AF" fontWeight="600">₹0</text>

                    {/* Bar Groups */}
                    {barChartData.map((d, i) => {
                      const baseX = 85 + i * 145;
                      const maxVal = 1600000;
                      const hTotal = Math.min(150, Math.max(12, (d.total / maxVal) * 150));
                      const hAdv = Math.min(150, Math.max(12, (d.advance / maxVal) * 150));
                      const hDue = Math.min(150, Math.max(12, (d.due / maxVal) * 150));

                      return (
                        <g key={i}>
                          {/* Total Bar */}
                          <rect
                            x={baseX}
                            y={170 - hTotal}
                            width="26"
                            height={hTotal}
                            rx="4"
                            fill="#087A3E"
                            className="transition-all hover:opacity-90"
                          />
                          {/* Advance Bar */}
                          <rect
                            x={baseX + 30}
                            y={170 - hAdv}
                            width="26"
                            height={hAdv}
                            rx="4"
                            fill="#14B8A6"
                            className="transition-all hover:opacity-90"
                          />
                          {/* Due Bar */}
                          <rect
                            x={baseX + 60}
                            y={170 - hDue}
                            width="26"
                            height={hDue}
                            rx="4"
                            fill="#F59E0B"
                            className="transition-all hover:opacity-90"
                          />
                          {/* X-axis Label */}
                          <text
                            x={baseX + 43}
                            y="192"
                            textAnchor="middle"
                            fontSize="11"
                            fill="#1F2937"
                            fontWeight="bold"
                          >
                            {d.label}
                          </text>
                          <text
                            x={baseX + 43}
                            y="206"
                            textAnchor="middle"
                            fontSize="9"
                            fill="#6B7280"
                          >
                            {d.sublabel}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Consignment Fulfillment Pipeline & Operational Flow */}
          <div className="bg-white rounded-3xl border border-[#D5E3D8] shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider block">
                  LIFECYCLE FULFILLMENT PIPELINE
                </span>
                <h3 className="text-base font-black text-gray-900 font-['Manrope'] flex items-center gap-2 mt-0.5">
                  <Activity size={18} className="text-[#087A3E]" /> 4-Stage Consignment Fulfillment &amp; Settlement Flow
                </h3>
              </div>
              <span className="text-xs font-bold text-gray-500">Live Status Tracker</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Stage 1 */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-[#087A3E] text-white flex items-center justify-center font-black text-[11px]">
                    1
                  </span>
                  <span className="text-[10px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    100% Completed
                  </span>
                </div>
                <strong className="font-extrabold text-gray-900 block">1. PO Issuance &amp; Confirmation</strong>
                <p className="text-[11px] text-gray-600">
                  Consignment contract authorized with Safal wholesale pricing.
                </p>
              </div>

              {/* Stage 2 */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-black text-[11px]">
                    2
                  </span>
                  <span className="text-[10px] font-black text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
                    Dispatch Active
                  </span>
                </div>
                <strong className="font-extrabold text-gray-900 block">2. Loading &amp; Dispatch Proof</strong>
                <p className="text-[11px] text-gray-600">
                  Vehicle photo and transporter bilty uploaded. Live truck en-route.
                </p>
              </div>

              {/* Stage 3 */}
              <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center font-black text-[11px]">
                    3
                  </span>
                  <span className="text-[10px] font-black text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200">
                    Weighbridge Verified
                  </span>
                </div>
                <strong className="font-extrabold text-gray-900 block">3. Regional Scale Weigh-In</strong>
                <p className="text-[11px] text-gray-600">
                  Electronic mandi gross, tare and net fruit weight verified.
                </p>
              </div>

              {/* Stage 4 */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-full bg-blue-700 text-white flex items-center justify-center font-black text-[11px]">
                    4
                  </span>
                  <span className="text-[10px] font-black text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">
                    Final Settlement
                  </span>
                </div>
                <strong className="font-extrabold text-gray-900 block">4. QC Acceptance &amp; Payout</strong>
                <p className="text-[11px] text-gray-600">
                  Quality grade certified and 45% balance settlement released.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Consignments Dossier Preview */}
          <div className="bg-white rounded-3xl border border-[#D5E3D8] shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/60 via-white to-white">
              <div>
                <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider block">
                  RECENT SUPPLY ACTIVITY
                </span>
                <h3 className="text-base font-black text-gray-900 font-['Manrope']">
                  Active Consignments Overview
                </h3>
              </div>
              <button
                type="button"
                onClick={() => handleTabClick('orders')}
                className="px-4 py-2 rounded-xl bg-[#087A3E] hover:bg-[#064D2B] text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <span>View Full Consignments Desk</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              {orders.slice(0, 3).map((po, idx) => (
                <div key={po.id || idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm font-black text-[#087A3E] font-mono">{po.poNumber}</strong>
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                        <Package size={13} className="text-[#087A3E]" /> {po.fruitName || 'Kashmir Apples'}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-0.5">
                        <MapPin size={11} className="text-gray-400" /> {po.orderPersonPlace || 'Warangal Hub'}
                      </span>
                      {po.dispatchVehicleNumber && (
                        <span className="px-2 py-0.5 rounded bg-gray-100 font-mono text-[10px] font-bold text-gray-700 flex items-center gap-1">
                          <Truck size={10} className="text-gray-500" /> {po.dispatchVehicleNumber}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span>Total Value: <strong className="text-gray-900">₹{Number(po.grandTotal || po.totalAmount || 0).toLocaleString('en-IN')}</strong></span>
                      <span>Advance: <strong className="text-emerald-700">₹{Number(po.advanceAmount || 0).toLocaleString('en-IN')}</strong></span>
                      <span>Balance Due: <strong className="text-amber-700">₹{Number(po.pendingAmount || 0).toLocaleString('en-IN')}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => openRecordQCModal(po.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#087A3E] border border-emerald-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Scale size={13} /> Record Scale Slip
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPOForDispatch(po);
                        setVehicleNumber(po.dispatchVehicleNumber || '');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Truck size={13} /> Dispatch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                                <span>{it.fruitName} ({it.varietyGrade})</span>
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
                  Fruit Supply Consignments
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Direct fruit supply dispatches to SAFAL Regional Hubs.
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
                  <th className="py-3 px-3 text-right font-bold border-r border-[#085A33]">Advance Paid</th>
                  <th className="py-3 px-3 text-right font-bold border-r border-[#085A33]">Balance Due</th>
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
                            <div className="font-extrabold text-gray-900 flex items-center gap-1.5">
                              <Package size={14} className="text-[#087A3E]" />
                              {isAppleConsignment ? 'Kashmir Apples' : (po.fruitName || 'Fresh Fruits')}
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
                              <MapPin size={11} className="text-gray-400" />
                              {po.orderPersonPlace || vendorProfile?.primaryLocation || 'Warangal Hub'}
                            </span>
                          </td>

                          {/* Consignment Value */}
                          <td className="text-right py-3.5 px-3 font-black text-gray-900 border-r border-gray-100 whitespace-nowrap">
                            ₹{total.toLocaleString('en-IN')}
                          </td>

                          {/* Advance Paid */}
                          <td className="text-right py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            <strong className="text-emerald-700 font-black block">₹{advance.toLocaleString('en-IN')}</strong>
                          </td>

                          {/* Balance Due */}
                          <td className="text-right py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            <strong className="text-amber-900 font-black block">₹{balance.toLocaleString('en-IN')}</strong>
                          </td>

                          {/* Logistics & Proof */}
                          <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            {po.dispatchVehicleNumber ? (
                              <div className="space-y-1">
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200 font-black text-[10px] inline-flex items-center gap-1">
                                  <Truck size={10} className="text-blue-700" /> {po.dispatchVehicleNumber}
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
                                      <Camera size={10} className="inline" /> Photo
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
                                      <ReceiptText size={10} className="inline" /> Bilty
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
                                    Total: ₹{total.toLocaleString('en-IN')} (Adv: ₹{advance.toLocaleString('en-IN')} | Due: ₹{balance.toLocaleString('en-IN')})
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

      {/* 6. Tab Content: Vendor Profile & KYC */}
      {activeTab === 'kyc' && (
        <section className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-700" size={24} />
                <h2 className="text-xl font-extrabold text-gray-900">Vendor Profile &amp; Banking Dossier</h2>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Official commercial registration and direct disbursement details registered with Safal Export and Import Pvt Ltd.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black inline-flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-800" />
                <span>Verified Partner</span>
              </span>
              <span className="px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                <Lock size={12} className="text-amber-700" />
                <span>KYC &amp; Bank Coordinates Locked</span>
              </span>
            </div>
          </div>

          {/* Profile Management Notice */}
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Lock className="text-emerald-700 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <strong className="block font-bold text-gray-900">Authorized Vendor Profile &amp; Bank Disbursement Dossier:</strong>
                <span className="text-gray-600">
                  Official commercial registration and direct bank coordinates are permanently locked by Safal Admin. Contact Safal Administrator for any profile or disbursement updates.
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black uppercase flex items-center gap-1 flex-shrink-0 self-start sm:self-auto">
              <ShieldCheck size={12} /> Admin Controlled
            </span>
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
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => openRecordQCModal()}
                className="px-4 py-2 rounded-xl bg-[#087A3E] hover:bg-[#064D2B] text-white text-xs font-black transition shadow-sm inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus size={15} /> + Record Weighbridge &amp; QC Slip
              </button>
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
                    Once your dispatch vehicle reaches the destination regional hub, you or the mandi weighbridge incharge can record the truck weights (Gross &amp; Tare) and upload the official digital scale slip here.
                  </p>
                  <button
                    type="button"
                    onClick={() => openRecordQCModal()}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-[#087A3E] hover:bg-[#064D2B] text-white text-xs font-black transition shadow-md inline-flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus size={16} /> + Enter Weighbridge &amp; QC Scale Slip Now
                  </button>
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
                            <span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-800 text-[11px] font-mono font-bold flex items-center gap-1">
                              <Truck size={12} className="text-gray-600" /> {order.dispatchVehicleNumber}
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
                                Gross Truck Weight (Loaded Vehicle)
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
                                Empty Tare Weight (Unloaded Vehicle)
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
                                Net Fruit Commodity Weight
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
                                    <Eye size={13} /> View Scale Slip
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
                        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-blue-600 flex-shrink-0" />
                            <span>
                              Truck dispatched ({order.dispatchVehicleNumber || 'In Transit'}). Official weighbridge scale gross and empty tare weights pending.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openRecordQCModal(order.id)}
                            className="px-3.5 py-1.5 bg-[#087A3E] hover:bg-[#064D2B] text-white rounded-lg text-xs font-black inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
                          >
                            <Scale size={14} /> + Record Scale Slip for This PO
                          </button>
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

                <label className="w-full h-11 px-3 border-2 border-dashed border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs">
                  <Upload size={15} className="text-emerald-700" />
                  <span className="text-xs font-bold text-emerald-900 truncate">
                    {vehiclePhotoFile ? vehiclePhotoFile.name : 'Choose Vehicle Photo (with number plate)'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    capture="environment"
                    required
                    onChange={handleVehiclePhotoChange}
                    style={{ display: 'none' }}
                    className="hidden"
                  />
                </label>

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

                <label className="w-full h-11 px-3.5 border-2 border-dashed border-blue-400 bg-blue-50/40 hover:bg-blue-50/80 rounded-xl flex items-center justify-center gap-2.5 cursor-pointer transition shadow-2xs group">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 group-hover:bg-blue-700 text-white flex items-center justify-center transition flex-shrink-0">
                    <Upload size={14} />
                  </div>
                  <span className="text-xs font-bold text-blue-900 truncate">
                    {transportBillFile ? transportBillFile.name : 'Choose Transport Bill (Bilty / LR) Image or PDF'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,application/pdf"
                    required
                    onChange={handleTransportBillChange}
                    style={{ display: 'none' }}
                    className="hidden"
                  />
                </label>

                {transportBillPreview && (
                  <div className="mt-2 p-2 bg-white rounded-xl border border-gray-200 inline-block">
                    {transportBillFile?.type === 'application/pdf' ? (
                      <span className="text-xs text-blue-800 font-bold flex items-center gap-1">
                        <FileText size={13} /> PDF Document Attached ({transportBillFile.name})
                      </span>
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
            className="bg-white rounded-3xl max-w-3xl w-full border border-gray-200 shadow-2xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col relative"
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
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      {fruit}
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
                        Apple Mandi Layer Box Grading (4L / 5L / Roll)
                      </span>
                      <p className="text-[11px] text-gray-600">
                        Wholesale apple telescopic cartons (~20-22 Kg/box). Enter box counts.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-lg text-[11px] font-black">
                      Kashmir Apples
                    </span>
                  </div>

                  <div className="rounded-xl border border-emerald-200 bg-white shadow-2xs overflow-hidden">
                    <table className="w-full table-fixed text-xs text-left">
                      <thead>
                        <tr className="bg-[#064D2B] text-white font-black text-[10px] uppercase tracking-wider">
                          <th className="w-[32%] py-2.5 px-3">Layer Grade</th>
                          <th className="w-[22%] py-2.5 px-2 text-center">No. of Boxes</th>
                          <th className="w-[22%] py-2.5 px-2 text-right">Rate (₹)</th>
                          <th className="w-[24%] py-2.5 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-bold">
                        {/* 4L */}
                        <tr className="hover:bg-gray-50/60">
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-gray-900 leading-tight">4L (Large)</div>
                            <span className="text-[10px] text-gray-500 font-medium leading-none block">Premium 4-Layer</span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={layer4LBoxes}
                              onChange={(e) => setLayer4LBoxes(e.target.value)}
                              placeholder="0"
                              className="w-full max-w-[85px] h-8 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-center focus:border-emerald-600 focus:outline-none"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span className="inline-flex items-center justify-end px-2 py-1 bg-gray-100 rounded-lg border border-gray-200 text-gray-800 font-mono font-bold text-xs">
                              ₹{Number(layer4LRate || 1200).toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-800 font-black font-mono">
                            ₹{apple4LAmount.toLocaleString('en-IN')}
                          </td>
                        </tr>

                        {/* 5L */}
                        <tr className="hover:bg-gray-50/60">
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-gray-900 leading-tight">5L (Medium)</div>
                            <span className="text-[10px] text-gray-500 font-medium leading-none block">Standard 5-Layer</span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={layer5LBoxes}
                              onChange={(e) => setLayer5LBoxes(e.target.value)}
                              placeholder="0"
                              className="w-full max-w-[85px] h-8 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-center focus:border-emerald-600 focus:outline-none"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span className="inline-flex items-center justify-end px-2 py-1 bg-gray-100 rounded-lg border border-gray-200 text-gray-800 font-mono font-bold text-xs">
                              ₹{Number(layer5LRate || 1100).toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-800 font-black font-mono">
                            ₹{apple5LAmount.toLocaleString('en-IN')}
                          </td>
                        </tr>

                        {/* Roll */}
                        <tr className="hover:bg-gray-50/60">
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-gray-900 leading-tight">Roll (Running)</div>
                            <span className="text-[10px] text-gray-500 font-medium leading-none block">Mandi Bulk Pack</span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={rollBoxes}
                              onChange={(e) => setRollBoxes(e.target.value)}
                              placeholder="0"
                              className="w-full max-w-[85px] h-8 px-2 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 bg-white text-center focus:border-emerald-600 focus:outline-none"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <span className="inline-flex items-center justify-end px-2 py-1 bg-gray-100 rounded-lg border border-gray-200 text-gray-800 font-mono font-bold text-xs">
                              ₹{Number(rollRate || 700).toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-800 font-black font-mono">
                            ₹{appleRollAmount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-emerald-300 bg-emerald-50/90 font-black">
                          <td className="py-2.5 px-3 text-gray-900 uppercase text-[10px] font-black">
                            Total Consignment
                          </td>
                          <td className="py-2.5 px-2 text-center font-black text-gray-900 text-xs">
                            {totalAppleBoxes.toLocaleString('en-IN')} Boxes
                          </td>
                          <td className="py-2.5 px-2 text-right text-gray-500 font-bold text-[10px]">
                            Mandi Rate
                          </td>
                          <td className="py-2.5 px-3 text-right text-sm sm:text-base font-black text-emerald-800 font-mono">
                            ₹{totalAppleAmount.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Prominent Total Apple Amount Summary Card */}
                  <div className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-xs font-bold text-gray-700 block">Total Apple Amount:</span>
                      <span className="text-[10px] text-gray-500 font-bold">
                        {totalAppleBoxes.toLocaleString('en-IN')} Boxes (4L: {layer4LBoxes || 0}, 5L: {layer5LBoxes || 0}, Roll: {rollBoxes || 0})
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-base sm:text-lg font-black text-emerald-800 block">
                        ₹{totalAppleAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>
              ) : isPomegranate ? (
                /* Pomegranate Consignment Sizing Form (No. of boxes, Total amount) */
                <div className="p-3.5 bg-gradient-to-br from-rose-50/70 via-red-50/30 to-amber-50/30 border border-rose-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-rose-800 tracking-wider block">
                        Pomegranate Consignment Entry
                      </span>
                      <p className="text-[11px] text-gray-600">
                        Standard wholesale pomegranate telescopic boxes / crates.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-900 rounded-lg text-[11px] font-black">
                      Pomegranate
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                        No. of Boxes *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={pomegranateBoxes}
                        onChange={(e) => setPomegranateBoxes(e.target.value)}
                        placeholder="e.g. 300"
                        className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white text-right focus:border-rose-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                        Procurement Rate (₹ / Box)
                      </label>
                      <div className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-gray-50 flex items-center justify-between">
                        <span className="text-gray-500 font-medium text-[11px]">Wholesale Rate</span>
                        <strong className="font-mono text-sm text-gray-900">₹{Number(pomegranateRate || 950).toLocaleString('en-IN')} <span className="text-xs font-normal text-gray-500">/ Box</span></strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-rose-200 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-xs font-bold text-gray-700 block">Total Pomegranate Amount:</span>
                      <span className="text-[10px] text-gray-500">{pomegranateBoxes || 0} Boxes @ ₹{pomegranateRate || 0} / Box</span>
                    </div>
                    <span className="text-base font-black text-rose-800">₹{pomegranateTotalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ) : isWatermelon ? (
                /* Watermelon Consignment Sizing Form (Total weight, Total amount) */
                <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-green-50/40 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-emerald-800 tracking-wider block">
                        Watermelon Harvest Weighment
                      </span>
                      <p className="text-[11px] text-gray-600">
                        Bulk truckload mandi weighbridge harvest.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg text-[11px] font-black">
                      Watermelon
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-700">Billing Weighment Unit:</span>
                    <div className="flex rounded-lg border border-emerald-300 overflow-hidden text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setWatermelonUnit('TON');
                          setWatermelonRate('14000');
                        }}
                        className={`px-3 py-1 cursor-pointer transition ${
                          watermelonUnit === 'TON' ? 'bg-[#064D2B] text-white' : 'bg-white text-emerald-900 hover:bg-emerald-50'
                        }`}
                      >
                        TON (Tons)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setWatermelonUnit('KG');
                          setWatermelonRate('14');
                        }}
                        className={`px-3 py-1 cursor-pointer transition ${
                          watermelonUnit === 'KG' ? 'bg-[#064D2B] text-white' : 'bg-white text-emerald-900 hover:bg-emerald-50'
                        }`}
                      >
                        KG (Kilograms)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                        Total Weight ({watermelonUnit}) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        value={watermelonWeight}
                        onChange={(e) => setWatermelonWeight(e.target.value)}
                        placeholder={`e.g. ${watermelonUnit === 'TON' ? '15' : '15000'}`}
                        className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white text-right focus:border-emerald-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                        Procurement Rate (₹ / {watermelonUnit})
                      </label>
                      <div className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-gray-50 flex items-center justify-between">
                        <span className="text-gray-500 font-medium text-[11px]">Wholesale Rate</span>
                        <strong className="font-mono text-sm text-gray-900">₹{Number(watermelonRate || (watermelonUnit === 'TON' ? 14000 : 14)).toLocaleString('en-IN')} <span className="text-xs font-normal text-gray-500">/ {watermelonUnit}</span></strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-emerald-200 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-xs font-bold text-gray-700 block">Total Watermelon Amount:</span>
                      <span className="text-[10px] text-gray-500">{watermelonWeight || 0} {watermelonUnit} @ ₹{watermelonRate || 0} / {watermelonUnit}</span>
                    </div>
                    <span className="text-base font-black text-emerald-800">₹{watermelonTotalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ) : isMuskmelon ? (
                /* Muskmelon Consignment Sizing Form (Total weight, Total amount) */
                <div className="p-3.5 bg-gradient-to-br from-amber-50/70 via-yellow-50/30 to-emerald-50/30 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-amber-900 tracking-wider block">
                        Muskmelon Loaded Weighment
                      </span>
                      <p className="text-[11px] text-gray-600">
                        Sweet melon farm loaded weighbridge load.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[11px] font-black">
                      Muskmelon
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-gray-700">Billing Weighment Unit:</span>
                    <div className="flex rounded-lg border border-amber-300 overflow-hidden text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => {
                          setMuskmelonUnit('TON');
                          setMuskmelonRate('18000');
                        }}
                        className={`px-3 py-1 cursor-pointer transition ${
                          muskmelonUnit === 'TON' ? 'bg-amber-700 text-white' : 'bg-white text-amber-900 hover:bg-amber-50'
                        }`}
                      >
                        TON (Tons)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMuskmelonUnit('KG');
                          setMuskmelonRate('18');
                        }}
                        className={`px-3 py-1 cursor-pointer transition ${
                          muskmelonUnit === 'KG' ? 'bg-amber-700 text-white' : 'bg-white text-amber-900 hover:bg-amber-50'
                        }`}
                      >
                        KG (Kilograms)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                        Total Weight ({muskmelonUnit}) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0.1"
                        value={muskmelonWeight}
                        onChange={(e) => setMuskmelonWeight(e.target.value)}
                        placeholder={`e.g. ${muskmelonUnit === 'TON' ? '8' : '8000'}`}
                        className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white text-right focus:border-amber-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                        Procurement Rate (₹ / {muskmelonUnit})
                      </label>
                      <div className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-gray-50 flex items-center justify-between">
                        <span className="text-gray-500 font-medium text-[11px]">Wholesale Rate</span>
                        <strong className="font-mono text-sm text-gray-900">₹{Number(muskmelonRate || (muskmelonUnit === 'TON' ? 18000 : 18)).toLocaleString('en-IN')} <span className="text-xs font-normal text-gray-500">/ {muskmelonUnit}</span></strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-amber-200 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-xs font-bold text-gray-700 block">Total Muskmelon Amount:</span>
                      <span className="text-[10px] text-gray-500">{muskmelonWeight || 0} {muskmelonUnit} @ ₹{muskmelonRate || 0} / {muskmelonUnit}</span>
                    </div>
                    <span className="text-base font-black text-amber-900">₹{muskmelonTotalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ) : isBanana ? (
                /* Banana Consignment Sizing Form (Total boxes, Total amount) */
                <div className="p-3.5 bg-gradient-to-br from-yellow-50/70 via-amber-50/30 to-lime-50/40 border border-yellow-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-yellow-900 tracking-wider block">
                        Banana Wholesale Crates
                      </span>
                      <p className="text-[11px] text-gray-600">
                        Green Cavendish / Robusta farm crates.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-yellow-100 text-yellow-900 rounded-lg text-[11px] font-black">
                      Banana
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                        Total Boxes *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={bananaBoxes}
                        onChange={(e) => setBananaBoxes(e.target.value)}
                        placeholder="e.g. 400"
                        className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white text-right focus:border-yellow-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                        Procurement Rate (₹ / Box)
                      </label>
                      <div className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-gray-50 flex items-center justify-between">
                        <span className="text-gray-500 font-medium text-[11px]">Wholesale Rate</span>
                        <strong className="font-mono text-sm text-gray-900">₹{Number(bananaRate || 550).toLocaleString('en-IN')} <span className="text-xs font-normal text-gray-500">/ Box</span></strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-yellow-200 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-xs font-bold text-gray-700 block">Total Banana Amount:</span>
                      <span className="text-[10px] text-gray-500">{bananaBoxes || 0} Boxes @ ₹{bananaRate || 0} / Box</span>
                    </div>
                    <span className="text-base font-black text-yellow-950">₹{bananaTotalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ) : isOrange ? (
                /* Orange Consignment Sizing Form (Total box, Counts 36/42/45/54/60/72/74/90/105, Total amount) */
                <div className="p-3.5 bg-gradient-to-br from-orange-50/70 via-amber-50/30 to-red-50/30 border border-orange-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-orange-900 tracking-wider block">
                        Orange (Citrus) Caliber &amp; Count Grading
                      </span>
                      <p className="text-[11px] text-gray-600">
                        Wholesale citrus caliber count selection.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-orange-100 text-orange-900 rounded-lg text-[11px] font-black">
                      Orange
                    </span>
                  </div>

                  {/* Mandi Caliber Counts Selection Chips */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-orange-950 mb-1.5 flex items-center justify-between">
                      <span>Counts Selection:</span>
                      <span className="text-[10px] text-orange-700 font-bold">Standard 36 - 105 Mandi Calibers</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ORANGE_COUNTS.map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setOrangeCount(cnt)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                            orangeCount === cnt
                              ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-400'
                              : 'bg-white hover:bg-orange-100 text-orange-900 border border-orange-300'
                          }`}
                        >
                          <span>Count {cnt}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                        Total Boxes *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={orangeBoxes}
                        onChange={(e) => setOrangeBoxes(e.target.value)}
                        placeholder="e.g. 350"
                        className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white text-right focus:border-orange-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                        Procurement Rate (₹ / Box)
                      </label>
                      <div className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-gray-50 flex items-center justify-between">
                        <span className="text-gray-500 font-medium text-[11px]">Wholesale Rate</span>
                        <strong className="font-mono text-sm text-gray-900">₹{Number(orangeRate || 780).toLocaleString('en-IN')} <span className="text-xs font-normal text-gray-500">/ Box</span></strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-orange-200 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-xs font-bold text-gray-700 block">
                        Total Orange Amount (Grade: <strong className="text-orange-900">Count {orangeCount}</strong>):
                      </span>
                      <span className="text-[10px] text-gray-500">{orangeBoxes || 0} Boxes (Count {orangeCount}) @ ₹{orangeRate || 0} / Box</span>
                    </div>
                    <span className="text-base font-black text-orange-800">₹{orangeTotalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ) : isPlum ? (
                /* Plum Consignment Sizing Form (Total box, Total amount) */
                <div className="p-3.5 bg-gradient-to-br from-purple-50/70 via-fuchsia-50/30 to-rose-50/30 border border-purple-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-purple-900 tracking-wider block">
                        Plum Consignment Entry
                      </span>
                      <p className="text-[11px] text-gray-600">
                        Fresh farm stone fruit cartons/crates.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-900 rounded-lg text-[11px] font-black">
                      Plum
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                        Total Boxes *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={plumBoxes}
                        onChange={(e) => setPlumBoxes(e.target.value)}
                        placeholder="e.g. 200"
                        className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white text-right focus:border-purple-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                        Procurement Rate (₹ / Box)
                      </label>
                      <div className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-gray-50 flex items-center justify-between">
                        <span className="text-gray-500 font-medium text-[11px]">Wholesale Rate</span>
                        <strong className="font-mono text-sm text-gray-900">₹{Number(plumRate || 850).toLocaleString('en-IN')} <span className="text-xs font-normal text-gray-500">/ Box</span></strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-purple-200 flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-xs font-bold text-gray-700 block">Total Plum Amount:</span>
                      <span className="text-[10px] text-gray-500">{plumBoxes || 0} Boxes @ ₹{plumRate || 0} / Box</span>
                    </div>
                    <span className="text-base font-black text-purple-900">₹{plumTotalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ) : (
                /* Fallback Sizing Form */
                <div className="p-3.5 bg-emerald-50/40 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-emerald-800 tracking-wider block">
                        Fruit Commodity Sizing &amp; Pricing
                      </span>
                      <p className="text-[11px] text-gray-600">
                        Enter dispatch quantity.
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
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                        Rate (₹ / {otherUnit})
                      </label>
                      <div className="w-full h-9 px-2.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 bg-gray-50 flex items-center justify-end">
                        <span className="font-mono text-xs">₹{Number(otherRate || 950).toLocaleString('en-IN')}</span>
                      </div>
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
                  <Truck size={14} className="text-blue-700" /> Dispatch &amp; Logistics Proof Documentation
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
                    <label className="block text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                      <Camera size={13} className="text-emerald-700" />
                      Dispatch Photo (Vehicle &amp; Loaded Cartons)
                    </label>
                    <p className="text-[10px] text-gray-500">
                      Clear photo showing vehicle with loaded fruit boxes and number plate.
                    </p>
                    <label className="w-full h-10 px-3 border-2 border-dashed border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs group">
                      <div className="w-6 h-6 rounded-md bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center transition flex-shrink-0">
                        <Upload size={13} />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-900 truncate">
                        {supplyVehiclePhotoFile ? supplyVehiclePhotoFile.name : 'Choose Vehicle Dispatch Photo'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleSupplyVehiclePhotoChange}
                        style={{ display: 'none' }}
                        className="hidden"
                      />
                    </label>
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
                    <label className="block text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                      <ReceiptText size={13} className="text-blue-700" />
                      Transport Bill Photo (Bilty / LR Receipt)
                    </label>
                    <p className="text-[10px] text-gray-500">
                      Clear photo or PDF receipt from transporter / consignment note.
                    </p>
                    <label className="w-full h-10 px-3 border-2 border-dashed border-blue-400 bg-blue-50/40 hover:bg-blue-50/80 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs group">
                      <div className="w-6 h-6 rounded-md bg-blue-600 group-hover:bg-blue-700 text-white flex items-center justify-center transition flex-shrink-0">
                        <Upload size={13} />
                      </div>
                      <span className="text-[11px] font-bold text-blue-900 truncate">
                        {supplyTransportBillFile ? supplyTransportBillFile.name : 'Choose Bilty / LR Document'}
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={handleSupplyTransportBillChange}
                        style={{ display: 'none' }}
                        className="hidden"
                      />
                    </label>
                    {supplyTransportBillPreview && (
                      <div className="mt-1.5 p-1.5 bg-gray-50 rounded-lg border border-gray-200 inline-block">
                        {supplyTransportBillFile?.type === 'application/pdf' ? (
                          <span className="text-xs text-blue-800 font-bold flex items-center gap-1">
                            <FileText size={12} /> PDF Document ({supplyTransportBillFile.name})
                          </span>
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
                  Digital Weighbridge Scale Slip
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
      {/* 10. Modal: Edit Vendor Profile & Bank Details */}
      {showEditProfileModal && (
        <div
          className="modal-backdrop !z-[9999] fixed inset-0 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditProfileModal(false);
          }}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full border border-gray-200 shadow-2xl p-4 sm:p-6 my-auto max-h-[92vh] flex flex-col relative"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-shrink-0">
              <div>
                <h3 className="text-lg font-black font-['Manrope'] text-gray-900 flex items-center gap-2">
                  <Edit3 size={18} className="text-[#087A3E]" />
                  Update Vendor Profile &amp; Banking Dossier
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Update commercial business name, contact person, primary delivery hub, and bank disbursement details.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 flex items-center justify-center transition cursor-pointer"
                title="Close modal (Esc)"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {profileUpdateError && (
              <div className="p-3 my-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-200 flex-shrink-0">
                {profileUpdateError}
              </div>
            )}

            {/* Edit Form */}
            <form onSubmit={handleSaveProfile} className="overflow-y-auto flex-1 pr-1 py-3 space-y-4 text-xs">
              {/* Commercial Entity Details */}
              <div className="p-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-3">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                  Commercial Identity &amp; Contact Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Business / Trade Name *</label>
                    <input
                      type="text"
                      value={editBusinessName}
                      onChange={(e) => setEditBusinessName(e.target.value)}
                      placeholder="e.g. Ramesh Agro Farms & Cold Storage"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Authorized Contact Person *</label>
                    <input
                      type="text"
                      value={editContactPerson}
                      onChange={(e) => setEditContactPerson(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="e.g. 9848012345"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="e.g. ramesh.agro@safal.in"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-gray-700 font-bold mb-1">Primary Regional Delivery Hub *</label>
                    <select
                      value={editPrimaryLocation}
                      onChange={(e) => setEditPrimaryLocation(e.target.value)}
                      className="w-full h-10 px-3 border border-emerald-300 rounded-xl text-xs font-bold text-gray-900 bg-emerald-50/20 focus:border-emerald-600 focus:outline-none"
                      required
                    >
                      {VENDOR_WHITELISTED_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc} Regional Hub
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      Restricted to Safal 8 official whitelisted AP/Telangana procurement hubs.
                    </span>
                  </div>
                </div>
              </div>

              {/* Disbursement Banking Coordinates */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                <span className="text-[10px] uppercase font-black text-emerald-900 tracking-wider block">
                  Official Disbursement Bank Coordinates (Direct NEFT/RTGS)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Bank Account Number *</label>
                    <input
                      type="text"
                      value={editBankAccountNumber}
                      onChange={(e) => setEditBankAccountNumber(e.target.value)}
                      placeholder="Account Number"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">IFSC Code *</label>
                    <input
                      type="text"
                      value={editBankIfscCode}
                      onChange={(e) => setEditBankIfscCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SBIN0001234"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white uppercase focus:border-emerald-600 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Account Holder Beneficiary Name *</label>
                    <input
                      type="text"
                      value={editBankAccountHolder}
                      onChange={(e) => setEditBankAccountHolder(e.target.value)}
                      placeholder="Beneficiary Name as in Bank"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Bank &amp; Branch Name</label>
                    <input
                      type="text"
                      value={editBankName ? `${editBankName}${editBankBranch ? ` - ${editBankBranch}` : ''}` : ''}
                      onChange={(e) => {
                        const parts = e.target.value.split('-');
                        setEditBankName(parts[0]?.trim() || '');
                        setEditBankBranch(parts[1]?.trim() || '');
                      }}
                      placeholder="e.g. State Bank of India - Warangal Main"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Statutory Tax & Identity */}
              <div className="p-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-3">
                <span className="text-[10px] uppercase font-bold text-gray-800 tracking-wider block">
                  Statutory Tax &amp; Identity Records
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Permanent Account Number (PAN)</label>
                    <input
                      type="text"
                      value={editPanNumber}
                      onChange={(e) => setEditPanNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white uppercase focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Aadhaar Card Number</label>
                    <input
                      type="text"
                      value={editAadharNumber}
                      onChange={(e) => setEditAadharNumber(e.target.value)}
                      placeholder="12-digit Aadhaar"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-6 py-2.5 rounded-xl bg-[#087A3E] hover:bg-[#064D2B] text-white font-extrabold text-xs shadow-md transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingProfile ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Record Weighbridge Scale & Quality Control (QC) Slip */}
      {showRecordQCModal && (
        <div
          className="modal-backdrop !z-[9999] fixed inset-0 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRecordQCModal(false);
          }}
        >
          <div
            className="modal !w-[740px] max-w-[96vw] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden relative"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header pb-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 grid place-items-center">
                  <Scale size={22} />
                </div>
                <div>
                  <span className="eyebrow text-emerald-800 font-black">
                    MANDI ELECTRONIC WEIGHBRIDGE &amp; QC
                  </span>
                  <h2 className="text-lg font-bold text-gray-900">
                    Record Weighbridge Scale &amp; Quality Control Slip
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRecordQCModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 flex items-center justify-center transition cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitQCRecord} className="overflow-y-auto flex-1 pr-1 py-3 space-y-4 text-xs">
              {qcError && (
                <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{qcError}</span>
                </div>
              )}

              {/* Consignment PO Selection */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-1.5">
                <label className="block text-gray-800 font-bold">
                  Select Consignment Purchase Order *
                </label>
                <select
                  value={qcSelectedPOId}
                  onChange={(e) => setQcSelectedPOId(e.target.value)}
                  className="w-full h-11 px-3 border border-emerald-300 rounded-xl text-xs font-mono font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                  required
                >
                  <option value="" disabled>-- Select Purchase Order --</option>
                  {orders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} — {po.orderPersonPlace || 'Regional Hub'} — ₹{Number(po.totalOrderValue || 0).toLocaleString('en-IN')} ({po.dispatchStatus?.replace(/_/g, ' ') || 'Pending'})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-500 block">
                  Select the consignment PO arriving at the destination regional hub yard.
                </span>
              </div>

              {/* Weighbridge Scale Weights */}
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black text-emerald-900 tracking-wider">
                    1. Official Scale Weights (Electronic Mandi Weighbridge)
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold">
                    Electronic Mandi Weighbridge
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Gross Truck Weight (Loaded Vehicle) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={qcGrossKg}
                        onChange={(e) => setQcGrossKg(e.target.value)}
                        placeholder="e.g. 24500"
                        className="w-full h-10 px-3 pr-10 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] font-bold text-gray-400">
                        KG
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Empty Tare Weight (Unloaded Vehicle) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={qcTareKg}
                        onChange={(e) => setQcTareKg(e.target.value)}
                        placeholder="e.g. 10200"
                        className="w-full h-10 px-3 pr-10 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                        required
                      />
                      <span className="absolute right-3 top-2.5 text-[11px] font-bold text-gray-400">
                        KG
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Net Weight Display */}
                  <div className="bg-white p-2.5 rounded-xl border-2 border-emerald-500 shadow-xs">
                    <span className="text-[10px] uppercase font-black text-emerald-800 block">
                      Net Fruit Commodity Weight
                    </span>
                    <strong className="text-base font-black text-emerald-700 block mt-0.5">
                      {qcNetKg.toLocaleString('en-IN')} KG
                    </strong>
                    <span className="text-[10px] text-gray-500 block">
                      {(qcNetKg / 1000).toFixed(2)} Metric Tonnes
                    </span>
                  </div>
                </div>
              </div>

              {/* Quality Grading Section */}
              <div className="p-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-3">
                <span className="text-[10px] uppercase font-bold text-gray-800 tracking-wider block">
                  2. Quality Inspection &amp; Commodity Grading
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-gray-700 font-bold mb-1">QC Decision *</label>
                    <select
                      value={qcStatus}
                      onChange={(e) => setQcStatus(e.target.value)}
                      className="w-full h-10 px-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                      required
                    >
                      <option value="PASSED">PASSED (100% Verified)</option>
                      <option value="CONDITIONAL_ACCEPTANCE">CONDITIONAL (Deduction)</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Grade A Ratio (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={qcGradeA}
                      onChange={(e) => setQcGradeA(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Grade B Ratio (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={qcGradeB}
                      onChange={(e) => setQcGradeB(e.target.value)}
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Wastage / Cull (KG)</label>
                    <input
                      type="number"
                      min="0"
                      value={qcWastage}
                      onChange={(e) => setQcWastage(e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Inspector & Scale Slip Upload */}
              <div className="p-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-3">
                <span className="text-[10px] uppercase font-bold text-gray-800 tracking-wider block">
                  3. Scale Slip Upload &amp; Mandi Inspection Details
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Scale Incharge / QC Inspector Name *
                    </label>
                    <input
                      type="text"
                      value={qcInspector}
                      onChange={(e) => setQcInspector(e.target.value)}
                      placeholder="e.g. Mandi Scale Officer / Warangal Hub QC"
                      className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Upload Weighbridge Scale Slip Photo / PDF
                    </label>
                    <label className="w-full h-11 px-3.5 border-2 border-dashed border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-xl flex items-center justify-center gap-2.5 cursor-pointer transition shadow-2xs group">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center transition flex-shrink-0">
                        <Upload size={14} />
                      </div>
                      <span className="text-xs font-bold text-emerald-900 truncate">
                        {qcSlipFile ? qcSlipFile.name : 'Choose Scale Slip Receipt Image / PDF'}
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleQCSlipFileChange}
                        style={{ display: 'none' }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {qcSlipPreview && (
                  <div className="mt-2 p-2 bg-white border border-emerald-200 rounded-xl flex items-center gap-3">
                    <img
                      src={qcSlipPreview}
                      alt="Scale Slip Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                    />
                    <div className="flex-1 text-xs">
                      <p className="font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 size={13} className="text-emerald-600" /> Electronic Scale Receipt Attached
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {qcSlipFile?.name} ({(Number(qcSlipFile?.size || 0) / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setQcSlipFile(null);
                        setQcSlipPreview('');
                      }}
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Inspection Remarks / Mandi Calibration Notes
                  </label>
                  <textarea
                    value={qcRemarks}
                    onChange={(e) => setQcRemarks(e.target.value)}
                    rows={2}
                    placeholder="e.g. Weighbridge calibration checked. Zero tare balance verified. Fruit firmness and sugar brix level approved."
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-xs text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowRecordQCModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQC}
                  className="px-6 py-2.5 rounded-xl bg-[#087A3E] hover:bg-[#064D2B] text-white font-extrabold text-xs shadow-md transition inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingQC ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving &amp; Verifying Scale Slip...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Save &amp; Verify Weighbridge Scale Slip</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal: In-depth KPI Metric Insight & Direct Section Navigation */}
      {selectedKpiModal && (
        <div
          className="modal-backdrop !z-[9999] fixed inset-0 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedKpiModal(null);
          }}
        >
          <div
            className="modal !w-[680px] max-w-[96vw] max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden relative shadow-2xl rounded-3xl bg-white border border-gray-200"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="pb-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl grid place-items-center ${
                  selectedKpiModal === 'orders' ? 'bg-amber-100 text-amber-700' :
                  selectedKpiModal === 'advance' ? 'bg-emerald-100 text-[#087A3E]' :
                  selectedKpiModal === 'due' ? 'bg-teal-100 text-teal-700' :
                  selectedKpiModal === 'volume' ? 'bg-blue-100 text-blue-700' :
                  selectedKpiModal === 'transit' ? 'bg-amber-100 text-amber-600' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedKpiModal === 'orders' && <Coins size={22} />}
                  {selectedKpiModal === 'advance' && <CreditCard size={22} />}
                  {selectedKpiModal === 'due' && <Clock size={22} />}
                  {selectedKpiModal === 'volume' && <ShoppingCart size={22} />}
                  {selectedKpiModal === 'transit' && <Truck size={22} />}
                  {selectedKpiModal === 'qc' && <ShieldCheck size={22} />}
                </div>
                <div>
                  <span className="eyebrow text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    {selectedKpiModal === 'orders' && 'COMMERCIAL PROCUREMENT CONTRACTS'}
                    {selectedKpiModal === 'advance' && 'UPFRONT VENDOR DISBURSEMENT'}
                    {selectedKpiModal === 'due' && 'SETTLEMENT LIFECYCLE'}
                    {selectedKpiModal === 'volume' && 'COMMODITY SUPPLY VOLUME'}
                    {selectedKpiModal === 'transit' && 'LOGISTICS & ROAD TRANSIT FLEET'}
                    {selectedKpiModal === 'qc' && 'MANDI QUALITY ASSURANCE'}
                  </span>
                  <h2 className="text-lg font-black text-gray-900 font-['Manrope']">
                    {selectedKpiModal === 'orders' && 'Gross Orders & Total Contract Value'}
                    {selectedKpiModal === 'advance' && 'Bank Advance Received (55% Upfront)'}
                    {selectedKpiModal === 'due' && 'Pending Mandi Due Balance (45% Delivery)'}
                    {selectedKpiModal === 'volume' && 'Total Fruit Volume Supplied'}
                    {selectedKpiModal === 'transit' && 'Active Transport Fleet in Transit'}
                    {selectedKpiModal === 'qc' && 'Mandi Quality Control & Acceptance'}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKpiModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 flex items-center justify-center transition cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 pr-1 py-4 space-y-4 text-xs">
              {/* Metric Hero Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-emerald-50/40 to-white border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Current Total</span>
                  <strong className="text-2xl sm:text-3xl font-black text-gray-900 font-['Manrope'] block mt-0.5">
                    {selectedKpiModal === 'orders' && `₹${Number(stats.totalOrderValue || 0).toLocaleString('en-IN')}`}
                    {selectedKpiModal === 'advance' && `₹${Number(stats.totalAdvanceReceived || 0).toLocaleString('en-IN')}`}
                    {selectedKpiModal === 'due' && `₹${Number(stats.totalPendingBalance || Math.max(0, (stats.totalOrderValue || 0) - (stats.totalAdvanceReceived || 0))).toLocaleString('en-IN')}`}
                    {selectedKpiModal === 'volume' && `${totalVolumeBoxes.toLocaleString('en-IN')} Boxes`}
                    {selectedKpiModal === 'transit' && `${stats.inTransitPOs || 0} Trucks on Road`}
                    {selectedKpiModal === 'qc' && `99.4% Mandi Verified`}
                  </strong>
                  <span className="text-[11px] text-gray-600 font-medium block mt-0.5">
                    {selectedKpiModal === 'orders' && `${stats.totalPOs || 0} Active Procurement Orders`}
                    {selectedKpiModal === 'advance' && `55% Advance Cleared to Vendor Account`}
                    {selectedKpiModal === 'due' && `45% Settled on Hub Delivery & Weighbridge`}
                    {selectedKpiModal === 'volume' && `~${(totalVolumeBoxes * 0.02).toFixed(1)} Metric Tonnes Net Fruit Weight`}
                    {selectedKpiModal === 'transit' && `Direct Hub Consignments En-Route`}
                    {selectedKpiModal === 'qc' && `Zero Tare Verification & Grade A Certified`}
                  </span>
                </div>
                <div className="flex-shrink-0">
                  <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs inline-flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-700" />
                    Verified Active
                  </span>
                </div>
              </div>

              {/* Explanatory Policy & Info Section */}
              <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                  Procurement Information &amp; Policy Details
                </span>
                <p className="text-gray-600 leading-relaxed">
                  {selectedKpiModal === 'orders' &&
                    'This represents the aggregate contract commitments issued to your vendor organization by Safal Export & Import Pvt Ltd. All wholesale fruit rates and grading guidelines adhere to official mandi market pricing agreements.'}
                  {selectedKpiModal === 'advance' &&
                    'Safal Vendor Protection Guarantee provides an automatic 55% upfront advance disbursed directly via NEFT/RTGS to your verified bank coordinates upon uploading dispatch truck photos and carrier bilty.'}
                  {selectedKpiModal === 'due' &&
                    'The remaining 45% due balance is automatically processed and released within a 24-hour settlement window upon consignment arrival at destination regional hub and electronic weighbridge scale verification.'}
                  {selectedKpiModal === 'volume' &&
                    'Total physical commodity volume packaged and supplied under your account. Covers all 7 authorized fruit varieties: Kashmir Apples, Pomegranate, Watermelon, Muskmelon, Banana, Orange, and Plum.'}
                  {selectedKpiModal === 'transit' &&
                    'Monitors commercial freight trucks currently in transit between your orchard/cold storage packing facility and the assigned Safal regional wholesale hub. Complete with driver contact and bilty receipts.'}
                  {selectedKpiModal === 'qc' &&
                    'Official quality inspection standard certified at hub yard. Grade A quality is accepted at 100% contracted value, with automatic weighbridge gross and empty tare weight calculation.'}
                </p>
              </div>

              {/* Contextual Breakdown Data */}
              {selectedKpiModal === 'orders' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                    Associated Purchase Orders ({orders.length})
                  </span>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl bg-white overflow-hidden">
                    {orders.slice(0, 4).map((po, idx) => (
                      <div key={po.id || idx} className="p-3 flex items-center justify-between gap-2 hover:bg-gray-50">
                        <div>
                          <strong className="text-xs font-mono font-bold text-[#087A3E]">{po.poNumber}</strong>
                          <span className="text-gray-500 text-[11px] block">{po.orderPersonPlace || 'Warangal'} Hub · {po.fruitName || 'Kashmir Apples'}</span>
                        </div>
                        <div className="text-right">
                          <strong className="text-xs font-bold text-gray-900 block">₹{Number(po.grandTotal || po.totalAmount || 0).toLocaleString('en-IN')}</strong>
                          <span className="text-[10px] text-emerald-700 font-bold">{po.dispatchStatus?.replace(/_/g, ' ') || 'Active'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedKpiModal === 'advance' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                    Disbursement Bank Coordinates
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                      <span className="text-[10px] text-gray-500 block">Beneficiary Name</span>
                      <strong className="font-bold text-gray-900">{vendorProfile?.bankAccountHolder || vendorProfile?.businessName || 'Ramesh Agro Farms'}</strong>
                    </div>
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                      <span className="text-[10px] text-gray-500 block">Bank Account Number</span>
                      <strong className="font-mono font-bold text-gray-900">{vendorProfile?.bankAccountNumber || '•••••••••6789'}</strong>
                    </div>
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                      <span className="text-[10px] text-gray-500 block">IFSC Code</span>
                      <strong className="font-mono font-bold text-emerald-800">{vendorProfile?.bankIfscCode || 'SBIN0001234'}</strong>
                    </div>
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                      <span className="text-[10px] text-gray-500 block">Disbursement Mode</span>
                      <strong className="font-bold text-gray-900">Direct RTGS / NEFT</strong>
                    </div>
                  </div>
                </div>
              )}

              {selectedKpiModal === 'due' && (
                <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-teal-900 uppercase tracking-wider block">
                    Release Conditions &amp; Settlement Trigger
                  </span>
                  <ul className="space-y-1.5 text-gray-700 text-[11px]">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-teal-700 flex-shrink-0" />
                      <span>Truck arrives at Safal destination hub yard.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-teal-700 flex-shrink-0" />
                      <span>Weighbridge scale weighs loaded gross and empty tare truck weight.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-teal-700 flex-shrink-0" />
                      <span>QC Officer signs off on Grade A fruit quality compliance.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-teal-700 flex-shrink-0" />
                      <span>Remaining 45% credited automatically within 24 hours.</span>
                    </li>
                  </ul>
                </div>
              )}

              {selectedKpiModal === 'volume' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                    Commodity Volume Breakdown
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {fruitBreakdown.map((f, i) => (
                      <div key={i} className="p-2.5 bg-white border border-gray-200 rounded-xl">
                        <span className="text-base mr-1">{f.icon}</span>
                        <strong className="text-xs font-bold text-gray-900 block">{f.fruit}</strong>
                        <span className="text-[11px] text-emerald-700 font-bold">{f.boxes} Boxes ({f.percent}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedKpiModal === 'transit' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                    Active Road Consignments
                  </span>
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs space-y-1.5 text-amber-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <Truck size={14} className="text-amber-700" /> Dispatch Desk Operations
                    </p>
                    <p className="text-[11px] text-gray-600">
                      You can generate delivery challans, update vehicle registration numbers, and upload driver transport bilty directly in the Dispatch Desk.
                    </p>
                  </div>
                </div>
              )}

              {selectedKpiModal === 'qc' && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block">
                    Quality Benchmarks &amp; Standards
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <span className="text-[10px] text-emerald-800 font-bold block">Grade A Export</span>
                      <strong className="text-sm font-black text-emerald-900">96% Ratio</strong>
                    </div>
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="text-[10px] text-amber-800 font-bold block">Grade B Domestic</span>
                      <strong className="text-sm font-black text-amber-900">4% Ratio</strong>
                    </div>
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                      <span className="text-[10px] text-blue-800 font-bold block">Weighbridge Scale</span>
                      <strong className="text-sm font-black text-blue-900">100% Calibrated</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setSelectedKpiModal(null)}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 cursor-pointer text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedKpiModal === 'orders' || selectedKpiModal === 'volume') {
                    handleTabClick('orders');
                  } else if (selectedKpiModal === 'advance') {
                    handleTabClick('kyc');
                  } else if (selectedKpiModal === 'due' || selectedKpiModal === 'qc') {
                    handleTabClick('qc');
                  } else if (selectedKpiModal === 'transit') {
                    handleTabClick('dispatch');
                  }
                  setSelectedKpiModal(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#087A3E] hover:bg-[#064D2B] text-white font-extrabold text-xs shadow-md transition inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <span>
                  {selectedKpiModal === 'orders' && 'Open Supply Consignments Desk'}
                  {selectedKpiModal === 'advance' && 'View Banking & KYC Coordinates'}
                  {selectedKpiModal === 'due' && 'Track Weighbridge & Settlement'}
                  {selectedKpiModal === 'volume' && 'View Supply Consignments Desk'}
                  {selectedKpiModal === 'transit' && 'Open Ready for Dispatch Desk'}
                  {selectedKpiModal === 'qc' && 'Open Weighbridge & QC Slips Desk'}
                </span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
