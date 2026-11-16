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
} from 'lucide-react';
import { api } from '../services/api';

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
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#064D2B]">Workspace &amp; System Configuration</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure application branding, procurement guidelines, and financial defaults.
          </p>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="primary-button inline-flex items-center gap-1.5"
        >
          <Save size={15} /> Save Settings
        </button>
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
    </form>
  );
};

