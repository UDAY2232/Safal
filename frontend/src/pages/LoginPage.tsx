import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  ShoppingCart,
  ThermometerSnowflake,
  FileText,
  Users,
  CheckCircle2,
  Database,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError('');
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#edf5ef] flex flex-col justify-between">
      {/* Top Brand Bar */}
      <header className="w-full bg-white border-b border-[#d8e6db] px-4 sm:px-6 lg:px-12 py-2 sm:py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3.5">
          <img
            src="/safal-header-banner.jpg"
            alt="SAFAL EXPORT AND IMPORT PVT LTD"
            className="h-11 sm:h-14 lg:h-16 w-auto max-w-[240px] sm:max-w-[420px] md:max-w-[560px] object-contain rounded-xl shadow-xs border border-blue-200/60"
          />
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold">Enterprise Internal Operations Portal</span>
        </div>
      </header>

      {/* Main Home & Portal Split Section */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14">
        {/* Left Column: Application Showcase / Highlights */}
        <div className="flex-1 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-900 text-xs font-bold uppercase tracking-wider border border-emerald-300">
            <Building2 size={13} />
            <span>Digital Cold-Chain &amp; Commodity ERP</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B3D23] font-['Manrope'] leading-tight tracking-tight">
            Integrated Fruit Procurement, Storage &amp; Fiscal Management
          </h1>

          <p className="text-sm text-gray-600 leading-relaxed max-w-xl">
            Centralized internal operations platform for <strong>SAFAL EXPORT AND IMPORT PVT LTD</strong>. Seamlessly managing wholesale fruit procurement contracts, temperature-regulated cold storage, real-time GST tax invoicing, and audited workforce financial disbursements.
          </p>

          {/* 4 Core Pillars Showcase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="p-3.5 rounded-xl bg-white border border-[#d6e5d9] shadow-xs flex items-start gap-3 hover:border-emerald-500 transition">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-[#087A3E] flex items-center justify-center flex-shrink-0">
                <ShoppingCart size={18} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-gray-900">Procurement &amp; Orders</h2>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                  Multi-fruit line items with automated advance &amp; pending due calculations.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#d6e5d9] shadow-xs flex items-start gap-3 hover:border-emerald-500 transition">
              <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                <ThermometerSnowflake size={18} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-gray-900">Cold Chain Storage</h2>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                  Navi Mumbai Hub 1 telemetry with -0.5°C threshold tracking.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#d6e5d9] shadow-xs flex items-start gap-3 hover:border-emerald-500 transition">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <FileText size={18} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-gray-900">Tax Invoicing &amp; Export</h2>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                  Compliant GST e-invoices, export documentation, and CSV reporting.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#d6e5d9] shadow-xs flex items-start gap-3 hover:border-emerald-500 transition">
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                <Users size={18} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-gray-900">Workforce &amp; Audit Trail</h2>
                <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                  Verified employee claims, payroll wage runs, and double-entry ledger.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5 text-emerald-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-gray-200">
              <Database size={14} className="text-emerald-600" />
              Neon Cloud PostgreSQL
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-gray-200">
              <ShieldCheck size={14} className="text-emerald-600" />
              256-Bit SSL Encrypted
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-800 font-semibold bg-white px-3 py-1.5 rounded-lg border border-gray-200">
              <CheckCircle2 size={14} className="text-emerald-600" />
              Private RBAC Protected
            </span>
          </div>
        </div>

        {/* Right Column: Portal Login Card */}
        <div className="w-full lg:w-[420px] flex-shrink-0">
          <div className="bg-white p-7 sm:p-8 rounded-3xl shadow-xl border border-[#d4e4d7] relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#087A3E] via-[#24A65A] to-[#F59E0B]" />

            <div className="text-center mb-6">
              <img
                src="/safal-globe-logo.png"
                alt="SAFAL Emblem"
                className="h-16 w-auto mx-auto mb-3 object-contain rounded-xl p-1 bg-emerald-50/60 border border-emerald-100"
              />
              <h2 className="text-xl font-extrabold text-[#0B3D23] font-['Manrope']">
                Operations Sign-In
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Access your designated Master Admin or Employee Operations workspace.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#1B2B21] mb-1">
                  Official Email Address
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 text-xs border border-gray-300 rounded-xl focus:border-[#087A3E] focus:outline-none focus:ring-1 focus:ring-[#087A3E]"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1B2B21] mb-1">Password</label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-9 py-2.5 text-xs border border-gray-300 rounded-xl focus:border-[#087A3E] focus:outline-none focus:ring-1 focus:ring-[#087A3E]"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl shadow-md text-xs font-bold text-white bg-gradient-to-r from-[#087A3E] to-[#064D2B] hover:opacity-95 focus:outline-none transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'} <ArrowRight size={15} />
                </button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-[11px] text-gray-500 leading-relaxed">
                <strong>Strictly Authorized Internal Portal</strong> · No public registration. Credentials are created and provisioned solely by SAFAL Administration.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#d8e6db] bg-white py-4 px-6 text-center text-xs text-gray-500">
        <p>
          © 2026 <strong>SAFAL EXPORT AND IMPORT PVT LTD</strong> · Registered Fruit Export &amp; Cold-Chain Enterprise · Hub 1 Navi Mumbai.
        </p>
      </footer>
    </div>
  );
};
