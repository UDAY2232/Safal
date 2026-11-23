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
      const data = await api.getAllVendors();
      setVendors(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load vendors:', err);
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
    </div>
  );
};
