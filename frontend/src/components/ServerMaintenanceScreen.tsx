import React, { useState } from 'react';
import {
  Wrench,
  RefreshCw,
  LogOut,
  PhoneCall,
  Mail,
  ShieldAlert,
  Clock,
  Building2,
  HardHat,
} from 'lucide-react';

interface ServerMaintenanceScreenProps {
  vendorName?: string;
  vendorId?: string;
  onRetry: () => void;
  onLogout: () => void;
  message?: string;
}

export const ServerMaintenanceScreen: React.FC<ServerMaintenanceScreenProps> = ({
  vendorName,
  vendorId,
  onRetry,
  onLogout,
  message,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      await onRetry();
    } finally {
      setTimeout(() => setIsRetrying(false), 800);
    }
  };

  return (
    <div className="min-h-screen bg-[#edf5ef] flex flex-col justify-between font-['Manrope',sans-serif]">
      {/* Brand Header */}
      <header className="w-full bg-white border-b border-[#d5e3d8] shadow-xs px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/safal-globe-logo.png"
            alt="SAFAL Logo"
            className="w-9 h-9 object-contain rounded-xl bg-emerald-50 p-1 border border-emerald-200 shadow-xs"
          />
          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-[#064D2B] tracking-tight leading-tight">
              SAFAL EXPORT &amp; IMPORT PVT LTD
            </h1>
            <p className="text-[10px] sm:text-xs text-emerald-800 font-semibold tracking-wide">
              Freshness Beyond Borders · Enterprise ERP Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50 px-3.5 py-1.5 rounded-full border border-amber-300 shadow-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <span className="font-extrabold text-[11px] sm:text-xs">Server Under Maintenance · 503</span>
        </div>
      </header>

      {/* Main Centered Maintenance Card */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 sm:py-14 flex items-center justify-center">
        <div className="w-full bg-white rounded-3xl border-2 border-amber-300/80 shadow-xl p-6 sm:p-10 text-center relative overflow-hidden space-y-6">
          {/* Decorative Top Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-emerald-500 to-amber-500" />

          {/* Icon Badge */}
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-50 border-2 border-amber-300 flex items-center justify-center shadow-inner relative">
            <div className="absolute inset-0 rounded-3xl bg-amber-400/10 animate-pulse" />
            <div className="relative text-amber-700 flex items-center justify-center">
              <HardHat size={44} className="stroke-[1.8]" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-white shadow-xs">
              <Wrench size={14} />
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase tracking-wider border border-amber-300">
              <ShieldAlert size={13} className="text-amber-700" />
              <span>Status: System Maintenance Active</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Server Under Maintenance
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 max-w-lg mx-auto leading-relaxed">
              {message ||
                'The Safal Wholesale Vendor Procurement Gateway is temporarily under scheduled system maintenance. Access to your vendor dashboard, consignment tracking, and PO desks is momentarily offline.'}
            </p>
          </div>

          {/* Vendor Details Box */}
          {(vendorName || vendorId) && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-left space-y-2.5">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 size={13} className="text-gray-600" />
                  Vendor Account
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                  Maintenance Mode
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">Authorized Vendor</span>
                  <strong className="text-gray-900 font-extrabold text-xs sm:text-sm">
                    {vendorName || 'Wholesale Partner'}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">Vendor ID Code</span>
                  <strong className="text-emerald-800 font-mono font-black text-xs sm:text-sm">
                    {vendorId || 'VND-XXX'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Notice Box */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-left flex items-start gap-2.5 text-xs text-amber-950">
            <Clock size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-[11px] leading-relaxed">
                All farm procurement orders, payment clearance records, and weighbridge audit logs are securely stored in our encrypted database.
              </p>
              <p className="text-[10px] text-amber-800 leading-normal">
                Our operations team will restore portal access once server maintenance and route sync are concluded.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#064D2B] hover:bg-[#087A3E] text-white text-xs font-black shadow-md transition inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isRetrying ? 'animate-spin' : ''} />
              <span>{isRetrying ? 'Checking Status...' : 'Check Server Status'}</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-extrabold transition inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <LogOut size={14} />
              <span>Sign Out / Return to Login</span>
            </button>
          </div>

          {/* Support Helpline Footer */}
          <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-500 flex flex-wrap items-center justify-center gap-4">
            <span className="font-bold text-gray-700">Safal Logistics Desk Support:</span>
            <a
              href="tel:+919848012345"
              className="inline-flex items-center gap-1 text-emerald-800 hover:underline font-bold"
            >
              <PhoneCall size={12} /> +91 98480 12345
            </a>
            <a
              href="mailto:support@safalexports.com"
              className="inline-flex items-center gap-1 text-emerald-800 hover:underline font-bold"
            >
              <Mail size={12} /> support@safalexports.com
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-[#d5e3d8] py-3 px-4 text-center text-[10px] text-gray-500 font-medium">
        SAFAL EXPORT AND IMPORT PVT LTD · Enterprise Wholesale Fruit Logistics ERP · All Rights Reserved
      </footer>
    </div>
  );
};
