import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  BriefcaseBusiness,
  ShoppingCart,
  Users,
  ReceiptIndianRupee,
  SlidersHorizontal,
  Save,
  CheckCircle2,
  Database,
  Server,
  ExternalLink,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  User,
  Lock,
  Building2,
  Percent,
} from 'lucide-react';
import { api } from '../services/api';
import { AdminPasswordResetModal } from '../components/AdminPasswordResetModal';

interface SettingsPageProps {
  onNotify: (msg: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNotify }) => {
  const [settings, setSettings] = useState<any>({
    companyName: 'SAFAL EXPORT AND IMPORT PVT LTD',
    applicationName: 'SAFAL APP',
    businessType: 'Fruits Import & Export',
    currency: 'INR (₹)',
    timezone: 'Asia/Kolkata (IST)',
    poNumberPrefix: 'PO/SF',
    poApprovalRequired: true,
    expenseMaxNoReceipt: 500,
  });
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [resSettings, resDb] = await Promise.allSettled([
          api.getSettings(),
          api.getSystemStatus(),
        ]);
        if (resSettings.status === 'fulfilled') {
          setSettings((prev: any) => ({ ...prev, ...resSettings.value }));
        }
        if (resDb.status === 'fulfilled') {
          setDbStatus(resDb.value);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.updateSettings(settings);
      onNotify('Application settings updated successfully');
    } catch {
      onNotify('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#087A3E]" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#064D2B]">Workspace &amp; System Configuration</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure application branding, procurement guidelines, and financial defaults.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Reset Password for Admin or Staff"
          >
            <KeyRound size={15} className="text-amber-700" /> Reset Password
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="primary-button inline-flex items-center gap-1.5"
          >
            <Save size={15} /> Save Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {/* Company Settings */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold border-b border-gray-100 pb-2">
            <BriefcaseBusiness size={18} /> Company Branding &amp; Profile
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Company Display Name</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Application Name</label>
            <input
              type="text"
              value={settings.applicationName}
              onChange={(e) => setSettings({ ...settings, applicationName: e.target.value })}
              className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Primary Currency</label>
              <input
                type="text"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Timezone</label>
              <input
                type="text"
                value={settings.timezone}
                onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>

        {/* PO Settings */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold border-b border-gray-100 pb-2">
            <ShoppingCart size={18} /> Purchase Order Policies
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">PO Number Prefix</label>
            <input
              type="text"
              value={settings.poNumberPrefix}
              onChange={(e) => setSettings({ ...settings, poNumberPrefix: e.target.value })}
              className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-mono"
            />
            <small className="text-gray-400 text-[10px]">
              Format: {settings.poNumberPrefix}/YYYY/XXX
            </small>
          </div>
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
              <input
                type="checkbox"
                checked={settings.poApprovalRequired}
                onChange={(e) =>
                  setSettings({ ...settings, poApprovalRequired: e.target.checked })
                }
                className="rounded text-emerald-600"
              />
              <span>Require Admin Approval Before Procurement Order is Open</span>
            </label>
            <p className="text-[11px] text-gray-500 mt-1 pl-6">
              When checked, accountant-submitted POs must be authorized by Admin before suppliers are issued orders.
            </p>
          </div>
        </div>

        {/* Purchase Order Commission & Mandi Settlement Settings (Admin Control) */}
        <div className="bg-white p-5 rounded-2xl border-2 border-emerald-300 shadow-sm space-y-4 md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3">
            <div>
              <div className="flex items-center gap-2 text-[#064D2B] font-bold text-sm">
                <Percent size={18} className="text-[#087A3E]" /> Purchase Order Commission &amp; Mandi Settlement Policies
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure role-based commission rates, calculation basis, and settlement rules for vendor and admin purchase orders.
              </p>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
              Historical Rates Preserved Permanently
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor PO Configuration */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                  <Building2 size={14} className="text-emerald-700" /> Vendor-Created POs (Mandi Consignment)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Total: {Number(settings.vendorCommissionRates?.safalPercent ?? 5) + Number(settings.vendorCommissionRates?.apmcPercent ?? 1)}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">SAFAL Commission (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={settings.vendorCommissionRates?.safalPercent ?? 5}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const cur = settings.vendorCommissionRates || {};
                      setSettings({
                        ...settings,
                        vendorCommissionRates: {
                          ...cur,
                          safalPercent: val,
                          totalPercent: val + Number(cur.apmcPercent ?? 1),
                        },
                      });
                    }}
                    className="w-full h-9 px-2.5 border border-emerald-300 rounded-lg text-xs font-bold bg-white"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Default: 5%</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">APMC Mandi Cess (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={settings.vendorCommissionRates?.apmcPercent ?? 1}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const cur = settings.vendorCommissionRates || {};
                      setSettings({
                        ...settings,
                        vendorCommissionRates: {
                          ...cur,
                          apmcPercent: val,
                          totalPercent: Number(cur.safalPercent ?? 5) + val,
                        },
                      });
                    }}
                    className="w-full h-9 px-2.5 border border-emerald-300 rounded-lg text-xs font-bold bg-white"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Default: 1%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Calculation Basis</label>
                  <select
                    value={settings.vendorCommissionRates?.calculationBasis || 'GROSS_PO_AMOUNT'}
                    onChange={(e) => {
                      setSettings({
                        ...settings,
                        vendorCommissionRates: {
                          ...(settings.vendorCommissionRates || {}),
                          calculationBasis: e.target.value,
                        },
                      });
                    }}
                    className="w-full h-9 px-2.5 border border-emerald-300 rounded-lg text-xs font-medium bg-white"
                  >
                    <option value="GROSS_PO_AMOUNT">Eligible Gross PO Base Amount</option>
                    <option value="NET_AFTER_DISCOUNT">Net Base After Trade Discount</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Accounting Settlement Treatment</label>
                  <select
                    value={settings.vendorCommissionRates?.settlementRule || 'DEDUCTION_FROM_PAYABLE'}
                    onChange={(e) => {
                      setSettings({
                        ...settings,
                        vendorCommissionRates: {
                          ...(settings.vendorCommissionRates || {}),
                          settlementRule: e.target.value,
                        },
                      });
                    }}
                    className="w-full h-9 px-2.5 border border-emerald-300 rounded-lg text-xs font-medium bg-white"
                  >
                    <option value="DEDUCTION_FROM_PAYABLE">Deduction from Vendor Payable (Net = 94%)</option>
                    <option value="ADDITIONAL_SURCHARGE">Additional Platform Surcharge</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  value={settings.vendorCommissionRates?.effectiveDate || '2026-04-01'}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      vendorCommissionRates: {
                        ...(settings.vendorCommissionRates || {}),
                        effectiveDate: e.target.value,
                      },
                    });
                  }}
                  className="w-full h-9 px-2.5 border border-emerald-300 rounded-lg text-xs bg-white"
                />
              </div>
            </div>

            {/* Admin PO Configuration */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#064D2B]" /> Admin-Created POs (Direct Procurement)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Commission: 0% (Exempt)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">SAFAL Commission (%)</label>
                  <input
                    type="number"
                    disabled
                    value={0}
                    className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Locked: 0%</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">APMC Commission (%)</label>
                  <input
                    type="number"
                    disabled
                    value={0}
                    className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Locked: 0%</span>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-gray-200 text-gray-600 text-[11px] leading-relaxed">
                <strong>Accounting Rule:</strong> Admin-created POs are company-direct wholesale fruit procurement orders. No mandi commission deductions apply. Net payable equals the full base commitment.
              </div>

              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                🛡️ <strong>Historical Rates Integrity:</strong> Modifying future commission settings applies only to newly issued POs. Previously finalized POs retain their historical commission rates in the database.
              </div>
            </div>
          </div>
        </div>

        {/* Expense Settings */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold border-b border-gray-100 pb-2">
            <ReceiptIndianRupee size={18} /> Expense &amp; Reimbursement Policies
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Maximum Expense Without Receipt (₹)
            </label>
            <input
              type="number"
              value={settings.expenseMaxNoReceipt}
              onChange={(e) =>
                setSettings({ ...settings, expenseMaxNoReceipt: Number(e.target.value) })
              }
              className="w-full h-9 px-2.5 border border-gray-300 rounded-lg text-xs"
            />
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
            <strong>Compliance Note:</strong> Employees and accountants can upload PDF, JPG, and PNG
            bills up to 10MB. Rejection reasons are mandatory and recorded in the audit trail.
          </div>
        </div>

        {/* Permissions & Security */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 font-bold border-b border-gray-100 pb-2">
            <SlidersHorizontal size={18} /> Role-Based Access Control (RBAC)
          </div>
          <div className="space-y-2 text-[11px] text-gray-700">
            <div className="p-2 bg-gray-50 rounded-lg">
              <strong className="text-gray-900 block">Admin Role</strong>
              Full control, accountant creation, PO approvals, expense authorizations, wage calculations, settings.
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <strong className="text-gray-900 block">Accountant Role</strong>
              PO drafting &amp; submission, expense review, permitted wage records, performance tracking.
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <strong className="text-gray-900 block">Employee Role</strong>
              Company spending submissions, receipt uploads, personal claim tracking. Cannot approve own claims.
            </div>
          </div>
        </div>

        {/* Password & Credential Management (Admin Only) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <KeyRound size={20} className="text-[#087A3E]" /> Password &amp; Credential Management
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Reset system passwords directly for Administrator or any staff member/employee across the platform.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPasswordModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#064D2B] hover:bg-emerald-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <KeyRound size={14} className="text-amber-300" /> Open Password Reset Tool
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div
              onClick={() => setShowPasswordModal(true)}
              className="p-3.5 bg-gray-50 hover:bg-emerald-50/60 rounded-xl border border-gray-200/80 hover:border-emerald-300 cursor-pointer transition flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                <User size={16} />
              </div>
              <div>
                <strong className="text-gray-900 block font-bold">Admin Account Password</strong>
                <span className="text-gray-500 text-[11px] block mt-0.5">
                  Update master administrator login password securely without current password barrier.
                </span>
              </div>
            </div>

            <div
              onClick={() => setShowPasswordModal(true)}
              className="p-3.5 bg-gray-50 hover:bg-blue-50/60 rounded-xl border border-gray-200/80 hover:border-blue-300 cursor-pointer transition flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                <KeyRound size={16} />
              </div>
              <div>
                <strong className="text-gray-900 block font-bold">Staff / Employee Passwords</strong>
                <span className="text-gray-500 text-[11px] block mt-0.5">
                  Select any employee or accountant to assign a new temporary or permanent password.
                </span>
              </div>
            </div>

            <div
              onClick={() => setShowPasswordModal(true)}
              className="p-3.5 bg-gray-50 hover:bg-amber-50/60 rounded-xl border border-gray-200/80 hover:border-amber-300 cursor-pointer transition flex items-start gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                <ShieldCheck size={16} />
              </div>
              <div>
                <strong className="text-gray-900 block font-bold">Auto-Generator &amp; Audit Logs</strong>
                <span className="text-gray-500 text-[11px] block mt-0.5">
                  Single-click strong password generator with instant copy and tamper-proof audit trails.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Database Connection & Architecture */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <Database size={20} className="text-[#087A3E]" /> Database Connection &amp; Architecture
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#087A3E] border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {dbStatus?.status === 'CONNECTED' ? 'PostgreSQL Live & Synced' : 'Database Active'}
              </span>
              <a
                href="http://localhost:5555"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#064D2B] hover:bg-[#087A3E] text-white rounded-lg text-xs font-bold transition shadow-xs"
                title="Open Visual Database Inspector"
              >
                <ExternalLink size={13} /> Open Prisma Studio
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 text-[10px] uppercase font-bold block">Engine</span>
              <strong className="text-gray-800 font-bold block mt-0.5">PostgreSQL 14</strong>
              <small className="text-gray-500 text-[10px]">Port: 5433</small>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 text-[10px] uppercase font-bold block">Database</span>
              <strong className="text-gray-800 font-bold block mt-0.5">safal_db</strong>
              <small className="text-emerald-700 text-[10px] font-semibold">15 Prisma Models</small>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 text-[10px] uppercase font-bold block">Purchase Orders</span>
              <strong className="text-gray-800 font-bold block mt-0.5">{dbStatus?.records?.purchaseOrders ?? 12} Records</strong>
              <small className="text-gray-500 text-[10px]">Sum: ₹ 1,23,56,400</small>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-gray-400 text-[10px] uppercase font-bold block">Workforce &amp; Suppliers</span>
              <strong className="text-gray-800 font-bold block mt-0.5">
                {(dbStatus?.records?.employees ?? 5) + (dbStatus?.records?.suppliers ?? 5)} Entities
              </strong>
              <small className="text-gray-500 text-[10px]">{dbStatus?.records?.employees ?? 5} Emp · {dbStatus?.records?.suppliers ?? 5} Sup</small>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-950 space-y-1">
            <strong>How to connect an external or remote database:</strong>
            <p className="text-gray-600 leading-relaxed">
              To connect your own cloud PostgreSQL database (e.g. Supabase, Neon, AWS RDS, or Railway), update the <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-800 font-mono">DATABASE_URL</code> in <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-800 font-mono">backend/.env</code> and run <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-800 font-mono">npx prisma db push</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Admin Password Reset Modal */}
      <AdminPasswordResetModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onNotify={onNotify}
      />
    </form>
  );
};

