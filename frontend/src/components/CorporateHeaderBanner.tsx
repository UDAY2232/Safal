import React from 'react';
import {
  Snowflake,
  ShieldCheck,
  Boxes,
  Truck,
  Globe2,
  Plane,
  Leaf,
  Sparkles,
  Apple,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface CorporateHeaderBannerProps {
  onNavigate: (page: string) => void;
}

export const CorporateHeaderBanner: React.FC<CorporateHeaderBannerProps> = ({ onNavigate }) => {
  return (
    <section
      onClick={() => onNavigate('Dashboard')}
      role="banner"
      aria-label="SAFAL EXPORT & IMPORT PVT LTD Corporate ERP Header"
      title="SAFAL EXPORT & IMPORT PVT LTD - Click to navigate to Dashboard"
      className="relative w-full overflow-hidden cursor-pointer select-none bg-gradient-to-r from-[#032313] via-[#064D2B] to-[#04331C] text-white border-t border-emerald-500/20 border-b-2 border-[#0D4E90] shadow-md transition-all duration-200 group"
    >
      {/* 1. Subtle Architectural SVG Background (World Logistics Network & Fruit Trade Mesh) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
        <svg
          className="absolute -right-10 -top-10 w-[600px] h-[260px] text-emerald-400"
          viewBox="0 0 600 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Grid Lines */}
          <line x1="0" y1="40" x2="600" y2="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.4" />
          <line x1="0" y1="120" x2="600" y2="120" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.4" />
          <line x1="0" y1="200" x2="600" y2="200" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.4" />
          <line x1="150" y1="0" x2="150" y2="260" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.3" />
          <line x1="350" y1="0" x2="350" y2="260" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.3" />
          <line x1="500" y1="0" x2="500" y2="260" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.3" />

          {/* Global Flight / Shipping Trade Arcs */}
          <path
            d="M 50 180 Q 220 30 420 90 T 560 60"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.6"
          />
          <path
            d="M 100 220 Q 300 90 520 160"
            stroke="#93C5FD"
            strokeWidth="1"
            strokeDasharray="3 5"
            opacity="0.5"
          />

          {/* Trade Hub Node Points */}
          <circle cx="50" cy="180" r="3.5" fill="#34D399" opacity="0.8" />
          <circle cx="280" cy="72" r="3" fill="#6EE7B7" opacity="0.8" />
          <circle cx="420" cy="90" r="4" fill="#FCD34D" opacity="0.9" />
          <circle cx="560" cy="60" r="3.5" fill="#60A5FA" opacity="0.8" />
        </svg>

        {/* Delicate Ambient Radial Glows */}
        <div className="absolute -left-20 -top-20 w-72 h-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute right-1/4 -bottom-20 w-80 h-80 rounded-full bg-[#0D4E90]/25 blur-3xl pointer-events-none" />
      </div>

      {/* 2. Main Executive Header Body */}
      <div className="relative z-10 max-w-[1720px] mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex flex-col lg:flex-row items-center justify-between gap-3 sm:gap-4">
        
        {/* LEFT WING: Brand Authority, Logo & Corporate Identity */}
        <div className="flex items-center gap-3 sm:gap-4 w-full lg:w-auto justify-between lg:justify-start">
          {/* Illuminated Logo Badge */}
          <div className="relative flex-shrink-0 group-hover:scale-102 transition-transform duration-200">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/95 p-1.5 shadow-lg border border-white/40 flex items-center justify-center backdrop-blur-md">
              <img
                src="/safal-globe-logo.png"
                alt="SAFAL Global Fruit Trade"
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
            </div>
            {/* Subtle Active Indicator Dot */}
            <span
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#064D2B] animate-pulse"
              title="Enterprise ERP Live & Synchronized"
            />
          </div>

          {/* Company Name, Taglines & Fiscal Pill */}
          <div className="flex flex-col min-w-0">
            {/* Top Sub-label / Sector Tag */}
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-emerald-300 tracking-wider uppercase leading-none mb-1">
              <Leaf size={11} className="text-emerald-400 shrink-0" />
              <span>International Fruit Import &amp; Export</span>
              <span className="opacity-40 hidden sm:inline">·</span>
              <span className="text-amber-300/90 font-semibold hidden sm:inline">Cold-Chain Network</span>
            </div>

            {/* Prominent Company Brand Name */}
            <h1 className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight leading-tight flex items-center gap-2">
              <span className="bg-gradient-to-r from-white via-white to-emerald-100 bg-clip-text text-transparent drop-shadow-xs">
                SAFAL EXPORT &amp; IMPORT PVT LTD
              </span>
            </h1>

            {/* Tagline & Corporate Designation */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5 mt-1 text-[11px] sm:text-xs">
              {/* Official Tagline */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-emerald-100 font-semibold border border-white/15 backdrop-blur-xs">
                <Sparkles size={11} className="text-amber-300 shrink-0" />
                <span>Freshness Beyond Borders</span>
              </span>

              {/* Fiscal Year & Platform Pill */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0D4E90]/40 text-blue-100 font-bold text-[10px] sm:text-[11px] border border-blue-400/30">
                <span>FY 2026–27</span>
                <span className="opacity-50">|</span>
                <span>Enterprise ERP Platform</span>
              </span>

              {/* Health Motto (Desktop only) */}
              <span className="hidden xl:inline-flex items-center gap-1 text-[11px] text-emerald-300/80 font-medium italic">
                “Eat Fresh · Get Good Health”
              </span>
            </div>
          </div>
        </div>

        {/* CENTER / RIGHT SECTION: 5 Core Service Pillars (Responsive Enterprise Badges) */}
        <div className="w-full lg:w-auto flex flex-col items-center lg:items-end gap-1.5 sm:gap-2">
          
          {/* Top Label (Visible on large screens) */}
          <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold text-emerald-200/90 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Core Integrated Operations &amp; Cold-Chain Facilities</span>
          </div>

          {/* 5 Enterprise Service Highlight Chips */}
          <div className="w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 sm:gap-2">
            
            {/* 1. Cold Storage */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 hover:border-cyan-300/40 transition-all duration-150 backdrop-blur-xs group/item">
              <div className="p-1 rounded-lg bg-cyan-400/15 text-cyan-300 group-hover/item:scale-110 transition-transform">
                <Snowflake size={14} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[11px] sm:text-xs font-bold text-white tracking-tight">Cold Storage</span>
                <span className="text-[9px] text-cyan-200/80 font-medium mt-0.5">-0.5°C Optimal</span>
              </div>
            </div>

            {/* 2. Quality Check */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 hover:border-emerald-300/40 transition-all duration-150 backdrop-blur-xs group/item">
              <div className="p-1 rounded-lg bg-emerald-400/15 text-emerald-300 group-hover/item:scale-110 transition-transform">
                <ShieldCheck size={14} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[11px] sm:text-xs font-bold text-white tracking-tight">Quality Check</span>
                <span className="text-[9px] text-emerald-200/80 font-medium mt-0.5">Grade A Certified</span>
              </div>
            </div>

            {/* 3. Export Packing */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 hover:border-amber-300/40 transition-all duration-150 backdrop-blur-xs group/item">
              <div className="p-1 rounded-lg bg-amber-400/15 text-amber-300 group-hover/item:scale-110 transition-transform">
                <Boxes size={14} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[11px] sm:text-xs font-bold text-white tracking-tight">Export Packing</span>
                <span className="text-[9px] text-amber-200/80 font-medium mt-0.5">Food-Safe Standard</span>
              </div>
            </div>

            {/* 4. Reefer Loading */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 hover:border-blue-300/40 transition-all duration-150 backdrop-blur-xs group/item">
              <div className="p-1 rounded-lg bg-blue-400/15 text-blue-300 group-hover/item:scale-110 transition-transform">
                <Truck size={14} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[11px] sm:text-xs font-bold text-white tracking-tight">Reefer Loading</span>
                <span className="text-[9px] text-blue-200/80 font-medium mt-0.5">Fleet Monitored</span>
              </div>
            </div>

            {/* 5. Global Supply */}
            <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 hover:border-teal-300/40 transition-all duration-150 backdrop-blur-xs group/item">
              <div className="p-1 rounded-lg bg-teal-400/15 text-teal-300 group-hover/item:scale-110 transition-transform">
                <Globe2 size={14} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[11px] sm:text-xs font-bold text-white tracking-tight">Global Supply</span>
                <span className="text-[9px] text-teal-200/80 font-medium mt-0.5">Sea &amp; Air Corridors</span>
              </div>
            </div>

          </div>

          {/* Telemetry Strip / Trade Route Accents (Desktop only) */}
          <div className="hidden md:flex items-center justify-between w-full text-[10px] text-emerald-200/80 font-medium px-1">
            <div className="flex items-center gap-1.5">
              <Apple size={11} className="text-red-400/90" />
              <span>Kashmir Apples · Citrus · Tropical Mangoes &amp; Wholesale Fresh Produce</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-300 font-bold">
              <CheckCircle2 size={11} className="text-emerald-400" />
              <span>Phytosanitary Verified · Farm to Port</span>
            </div>
          </div>

        </div>

      </div>

      {/* 3. Bottom Executive Accent Belt (Dual Blue & Emerald Stripe) */}
      <div className="w-full bg-[#031d10] border-t border-emerald-900/60 px-4 py-1 flex items-center justify-between text-[10px] text-emerald-300/90 font-bold uppercase tracking-wider">
        <div className="flex items-center gap-2 overflow-hidden truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate">FRUITS IMPORT &nbsp;|&nbsp; EXPORT &nbsp;|&nbsp; WHOLESALE &nbsp;|&nbsp; COLD CHAIN LOGISTICS</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-gray-300 font-semibold shrink-0">
          <MapPin size={10} className="text-emerald-400" />
          <span>Hanamkonda, Telangana · 506011</span>
        </div>
      </div>
    </section>
  );
};
