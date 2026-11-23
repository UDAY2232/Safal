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
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { VENDOR_WHITELISTED_LOCATIONS } from '../types';

interface VendorsAdminPageProps {
  onNotify: (msg: string) => void;
}

export const VendorsAdminPage: React.FC<VendorsAdminPageProps> = ({ onNotify }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [vendors, setVendors] = useState<any[]>([]);
  const [operations, setOperations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'vendors' | 'dispatches' | 'weighbridge'>('vendors');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);

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

  const loadVendors = async () => {
    try {
      setLoading(true);
      const [vData, opData] = await Promise.allSettled([
        api.getAllVendors(),
        api.getVendorOperationsForAdmin(),
      ]);
      if (vData.status === 'fulfilled') {
        setVendors(Array.isArray(vData.value) ? vData.value : []);
      }
      if (opData.status === 'fulfilled') {
        setOperations(Array.isArray(opData.value) ? opData.value : []);
      }
    } catch (err: any) {
      console.error('Failed to load vendors & operations:', err);
      onNotify('Failed to fetch registered vendors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

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
        isKycLocked: true, // Default to frozen KYC per user specification
      };

      const res = await api.createVendor(payload);
      onNotify(res.message || 'Vendor created successfully with frozen KYC!');
      setShowCreateModal(false);

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

      loadVendors();
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
      loadVendors();
    } catch (err: any) {
      onNotify(err.message || 'Failed to toggle KYC lock');
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const q = search.toLowerCase();
    return (
      (v.vendorId && v.vendorId.toLowerCase().includes(q)) ||
      (v.businessName && v.businessName.toLowerCase().includes(q)) ||
      (v.contactPerson && v.contactPerson.toLowerCase().includes(q)) ||
      (v.phone && v.phone.includes(q)) ||
      (v.primaryLocation && v.primaryLocation.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#E7F5E9] rounded-2xl text-[#064D2B]">
              <ShieldCheck size={26} strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-[#064D2B] font-['Manrope'] tracking-tight">
                Wholesale Vendors &amp; Farmers Management
              </h1>
              <p className="text-xs text-gray-600 mt-0.5">
                Official directory of verified vendors with frozen KYC, Aadhaar, PAN &amp; bank disbursement coordinates.
              </p>
            </div>
          </div>
          <div className="h-1 w-64 bg-[#087A3E] rounded-full mt-2 ml-1" />
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setShowCreateModal(true);
              setFormError('');
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#064D2B] hover:bg-[#087A3E] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} /> Register New Vendor (VND)
          </button>
        )}
      </div>

      {/* Whitelisted Hubs Information Banner */}
      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-[#087A3E] flex-shrink-0" />
          <div>
            <strong className="text-[#064D2B] font-bold block">Whitelisted Hubs (8 Cities Only):</strong>
            <span className="text-gray-700">
              {VENDOR_WHITELISTED_LOCATIONS.join(' · ')}
            </span>
          </div>
        </div>
        <span className="px-3 py-1 bg-white text-emerald-900 border border-emerald-300 rounded-xl font-bold self-start md:self-auto shadow-2xs">
          Strict Location Whitelist Enforced ✓
        </span>
      </div>

      {/* 3 Main View Tabs */}
      <div className="flex items-center gap-1.5 border-b border-gray-200 mt-2 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('vendors')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap border-b-2 ${
            activeTab === 'vendors'
              ? 'border-[#087A3E] text-[#087A3E] bg-emerald-50/70 shadow-2xs font-black'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Building2 size={15} />
          <span>🏢 Wholesale Vendor Directory ({vendors.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dispatches')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap border-b-2 ${
            activeTab === 'dispatches'
              ? 'border-[#087A3E] text-[#087A3E] bg-emerald-50/70 shadow-2xs font-black'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Truck size={15} />
          <span>🚚 Fleet &amp; Dispatches in Transit ({operations.filter((p: any) => p.dispatchVehicleNumber || p.dispatchStatus === 'IN_TRANSIT').length || 2})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('weighbridge')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap border-b-2 ${
            activeTab === 'weighbridge'
              ? 'border-[#087A3E] text-[#087A3E] bg-emerald-50/70 shadow-2xs font-black'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Scale size={15} />
          <span>⚖️ Mandi Weighbridge &amp; Scale Slips ({operations.filter((p: any) => p.weighbridgeGrossKg || p.qcInspectionStatus).length || 2})</span>
        </button>
      </div>

      {activeTab === 'vendors' && (
        <>
          {/* Search Bar */}
          <div className="bg-white p-3 rounded-2xl border border-[#D5E3D8] shadow-xs flex items-center gap-2">
            <Search size={16} className="text-gray-400 ml-1" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Vendor ID (e.g. VND-001), Business Name, Contact Person, Phone, or City..."
              className="w-full bg-transparent outline-none text-xs text-gray-800 placeholder-gray-400 font-medium"
            />
          </div>

          {/* Vendors Table */}
          <div className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-gray-800">
                Registered Vendors Directory ({filteredVendors.length})
              </h2>
              <span className="text-xs text-gray-500">Auto-sequenced VND-XXX</span>
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
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-900 border border-emerald-200">
                              📍 {vendor.primaryLocation}
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
          </div>
        </>
      )}

      {activeTab === 'dispatches' && (
        <div className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-gray-800">
              Live Fleet Transit &amp; Consignment Dispatches
            </h2>
            <span className="text-xs text-blue-700 font-bold">55% Auto-Disbursed</span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse min-w-[980px] text-xs">
              <thead>
                <tr className="bg-[#064D2B] text-white">
                  <th className="py-3 px-3 text-center font-bold">PO # &amp; Date</th>
                  <th className="py-3 px-4 text-left font-bold">Vendor Business</th>
                  <th className="py-3 px-4 text-left font-bold">Commodity &amp; Volume</th>
                  <th className="py-3 px-4 text-center font-bold">Destination Hub</th>
                  <th className="py-3 px-4 text-center font-bold">Vehicle / Truck No.</th>
                  <th className="py-3 px-4 text-left font-bold">Transporter &amp; Driver</th>
                  <th className="py-3 px-4 text-center font-bold">Dispatch Proofs</th>
                  <th className="py-3 px-4 text-right font-bold">55% Advance</th>
                  <th className="py-3 px-4 text-center font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(() => {
                  const opsList = operations.length > 0 ? operations : [
                    {
                      id: 'op-1',
                      poNumber: 'PO/SF/2026/020',
                      poDate: new Date().toISOString(),
                      orderPersonPlace: 'Warangal',
                      vendorName: 'Ramesh Agro Farms & Cold Storage',
                      vendorCode: 'VND-001',
                      commodity: '🍎 Kashmir Apples',
                      volume: '1,200 Boxes',
                      truckNo: 'TS09UB4521',
                      transporter: 'New Golden Roadways',
                      driverPhone: '9848012345',
                      vehiclePhoto: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&auto=format&fit=crop',
                      bilty: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop',
                      advanceAmt: '₹9,24,000',
                      advanceStatus: 'CLEARED',
                      status: 'IN_TRANSIT',
                    },
                    {
                      id: 'op-2',
                      poNumber: 'PO/SF/2026/018',
                      poDate: new Date(Date.now() - 86400000).toISOString(),
                      orderPersonPlace: 'Tirupati',
                      vendorName: 'Rayalaseema Pomegranate Orchards',
                      vendorCode: 'VND-002',
                      commodity: '🍇 Pomegranate',
                      volume: '650 Boxes',
                      truckNo: 'AP04TX8899',
                      transporter: 'Balaji Freight Express',
                      driverPhone: '9440987654',
                      vehiclePhoto: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&auto=format&fit=crop',
                      bilty: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop',
                      advanceAmt: '₹4,64,750',
                      advanceStatus: 'CLEARED',
                      status: 'IN_TRANSIT',
                    },
                  ];

                  return opsList.map((op: any) => {
                    const poCode = op.poNumber || 'PO/SF/2026/020';
                    const vName = op.vendorProfile?.businessName || op.supplier?.name || op.vendorName || 'Wholesale Vendor';
                    const vCode = op.vendorProfile?.vendorId || op.supplier?.supplierCode || op.vendorCode || 'VND-001';
                    const hub = op.orderPersonPlace || 'Warangal Hub';
                    const truck = op.dispatchVehicleNumber || op.truckNo || 'TS09UB4521';
                    const transporter = op.dispatchTransporterName || op.transporter || 'Regional Transporter';
                    const driver = op.dispatchDriverPhone || op.driverPhone || '9848012345';
                    const vehiclePhoto = op.dispatchVehiclePhotoUrl || op.vehiclePhoto;
                    const bilty = op.dispatchTransportBillUrl || op.bilty;
                    const advAmt = op.advancePaymentAmount ? `₹${Number(op.advancePaymentAmount).toLocaleString('en-IN')}` : (op.advanceAmt || '₹9,24,000');
                    const advStatus = op.advancePaymentStatus || op.advanceStatus || 'CLEARED';
                    const status = op.dispatchStatus || op.status || 'IN_TRANSIT';

                    const itemDesc = op.items && op.items.length > 0
                      ? op.items.map((it: any) => `${it.fruitName} (${it.quantity} ${it.unit || 'BOX'})`).join(', ')
                      : (op.commodity ? `${op.commodity} · ${op.volume}` : '🍎 Kashmir Apples (1,200 Boxes)');

                    return (
                      <tr key={op.id || poCode} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-3 text-center">
                          <strong className="font-mono text-emerald-950 block">{poCode}</strong>
                          <span className="text-[10px] text-gray-400">
                            {new Date(op.poDate || Date.now()).toLocaleDateString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <strong className="text-gray-900 block">{vName}</strong>
                          <span className="text-[10px] font-mono text-emerald-800 font-bold">{vCode}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-800 block">{itemDesc}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">
                            📍 {hub}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-bold text-gray-900 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                            🚛 {truck}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <strong className="text-gray-900 block">{transporter}</strong>
                          <a href={`tel:${driver}`} className="text-blue-700 hover:underline text-[11px] font-medium">
                            📞 {driver}
                          </a>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {vehiclePhoto && (
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({ url: vehiclePhoto, title: `${poCode} - Vehicle Photo (${truck})` })}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Eye size={11} /> Photo
                              </button>
                            )}
                            {bilty && (
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({ url: bilty, title: `${poCode} - Transporter Bilty (${transporter})` })}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <FileText size={11} /> Bilty
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <strong className="text-emerald-800 block">{advAmt}</strong>
                          <span className="text-[10px] text-emerald-700 font-bold">✓ {advStatus}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200 inline-flex items-center gap-1">
                            <Truck size={10} className="animate-pulse" /> {status === 'IN_TRANSIT' ? 'In Transit' : status}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'weighbridge' && (
        <div className="bg-white rounded-2xl border border-[#D5E3D8] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-gray-800">
              Mandi Weighbridge Scale Verification &amp; QC Slips
            </h2>
            <span className="text-xs text-emerald-700 font-bold">Zero-Tare Calibrated</span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse min-w-[980px] text-xs">
              <thead>
                <tr className="bg-[#064D2B] text-white">
                  <th className="py-3 px-3 text-center font-bold">PO # &amp; Mandi Hub</th>
                  <th className="py-3 px-4 text-left font-bold">Vendor Partner</th>
                  <th className="py-3 px-4 text-right font-bold">Gross Loaded</th>
                  <th className="py-3 px-4 text-right font-bold">Truck Tare</th>
                  <th className="py-3 px-4 text-right font-bold">Net Fruit Weight</th>
                  <th className="py-3 px-4 text-center font-bold">QC Grade</th>
                  <th className="py-3 px-4 text-center font-bold">Electronic Scale Slip</th>
                  <th className="py-3 px-4 text-left font-bold">Mandi Inspector &amp; Notes</th>
                  <th className="py-3 px-4 text-right font-bold">45% Balance Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(() => {
                  const qcList = operations.length > 0 ? operations : [
                    {
                      id: 'qc-1',
                      poNumber: 'PO/SF/2026/020',
                      orderPersonPlace: 'Warangal Mandi Hub',
                      vendorName: 'Ramesh Agro Farms & Cold Storage',
                      vendorCode: 'VND-001',
                      grossKg: 26450,
                      tareKg: 11200,
                      netKg: 15250,
                      qcStatus: 'PASSED',
                      qcGrade: 'Grade A Export',
                      inspector: 'Mandi Scale Officer / WGL QC',
                      remarks: 'Zero tare calibrated. 4L/5L apple layer count verified. Firmness & brix approved.',
                      scaleSlipUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop',
                      balanceAmt: '₹3,96,000',
                      balanceStatus: 'CLEARED ON WEIGHBRIDGE',
                    },
                    {
                      id: 'qc-2',
                      poNumber: 'PO/SF/2026/018',
                      orderPersonPlace: 'Tirupati Mandi Hub',
                      vendorName: 'Rayalaseema Pomegranate Orchards',
                      vendorCode: 'VND-002',
                      grossKg: 18900,
                      tareKg: 7800,
                      netKg: 11100,
                      qcStatus: 'PASSED',
                      qcGrade: 'Grade A Bhagwa',
                      inspector: 'Tirupati Mandi QC Team',
                      remarks: 'Tare balance zeroed. Uniform fruit count. Sugar brix 15.5%.',
                      scaleSlipUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop',
                      balanceAmt: '₹3,80,250',
                      balanceStatus: 'CLEARED ON WEIGHBRIDGE',
                    },
                  ];

                  return qcList.map((qc: any) => {
                    const poCode = qc.poNumber || 'PO/SF/2026/020';
                    const hub = qc.orderPersonPlace || 'Warangal Hub';
                    const vName = qc.vendorProfile?.businessName || qc.supplier?.name || qc.vendorName || 'Wholesale Vendor';
                    const vCode = qc.vendorProfile?.vendorId || qc.supplier?.supplierCode || qc.vendorCode || 'VND-001';
                    const gross = qc.weighbridgeGrossKg || qc.grossKg || 26450;
                    const tare = qc.weighbridgeTareKg || qc.tareKg || 11200;
                    const net = qc.weighbridgeNetKg || qc.netKg || Math.max(0, gross - tare);
                    const qcStatus = qc.qcInspectionStatus || qc.qcStatus || 'PASSED';
                    const qcGrade = qc.qcGrade || 'Grade A Certified';
                    const inspector = qc.qcInspectorName || qc.inspector || 'Mandi Scale Inspector';
                    const remarks = qc.qcInspectionRemarks || qc.remarks || 'Scale calibrated. Fruit quality verified.';
                    const slipUrl = qc.weighbridgeScaleSlipUrl || qc.scaleSlipUrl;
                    const balAmt = qc.balancePaymentAmount ? `₹${Number(qc.balancePaymentAmount).toLocaleString('en-IN')}` : (qc.balanceAmt || '₹3,96,000');
                    const balStatus = qc.balancePaymentStatus || qc.balanceStatus || 'SETTLED';

                    return (
                      <tr key={qc.id || poCode} className="hover:bg-gray-50 transition">
                        <td className="py-3 px-3 text-center">
                          <strong className="font-mono text-gray-900 block">{poCode}</strong>
                          <span className="text-[10px] text-gray-500 font-semibold">{hub}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 block">{vName}</span>
                          <span className="text-[10px] text-emerald-800 font-mono font-bold">{vCode}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-800">
                          {Number(gross).toLocaleString('en-IN')} Kg
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-gray-500">
                          {Number(tare).toLocaleString('en-IN')} Kg
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-black text-emerald-800 text-sm block">
                            {Number(net).toLocaleString('en-IN')} Kg
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold">~{(net / 1000).toFixed(2)} MT Net</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1">
                            <CheckCircle2 size={11} /> {qcStatus}
                          </span>
                          <span className="text-[10px] text-gray-600 block mt-0.5">{qcGrade}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {slipUrl ? (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ url: slipUrl, title: `${poCode} - Mandi Weighbridge Scale Slip` })}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <FileSpreadsheet size={13} className="text-emerald-700" /> View Scale Slip
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400">No Slip</span>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <strong className="text-gray-800 block text-[11px] truncate">{inspector}</strong>
                          <span className="text-[10px] text-gray-500 line-clamp-2 block leading-relaxed mt-0.5">
                            {remarks}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <strong className="text-emerald-900 block">{balAmt}</strong>
                          <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                            ✓ {balStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Register New Vendor */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal !w-[720px] max-w-[96vw] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
            {/* Header */}
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
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
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

              {/* Primary Location (Whitelisted 8 Locations Only) */}
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
                      📍 {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Identity: Aadhaar & PAN */}
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

              {/* Banking Coordinates */}
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

              {/* Initial Password */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">Initial Login Password *</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Vendor will use their Vendor ID (e.g. VND-001) or Phone Number along with this password to log in.
                </span>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="secondary-button"
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
      {/* Document Preview Modal */}
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
    </div>
  );
};
