import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Navigation,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { PurchaseOrder, VENDOR_WHITELISTED_LOCATIONS, VENDOR_WHITELISTED_FRUITS } from '../types';
import { VendorPhotoCaptureModal } from '../components/VendorPhotoCaptureModal';
import { PODetailModal } from '../components/PODetailModal';
import { stampImageFile, compressImageFile } from '../utils/watermark';
import { resolvePhotoUrl, downloadProofFile, compressImageFile as compressImageBlob } from '../utils/imageUtils';

interface VendorDashboardPageProps {
  onNotify: (msg: string) => void;
  onCreatePO?: () => void;
  activePage?: string;
  onNavigate?: (page: string) => void;
  navParams?: any;
}

export const VendorDashboardPage: React.FC<VendorDashboardPageProps> = ({
  onNotify,
  onCreatePO,
  activePage,
  onNavigate,
  navParams,
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
  const [selectedPODetail, setSelectedPODetail] = useState<any | null>(null);

  // Weighbridge is strictly for bulk-weighment commodities (Watermelon & Muskmelon)
  const isBulkWeighmentFruit = (fruitName?: string) => {
    if (!fruitName) return false;
    const f = fruitName.toLowerCase();
    return f.includes('watermelon') || f.includes('water melon') || f.includes('muskmelon') || f.includes('musk melon') || f.includes('melon');
  };

  // Dynamic Mandi Commercial Realization Calculations (Entered by Safal Accounts upon Mandi sales realization)
  const derivedFinancialStats = React.useMemo(() => {
    let grossContractValue = 0;
    let totalAdvanceDisbursed = 0;
    let totalSafalShare = 0;
    let totalApmcShare = 0;
    let totalNetPayable = 0;
    let totalNetBalanceDue = 0;

    for (const po of orders) {
      const gross = Number(po.grandTotal || 0);
      const settle = (po as any).settlementDetails;
      const adv = Number(settle?.advanceAmount ?? po.advanceAmount ?? Math.round(gross * 0.55));
      const hasSettlement = Boolean(settle?.hasSettlementEntry || settle?.settlementCompleted || (po.status === 'CLOSED' && Number(po.pendingAmount || 0) === 0));
      const due = hasSettlement ? Number(settle?.finalBalanceDue ?? 0) : 0;
      const safal = Number(settle?.adminShareAmount ?? Math.round(gross * 0.05));
      const apmc = Number(settle?.apmcShareAmount ?? Math.round(gross * 0.01));
      const net = hasSettlement ? Number(settle?.netVendorPayable ?? Math.max(0, gross - (safal + apmc))) : 0;

      grossContractValue += gross;
      totalAdvanceDisbursed += adv;
      totalSafalShare += (hasSettlement ? safal : 0);
      totalApmcShare += (hasSettlement ? apmc : 0);
      totalNetPayable += net;
      totalNetBalanceDue += due;
    }

    return {
      grossContractValue,
      totalAdvanceDisbursed,
      totalSafalShare,
      totalApmcShare,
      totalNetPayable,
      totalNetBalanceDue,
    };
  }, [orders]);

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
  const [consignmentFilter, setConsignmentFilter] = useState<'ALL' | 'PENDING' | 'IN_TRANSIT' | 'AWAITING_CLEARANCE' | 'CLEARED' | 'DELIVERED'>('ALL');
  const [consignmentSearch, setConsignmentSearch] = useState('');
  const [expandedPOId, setExpandedPOId] = useState<string | null>(null);
  const [previewMediaModal, setPreviewMediaModal] = useState<{ url: string; title: string } | null>(null);

  // Live Camera Capture Modal State (Attendance Mode with GPS & IST Watermark)
  const [cameraModalConfig, setCameraModalConfig] = useState<{
    open: boolean;
    title: string;
    documentType: string;
    poNumber?: string;
    onCapture: (file: File, previewUrl: string) => void;
  }>({
    open: false,
    title: '',
    documentType: '',
    onCapture: () => {},
  });

  const openCameraModal = (
    title: string,
    documentType: string,
    poNumber: string | undefined,
    onCapture: (file: File, previewUrl: string) => void
  ) => {
    setCameraModalConfig({
      open: true,
      title,
      documentType,
      poNumber,
      onCapture,
    });
  };

  // Missing Images Warning Popup Alert State
  const [missingImagesPopup, setMissingImagesPopup] = useState<{
    open: boolean;
    title: string;
    missingItems: string[];
    targetAction?: 'dispatch' | 'supply';
  } | null>(null);

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

  // Hidden File Input Refs (Prevents native browser file picker overflow and button misalignment)
  const dispatchVehicleInputRef = useRef<HTMLInputElement | null>(null);
  const dispatchTransportInputRef = useRef<HTMLInputElement | null>(null);
  const supplyVehicleInputRef = useRef<HTMLInputElement | null>(null);
  const supplyTransportInputRef = useRef<HTMLInputElement | null>(null);
  const qcSlipInputRef = useRef<HTMLInputElement | null>(null);

  // Vendor Supply PO Creation State
  const [showCreatePOModal, setShowCreatePOModal] = useState(false);
  const [poInitiateDate, setPoInitiateDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [startingLocation, setStartingLocation] = useState<string>('');
  const [targetHub, setTargetHub] = useState<string>('Warangal');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [vendorSignatureData, setVendorSignatureData] = useState<string>('');
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dispatch Tab Table Filter & Search State
  const [dispatchTabFilter, setDispatchTabFilter] = useState<'ALL' | 'PENDING' | 'IN_TRANSIT' | 'COMPLETED'>('ALL');
  const [dispatchTabSearch, setDispatchTabSearch] = useState('');

  // Selected Fruit & Commodity States
  const [selectedFruit, setSelectedFruit] = useState<string>('Kashmir Apples');

  // 1. Kashmir Apples Layer Breakdown (4L, 5L, Roll, Total, Amount)
  const [layer4LBoxes, setLayer4LBoxes] = useState<string>('200');
  const [layer4LRate, setLayer4LRate] = useState<string>('1498');
  const [layer5LBoxes, setLayer5LBoxes] = useState<string>('250');
  const [layer5LRate, setLayer5LRate] = useState<string>('1100');
  const [rollBoxes, setRollBoxes] = useState<string>('50');
  const [rollRate, setRollRate] = useState<string>('900');

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

  // Deep-link from System Notifications: open related PO details or dispatch modal
  useEffect(() => {
    if (navParams?.orderNumber && orders.length > 0) {
      const targetPO = orders.find(
        (o) => o.poNumber?.toLowerCase() === navParams.orderNumber.toLowerCase()
      );
      if (targetPO) {
        if (navParams.openDispatch) {
          openDispatchModal(targetPO);
        } else {
          setSelectedPODetail(targetPO);
        }
      }
    }
  }, [navParams, orders]);

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
        if (cameraModalConfig.open) {
          setCameraModalConfig((prev) => ({ ...prev, open: false }));
          return;
        }
        setShowCreatePOModal(false);
        setSelectedPOForDispatch(null);
        setViewSlipModalUrl(null);
        setPreviewMediaModal(null);
        setShowEditProfileModal(false);
        setShowRecordQCModal(false);
        setSelectedKpiModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cameraModalConfig.open, showCreatePOModal, selectedPOForDispatch, viewSlipModalUrl, previewMediaModal, showEditProfileModal, showRecordQCModal, selectedKpiModal]);

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
    } else {
      const bulkOrders = orders.filter((o) => isBulkWeighmentFruit(o.fruitName));
      const unweighed = bulkOrders.find((o) => !o.weighbridgeNetKg);
      setQcSelectedPOId(unweighed ? unweighed.id : (bulkOrders[0]?.id || ''));
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

  const handleSupplyVehiclePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { file: stampedFile, previewUrl } = await stampImageFile(file, {
          documentType: 'Vehicle Dispatch Photo',
          vendorName: vendorProfile?.businessName || user?.name,
          vendorId: vendorProfile?.vendorId || 'VND-001',
        });
        setSupplyVehiclePhotoFile(stampedFile);
        setSupplyVehiclePhotoPreview(previewUrl);
      } catch {
        const { file: optFile, previewUrl } = await compressImageFile(file);
        setSupplyVehiclePhotoFile(optFile);
        setSupplyVehiclePhotoPreview(previewUrl);
      }
    }
  };

  const handleSupplyTransportBillChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { file: stampedFile, previewUrl } = await stampImageFile(file, {
          documentType: 'Transport Bilty (LR)',
          vendorName: vendorProfile?.businessName || user?.name,
          vendorId: vendorProfile?.vendorId || 'VND-001',
        });
        setSupplyTransportBillFile(stampedFile);
        setSupplyTransportBillPreview(previewUrl);
      } catch {
        const { file: optFile, previewUrl } = await compressImageFile(file);
        setSupplyTransportBillFile(optFile);
        setSupplyTransportBillPreview(previewUrl);
      }
    }
  };

  const handleFruitSelect = (fruit: string) => {
    setSelectedFruit(fruit);
    if (fruit === 'Kashmir Apples' || fruit.toLowerCase().includes('apple')) {
      if (!layer4LBoxes) setLayer4LBoxes('200');
      if (!layer4LRate) setLayer4LRate('1498');
      if (!layer5LBoxes) setLayer5LBoxes('250');
      if (!layer5LRate) setLayer5LRate('1100');
      if (!rollBoxes) setRollBoxes('50');
      if (!rollRate) setRollRate('900');
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

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setVendorSignatureData('');
    setSupplyTransportBillFile(null);
    setSupplyTransportBillPreview('');
  };

  const getCanvasPos = (canvas: HTMLCanvasElement, clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawingSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#064D2B';

    setIsDrawingSignature(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCanvasPos(canvas, clientX, clientY);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingSignature) return;
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const { x, y } = getCanvasPos(canvas, clientX, clientY);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawingSignature = () => {
    if (!isDrawingSignature) return;
    setIsDrawingSignature(false);
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setVendorSignatureData(dataUrl);
      setSupplyTransportBillPreview(dataUrl);
    }
  };

  const handleSubmitVendorPO = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatePOError('');

    if (!startingLocation.trim()) {
      setCreatePOError('Please enter your Vendor Farm / Loading Origin Location (Starting Point).');
      return;
    }

    try {
      setIsSubmittingPO(true);
      const formData = new FormData();
      formData.append('poInitiateDate', poInitiateDate || new Date().toISOString().split('T')[0]);
      formData.append('poDate', poInitiateDate || new Date().toISOString().split('T')[0]);
      formData.append('startingLocation', startingLocation.trim());
      formData.append('originLocation', startingLocation.trim());
      formData.append('destinationHub', targetHub);
      if (expectedDeliveryDate) {
        formData.append('expectedDeliveryDate', expectedDeliveryDate);
      }
      formData.append('fruitName', selectedFruit);
      formData.append('notes', poNotes);

      // Step 1: Submit PO Request (Awaiting Admin Vehicle Allotment & Bilty)
      const res = await api.createVendorSupplyPO(formData);
      setShowCreatePOModal(false);
      onNotify(res.message || 'Consignment PO requested! Awaiting Safal Hub vehicle allotment & Transporter Bilty.');

      // Reset form fields
      setStartingLocation('');
      setPoNotes('');

      await loadData();
      setActiveTab('orders');
    } catch (err: any) {
      const msg = err.message || '';
      if (/413|too large|entity/i.test(msg)) {
        setCreatePOError('Upload size too large. Please retry.');
      } else {
        setCreatePOError(msg || 'Failed to submit consignment PO request');
      }
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

  const handleVehiclePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { file: stampedFile, previewUrl } = await stampImageFile(file, {
          documentType: 'Vehicle Dispatch Photo',
          poNumber: selectedPOForDispatch?.poNumber,
          vendorName: vendorProfile?.businessName || user?.name,
          vendorId: vendorProfile?.vendorId || 'VND-001',
        });
        setVehiclePhotoFile(stampedFile);
        setVehiclePhotoPreview(previewUrl);
      } catch {
        const { file: optFile, previewUrl } = await compressImageFile(file);
        setVehiclePhotoFile(optFile);
        setVehiclePhotoPreview(previewUrl);
      }
    }
  };

  const handleTransportBillChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { file: stampedFile, previewUrl } = await stampImageFile(file, {
          documentType: 'Transport Bilty (LR)',
          poNumber: selectedPOForDispatch?.poNumber,
          vendorName: vendorProfile?.businessName || user?.name,
          vendorId: vendorProfile?.vendorId || 'VND-001',
        });
        setTransportBillFile(stampedFile);
        setTransportBillPreview(previewUrl);
      } catch {
        const { file: optFile, previewUrl } = await compressImageFile(file);
        setTransportBillFile(optFile);
        setTransportBillPreview(previewUrl);
      }
    }
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOForDispatch) return;

    if (!vehicleNumber.trim()) {
      setDispatchError('Vehicle Registration Number is mandatory');
      return;
    }

    const missing: string[] = [];
    if (!vehiclePhotoFile) {
      missing.push('Dispatch Vehicle Photo (with clear number plate & loaded fruit boxes)');
    }
    if (!vendorSignatureData && !transportBillFile) {
      missing.push('Vendor Digital E-Signature & Authorization (Sign on pad)');
    }

    if (missing.length > 0) {
      setDispatchError('Please provide both the Dispatch Vehicle Photo and Vendor Digital E-Signature before submitting.');
      setMissingImagesPopup({
        open: true,
        title: 'Dispatch Verification Required',
        missingItems: missing,
        targetAction: 'dispatch',
      });
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

      // Append loaded fruit commodity and grading
      formData.append('fruitName', selectedFruit);
      if (isApple) {
        const b4L = Number(layer4LBoxes) || 0;
        const b5L = Number(layer5LBoxes) || 0;
        const bRoll = Number(rollBoxes) || 0;
        const r4L = Number(layer4LRate) || 1498;
        const r5L = Number(layer5LRate) || 1100;
        const rRoll = Number(rollRate) || 900;
        const totalB = b4L + b5L + bRoll;
        if (totalB <= 0) {
          setDispatchError('Please enter at least one apple box (4L, 5L, or Roll) loaded onto the vehicle.');
          setIsSubmittingDispatch(false);
          return;
        }

        formData.append('layer4LBoxes', String(b4L));
        formData.append('layer4LRate', String(r4L));
        formData.append('layer5LBoxes', String(b5L));
        formData.append('layer5LRate', String(r5L));
        formData.append('rollBoxes', String(bRoll));
        formData.append('rollRate', String(rRoll));

        const appleItems = [
          { fruitName: 'Kashmir Apples', category: 'Fresh Fruits', varietyGrade: '4L (Large)', quantity: b4L, unit: 'BOX', ratePerUnit: r4L, lineTotal: b4L * r4L },
          { fruitName: 'Kashmir Apples', category: 'Fresh Fruits', varietyGrade: '5L (Medium)', quantity: b5L, unit: 'BOX', ratePerUnit: r5L, lineTotal: b5L * r5L },
          { fruitName: 'Kashmir Apples', category: 'Fresh Fruits', varietyGrade: 'Roll (Running)', quantity: bRoll, unit: 'BOX', ratePerUnit: rRoll, lineTotal: bRoll * rRoll },
        ].filter((i) => i.quantity > 0);
        formData.append('items', JSON.stringify(appleItems));
      } else if (isPomegranate) {
        const pBoxes = Number(pomegranateBoxes) || 0;
        const pRate = Number(pomegranateRate) || 950;
        if (pBoxes <= 0) {
          setDispatchError('Please enter pomegranate box count.');
          setIsSubmittingDispatch(false);
          return;
        }
        formData.append('items', JSON.stringify([{
          fruitName: 'Pomegranate',
          category: 'Fresh Fruits',
          varietyGrade: 'Export Grade A',
          quantity: pBoxes,
          unit: 'BOX',
          ratePerUnit: pRate,
          lineTotal: pBoxes * pRate,
        }]));
      } else if (isWatermelon) {
        const wWeight = Number(watermelonWeight) || 0;
        const wRate = Number(watermelonRate) || 14;
        if (wWeight <= 0) {
          setDispatchError('Please enter watermelon harvest weight.');
          setIsSubmittingDispatch(false);
          return;
        }
        formData.append('items', JSON.stringify([{
          fruitName: 'Watermelon',
          category: 'Fresh Fruits',
          varietyGrade: 'Harvest Load',
          quantity: wWeight,
          unit: watermelonUnit,
          ratePerUnit: wRate,
          lineTotal: wWeight * wRate,
        }]));
      } else if (isMuskmelon) {
        const mWeight = Number(muskmelonWeight) || 0;
        const mRate = Number(muskmelonRate) || 18;
        if (mWeight <= 0) {
          setDispatchError('Please enter muskmelon harvest weight.');
          setIsSubmittingDispatch(false);
          return;
        }
        formData.append('items', JSON.stringify([{
          fruitName: 'Muskmelon',
          category: 'Fresh Fruits',
          varietyGrade: 'Harvest Load',
          quantity: mWeight,
          unit: muskmelonUnit,
          ratePerUnit: mRate,
          lineTotal: mWeight * mRate,
        }]));
      } else if (isBanana) {
        const bBoxes = Number(bananaBoxes) || 0;
        const bRate = Number(bananaRate) || 550;
        if (bBoxes <= 0) {
          setDispatchError('Please enter banana boxes count.');
          setIsSubmittingDispatch(false);
          return;
        }
        formData.append('items', JSON.stringify([{
          fruitName: 'Banana',
          category: 'Fresh Fruits',
          varietyGrade: 'Cavendish Crates',
          quantity: bBoxes,
          unit: 'BOX',
          ratePerUnit: bRate,
          lineTotal: bBoxes * bRate,
        }]));
      } else if (isOrange) {
        const oBoxes = Number(orangeBoxes) || 0;
        const oRate = Number(orangeRate) || 780;
        if (oBoxes <= 0) {
          setDispatchError('Please enter orange boxes count.');
          setIsSubmittingDispatch(false);
          return;
        }
        formData.append('items', JSON.stringify([{
          fruitName: 'Orange',
          category: 'Fresh Fruits',
          varietyGrade: `Count ${orangeCount}`,
          quantity: oBoxes,
          unit: 'BOX',
          ratePerUnit: oRate,
          lineTotal: oBoxes * oRate,
        }]));
      } else if (isPlum) {
        const plBoxes = Number(plumBoxes) || 0;
        const plRate = Number(plumRate) || 850;
        if (plBoxes <= 0) {
          setDispatchError('Please enter plum boxes count.');
          setIsSubmittingDispatch(false);
          return;
        }
        formData.append('items', JSON.stringify([{
          fruitName: 'Plum',
          category: 'Fresh Fruits',
          varietyGrade: 'Stone Fruit Cartons',
          quantity: plBoxes,
          unit: 'BOX',
          ratePerUnit: plRate,
          lineTotal: plBoxes * plRate,
        }]));
      } else {
        const oQty = Number(otherQuantity) || 0;
        const oRate = Number(otherRate) || 950;
        if (oQty <= 0) {
          setDispatchError('Please enter consignment quantity.');
          setIsSubmittingDispatch(false);
          return;
        }
        formData.append('items', JSON.stringify([{
          fruitName: selectedFruit,
          category: 'Fresh Fruits',
          varietyGrade: otherGrade || 'Standard Grade',
          quantity: oQty,
          unit: otherUnit,
          ratePerUnit: oRate,
          lineTotal: oQty * oRate,
        }]));
      }

      let finalBill = transportBillFile;
      if (!finalBill && vendorSignatureData) {
        try {
          const sigBlob = await (await fetch(vendorSignatureData)).blob();
          finalBill = new File([sigBlob], 'vendor_signature.png', { type: 'image/png' });
        } catch (e) {
          console.warn('Signature conversion error:', e);
        }
      }
      if (finalBill) {
        formData.append('transportBill', finalBill);
      }
      if (vendorSignatureData) {
        formData.append('vendorSignature', vendorSignatureData);
      }

      const res = await api.submitPODispatch(formData);
      onNotify(res.message || 'Consignment dispatch authorized and submitted! Highway in-transit live tracking is now active.');

      // Reset modal state
      setSelectedPOForDispatch(null);
      setVehicleNumber('');
      setTransporterName('');
      setDriverPhone('');
      setVehiclePhotoFile(null);
      setVehiclePhotoPreview('');
      setTransportBillFile(null);
      setTransportBillPreview('');
      setVendorSignatureData('');
      clearSignature();

      // Reload data
      loadData();
    } catch (err: any) {
      setDispatchError(err.message || 'Failed to submit dispatch details');
    } finally {
      setIsSubmittingDispatch(false);
    }
  };

  const openDispatchModal = (po: PurchaseOrder) => {
    const hasVehicle = Boolean(
      po.dispatchVehicleNumber &&
      po.dispatchVehicleNumber !== '-' &&
      po.dispatchVehicleNumber.trim() !== ''
    );
    if (!hasVehicle) {
      onNotify(`PO ${po.poNumber} is awaiting vehicle allotment by Safal Logistics Hub. Once allotted, loading & dispatch will unlock.`);
      return;
    }
    setSelectedPOForDispatch(po);
    setVehicleNumber(po.dispatchVehicleNumber || '');
    setTransporterName(po.transporterName || 'SAFAL Cold-Chain Express');
    setDriverPhone(po.driverPhone || '');
    setVehiclePhotoFile(null);
    setVehiclePhotoPreview(po.vehiclePhotoUrl ? (po.vehiclePhotoUrl.startsWith('/') ? `/api${po.vehiclePhotoUrl}` : po.vehiclePhotoUrl) : '');
    setTransportBillFile(null);
    setTransportBillPreview(po.transportBillUrl ? (po.transportBillUrl.startsWith('/') ? `/api${po.transportBillUrl}` : po.transportBillUrl) : '');
    setVendorSignatureData('');
    clearSignature();
    setDispatchError('');

    // Pre-populate fruit variety and box counts
    const fruit = po.commodity || po.items?.[0]?.fruitName || 'Kashmir Apples';
    setSelectedFruit(fruit);
    if (fruit === 'Kashmir Apples' || fruit.toLowerCase().includes('apple')) {
      const it4L = po.items?.find((i: any) => i.varietyGrade?.includes('4L'));
      const it5L = po.items?.find((i: any) => i.varietyGrade?.includes('5L'));
      const itRoll = po.items?.find((i: any) => i.varietyGrade?.includes('Roll'));
      setLayer4LBoxes(it4L && it4L.quantity ? String(it4L.quantity) : '200');
      setLayer4LRate(it4L && it4L.ratePerUnit ? String(it4L.ratePerUnit) : '1498');
      setLayer5LBoxes(it5L && it5L.quantity ? String(it5L.quantity) : '250');
      setLayer5LRate(it5L && it5L.ratePerUnit ? String(it5L.ratePerUnit) : '1100');
      setRollBoxes(itRoll && itRoll.quantity ? String(itRoll.quantity) : '50');
      setRollRate(itRoll && itRoll.ratePerUnit ? String(itRoll.ratePerUnit) : '900');
    } else if (fruit === 'Pomegranate') {
      const pIt = po.items?.[0];
      setPomegranateBoxes(pIt && pIt.quantity ? String(pIt.quantity) : '300');
      setPomegranateRate(pIt && pIt.ratePerUnit ? String(pIt.ratePerUnit) : '950');
    }
  };

  // 1. Cleared / Completed Consignments (Strictly 0 remaining balance due & verified settlement)
  const clearedOrders = orders.filter((o) => {
    const settle = (o as any).settlementDetails;
    const remainingDue = settle?.finalBalanceDue !== undefined
      ? Number(settle.finalBalanceDue)
      : Number(o.pendingAmount || 0);
    return remainingDue === 0 && (Boolean(settle?.settlementCompleted) || (o.status === 'CLOSED' && Number(o.pendingAmount || 0) === 0));
  });
  const deliveredAndVerifiedOrders = clearedOrders;

  // 2. Orders Awaiting Vehicle Allotment from Safal Hub
  const awaitingAllotmentOrders = orders.filter((o) => {
    const isCleared = clearedOrders.some((c) => c.id === o.id);
    const hasVehicle = Boolean(
      o.dispatchVehicleNumber &&
      o.dispatchVehicleNumber !== '-' &&
      o.dispatchVehicleNumber.trim() !== ''
    );
    return (
      !isCleared &&
      !hasVehicle &&
      (!o.dispatchStatus || o.dispatchStatus === 'PENDING_DISPATCH' || o.status === 'PENDING_APPROVAL') &&
      o.status !== 'CLOSED' &&
      o.status !== 'CANCELLED' &&
      o.status !== 'REJECTED'
    );
  });

  // 3. Ready for Loading & Dispatch (Vehicle has been allotted by Admin, awaiting vendor carton loading & signature)
  const pendingDispatchOrders = orders.filter((o) => {
    const isCleared = clearedOrders.some((c) => c.id === o.id);
    const hasVehicle = Boolean(
      o.dispatchVehicleNumber &&
      o.dispatchVehicleNumber !== '-' &&
      o.dispatchVehicleNumber.trim() !== ''
    );
    return (
      !isCleared &&
      hasVehicle &&
      !o.vehiclePhotoUrl &&
      (!o.dispatchStatus || o.dispatchStatus === 'PENDING_DISPATCH') &&
      o.status !== 'CLOSED' &&
      o.status !== 'CANCELLED' &&
      o.status !== 'REJECTED'
    );
  });

  // 4. In Transit (Truck on the road with photos/bilty submitted, not yet marked delivered at hub)
  const inTransitOrders = orders.filter((o) => {
    const isCleared = clearedOrders.some((c) => c.id === o.id);
    const isPending = pendingDispatchOrders.some((p) => p.id === o.id);
    const isAwaitingAllotment = awaitingAllotmentOrders.some((a) => a.id === o.id);
    if (isCleared || isPending || isAwaitingAllotment) return false;
    return (
      (o.dispatchStatus === 'LOADED_AND_DISPATCHED' || o.dispatchStatus === 'IN_TRANSIT') &&
      o.dispatchStatus !== 'DELIVERED_AT_HUB'
    );
  });

  // 5. Awaiting Safal Clearance (Arrived at regional hub / weighbridge recorded / awaiting final settlement clearance)
  const awaitingClearanceOrders = orders.filter((o) => {
    const isCleared = clearedOrders.some((c) => c.id === o.id);
    const isPending = pendingDispatchOrders.some((p) => p.id === o.id);
    const isAwaitingAllotment = awaitingAllotmentOrders.some((a) => a.id === o.id);
    const isInTransit = inTransitOrders.some((t) => t.id === o.id);
    return !isCleared && !isPending && !isAwaitingAllotment && !isInTransit;
  });

  const completedOrders = clearedOrders;

  const filteredDispatchTabOrders = orders.filter((o) => {
    if (dispatchTabFilter === 'PENDING') {
      if (!pendingDispatchOrders.some((p) => p.id === o.id)) return false;
    } else if (dispatchTabFilter === 'IN_TRANSIT') {
      if (!inTransitOrders.some((t) => t.id === o.id)) return false;
    } else if (dispatchTabFilter === 'COMPLETED') {
      if (!clearedOrders.some((c) => c.id === o.id)) return false;
    }

    if (dispatchTabSearch.trim()) {
      const q = dispatchTabSearch.toLowerCase();
      const matchPO = o.poNumber?.toLowerCase().includes(q);
      const matchFruit = o.fruitName?.toLowerCase().includes(q) || o.items?.some((it) => it.fruitName?.toLowerCase().includes(q));
      const matchVehicle = o.dispatchVehicleNumber?.toLowerCase().includes(q);
      const matchTransporter = o.transporterName?.toLowerCase().includes(q);
      const matchHub = (o.orderPersonPlace || '').toLowerCase().includes(q);
      return matchPO || matchFruit || matchVehicle || matchTransporter || matchHub;
    }

    return true;
  });

  const filteredOrders = orders.filter((po) => {
    if (consignmentFilter === 'PENDING') {
      if (!pendingDispatchOrders.some((p) => p.id === po.id)) return false;
    } else if (consignmentFilter === 'IN_TRANSIT') {
      if (!inTransitOrders.some((t) => t.id === po.id)) return false;
    } else if (consignmentFilter === 'AWAITING_CLEARANCE') {
      if (!awaitingClearanceOrders.some((a) => a.id === po.id)) return false;
    } else if (consignmentFilter === 'CLEARED' || consignmentFilter === 'DELIVERED') {
      if (!clearedOrders.some((c) => c.id === po.id)) return false;
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
              · Authorized Wholesale Vendor Partner
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
              <Plus size={15} /> Create Supply PO
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

      {/* 2. Navigation Tab Buttons (Responsive 2-column mobile layout without side-scrolling) */}
      <div className="bg-white p-2.5 rounded-2xl border border-[#D5E3D8] shadow-xs grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-2">
        <button
          onClick={() => handleTabClick('dashboard')}
          className={`w-full justify-center px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer text-center ${
            activeTab === 'dashboard'
              ? 'bg-[#064D2B] text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <BarChart3 size={15} className="flex-shrink-0" />
          <span>Dashboard &amp; Analytics</span>
        </button>

        <button
          onClick={() => handleTabClick('orders')}
          className={`w-full justify-center px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer text-center ${
            activeTab === 'orders'
              ? 'bg-[#064D2B] text-white shadow-xs'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <ShoppingCart size={15} className="flex-shrink-0" />
          <span className="relative inline-flex items-center">
            <span>Consignments</span>
            {orders.length > 0 && (
              <span className="ml-1 -top-1 px-1.5 py-0.5 text-[9px] font-black rounded-full bg-emerald-700 text-white shadow-2xs leading-none">
                {orders.length}
              </span>
            )}
          </span>
        </button>

        <button
          onClick={() => handleTabClick('dispatch')}
          className={`w-full justify-center px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer text-center ${
            activeTab === 'dispatch'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <Truck size={15} className="flex-shrink-0" />
          <span className="relative inline-flex items-center">
            <span>Dispatch &amp; Transit</span>
            {inTransitOrders.length > 0 && (
              <span className="ml-1 -top-1 px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white shadow-2xs leading-none">
                {inTransitOrders.length}
              </span>
            )}
          </span>
        </button>

        <button
          onClick={() => handleTabClick('qc')}
          className={`w-full justify-center px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer text-center ${
            activeTab === 'qc'
              ? 'bg-[#087A3E] text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <Scale size={15} className="flex-shrink-0" />
          {(() => {
            const qcCount = orders.filter((o) => o.weighbridgeNetKg || o.dispatchStatus === 'IN_TRANSIT' || o.dispatchStatus === 'LOADED_AND_DISPATCHED' || o.dispatchStatus === 'DELIVERED_AT_HUB').length;
            return (
              <span className="relative inline-flex items-center">
                <span>Weighbridge &amp; QC</span>
                {qcCount > 0 && (
                  <span className="ml-1 -top-1 px-1.5 py-0.5 text-[9px] font-black rounded-full bg-[#087A3E] text-white shadow-2xs leading-none">
                    {qcCount}
                  </span>
                )}
              </span>
            );
          })()}
        </button>

        <button
          onClick={() => handleTabClick('kyc')}
          className={`w-full justify-center px-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer text-center col-span-2 sm:col-span-1 lg:col-span-auto ${
            activeTab === 'kyc'
              ? 'bg-[#064D2B] text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
          }`}
        >
          <User size={15} className="flex-shrink-0" />
          <span>Vendor Profile &amp; KYC</span>
        </button>
      </div>

      {/* Compact Stat Cards (Visible on secondary tabs: orders, dispatch, qc, kyc) */}
      {activeTab !== 'dashboard' && (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
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
              <small className="text-[10px] text-gray-500 hidden sm:block truncate">Procurement contracts · Tap info</small>
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
              <small className="text-[10px] text-emerald-700 hidden sm:block truncate">Dispatched on road · Tap info</small>
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
                ₹{Number(derivedFinancialStats.grossContractValue || stats.totalOrderValue || 0).toLocaleString('en-IN')}
              </strong>
              <small className="text-[10px] text-gray-500 hidden sm:block truncate">Gross commitments · Tap info</small>
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
                ₹{Number(derivedFinancialStats.totalAdvanceDisbursed || stats.totalAdvanceReceived || 0).toLocaleString('en-IN')}
              </strong>
              <small className="text-[10px] text-emerald-700 hidden sm:block truncate">Disbursed to Bank · Tap for PO list</small>
            </div>
          </div>

          {/* Card 5: Net Balance Due */}
          <div
            onClick={() => setSelectedKpiModal('due')}
            className="stat-card orange flex items-center gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] hover:border-amber-500 hover:shadow-md cursor-pointer transition-all active:scale-95 group"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FFEDD5] flex items-center justify-center text-[#C2410C] flex-shrink-0">
              <ReceiptText size={20} strokeWidth={2.2} className="sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] sm:text-xs font-bold text-amber-950 block truncate">Net Balance Due</span>
              <strong className="text-sm sm:text-base md:text-xl lg:text-2xl font-black text-[#C2410C] font-['Manrope'] block mt-0.5 truncate">
                ₹{Number(derivedFinancialStats.totalNetBalanceDue || 0).toLocaleString('en-IN')}
              </strong>
              <small className="text-[10px] text-amber-800 hidden sm:block truncate">Entered by Safal Accounts · Tap info</small>
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
                  ₹{Number(derivedFinancialStats.totalNetBalanceDue || 0).toLocaleString('en-IN')}
                </strong>
                <span className="text-[10px] text-teal-700 font-bold block mt-1">
                  Settled by Safal on Mandi Delivery
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

          {/* LIVE COLD-CHAIN HIGHWAY TRANSIT TRACKER (Motion Tracking Truck En-Route) */}
          {(() => {
            // Strictly display ONLY when vehicle transit has actually started and is currently en-route
            const activeOrder = inTransitOrders.find(
              (o) => o.dispatchStatus === 'IN_TRANSIT' || o.dispatchStatus === 'LOADED_AND_DISPATCHED'
            ) || inTransitOrders[0];

            if (!activeOrder) return null;

            const activeOrigin = activeOrder?.orderPersonPlace || 'Kashmir Apple Farm';
            const activeDest = activeOrder?.deliveryAddress?.includes('➔')
              ? activeOrder.deliveryAddress.split('➔')[1].replace('Regional Hub Receiving Desk', '').trim()
              : (targetHub || 'Warangal');
            const activeTruck = activeOrder?.dispatchVehicleNumber || 'TS09UB4521';

            return (
              <div className="bg-gradient-to-br from-slate-950 via-[#052b1b] to-slate-950 rounded-3xl p-4 sm:p-6 border border-emerald-500/30 shadow-xl overflow-hidden text-white relative">
                {/* Telemetry Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-emerald-500/20">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-black tracking-wider uppercase animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                        ● LIVE EN-ROUTE
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/90">
                        SAFAL REFRIGERATED HIGHWAY LOGISTICS
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white font-['Manrope'] mt-1 flex items-center gap-2">
                      <Truck className="text-emerald-400" size={20} />
                      Active Consignment Corridor: {activeOrigin} ➔ {activeDest} Hub
                    </h3>
                  </div>

                  {/* Live Telemetry Badges */}
                  <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                    <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-emerald-500/40 text-emerald-300 font-bold flex items-center gap-1.5 shadow-2xs">
                      <Activity size={13} className="text-emerald-400" />
                      <span>Speed: <strong>62 KM/H</strong></span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-teal-500/40 text-teal-300 font-bold flex items-center gap-1.5 shadow-2xs">
                      <Sparkles size={13} className="text-teal-400" />
                      <span>Reefer Temp: <strong>+2.8°C</strong></span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1.5 shadow-2xs">
                      <Navigation size={13} className="text-amber-400" />
                      <span>NH44 Cold Corridor</span>
                    </div>
                  </div>
                </div>

                {/* Highway Motion Corridor */}
                <div className="mt-4 relative">
                  {/* Origin & Destination Labels */}
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-200/90 mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-400" />
                      <span>Loading Origin: <strong className="text-white">{activeOrigin}</strong></span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                      <Clock size={12} />
                      <span>ETA to Hub: ~2h 45m</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-right">
                      <span>Destination: <strong className="text-amber-300">{activeDest} Regional Hub</strong></span>
                      <Building2 size={14} className="text-amber-400" />
                    </div>
                  </div>

                  {/* Animated Asphalt Highway Bar */}
                  <div className="relative h-24 sm:h-28 bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 rounded-2xl border-2 border-emerald-500/40 overflow-hidden shadow-inner flex items-center">
                    {/* Highway Lane Borders */}
                    <div className="absolute inset-x-0 top-2 h-[1px] bg-white/20" />
                    <div className="absolute inset-x-0 bottom-2 h-[1px] bg-white/20" />

                    {/* Animated moving road center dashed line */}
                    <div 
                      className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 opacity-90 pointer-events-none"
                      style={{
                        backgroundImage: 'repeating-linear-gradient(90deg, #FBBF24 0, #FBBF24 24px, transparent 24px, transparent 48px)',
                        backgroundSize: '48px 100%',
                        animation: 'highwayDash 0.6s linear infinite',
                      }}
                    />

                    {/* Animated Small Transparent SAFAL Reefer Truck */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 pointer-events-none select-none z-10"
                      style={{
                        animation: 'truckHighwayCruise 15s cubic-bezier(0.25, 0.1, 0.25, 1) infinite',
                      }}
                    >
                      <div className="relative flex items-center" style={{ animation: 'truckSuspension 0.8s ease-in-out infinite alternate' }}>
                        {/* Floating Truck Badge */}
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-900/95 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg border border-emerald-400 font-mono whitespace-nowrap z-20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                          <span>{activeTruck}</span>
                        </div>

                        {/* Crisp Transparent Vector SAFAL Reefer Truck */}
                        <svg width="124" height="54" viewBox="0 0 134 58" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_8px_18px_rgba(16,185,129,0.35)]">
                          <defs>
                            <linearGradient id="headlightBeam" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#FDE047" stopOpacity="0.8" />
                              <stop offset="60%" stopColor="#FDE047" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="reeferGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#FFFFFF" />
                              <stop offset="100%" stopColor="#E2E8F0" />
                            </linearGradient>
                            <linearGradient id="cabinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#0A9448" />
                              <stop offset="100%" stopColor="#044D25" />
                            </linearGradient>
                          </defs>

                          {/* Forward Headlight Light Beam */}
                          <polygon points="124,38 178,24 178,50" fill="url(#headlightBeam)" opacity="0.45" />

                          {/* Chassis & Underside */}
                          <rect x="8" y="42" width="118" height="4" rx="2" fill="#0F172A" />

                          {/* Reefer Box Trailer (White/Silver with SAFAL Logo) */}
                          <rect x="8" y="10" width="80" height="34" rx="3" fill="url(#reeferGrad)" stroke="#CBD5E1" strokeWidth="1.2" />
                          {/* Reefer Top Cooling Unit (ThermoKing/Carrier) */}
                          <rect x="10" y="5" width="16" height="7" rx="1.5" fill="#64748B" stroke="#475569" strokeWidth="0.8" />
                          {/* Active Cooling LED */}
                          <circle cx="23" cy="8.5" r="1.2" fill="#06B6D4" className="animate-pulse" />

                          {/* SAFAL Green Leaf Logo & Text on Trailer Body */}
                          <g transform="translate(18, 17)">
                            {/* Green Leaf Icon */}
                            <path d="M 0 10 C 0 3, 7 0, 11 0 C 11 7, 8 13, 0 13 Z" fill="#10B981" />
                            <path d="M 1 11 C 4 8, 8 5, 11 0" stroke="#047857" strokeWidth="0.8" fill="none" />
                            {/* Text SAFAL */}
                            <text x="14" y="10" fill="#064D2B" fontSize="11" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5">SAFAL</text>
                            {/* Cold Chain subtext */}
                            <text x="1" y="19" fill="#047857" fontSize="5" fontWeight="800" fontFamily="sans-serif" letterSpacing="0.8">COLD-CHAIN EXPRESS</text>
                          </g>

                          {/* Reefer Vertical Ribs */}
                          <line x1="86" y1="11" x2="86" y2="43" stroke="#CBD5E1" strokeWidth="1" />
                          <line x1="8" y1="11" x2="8" y2="43" stroke="#CBD5E1" strokeWidth="1" />

                          {/* Truck Cabin (Emerald Green Aerodynamic Cab) */}
                          <path d="M 88 44 L 88 18 Q 98 17 106 20 L 119 28 Q 124 32 124 37 L 124 44 Z" fill="url(#cabinGrad)" stroke="#064D2B" strokeWidth="1" />
                          {/* Windshield Glass */}
                          <path d="M 103 21 L 115 28 L 103 28 Z" fill="#0F172A" />
                          <path d="M 104 22 L 113 27.5 L 104 27.5 Z" fill="#38BDF8" opacity="0.6" />
                          {/* Driver Silhouette */}
                          <circle cx="106" cy="25" r="2" fill="#0F172A" />
                          {/* Chrome Front Grille */}
                          <rect x="122" y="36" width="3" height="7" rx="1" fill="#E2E8F0" />
                          {/* Xenon Headlight Bulb */}
                          <circle cx="123" cy="38" r="2.2" fill="#FDE047" stroke="#FEF08A" strokeWidth="0.8" />

                          {/* Wheels (3 Axles: 1 Steer at x=112, 2 Tandem at x=26 and x=48) */}
                          {/* Wheel 1 (Rear 1) */}
                          <g transform="translate(26, 44)">
                            <circle cx="0" cy="0" r="7.5" fill="#0F172A" stroke="#1E293B" strokeWidth="1.5" />
                            <circle cx="0" cy="0" r="4.2" fill="#94A3B8" />
                            <circle cx="0" cy="0" r="1.8" fill="#F1F5F9" />
                            <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="#475569" strokeWidth="1" style={{ animation: 'wheelSpin 0.5s linear infinite', transformOrigin: '0px 0px' }} />
                            <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#475569" strokeWidth="1" style={{ animation: 'wheelSpin 0.5s linear infinite', transformOrigin: '0px 0px' }} />
                          </g>

                          {/* Wheel 2 (Rear 2) */}
                          <g transform="translate(48, 44)">
                            <circle cx="0" cy="0" r="7.5" fill="#0F172A" stroke="#1E293B" strokeWidth="1.5" />
                            <circle cx="0" cy="0" r="4.2" fill="#94A3B8" />
                            <circle cx="0" cy="0" r="1.8" fill="#F1F5F9" />
                            <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="#475569" strokeWidth="1" style={{ animation: 'wheelSpin 0.5s linear infinite', transformOrigin: '0px 0px' }} />
                            <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#475569" strokeWidth="1" style={{ animation: 'wheelSpin 0.5s linear infinite', transformOrigin: '0px 0px' }} />
                          </g>

                          {/* Wheel 3 (Front Steer) */}
                          <g transform="translate(112, 44)">
                            <circle cx="0" cy="0" r="7.5" fill="#0F172A" stroke="#1E293B" strokeWidth="1.5" />
                            <circle cx="0" cy="0" r="4.2" fill="#94A3B8" />
                            <circle cx="0" cy="0" r="1.8" fill="#F1F5F9" />
                            <line x1="-3.5" y1="0" x2="3.5" y2="0" stroke="#475569" strokeWidth="1" style={{ animation: 'wheelSpin 0.5s linear infinite', transformOrigin: '0px 0px' }} />
                            <line x1="0" y1="-3.5" x2="0" y2="3.5" stroke="#475569" strokeWidth="1" style={{ animation: 'wheelSpin 0.5s linear infinite', transformOrigin: '0px 0px' }} />
                          </g>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Checkpoint Milestones Progress */}
                  <div className="mt-3 flex items-center justify-between text-[10px] sm:text-[11px] text-gray-400 font-medium flex-wrap gap-2">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle2 size={12} /> 1. Farm Loading Confirmed
                    </span>
                    <span className="flex items-center gap-1 text-amber-300 font-black animate-pulse">
                      <Activity size={12} /> 2. Cold Reefer Transit Active (68% Complete)
                    </span>
                    <span className="flex items-center gap-1 text-gray-300 font-bold">
                      <Scale size={12} /> 3. Regional Hub Mandi Weighment Pending
                    </span>
                  </div>
                </div>

                {/* Inline CSS Keyframes */}
                <style>{`
                  @keyframes highwayDash {
                    0% { background-position: 0 0; }
                    100% { background-position: -48px 0; }
                  }
                  @keyframes wheelSpin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                  @keyframes truckSuspension {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-2px); }
                  }
                  @keyframes truckHighwayCruise {
                    0% { left: 2%; opacity: 1; }
                    86% { left: calc(98% - 134px); opacity: 1; }
                    90% { left: calc(98% - 134px); opacity: 1; }
                    94% { left: calc(98% - 134px); opacity: 0; }
                    96% { left: 2%; opacity: 0; }
                    100% { left: 2%; opacity: 1; }
                  }
                `}</style>
              </div>
            );
          })()}

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
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto flex-shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 320 320" className="w-full h-full transform -rotate-90 select-none">
                      {(() => {
                        const radius = 104;
                        const circumference = 2 * Math.PI * radius; // ~653.45
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
                              strokeWidth="24"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-500 hover:opacity-85 cursor-pointer"
                            />
                          );
                        });
                      })()}
                    </svg>
                    {/* Center Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-3">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Total Volume</span>
                      <strong className="text-2xl sm:text-3xl font-black text-gray-900 font-['Manrope'] block my-0.5">
                        {totalVolumeBoxes.toLocaleString('en-IN')}
                      </strong>
                      <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
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
                <div className="w-full overflow-x-auto pb-2 pt-2">
                  <svg viewBox="0 0 520 220" className="w-full h-56 select-none font-sans min-w-[460px] sm:min-w-full">
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
                  Quality grade certified and final balance settlement released by Safal.
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
                    {(() => {
                      const settle = (po as any).settlementDetails;
                      const hasSafalSettlement = Boolean(settle?.hasSettlementEntry || settle?.settlementCompleted);
                      const dueAmount = hasSafalSettlement ? Number(settle.finalBalanceDue ?? po.pendingAmount ?? 0) : 0;
                      return (
                        <div className="text-xs text-gray-500 flex items-center gap-3 flex-wrap">
                          <span>Total Value: <strong className="text-gray-900">₹{Number(po.grandTotal || po.totalAmount || 0).toLocaleString('en-IN')}</strong></span>
                          <span>Advance: <strong className="text-emerald-700">₹{Number(po.advanceAmount || 0).toLocaleString('en-IN')}</strong></span>
                          <span>
                            Balance Due: <strong className={dueAmount > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                              ₹{dueAmount.toLocaleString('en-IN')}
                            </strong>
                            {!hasSafalSettlement && (
                              <span className="text-[10px] text-gray-400 ml-1 font-medium">(Settled by Safal)</span>
                            )}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {isBulkWeighmentFruit(po.fruitName) && (
                      <button
                        type="button"
                        onClick={() => openRecordQCModal(po.id)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#087A3E] border border-emerald-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Submit weighbridge gross & tare scale slip for bulk fruit"
                      >
                        <Scale size={13} /> Record Scale Slip
                      </button>
                    )}
                    {(!po.dispatchVehicleNumber || po.dispatchVehicleNumber === '-') ? (
                      <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                        <Clock size={13} className="text-amber-700 animate-spin" /> Awaiting Vehicle Allotment
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openDispatchModal(po)}
                        className="px-3 py-1.5 rounded-xl bg-[#087A3E] hover:bg-[#064D2B] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Truck size={13} /> Load &amp; Sign Dispatch
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Tab Content: Dispatch Queue & Fleet Transit Management */}
      {activeTab === 'dispatch' && (
        <section className="bg-white rounded-3xl border border-[#D5E3D8] shadow-sm overflow-hidden p-4 sm:p-6 space-y-5">
          {/* Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="text-amber-600" size={24} />
                <h2 className="text-xl font-extrabold text-gray-900">
                  Consignments Dispatch &amp; Transit Tracking Desk
                </h2>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Real-time tracking of pending vehicle loading, on-road transit consignments, and hub delivery clearance.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black inline-flex items-center gap-1.5">
                <Clock size={13} className="text-amber-700" />
                <span>{pendingDispatchOrders.length} Ready for Loading</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-300 text-xs font-black inline-flex items-center gap-1.5">
                <Truck size={13} className="text-blue-700" />
                <span>{inTransitOrders.length} In Transit</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black inline-flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-700" />
                <span>{completedOrders.length} Cleared &amp; Completed</span>
              </span>
            </div>
          </div>

          {/* If there are orders awaiting vehicle allotment */}
          {awaitingAllotmentOrders.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-50 to-white border-2 border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Clock size={18} />
                </div>
                <div>
                  <strong className="text-sm font-extrabold text-amber-950 block">
                    {awaitingAllotmentOrders.length} Consignment PO(s) Awaiting Safal Hub Vehicle Allotment
                  </strong>
                  <span className="text-xs text-amber-800">
                    Safal Logistics team is reviewing your farm origin and assigning authorized refrigerated transport. Once allotted, carton loading &amp; digital dispatch will unlock.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* If there are pending dispatch orders, show a priority action callout banner */}
          {pendingDispatchOrders.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-50 to-emerald-50 border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Upload size={18} />
                </div>
                <div>
                  <strong className="text-sm font-extrabold text-amber-950 block">
                    {pendingDispatchOrders.length} Consignment(s) Awaiting Dispatch Proof Submission
                  </strong>
                  <span className="text-xs text-amber-800">
                    Upload vehicle photo with visible registration plate &amp; transporter bilty to initiate live transit and advance clearance.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openDispatchModal(pendingDispatchOrders[0])}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto active:scale-95"
              >
                <Truck size={14} /> Load &amp; Sign Dispatch: {pendingDispatchOrders[0].poNumber}
              </button>
            </div>
          )}

          {/* Filter Pills & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDispatchTabFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                  dispatchTabFilter === 'ALL'
                    ? 'bg-[#064D2B] text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>All Consignments</span>
                {orders.length > 0 && (
                  <sup className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-emerald-700 text-white leading-none">
                    {orders.length}
                  </sup>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDispatchTabFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                  dispatchTabFilter === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>Ready for Loading</span>
                {pendingDispatchOrders.length > 0 && (
                  <sup className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white leading-none">
                    {pendingDispatchOrders.length}
                  </sup>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDispatchTabFilter('IN_TRANSIT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                  dispatchTabFilter === 'IN_TRANSIT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>In Transit</span>
                {inTransitOrders.length > 0 && (
                  <sup className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-blue-500 text-white leading-none">
                    {inTransitOrders.length}
                  </sup>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDispatchTabFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                  dispatchTabFilter === 'COMPLETED'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>Delivered &amp; Cleared ✓</span>
                {completedOrders.length > 0 && (
                  <sup className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-emerald-600 text-white leading-none">
                    {completedOrders.length}
                  </sup>
                )}
              </button>
            </div>

            <div className="relative sm:w-72">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={dispatchTabSearch}
                onChange={(e) => setDispatchTabSearch(e.target.value)}
                placeholder="Search PO #, Hub, Fruit, Truck..."
                className="w-full h-8 pl-8 pr-3 border border-gray-300 rounded-xl text-xs font-medium text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Unified Consignments Dispatch & Transit Table */}
          <div className="overflow-x-auto w-full rounded-2xl border border-gray-200 shadow-2xs">
            <table className="w-full border-collapse min-w-[980px] text-xs">
              <thead>
                <tr className="bg-[#064D2B] text-white">
                  <th className="py-3 px-3 text-center font-bold w-12 border-r border-[#085A33]">S.No.</th>
                  <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Consignment PO # &amp; Date</th>
                  <th className="py-3 px-3 text-left font-bold border-r border-[#085A33]">Commodity &amp; Volume</th>
                  <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Destination Hub</th>
                  <th className="py-3 px-3 text-left font-bold border-r border-[#085A33]">Vehicle &amp; Transporter</th>
                  <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Dispatch Proofs</th>
                  <th className="py-3 px-3 text-right font-bold border-r border-[#085A33]">Advance Amount</th>
                  <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Consignment Status</th>
                  <th className="py-3 px-3 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredDispatchTabOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <Truck size={36} className="mx-auto text-gray-300 mb-2" />
                      <p className="font-bold text-gray-700 text-sm">No consignments found</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {dispatchTabSearch ? `No matches for "${dispatchTabSearch}"` : 'No purchase orders in this dispatch filter.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredDispatchTabOrders.map((po, index) => {
                    const total = Number(po.grandTotal || po.totalAmount || 0);
                    const settle = (po as any).settlementDetails || {};
                    const advance = Number(settle.advanceAmount ?? po.advanceAmount ?? Math.round(total * 0.55));
                    const adminShare = Number(settle.adminShareAmount ?? Math.round(total * 0.05));
                    const apmcShare = Number(settle.apmcShareAmount ?? Math.round(total * 0.01));
                    const totalDeductions = adminShare + apmcShare;
                    const netVendorPayable = Number(settle.netVendorPayable ?? Math.max(0, total - totalDeductions));
                    const calculatedDue = Math.max(0, netVendorPayable - advance);
                    const remainingDue = settle.finalBalanceDue !== undefined
                      ? Number(settle.finalBalanceDue)
                      : (po.status === 'CLOSED' && Number(po.pendingAmount || 0) === 0 ? 0 : (po.pendingAmount ? Number(po.pendingAmount) : calculatedDue));
                    const isFullyCleared = remainingDue === 0 && (Boolean(settle.settlementCompleted) || (po.status === 'CLOSED' && Number(po.pendingAmount || 0) === 0));
                    const isAppleConsignment = po.fruitName === 'Kashmir Apples' || po.fruitName?.toLowerCase().includes('apple') || po.items?.some(it => it.fruitName?.toLowerCase().includes('apple'));
                    const totalBoxes = po.items && po.items.length > 0 ? po.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : 0;
                    const isPendingDispatch = (!po.dispatchStatus || po.dispatchStatus === 'PENDING_DISPATCH') && !isFullyCleared;
                    const isInTransit = (po.dispatchStatus === 'LOADED_AND_DISPATCHED' || po.dispatchStatus === 'IN_TRANSIT') && !isFullyCleared;

                    return (
                      <tr key={po.id} className="hover:bg-emerald-50/20 transition">
                        {/* S.No */}
                        <td className="text-center py-3.5 px-3 font-mono font-bold text-gray-500 border-r border-gray-100">
                          {index + 1}
                        </td>

                        {/* PO Number & Initiate Date */}
                        <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                          <strong className="text-emerald-800 font-mono font-bold text-xs block">
                            {po.poNumber}
                          </strong>
                          <span className="text-[10px] text-gray-500 font-semibold inline-flex items-center gap-1 mt-0.5">
                            <Calendar size={10} className="text-emerald-700" />
                            Initiated: {po.poDate ? new Date(po.poDate).toLocaleDateString('en-GB') : (po.createdAt ? new Date(po.createdAt).toLocaleDateString('en-GB') : '-')}
                          </span>
                        </td>

                        {/* Commodity & Volume */}
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
                                <span>{totalBoxes} {po.items[0]?.unit || 'BOX'}</span>
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

                        {/* Vehicle & Transporter */}
                        <td className="py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                          {po.dispatchVehicleNumber ? (
                            <div>
                              <strong className="text-xs font-mono font-black text-gray-900 block">
                                {po.dispatchVehicleNumber}
                              </strong>
                              <span className="text-[10px] text-gray-500 block truncate max-w-[170px]">
                                {po.transporterName || 'Transporter Assigned'} {po.driverPhone ? `· ${po.driverPhone}` : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Vehicle Not Assigned
                            </span>
                          )}
                        </td>

                        {/* Dispatch Proofs */}
                        <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                          {po.vehiclePhotoUrl || po.transportBillUrl ? (
                            <div className="flex items-center justify-center gap-1">
                              {po.vehiclePhotoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewMediaModal({ url: po.vehiclePhotoUrl!, title: `Truck Photo: ${po.dispatchVehicleNumber || po.poNumber}` })}
                                  className="px-2 py-0.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Camera size={10} /> Photo ✓
                                </button>
                              )}
                              {po.transportBillUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewMediaModal({ url: po.transportBillUrl!, title: `Transport Bill (Bilty): ${po.poNumber}` })}
                                  className="px-2 py-0.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <ReceiptText size={10} /> Bilty ✓
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                              Proof Pending
                            </span>
                          )}
                        </td>

                        {/* 55% Advance Cleared */}
                        <td className="text-right py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                          <strong className="text-emerald-700 font-black block">
                            ₹{advance.toLocaleString('en-IN')}
                          </strong>
                          {settle.advanceDisbursed ? (
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                                Paid by {settle.advancePayingHub || po.orderPersonPlace || 'Warangal Hub'} ✓
                              </span>
                              {settle.advanceProofUrl && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewMediaModal({
                                      url: settle.advanceProofUrl!,
                                      title: `Advance Bank Payment Receipt: ${po.poNumber} (${settle.advancePayingHub || 'Warangal Hub'})`,
                                    })
                                  }
                                  className="px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[9px] font-extrabold inline-flex items-center gap-0.5 cursor-pointer shadow-2xs"
                                  title="View Advance Payment Proof Slip"
                                >
                                  <Eye size={9} /> Receipt
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 block font-mono">
                              of ₹{total.toLocaleString('en-IN')}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                          {isFullyCleared ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-700" /> Cleared ✓
                            </span>
                          ) : po.dispatchStatus === 'DELIVERED_AT_HUB' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                              <Clock size={12} className="text-amber-700" /> Awaiting Safal Clearance{remainingDue > 0 ? ` (₹${remainingDue.toLocaleString('en-IN')} Due)` : ''}
                            </span>
                          ) : isInTransit ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300 inline-flex items-center gap-1">
                              <Truck size={12} className="text-blue-700" /> In Transit (₹{remainingDue.toLocaleString('en-IN')} Due)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                              <Clock size={12} className="text-amber-700" /> Ready for Loading
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="text-center py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedPODetail(po)}
                              className="h-7 px-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 whitespace-nowrap transition"
                              title="View full PO settlement statement"
                            >
                              <Eye size={12} /> Dossier
                            </button>
                            {isPendingDispatch && (
                              (!po.dispatchVehicleNumber || po.dispatchVehicleNumber === '-') ? (
                                <span className="h-7 px-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
                                  <Clock size={11} className="text-amber-700 animate-spin" /> Awaiting Allotment
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openDispatchModal(po)}
                                  className="h-7 px-2.5 bg-[#087A3E] hover:bg-[#064D2B] text-white rounded-lg font-bold text-[11px] transition shadow-xs cursor-pointer inline-flex items-center gap-1 active:scale-95 whitespace-nowrap"
                                >
                                  <Truck size={12} /> Load &amp; Sign
                                </button>
                              )
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
        </section>
      )}

      {/* 5. Tab Content: Fruit Supply Consignments */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
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
                <Plus size={15} /> Create Supply Consignment
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-3.5 bg-gray-50/80 border-b border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setConsignmentFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                  consignmentFilter === 'ALL'
                    ? 'bg-[#064D2B] text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>All Consignments</span>
                {orders.length > 0 && (
                  <sup className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-emerald-700 text-white leading-none">
                    {orders.length}
                  </sup>
                )}
              </button>
              <button
                type="button"
                onClick={() => setConsignmentFilter('PENDING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                  consignmentFilter === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>Pending Dispatch</span>
                {pendingDispatchOrders.length > 0 && (
                  <sup className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white leading-none">
                    {pendingDispatchOrders.length}
                  </sup>
                )}
              </button>
              <button
                type="button"
                onClick={() => setConsignmentFilter('IN_TRANSIT')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                  consignmentFilter === 'IN_TRANSIT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>In Transit</span>
                {inTransitOrders.length > 0 && (
                  <sup className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-blue-500 text-white leading-none">
                    {inTransitOrders.length}
                  </sup>
                )}
              </button>
              <button
                type="button"
                onClick={() => setConsignmentFilter('AWAITING_CLEARANCE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                  consignmentFilter === 'AWAITING_CLEARANCE'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>Awaiting Clearance</span>
                {awaitingClearanceOrders.length > 0 && (
                  <sup className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-amber-500 text-white leading-none">
                    {awaitingClearanceOrders.length}
                  </sup>
                )}
              </button>
              <button
                type="button"
                onClick={() => setConsignmentFilter('CLEARED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-1 ${
                  consignmentFilter === 'CLEARED' || consignmentFilter === 'DELIVERED'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>Cleared ✓</span>
                {clearedOrders.length > 0 && (
                  <sup className="px-1.5 py-0.5 text-[9px] font-black rounded-full bg-emerald-600 text-white leading-none">
                    {clearedOrders.length}
                  </sup>
                )}
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
            <table className="w-full border-collapse min-w-[1100px] text-xs">
              <thead>
                <tr className="bg-[#064D2B] text-white">
                  <th className="py-3 px-3 text-center font-bold w-12 border-r border-[#085A33]">S.No.</th>
                  <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Consignment PO #</th>
                  <th className="py-3 px-3 text-left font-bold border-r border-[#085A33]">Fruit &amp; Layer Breakdown</th>
                  <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Destination Hub</th>
                  <th className="py-3 px-3 text-right font-bold border-r border-[#085A33]">Gross Value</th>
                  <th className="py-3 px-3 text-right font-bold border-r border-[#085A33]">Advance Amount</th>
                  <th className="py-3 px-3 text-right font-bold border-r border-[#085A33]">Charges (6%)</th>
                  <th className="py-3 px-3 text-right font-bold border-r border-[#085A33]">Net Balance Due</th>
                  <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Vendor Profit</th>
                  <th className="py-3 px-3 text-center font-bold border-r border-[#085A33]">Status</th>
                  <th className="py-3 px-3 text-center font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-gray-400">
                      <ShoppingCart size={32} className="mx-auto mb-2 text-gray-300" />
                      No supply consignments found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((po, idx) => {
                    const total = Number(po.grandTotal || 0);
                    const settle = (po as any).settlementDetails || {};
                    const advance = Number(settle.advanceAmount ?? po.advanceAmount ?? Math.round(total * 0.55));
                    const adminShare = Number(settle.adminShareAmount ?? Math.round(total * 0.05));
                    const apmcShare = Number(settle.apmcShareAmount ?? Math.round(total * 0.01));
                    const totalDeductions = adminShare + apmcShare;
                    const netVendorPayable = Number(settle.netVendorPayable ?? Math.max(0, total - totalDeductions));

                    // Safal Mandi Sales Realization Check:
                    // Net Balance Due & Mandi Deductions are 0 until Safal accounts records the sales settlement!
                    const hasSettlementEntry = Boolean(
                      settle.hasSettlementEntry ||
                      settle.settlementCompleted ||
                      (po.status === 'CLOSED' && Number(po.pendingAmount || 0) === 0 && Number(settle.finalBalancePaid || 0) > 0)
                    );
                    const remainingDue = hasSettlementEntry ? Number(settle.finalBalanceDue ?? 0) : 0;

                    // STRICT CLEARANCE RULE: "1 ruppe unna clear radhu open ane vastadhi"
                    const isFullyCleared = hasSettlementEntry && remainingDue === 0 && (Boolean(settle.settlementCompleted) || (po.status === 'CLOSED' && Number(po.pendingAmount || 0) === 0 && Number(settle.finalBalancePaid || 0) > 0));
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
                            <span className="text-[10px] text-gray-500 block font-semibold flex items-center justify-center gap-1 mt-0.5">
                              <Calendar size={10} className="text-emerald-700" />
                              Initiated: {po.poDate ? new Date(po.poDate).toLocaleDateString('en-GB') : (po.createdAt ? new Date(po.createdAt).toLocaleDateString('en-GB') : '-')}
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
                            <strong className="font-mono font-black text-gray-900 block text-xs">
                              ₹{total.toLocaleString('en-IN')}
                            </strong>
                          </td>

                          {/* Advance Amount */}
                          <td className="text-right py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            <strong className="text-emerald-700 font-black block font-mono text-xs">
                              ₹{advance.toLocaleString('en-IN')}
                            </strong>
                            <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                              Paid by {settle.advancePayingHub || po.orderPersonPlace || 'Warangal Hub'} ✓
                            </span>
                          </td>

                          {/* Charges (6% Mandi: 5% Safal + 1% APMC) - ₹0.00 until Safal settles consignment */}
                          <td className="text-right py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            {isFullyCleared || hasSettlementEntry ? (
                              <div>
                                <strong className="text-rose-600 font-black block font-mono text-xs">
                                  -₹{totalDeductions.toLocaleString('en-IN')}
                                </strong>
                                <span className="text-[9px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 inline-block mt-0.5">
                                  5% Safal (-₹{adminShare.toLocaleString('en-IN')}) + 1% APMC (-₹{apmcShare.toLocaleString('en-IN')})
                                </span>
                              </div>
                            ) : (
                              <div>
                                <strong className="text-gray-900 font-black block font-mono text-xs">
                                  ₹0.00
                                </strong>
                                <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 inline-block mt-0.5">
                                  Pending Safal Settlement
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Net Balance Due (Cleared shows actual Net Balance paid by Safal; 0 if pending sales realization) */}
                          <td className="text-right py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            {isFullyCleared ? (
                              <div>
                                <strong className="text-emerald-700 font-black block font-mono text-xs">
                                  ₹{Number(
                                    settle.finalBalancePaid > 0 && settle.finalBalancePaid <= total
                                      ? settle.finalBalancePaid
                                      : (netVendorPayable - advance) > 0
                                      ? (netVendorPayable - advance)
                                      : (total - advance)
                                  ).toLocaleString('en-IN')}
                                </strong>
                                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                                  Cleared by Safal ✓
                                </span>
                              </div>
                            ) : hasSettlementEntry && remainingDue > 0 ? (
                              <div>
                                <strong className="text-[#C2410C] font-black block font-mono text-sm">
                                  ₹{remainingDue.toLocaleString('en-IN')}
                                </strong>
                                <span className="text-[9px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                                  OPEN (Due Pending)
                                </span>
                              </div>
                            ) : (
                              <div>
                                <strong className="text-gray-900 font-black block font-mono text-xs">₹0.00</strong>
                                <span
                                  className="text-[9px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-300 inline-block mt-0.5"
                                  title="Net balance due will appear once Safal accounts enters Mandi sales realization"
                                >
                                  Pending Safal Realization
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Vendor Profit / Realized Gain */}
                          <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            {(() => {
                              const fin = (po as any).financialRecord;
                              const hasPL = fin && fin.realizedProfitLoss !== null && fin.realizedProfitLoss !== undefined;
                              if (hasPL) {
                                const plVal = Number(fin.realizedProfitLoss);
                                return (
                                  <div>
                                    <strong className={`block font-mono text-xs ${plVal >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                      {plVal >= 0 ? '+' : '-'}₹{Math.abs(Math.round(plVal)).toLocaleString('en-IN')}
                                    </strong>
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${
                                      plVal >= 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}>
                                      {plVal >= 0 ? 'Net Profit' : 'Loss'}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <span className="text-[10px] text-gray-400 italic">
                                  Pending Realization
                                </span>
                              );
                            })()}
                          </td>

                          {/* Status */}
                          <td className="text-center py-3.5 px-3 border-r border-gray-100 whitespace-nowrap">
                            {isFullyCleared ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1">
                                <CheckCircle2 size={12} className="text-emerald-700" /> Cleared ✓
                              </span>
                            ) : hasSettlementEntry && remainingDue > 0 ? (
                              <span
                                className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1"
                                title="Safal entered settlement. Consignment remains open until full balance is paid."
                              >
                                <Clock size={12} className="text-amber-700" /> Awaiting Safal Clearance (₹{remainingDue.toLocaleString('en-IN')} Due)
                              </span>
                            ) : po.dispatchStatus === 'DELIVERED_AT_HUB' || po.dispatchVehicleNumber || po.vehiclePhotoUrl ? (
                              <span
                                className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1"
                                title="Consignment dispatched and submitted. Awaiting Safal Mandi sales realization & clearance."
                              >
                                <Clock size={12} className="text-amber-700" /> Awaiting Safal Clearance
                              </span>
                            ) : po.dispatchStatus === 'LOADED_AND_DISPATCHED' || po.dispatchStatus === 'IN_TRANSIT' ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300 inline-flex items-center gap-1">
                                <Truck size={12} className="text-blue-700" /> In Transit
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-800 border border-gray-300 inline-flex items-center gap-1">
                                <Clock size={12} /> Pending Dispatch
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="text-center py-3 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPODetail(po);
                                }}
                                className="h-7 px-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 whitespace-nowrap transition"
                                title="View full PO settlement statement & commercial realization"
                              >
                                <Eye size={12} /> Dossier
                              </button>

                              {po.dispatchStatus === 'PENDING_DISPATCH' && (
                                (!po.dispatchVehicleNumber || po.dispatchVehicleNumber === '-') ? (
                                  <span className="h-7 px-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg font-bold text-[10px] inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
                                    <Clock size={11} className="text-amber-700 animate-spin" /> Awaiting Allotment
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDispatchModal(po);
                                    }}
                                    className="h-7 px-2.5 bg-[#087A3E] hover:bg-[#064D2B] text-white rounded-lg font-bold text-[11px] inline-flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 whitespace-nowrap transition"
                                  >
                                    <Truck size={12} /> Load &amp; Sign
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* SEPARATE DEDICATED SECTION: VERIFIED SLIPS & DOCUMENTS */}
        <section className="bg-white rounded-3xl border border-[#D5E3D8] shadow-sm overflow-hidden p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-gray-100 gap-2">
            <div>
              <span className="text-[10px] uppercase font-black text-emerald-800 tracking-wider block">
                OFFICIAL AUDIT PROOFS
              </span>
              <h3 className="text-base font-black text-gray-900 font-['Manrope'] flex items-center gap-2">
                <FileText size={18} className="text-[#087A3E]" />
                Verified Slips &amp; Documents
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                (Click any document to inspect full-screen proof with timestamp &amp; watermark)
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold self-start sm:self-auto flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 size={13} className="text-emerald-700" />
              <span>Geo-Stamped &amp; Verified Slips ✓</span>
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredOrders.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                No consignment proof documents available.
              </div>
            ) : (
              filteredOrders.map((po) => {
                const total = Number(po.grandTotal || po.totalAmount || 0);
                const settle = (po as any).settlementDetails || {};
                const advance = Number(settle.advanceAmount ?? po.advanceAmount ?? Math.round(total * 0.55));
                const isFullyCleared = Boolean(settle.settlementCompleted && Number(settle.finalBalanceDue ?? 0) === 0);

                return (
                  <div
                    key={po.id}
                    className="py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-emerald-50/20 px-3 rounded-2xl transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono font-bold text-xs text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 flex-shrink-0">
                        {po.poNumber}
                      </span>
                      <div className="min-w-0">
                        <strong className="text-xs text-gray-900 block truncate">
                          {po.fruitName || 'Fresh Fruits'}
                        </strong>
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <MapPin size={10} className="text-emerald-700 flex-shrink-0" />
                          <span>{po.orderPersonPlace || 'Warangal Hub'}</span>
                          <span className="text-gray-300">·</span>
                          <span>Vehicle: <strong>{po.dispatchVehicleNumber || 'Pending'}</strong></span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 1. Vehicle Photo */}
                      {po.vehiclePhotoUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewMediaModal({
                            url: po.vehiclePhotoUrl!,
                            title: `Vehicle Dispatch Photo: ${po.dispatchVehicleNumber || po.poNumber}`,
                          })}
                          className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition active:scale-95"
                          title="View vehicle photo"
                        >
                          <Camera size={11} className="text-emerald-600" />
                          <span>Vehicle Photo ({po.dispatchVehicleNumber || 'Loaded'})</span>
                          <Eye size={10} className="text-emerald-700 ml-0.5" />
                        </button>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-[10px] font-medium flex items-center gap-1">
                          <Camera size={11} /> Vehicle Photo Pending
                        </span>
                      )}

                      {/* 2. Transport Bilty / E-Signature */}
                      {po.transportBillUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewMediaModal({
                            url: po.transportBillUrl!,
                            title: `Consignment Authorization & Bilty: ${po.poNumber}`,
                          })}
                          className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition active:scale-95"
                          title="View authorization signature or transport bilty"
                        >
                          <Pencil size={11} className="text-emerald-700" />
                          <span>E-Signature / Bilty</span>
                          <Eye size={10} className="text-emerald-800 ml-0.5" />
                        </button>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-[10px] font-medium flex items-center gap-1">
                          <Pencil size={11} /> Signature Pending
                        </span>
                      )}

                      {/* 3. Advance Payment Bank Slip */}
                      {settle.advanceProofUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewMediaModal({
                            url: settle.advanceProofUrl!,
                            title: `Advance Payment Receipt: ${po.poNumber} (${settle.advancePayingHub || 'Warangal Hub'})`,
                          })}
                          className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-400 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-2xs cursor-pointer transition active:scale-95"
                          title="View advance payment receipt slip"
                        >
                          <CreditCard size={11} className="text-emerald-700" />
                          <span>Advance Slip (₹{advance.toLocaleString('en-IN')})</span>
                          <Eye size={10} className="text-emerald-800 ml-0.5" />
                        </button>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg text-[10px] font-medium flex items-center gap-1">
                          <CreditCard size={11} /> Advance Slip Pending
                        </span>
                      )}

                      {/* 4. Final Settlement Slip */}
                      {settle.finalSettlementProofUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewMediaModal({
                            url: settle.finalSettlementProofUrl!,
                            title: `Final Settlement Clearance Slip: ${po.poNumber} (${settle.finalSettlingHub || 'Warangal Hub'})`,
                          })}
                          className="px-2.5 py-1.5 bg-white hover:bg-purple-50 text-purple-900 border border-purple-300 rounded-lg text-[10px] font-black flex items-center gap-1 shadow-2xs cursor-pointer transition active:scale-95"
                          title="View final commercial settlement receipt"
                        >
                          <Scale size={11} className="text-purple-700" />
                          <span>Final Settlement Slip</span>
                          <Eye size={10} className="text-purple-800 ml-0.5" />
                        </button>
                      ) : isFullyCleared ? (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-bold">
                          Settlement Realized ✓
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-semibold">
                          Settlement Slip Awaiting Clearance
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
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
                  Official commercial registration and direct bank coordinates are permanently locked by Safal. Contact Safal Management for any profile or disbursement updates.
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 text-[11px] font-black uppercase flex items-center gap-1 flex-shrink-0 self-start sm:self-auto">
              <ShieldCheck size={12} /> Safal Controlled
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
                <Plus size={15} /> Record Weighbridge &amp; QC Slip
              </button>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black inline-flex items-center gap-1.5">
                <BadgeCheck size={14} className="text-emerald-700" />
                <span>Mandi Scale Verified</span>
              </span>
            </div>
          </div>

          {/* Bulk Fruit Weighbridge Policy Banner */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-950">
            <Scale size={22} className="text-emerald-700 flex-shrink-0" />
            <div>
              <strong className="block text-emerald-900 font-black">Weighbridge Scale Slip Policy Notice:</strong>
              <span>
                Electronic gross/tare weighbridge scale slips are strictly required for bulk-weight commodities (<strong>Watermelon &amp; Muskmelon</strong>). Boxed/crated fruits (<strong>Kashmir Apples, Pomegranates, Bananas, Oranges, Plums</strong>) are audited and verified upon arrival by standard crate count.
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
                    <Plus size={16} /> Enter Weighbridge &amp; QC Scale Slip Now
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
                      ) : !isBulkWeighmentFruit(order.fruitName) ? (
                        <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0" />
                            <span>
                              Boxed Fruit Consignment ({order.fruitName || 'Kashmir Apples'}): Audited upon arrival by crate count ({order.items?.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0) || 'Standard'} Cartons). Electronic weighbridge scale slip is not required for boxed fruits.
                            </span>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black inline-flex items-center gap-1 whitespace-nowrap shadow-2xs">
                            <CheckCircle2 size={13} className="text-emerald-700" /> Carton Count Verified ✓
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-blue-600 flex-shrink-0" />
                            <span>
                              Bulk Fruit ({order.fruitName || 'Watermelon / Muskmelon'}). Official weighbridge gross &amp; tare weights pending.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openRecordQCModal(order.id)}
                            className="px-3.5 py-1.5 bg-[#087A3E] hover:bg-[#064D2B] text-white rounded-lg text-xs font-black inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
                          >
                            <Scale size={14} /> Record Scale Slip for This PO
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

      {/* 6. Modal: Submit Vehicle Photo & Transport Bill (Step 2: Dispatch & Authorization) */}
      {selectedPOForDispatch && (
        <div
          className="modal-backdrop !z-[9999] fixed inset-0 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          style={{ zIndex: 9999, backgroundColor: 'rgba(6, 45, 25, 0.85)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !cameraModalConfig.open) setSelectedPOForDispatch(null);
          }}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full border border-gray-200 shadow-2xl p-4 sm:p-6 my-auto max-h-[94vh] flex flex-col relative"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="pb-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 grid place-items-center">
                  <Truck size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                      CONSIGNMENT DISPATCH &amp; AUTHORIZATION
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black">
                      Vehicle Allotted
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-gray-900 font-['Manrope'] mt-0.5">
                    Dispatch Order: {selectedPOForDispatch.poNumber}
                  </h2>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Route: <strong className="text-gray-800">{selectedPOForDispatch.orderPersonPlace || 'Farm Origin'}</strong> ➔ <strong className="text-emerald-800">{selectedPOForDispatch.deliveryAddress || 'Regional Hub'}</strong>
                  </p>
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

              {/* Section 1: Allotted Logistics Vehicle Details & Official Transporter Bilty */}
              <div className="p-3.5 bg-gray-50/80 border border-gray-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black text-gray-700 tracking-wider flex items-center gap-1.5">
                    <Truck size={14} className="text-[#087A3E]" /> Allotted Logistics Vehicle &amp; Carrier Allotment
                  </span>
                  <span className="text-[10px] font-bold text-gray-500">Safal Regional Allotment</span>
                </div>

                {/* Transporter Bilty (LR) Attached by Admin Card */}
                {selectedPOForDispatch.transportBillUrl ? (
                  <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#087A3E] text-white flex items-center justify-center flex-shrink-0">
                        <FileText size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-900">
                            Transporter Bilty (LR) Attached by Admin
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black">
                            Verified ✓
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          Official Consignment Note &amp; Carrier Allotment verified by Logistics Desk.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const bUrl = selectedPOForDispatch.transportBillUrl?.startsWith('/')
                          ? `/api${selectedPOForDispatch.transportBillUrl}`
                          : selectedPOForDispatch.transportBillUrl;
                        setPreviewMediaModal({
                          open: true,
                          title: `Transporter Bilty (LR) - PO ${selectedPOForDispatch.poNumber}`,
                          url: bUrl || '',
                          type: 'image',
                        });
                      }}
                      className="px-3.5 py-1.5 bg-[#087A3E] hover:bg-[#064D2B] text-white rounded-lg text-xs font-black shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto transition"
                    >
                      <Eye size={13} />
                      <span>View / Inspect Bilty</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center gap-2 text-[11px] text-amber-900 font-medium">
                    <AlertCircle size={14} className="text-amber-700 flex-shrink-0" />
                    <span>Physical Transporter Bilty copy provided with refrigerated truck.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                      <span>Vehicle Registration Number *</span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                        🔒 Allotted
                      </span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={vehicleNumber || selectedPOForDispatch.dispatchVehicleNumber || ''}
                      placeholder="e.g. TS09UB4521"
                      className="w-full h-9 px-2.5 border border-gray-300 rounded-xl font-mono text-xs font-bold text-gray-800 bg-gray-100 cursor-not-allowed outline-none uppercase select-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                      <span>Transporter / Agency Name</span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                        🔒 Allotted
                      </span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={transporterName || selectedPOForDispatch.transporterName || 'SAFAL Cold-Chain Express'}
                      placeholder="e.g. New Golden Roadways"
                      className="w-full h-9 px-2.5 border border-gray-300 rounded-xl text-xs text-gray-800 bg-gray-100 cursor-not-allowed outline-none font-medium select-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1 flex items-center justify-between">
                      <span>Driver Contact Phone</span>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                        🔒 Allotted
                      </span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={driverPhone || selectedPOForDispatch.driverPhone || 'Contact Dispatch Desk'}
                      placeholder="e.g. 9848012345"
                      className="w-full h-9 px-2.5 border border-gray-300 rounded-xl text-xs text-gray-800 bg-gray-100 cursor-not-allowed outline-none font-medium select-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Mandi Fruit Variety & Loaded Box Grading Matrix */}
              <div className="p-3 sm:p-4 bg-gradient-to-br from-red-50/40 via-amber-50/20 to-emerald-50/30 border border-amber-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] sm:text-xs uppercase font-extrabold text-[#064D2B] tracking-wider block">
                      Fruit Commodity &amp; Mandi Layer Box Grading
                    </span>
                    <p className="text-[10px] sm:text-[11px] text-gray-600 mt-0.5">
                      Confirm fruit cartons loaded onto truck <strong className="text-gray-900 font-mono">{vehicleNumber || selectedPOForDispatch.dispatchVehicleNumber}</strong>
                    </p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-100 text-[#064D2B] rounded-lg text-[10px] sm:text-[11px] font-black flex-shrink-0">
                    {selectedFruit}
                  </span>
                </div>

                {/* 7 Whitelisted Fruits Selection Chips */}
                <div className="p-2.5 bg-white border border-emerald-200 rounded-xl space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-gray-600 tracking-wider block flex items-center justify-between">
                    <span>SELECT FRUIT COMMODITY (WHITELISTED)</span>
                    <span className="text-emerald-700 font-bold">7 ALLOWED VARIETIES</span>
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
                            : 'bg-gray-50 hover:bg-emerald-50 text-gray-700 border border-gray-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full inline-block ${selectedFruit === fruit ? 'bg-emerald-400' : 'bg-gray-400'}`} />
                        {fruit}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Fruit Sizing & Pricing */}
                {isApple ? (
                  /* Apple Mandi Layer Grading Box Matrix (4L, 5L, Roll, Total, Amount) */
                  <div className="p-2.5 sm:p-3.5 bg-white border border-amber-200/80 rounded-xl space-y-3 shadow-2xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] sm:text-xs uppercase font-extrabold text-red-700 tracking-wider block">
                          APPLE MANDI LAYER BOX GRADING (4L / 5L / ROLL)
                        </span>
                        <p className="text-[10px] sm:text-[11px] text-gray-600 mt-0.5">
                          Wholesale apple telescopic cartons (~20-22 Kg/box). Enter loaded box counts.
                        </p>
                      </div>
                      <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-red-100 text-red-800 rounded-lg text-[10px] sm:text-[11px] font-black flex-shrink-0">
                        Kashmir Apples
                      </span>
                    </div>

                    {/* Mandi 3-Column Responsive Matrix */}
                    <div className="rounded-xl border border-emerald-200 bg-white shadow-2xs overflow-hidden w-full divide-y divide-gray-100">
                      <div className="bg-[#064D2B] text-white font-black text-[10px] sm:text-xs uppercase tracking-wider flex items-center px-2.5 sm:px-3 py-2.5">
                        <div className="w-[42%] text-left">LAYER GRADE</div>
                        <div className="w-[30%] text-center">NO. OF BOXES</div>
                        <div className="w-[28%] text-right">RATE (₹)</div>
                      </div>

                      {/* 4L Row */}
                      <div className="flex items-center px-2.5 sm:px-3 py-2.5 hover:bg-gray-50/70 transition">
                        <div className="w-[42%] pr-1">
                          <div className="font-extrabold text-gray-900 leading-tight text-xs sm:text-sm">4L (Large)</div>
                          <span className="text-[10px] text-gray-500 font-medium block">Premium 4-Layer</span>
                        </div>
                        <div className="w-[30%] flex justify-center">
                          <input
                            type="number"
                            min="0"
                            value={layer4LBoxes}
                            onChange={(e) => setLayer4LBoxes(e.target.value)}
                            placeholder="0"
                            className="w-16 sm:w-20 h-8 px-1 border border-gray-300 rounded-lg text-xs sm:text-sm font-bold text-gray-900 bg-white text-center focus:border-emerald-600 focus:outline-none shadow-2xs"
                          />
                        </div>
                        <div className="w-[28%] text-right">
                          <span className="inline-flex items-center justify-end px-1.5 sm:px-2 py-0.5 bg-gray-100 rounded text-gray-900 font-mono font-bold text-xs whitespace-nowrap">
                            ₹{Number(layer4LRate || 1498).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* 5L Row */}
                      <div className="flex items-center px-2.5 sm:px-3 py-2.5 hover:bg-gray-50/70 transition">
                        <div className="w-[42%] pr-1">
                          <div className="font-extrabold text-gray-900 leading-tight text-xs sm:text-sm">5L (Medium)</div>
                          <span className="text-[10px] text-gray-500 font-medium block">Standard 5-Layer</span>
                        </div>
                        <div className="w-[30%] flex justify-center">
                          <input
                            type="number"
                            min="0"
                            value={layer5LBoxes}
                            onChange={(e) => setLayer5LBoxes(e.target.value)}
                            placeholder="0"
                            className="w-16 sm:w-20 h-8 px-1 border border-gray-300 rounded-lg text-xs sm:text-sm font-bold text-gray-900 bg-white text-center focus:border-emerald-600 focus:outline-none shadow-2xs"
                          />
                        </div>
                        <div className="w-[28%] text-right">
                          <span className="inline-flex items-center justify-end px-1.5 sm:px-2 py-0.5 bg-gray-100 rounded text-gray-900 font-mono font-bold text-xs whitespace-nowrap">
                            ₹{Number(layer5LRate || 1100).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Roll Row */}
                      <div className="flex items-center px-2.5 sm:px-3 py-2.5 hover:bg-gray-50/70 transition">
                        <div className="w-[42%] pr-1">
                          <div className="font-extrabold text-gray-900 leading-tight text-xs sm:text-sm">Roll (Running)</div>
                          <span className="text-[10px] text-gray-500 font-medium block">Mandi Bulk Pack</span>
                        </div>
                        <div className="w-[30%] flex justify-center">
                          <input
                            type="number"
                            min="0"
                            value={rollBoxes}
                            onChange={(e) => setRollBoxes(e.target.value)}
                            placeholder="0"
                            className="w-16 sm:w-20 h-8 px-1 border border-gray-300 rounded-lg text-xs sm:text-sm font-bold text-gray-900 bg-white text-center focus:border-emerald-600 focus:outline-none shadow-2xs"
                          />
                        </div>
                        <div className="w-[28%] text-right">
                          <span className="inline-flex items-center justify-end px-1.5 sm:px-2 py-0.5 bg-gray-100 rounded text-gray-900 font-mono font-bold text-xs whitespace-nowrap">
                            ₹{Number(rollRate || 900).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Total Row */}
                      <div className="flex items-center px-2.5 sm:px-3 py-2.5 bg-emerald-50/90 font-black border-t-2 border-emerald-300 text-xs">
                        <div className="w-[42%] uppercase text-[10px] sm:text-xs text-gray-900 font-black">
                          TOTAL CONSIGNMENT
                        </div>
                        <div className="w-[30%] text-center text-xs sm:text-sm font-black text-gray-900 whitespace-nowrap">
                          {totalAppleBoxes.toLocaleString('en-IN')} Boxes
                        </div>
                        <div className="w-[28%] text-right text-[10px] sm:text-xs text-gray-600 font-bold whitespace-nowrap">
                          Mandi Rate
                        </div>
                      </div>
                    </div>

                    {/* Prominent Total Apple Amount Summary Card */}
                    <div className="p-3 bg-white rounded-xl border border-emerald-300 flex flex-wrap items-center justify-between gap-2 shadow-xs">
                      <div className="min-w-[170px]">
                        <span className="text-xs font-bold text-gray-700 block">Total Apple Amount:</span>
                        <span className="text-[10px] text-gray-500 font-bold block">
                          {totalAppleBoxes.toLocaleString('en-IN')} Boxes (4L: {layer4LBoxes || 0}, 5L: {layer5LBoxes || 0}, Roll: {rollBoxes || 0})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-base sm:text-lg font-black text-emerald-800 block font-mono">
                          ₹{totalAppleAmount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-emerald-700 font-bold">
                          Direct 55% Advance: ₹{Math.round(totalAppleAmount * 0.55).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : isPomegranate ? (
                  /* Pomegranate Consignment Sizing Form */
                  <div className="p-3.5 bg-white border border-rose-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-rose-800 tracking-wider block">
                          Pomegranate Loaded Boxes
                        </span>
                        <p className="text-[11px] text-gray-600">Standard wholesale pomegranate cartons.</p>
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
                          Rate (₹ / Box)
                        </label>
                        <div className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-gray-50 flex items-center justify-between">
                          <span className="text-gray-500 font-medium text-[11px]">Wholesale</span>
                          <strong className="font-mono text-sm text-gray-900">₹{Number(pomegranateRate || 950).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Total Consignment Value:</span>
                      <span className="text-base font-black text-rose-800 font-mono">₹{pomegranateTotalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ) : isWatermelon ? (
                  /* Watermelon Consignment Sizing Form */
                  <div className="p-3.5 bg-white border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-emerald-800 tracking-wider block">
                          Watermelon Harvest Weight
                        </span>
                        <p className="text-[11px] text-gray-600">Bulk truckload weighbridge harvest.</p>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg text-[11px] font-black">
                        Watermelon
                      </span>
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
                          placeholder="Weight"
                          className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white text-right focus:border-emerald-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                          Rate (₹ / {watermelonUnit})
                        </label>
                        <div className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-gray-50 flex items-center justify-between">
                          <span className="text-gray-500 font-medium text-[11px]">Wholesale</span>
                          <strong className="font-mono text-sm text-gray-900">₹{Number(watermelonRate || (watermelonUnit === 'TON' ? 14000 : 14)).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Total Consignment Value:</span>
                      <span className="text-base font-black text-emerald-800 font-mono">₹{watermelonTotalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ) : (
                  /* Fallback Generic Commodity */
                  <div className="p-3.5 bg-white border border-emerald-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-extrabold text-emerald-800 tracking-wider block">
                          Fruit Commodity Sizing &amp; Pricing
                        </span>
                        <p className="text-[11px] text-gray-600">Enter loaded carton quantity.</p>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-black">
                        {selectedFruit}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                          Total Boxes / Crates *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={otherQuantity}
                          onChange={(e) => setOtherQuantity(e.target.value)}
                          placeholder="e.g. 400"
                          className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white text-right focus:border-emerald-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-extrabold text-gray-800 mb-1">
                          Rate (₹ / {otherUnit})
                        </label>
                        <div className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 bg-gray-50 flex items-center justify-between">
                          <span className="text-gray-500 font-medium text-[11px]">Wholesale</span>
                          <strong className="font-mono text-sm text-gray-900">₹{Number(otherRate || 950).toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">Total Consignment Value:</span>
                      <span className="text-base font-black text-emerald-800 font-mono">₹{otherTotalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Dispatch & Logistics Proof Documentation (Image 4) */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-2xl space-y-3">
                <span className="text-[10px] uppercase font-black text-blue-900 tracking-wider block flex items-center gap-1.5">
                  <Truck size={14} className="text-blue-700" /> Dispatch &amp; Logistics Proof Documentation
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* File 1: Vehicle Photo with Number Plate Clearly Visible */}
                  <div className={`p-3 bg-white border rounded-xl space-y-2 transition shadow-2xs ${
                    vehiclePhotoFile ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-amber-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="block text-gray-900 font-bold text-xs flex items-center gap-1.5">
                        <Camera size={14} className="text-emerald-700" />
                        <span>Dispatch Vehicle Photo <span className="text-red-600 font-black">*</span></span>
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        vehiclePhotoFile ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                      }`}>
                        {vehiclePhotoFile ? 'Photo Attached ✓' : '* Mandatory'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Clear photo showing truck number plate and loaded cartons. Timestamp &amp; GPS stamped automatically.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-0.5 items-center">
                      <button
                        type="button"
                        onClick={() =>
                          openCameraModal(
                            'Dispatch Vehicle Photo',
                            'VEHICLE DISPATCH PHOTO',
                            selectedPOForDispatch?.poNumber,
                            (file, preview) => {
                              setVehiclePhotoFile(file);
                              setVehiclePhotoPreview(preview);
                            }
                          )
                        }
                        className="h-9 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition cursor-pointer"
                      >
                        <Camera size={13} className="text-emerald-300" />
                        <span>Live Camera</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => dispatchVehicleInputRef.current?.click()}
                        className="h-9 px-2 border-2 border-dashed border-emerald-400 bg-white hover:bg-emerald-50 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs group"
                      >
                        <Upload size={12} className="text-emerald-700" />
                        <span className="text-xs font-bold text-emerald-900 truncate">
                          {vehiclePhotoFile ? vehiclePhotoFile.name : 'Choose File'}
                        </span>
                      </button>
                      <input
                        ref={dispatchVehicleInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleVehiclePhotoChange}
                        style={{ display: 'none' }}
                      />
                    </div>

                    {vehiclePhotoPreview && (
                      <div className="mt-1.5 p-1.5 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={vehiclePhotoPreview}
                            alt="Vehicle Preview"
                            className="h-12 w-16 object-cover rounded border border-gray-200"
                          />
                          <div>
                            <span className="text-[11px] text-emerald-800 font-bold block">Vehicle Photo Attached ✓</span>
                            <span className="text-[9px] text-gray-400">Verified Plate Image</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setVehiclePhotoFile(null);
                            setVehiclePhotoPreview('');
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* File 2: Vendor Digital E-Signature Pad (Image 4) */}
                  <div className={`p-3 bg-white border rounded-xl space-y-2 transition shadow-2xs ${
                    vendorSignatureData || transportBillFile ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-emerald-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="block text-gray-900 font-bold text-xs flex items-center gap-1.5">
                        <Pencil size={14} className="text-emerald-700" />
                        <span>Vendor Digital E-Signature <span className="text-red-600 font-black">*</span></span>
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        vendorSignatureData || transportBillFile ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                      }`}>
                        {vendorSignatureData || transportBillFile ? 'Signed ✓' : '* Sign Below'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Sign using finger or stylus on mobile screen to authorize consignment release.
                    </p>

                    {/* Interactive Canvas Pad */}
                    <div className="relative border-2 border-dashed border-emerald-400 rounded-lg bg-gray-50/70 overflow-hidden shadow-inner">
                      <canvas
                        ref={signatureCanvasRef}
                        width={460}
                        height={130}
                        onMouseDown={startDrawingSignature}
                        onMouseMove={drawSignature}
                        onMouseUp={stopDrawingSignature}
                        onMouseLeave={stopDrawingSignature}
                        onTouchStart={startDrawingSignature}
                        onTouchMove={drawSignature}
                        onTouchEnd={stopDrawingSignature}
                        className="w-full h-24 sm:h-28 bg-white cursor-crosshair touch-none select-none block"
                      />
                      {!vendorSignatureData && !isDrawingSignature && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-400 text-xs font-medium">
                          ✍ Touch &amp; draw signature here with finger...
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded-lg transition cursor-pointer"
                      >
                        Clear Signature
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatchTransportInputRef.current?.click()}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[11px] font-bold rounded-lg border border-emerald-300 transition cursor-pointer flex items-center gap-1"
                      >
                        <Upload size={11} />
                        <span>Or Upload Slip</span>
                      </button>
                      <input
                        ref={dispatchTransportInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        onChange={handleTransportBillChange}
                        style={{ display: 'none' }}
                      />
                    </div>

                    {vendorSignatureData && (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 size={12} className="text-emerald-600" /> Digital Signature Captured ✓
                      </span>
                    )}
                  </div>
                </div>
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
                  className="px-5 py-2.5 rounded-xl bg-[#064D2B] hover:bg-[#087A3E] text-white font-black shadow-md inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Truck size={15} />
                  {isSubmittingDispatch ? 'Submitting Dispatch...' : '🚚 Submit Consignment Dispatch & Sign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vendor Create Supply PO Modal */}
      {showCreatePOModal && (
        <div
          className="modal-backdrop !z-[9999] fixed inset-0 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          style={{ zIndex: 9999, backgroundColor: 'rgba(6, 45, 25, 0.85)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !cameraModalConfig.open) setShowCreatePOModal(false);
          }}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full border border-gray-200 shadow-2xl p-3.5 sm:p-6 my-auto max-h-[94vh] flex flex-col relative"
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
              {/* Destination Hub, Origin, and Date Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. PO Initiate Date (Creation Date) */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1.5">
                    <Calendar size={13} className="text-emerald-700" />
                    PO Initiate Date (Today) *
                  </label>
                  <input
                    type="date"
                    value={poInitiateDate}
                    onChange={(e) => setPoInitiateDate(e.target.value)}
                    className="w-full h-10 px-3 border border-emerald-400 bg-emerald-50/40 rounded-xl text-xs font-bold text-gray-900 focus:border-emerald-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-emerald-800 font-bold mt-0.5 block flex items-center gap-1">
                    <Clock size={10} className="text-emerald-600" />
                    Creation Day: {poInitiateDate ? new Date(poInitiateDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
                  </span>
                </div>

                {/* 2. Starting Origin Location */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1.5">
                    <MapPin size={13} className="text-amber-700" />
                    Vendor Farm / Loading Origin Location (Starting Point) *
                  </label>
                  <input
                    type="text"
                    value={startingLocation}
                    onChange={(e) => setStartingLocation(e.target.value)}
                    placeholder="e.g. Shopian Apple Farm / Sopore Mandi"
                    className="w-full h-10 px-3 border border-amber-300 bg-amber-50/20 rounded-xl text-xs font-bold text-gray-900 focus:border-amber-600 focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    Loading point where vehicle arrives.
                  </span>
                </div>

                {/* 3. Destination Regional Hub */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1.5">
                    <MapPin size={13} className="text-emerald-700" />
                    Destination Hub *
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
                    Restricted to 8 whitelisted hubs.
                  </span>
                </div>

                {/* 4. Expected Dispatch / Delivery Date */}
                <div>
                  <label className="block text-gray-700 font-bold mb-1 flex items-center gap-1.5">
                    <Truck size={13} className="text-blue-700" />
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white focus:border-emerald-600 focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    Target hub arrival date.
                  </span>
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

              {/* Phase 1: Logistics Allotment Workflow Notice */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white border border-emerald-300 rounded-2xl flex items-start gap-3 shadow-2xs">
                <div className="w-10 h-10 rounded-2xl bg-[#087A3E] text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  <Truck size={20} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-gray-950 font-['Manrope']">
                      Phase 1: Consignment Vehicle &amp; Route Allotment Request
                    </h4>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black">
                      Step 1 of 2
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Submit your farm loading location (<strong className="text-gray-900">{startingLocation || 'Farm Origin'}</strong>) and destination hub (<strong className="text-emerald-800">{targetHub} Hub</strong>). Safal Regional Logistics Hub will review the route, allot an authorized refrigerated vehicle, and upload the official <strong>Transporter Bilty (LR) / Consignment Note</strong>.
                  </p>
                  <div className="p-2.5 bg-emerald-100/70 border border-emerald-300 rounded-xl text-[11px] text-emerald-950 font-bold flex items-center gap-2 mt-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse flex-shrink-0" />
                    <span>Box Grading &amp; Pricing: Once Admin approves and allots the vehicle with Bilty, you will record loaded box counts (4L / 5L / Roll grading), upload truck photos, and digitally sign for dispatch.</span>
                  </div>
                </div>
              </div>

              {/* Consignment Remarks */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Consignment &amp; Farm Loading Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="e.g. Cold storage packed Grade A Apples ready for farm pickup to Warangal regional hub"
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
                  <Truck size={15} />
                  {isSubmittingPO ? 'Submitting Supply PO...' : 'Request Consignment PO & Vehicle Allotment'}
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
                  src={resolvePhotoUrl(viewSlipModalUrl)}
                  title="Weighbridge PDF"
                  className="w-full h-96 rounded-xl border-0"
                />
              ) : (
                <img
                  src={resolvePhotoUrl(viewSlipModalUrl)}
                  alt="Weighbridge Scale Slip"
                  className="max-h-[70vh] object-contain rounded-xl shadow-xs"
                  onError={(e) => {
                    const img = e.currentTarget;
                    const resolved = resolvePhotoUrl(viewSlipModalUrl);
                    if (img.src !== resolved) img.src = resolved;
                  }}
                />
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between flex-shrink-0 text-xs">
              <span className="text-gray-500 font-medium">Official mandi weighbridge printout</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadProofFile(viewSlipModalUrl, 'weighbridge-scale-slip')}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Download size={14} /> Download Slip
                </button>
                <a
                  href={resolvePhotoUrl(viewSlipModalUrl)}
                  target="_blank"
                  rel="noreferrer"
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
                  src={resolvePhotoUrl(previewMediaModal.url)}
                  title={previewMediaModal.title}
                  className="w-full h-96 rounded-xl border-0"
                />
              ) : (
                <img
                  src={resolvePhotoUrl(previewMediaModal.url)}
                  alt={previewMediaModal.title}
                  className="max-h-[70vh] object-contain rounded-xl shadow-xs"
                  onError={(e) => {
                    const img = e.currentTarget;
                    const resolved = resolvePhotoUrl(previewMediaModal.url);
                    if (img.src !== resolved) img.src = resolved;
                  }}
                />
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between flex-shrink-0 text-xs">
              <span className="text-gray-500 font-medium">Verified Consignment Dispatch Proof</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadProofFile(previewMediaModal.url, previewMediaModal.title)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold inline-flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Download size={14} /> Download Proof
                </button>
                <a
                  href={resolvePhotoUrl(previewMediaModal.url)}
                  target="_blank"
                  rel="noreferrer"
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
                  <option value="" disabled>-- Select Purchase Order (Watermelon / Muskmelon Bulk Only) --</option>
                  {(() => {
                    const bulkOrders = orders.filter((po) => isBulkWeighmentFruit(po.fruitName));
                    if (bulkOrders.length === 0) {
                      return (
                        <option value="" disabled>
                          No active Watermelon / Muskmelon consignments requiring electronic scale slips.
                        </option>
                      );
                    }
                    return bulkOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} — {po.fruitName} ({po.orderPersonPlace || 'Regional Hub'}) — ₹{Number(po.totalOrderValue || po.grandTotal || 0).toLocaleString('en-IN')}
                      </option>
                    ));
                  })()}
                </select>
                <span className="text-[10px] text-gray-500 block">
                  Electronic weighbridge gross/tare scale slips are strictly required for bulk weight fruits (Watermelon &amp; Muskmelon). Boxed consignments are verified by crate count.
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-gray-700 font-bold">
                        Upload Weighbridge Scale Slip Photo / PDF
                      </label>
                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        Mandatory
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const poObj = orders.find((o) => o.id === qcSelectedPOId);
                          openCameraModal(
                            'Weighbridge Scale Slip Photo',
                            'WEIGHBRIDGE SCALE SLIP',
                            poObj?.poNumber,
                            (file, preview) => {
                              setQcSlipFile(file);
                              setQcSlipPreview(preview);
                            }
                          );
                        }}
                        className="h-10 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                      >
                        <Camera size={15} className="text-emerald-300" />
                        <span>Live Camera (Slip)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => qcSlipInputRef.current?.click()}
                        className="h-10 px-3 border-2 border-dashed border-emerald-400 bg-white hover:bg-emerald-50 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-2xs group"
                      >
                        <div className="w-6 h-6 rounded-md bg-emerald-600 group-hover:bg-emerald-700 text-white flex items-center justify-center transition flex-shrink-0">
                          <Upload size={13} />
                        </div>
                        <span className="text-xs font-bold text-emerald-900 truncate">
                          {qcSlipFile ? qcSlipFile.name : 'Choose File / PDF'}
                        </span>
                      </button>
                      <input
                        ref={qcSlipInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleQCSlipFileChange}
                        style={{ display: 'none' }}
                      />
                    </div>
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
                    {selectedKpiModal === 'advance' && 'Bank Advance Received'}
                    {selectedKpiModal === 'due' && 'Consignment Net Balance Due'}
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
                    {selectedKpiModal === 'due' && `₹${Number(derivedFinancialStats.totalNetBalanceDue || 0).toLocaleString('en-IN')}`}
                    {selectedKpiModal === 'volume' && `${totalVolumeBoxes.toLocaleString('en-IN')} Boxes`}
                    {selectedKpiModal === 'transit' && `${stats.inTransitPOs || 0} Trucks on Road`}
                    {selectedKpiModal === 'qc' && `99.4% Mandi Verified`}
                  </strong>
                  <span className="text-[11px] text-gray-600 font-medium block mt-0.5">
                    {selectedKpiModal === 'orders' && `${stats.totalPOs || 0} Active Procurement Orders`}
                    {selectedKpiModal === 'advance' && `Advance Cleared to Vendor Account`}
                    {selectedKpiModal === 'due' && `Settled upon Mandi Realization by Safal Accounts`}
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
                    'Safal Vendor Protection Guarantee provides an upfront advance disbursed directly via NEFT/RTGS to your verified bank coordinates upon uploading dispatch truck photos and carrier bilty.'}
                  {selectedKpiModal === 'due' &&
                    'Safal operates on a Mandi sales consignment model. Once your fruit consignment arrives at the regional hub, Safal enters the finalized sales realization and deductions. Until Safal Accounts records the final settlement, Net Balance Due displays ₹0.00. Once entered by Safal, the realized net balance due appears here and is cleared upon settlement payment.'}
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
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider block">
                      Disbursed Upfront Advances by PO ({orders.length})
                    </span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Advance Cleared
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold text-[10px] uppercase">
                          <th className="py-2.5 px-3">PO # &amp; Date</th>
                          <th className="py-2.5 px-3">Hub Location</th>
                          <th className="py-2.5 px-3 text-right">Gross Total</th>
                          <th className="py-2.5 px-3 text-right text-emerald-800">Advance Amount Received</th>
                          <th className="py-2.5 px-3 text-center">Payment UTR</th>
                          <th className="py-2.5 px-3 text-center">Receipt Slip</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {orders.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-gray-400">
                              No purchase orders found.
                            </td>
                          </tr>
                        ) : (
                          orders.map((po) => {
                            const total = Number(po.grandTotal || 0);
                            const settle = (po as any).settlementDetails;
                            const adv = Number(settle?.advanceAmount ?? po.advanceAmount ?? Math.round(total * 0.55));
                            const proofUrl = settle?.advanceProofUrl || po.paymentProofUrl;
                            const utr = settle?.advancePaymentUtr || po.paymentProofNotes || 'RTGS-MANDI-ADV';

                            return (
                              <tr key={po.id} className="hover:bg-emerald-50/20">
                                <td className="py-2.5 px-3">
                                  <strong className="font-mono text-emerald-900 block font-bold">{po.poNumber}</strong>
                                  <span className="text-[10px] text-gray-500">
                                    {po.poDate ? new Date(po.poDate).toLocaleDateString('en-GB') : '-'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-gray-800">
                                  {settle?.advancePayingHub || po.orderPersonPlace || 'Warangal Hub'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                                  ₹{total.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                                  ₹{adv.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="text-[10px] font-mono font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                    {utr}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {proofUrl ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewMediaModal({
                                          url: proofUrl,
                                          title: `Advance Bank Slip: ${po.poNumber} (${settle?.advancePayingHub || 'Warangal Hub'})`,
                                        })
                                      }
                                      className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded font-bold text-[10px] inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                    >
                                      <Eye size={10} /> View Slip ↗
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-gray-400">Pending</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider block pt-2">
                    Disbursement Bank Coordinates
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                      <span className="text-[10px] text-gray-500 block">Beneficiary Name</span>
                      <strong className="font-bold text-gray-900">{vendorProfile?.bankAccountHolder || vendorProfile?.businessName || '-'}</strong>
                    </div>
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                      <span className="text-[10px] text-gray-500 block">Bank Account Number</span>
                      <strong className="font-mono font-bold text-gray-900">{vendorProfile?.bankAccountNumber || '-'}</strong>
                    </div>
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                      <span className="text-[10px] text-gray-500 block">IFSC Code</span>
                      <strong className="font-mono font-bold text-emerald-800">{vendorProfile?.bankIfscCode || '-'}</strong>
                    </div>
                    <div className="p-2.5 bg-white border border-emerald-200 rounded-xl">
                      <span className="text-[10px] text-gray-500 block">Disbursement Mode</span>
                      <strong className="font-bold text-gray-900">Direct RTGS / NEFT</strong>
                    </div>
                  </div>
                </div>
              )}

              {selectedKpiModal === 'due' && (
                <div className="space-y-3">
                  {/* Realization Status Card */}
                  <div className="p-3.5 bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-white border border-amber-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                      <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
                        Mandi Sales Realization Summary
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        Safal Accounts Realization
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                      <div className="p-2.5 bg-white rounded-xl border border-amber-100">
                        <span className="text-[10px] text-gray-500 block">Total Consignment Value</span>
                        <strong className="text-sm font-black text-gray-900 font-mono block mt-0.5">
                          ₹{derivedFinancialStats.grossContractValue.toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
                        <span className="text-[10px] text-emerald-800 font-bold block">Advance Amount Received</span>
                        <strong className="text-sm font-black text-emerald-800 font-mono block mt-0.5">
                          ₹{derivedFinancialStats.totalAdvanceDisbursed.toLocaleString('en-IN')}
                        </strong>
                      </div>
                      <div className="p-2.5 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl border border-amber-300">
                        <span className="text-[10px] text-amber-950 font-black block">Realized Net Balance Due</span>
                        <strong className="text-base font-black text-[#C2410C] font-mono block mt-0.5">
                          ₹{Number(derivedFinancialStats.totalNetBalanceDue || 0).toLocaleString('en-IN')}
                        </strong>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-800 pt-1">
                      * Consignment balance remains <strong>₹0.00</strong> until Safal Accounts records Mandi sales realization and settlement.
                    </p>
                  </div>

                  {/* Consignments Pending Balance Due Table */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider block">
                      Consignments Breakdown &amp; Realization Status ({orders.length})
                    </span>
                    <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-2xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold text-[10px] uppercase">
                            <th className="py-2.5 px-3">PO # &amp; Date</th>
                            <th className="py-2.5 px-3">Hub Location</th>
                            <th className="py-2.5 px-3 text-right">Gross Total</th>
                            <th className="py-2.5 px-3 text-right text-emerald-800">Advance Paid</th>
                            <th className="py-2.5 px-3 text-right font-black">Realized Net Due</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {orders.map((po) => {
                            const total = Number(po.grandTotal || 0);
                            const settle = (po as any).settlementDetails;
                            const adv = Number(settle?.advanceAmount ?? po.advanceAmount ?? Math.round(total * 0.55));
                            const hasSettlement = Boolean(settle?.hasSettlementEntry || settle?.settlementCompleted || (po.status === 'CLOSED' && Number(po.pendingAmount || 0) === 0));
                            const due = hasSettlement ? Number(settle?.finalBalanceDue ?? 0) : 0;
                            const isCleared = hasSettlement && due === 0 && (Boolean(settle?.settlementCompleted) || (po.status === 'CLOSED' && Number(po.pendingAmount || 0) === 0));

                            return (
                              <tr key={po.id} className="hover:bg-amber-50/20">
                                <td className="py-2.5 px-3">
                                  <strong className="font-mono text-gray-900 block font-bold">{po.poNumber}</strong>
                                  <span className="text-[10px] text-gray-500">
                                    {po.poDate ? new Date(po.poDate).toLocaleDateString('en-GB') : '-'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-semibold text-gray-800">
                                  {po.orderPersonPlace || 'Warangal'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                                  ₹{total.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-emerald-800 font-bold">
                                  ₹{adv.toLocaleString('en-IN')}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-black text-amber-900">
                                  {hasSettlement ? `₹${due.toLocaleString('en-IN')}` : '₹0.00'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {isCleared ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1">
                                      <CheckCircle2 size={11} className="text-emerald-700" /> Cleared ✓
                                    </span>
                                  ) : hasSettlement && due > 0 ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                      <Clock size={11} className="text-amber-700" /> OPEN (₹{due.toLocaleString('en-IN')} Due)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-300 inline-flex items-center gap-1">
                                      Pending Mandi Realization
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
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

      {/* Live Camera Capture Modal (Attendance-style with IST time, GPS, Vendor Name & Device Stamped) */}
      <VendorPhotoCaptureModal
        isOpen={cameraModalConfig.open}
        onClose={() => setCameraModalConfig((prev) => ({ ...prev, open: false }))}
        title={cameraModalConfig.title}
        documentType={cameraModalConfig.documentType}
        poNumber={cameraModalConfig.poNumber}
        vendorName={vendorProfile?.businessName || user?.name || 'Vendor Partner'}
        vendorId={vendorProfile?.vendorId || 'VND-001'}
        onCapture={cameraModalConfig.onCapture}
      />

      {/* Pop-up Alert when user clicks Submit without uploading required images */}
      {missingImagesPopup && missingImagesPopup.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-amber-300 overflow-hidden">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/30">
                <AlertTriangle size={22} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Images Upload Required</h3>
                <p className="text-[11px] text-amber-100 font-semibold">ఫోటోలు తప్పనిసరిగా అప్‌లోడ్ చేయాలి</p>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-gray-700 leading-relaxed font-medium">
                You cannot submit this consignment without uploading the required photographic proof. Safal quality control requires tamper-proof photo verification:
              </p>

              <div className="space-y-2">
                {missingImagesPopup.missingItems.map((item, i) => (
                  <div
                    key={i}
                    className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-900 font-bold"
                  >
                    <div className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center flex-shrink-0 text-[11px]">
                      ✕
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <Camera size={15} className="text-amber-700 flex-shrink-0 mt-0.5" />
                <span>
                  Tip: Use the <strong>"Open Camera (Live Capture)"</strong> button to snap directly from your phone. Time, location, and device details will be stamped automatically!
                </span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setMissingImagesPopup(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Close &amp; Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  const missingFirst = missingImagesPopup.missingItems[0];
                  const isSupply = missingImagesPopup.targetAction === 'supply';
                  setMissingImagesPopup(null);
                  if (missingFirst?.toLowerCase().includes('vehicle')) {
                    if (isSupply) {
                      openCameraModal(
                        'Dispatch Vehicle Photo',
                        'VEHICLE DISPATCH PHOTO',
                        undefined,
                        (file, preview) => {
                          setSupplyVehiclePhotoFile(file);
                          setSupplyVehiclePhotoPreview(preview);
                        }
                      );
                    } else {
                      openCameraModal(
                        'Vehicle Dispatch Photo',
                        'VEHICLE DISPATCH PHOTO',
                        selectedPOForDispatch?.poNumber,
                        (file, preview) => {
                          setVehiclePhotoFile(file);
                          setVehiclePhotoPreview(preview);
                        }
                      );
                    }
                  } else {
                    // Transport bill uses file upload with automatic watermark
                    onNotify('Please select your Transport Bill (Bilty / LR) document or photo.');
                  }
                }}
                className="px-5 py-2 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Camera size={14} className="text-emerald-300" />
                <span>Open Camera Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Purchase Order Dossier / Realization Statement Modal */}
      {selectedPODetail && (
        <PODetailModal
          order={selectedPODetail}
          onClose={() => setSelectedPODetail(null)}
          onRefresh={loadData}
          onNotify={onNotify}
        />
      )}
    </div>
  );
};
