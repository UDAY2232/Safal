import React from 'react';
import {
  Home,
  ShoppingCart,
  Package,
  CreditCard,
  FileText,
  ReceiptIndianRupee,
  ClipboardCheck,
  WalletCards,
  Users,
  Truck,
  BarChart3,
  BriefcaseBusiness,
  Clock,
  Clock3,
  Settings,
  Leaf,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  LucideIcon,
  ShieldCheck,
  Scale,
  User,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  close: () => void;
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

interface NavEntry {
  label: string;
  icon: LucideIcon;
  roles: Role[];
  adminOnly?: boolean;
}

const navItems: NavEntry[] = [
  { label: 'Dashboard', icon: Home, roles: ['ADMIN', 'ACCOUNTANT', 'EMPLOYEE', 'VENDOR'] },
  { label: 'Purchase Order (PO)', icon: ShoppingCart, roles: ['ADMIN', 'ACCOUNTANT', 'VENDOR'] },
  { label: 'Supply Consignments', icon: Package, roles: ['VENDOR'] },
  { label: 'Ready for Dispatch', icon: Truck, roles: ['VENDOR'] },
  { label: 'Weighbridge & QC Slips', icon: Scale, roles: ['VENDOR'] },
  { label: 'Profile', icon: User, roles: ['VENDOR'] },
  { label: 'Customer Due (CD)', icon: CreditCard, roles: ['ADMIN', 'ACCOUNTANT', 'EMPLOYEE'] },
  { label: 'Field Work', icon: MapPin, roles: ['EMPLOYEE'] },
  { label: 'Seller Business Tracking', icon: TrendingUp, roles: ['EMPLOYEE'] },
  { label: 'Vendors (KYC)', icon: ShieldCheck, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Field Work Management', icon: MapPin, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Field Sales & Seller Business', icon: TrendingUp, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Attendance', icon: Clock, roles: ['ADMIN', 'ACCOUNTANT', 'EMPLOYEE'] },
  { label: 'Invoices', icon: FileText, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Employee Expenses', icon: ReceiptIndianRupee, roles: ['ADMIN', 'ACCOUNTANT', 'EMPLOYEE'] },
  { label: 'Bill Clearance', icon: ClipboardCheck, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Wages & Salary', icon: WalletCards, roles: ['ADMIN'], adminOnly: true },
  { label: 'Employees', icon: Users, roles: ['ADMIN'], adminOnly: true },
  { label: 'Suppliers', icon: Truck, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Activity Logs', icon: Clock3, roles: ['ADMIN'], adminOnly: true },
  { label: 'Settings', icon: Settings, roles: ['ADMIN'], adminOnly: true },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onNavigate,
  isOpen,
  close,
  isCollapsed = false,
  toggleCollapse,
}) => {
  const { user, logout } = useAuth();
  const currentRole = user?.role || 'EMPLOYEE';

  // In mobile overlay drawer mode (isOpen = true), sidebar must NEVER be collapsed.
  // Full text labels and names must always show next to the icons!
  const isEffectivelyCollapsed = isCollapsed && !isOpen;

  const visibleNav = navItems.filter((item) => item.roles.includes(currentRole));

  return (
    <aside
      className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${isEffectivelyCollapsed ? 'sidebar-collapsed' : ''}`}
      aria-label="Sidebar Navigation"
    >
      {/* Mobile drawer header */}
      <div className="sidebar-mobile-header flex items-center justify-between pb-3 mb-2.5 border-b border-white/15">
        <div className="flex items-center gap-2.5">
          <img
            src="/safal-globe-logo.png"
            alt="SAFAL Logo"
            className="w-11 h-11 object-contain rounded-xl bg-white/10 p-1 shadow-sm"
          />
          <div>
            <h3 className="font-extrabold text-sm text-white tracking-tight leading-none font-['Manrope']">
              SAFAL
            </h3>
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block mt-0.5">
              Workspace Menu
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close menu"
          className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 text-white flex items-center justify-center transition-transform cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Access Scope Banner & Desktop Collapse Toggle */}
      {!isEffectivelyCollapsed ? (
        <div className="flex items-center justify-between px-3 py-2 mb-2 bg-white/5 rounded-xl border border-white/10 flex-shrink-0">
          <div className="min-w-0 pr-1">
            <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">Access Scope</span>
            <p className="text-xs font-semibold text-white truncate">
              {currentRole === 'ADMIN'
                ? 'Full Administrator'
                : currentRole === 'ACCOUNTANT'
                ? 'Accountant Console'
                : currentRole === 'VENDOR'
                ? 'Authorized Vendor'
                : 'Employee Operations'}
            </p>
          </div>
          {toggleCollapse && (
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-emerald-200/80 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              title="Collapse sidebar to icon bar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-2 mb-2 bg-white/5 rounded-xl border border-white/10 flex-shrink-0">
          {toggleCollapse && (
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen size={18} />
            </button>
          )}
          <span className="text-[9px] font-black text-emerald-300 uppercase tracking-tighter mt-1">
            {currentRole === 'ADMIN' ? 'ADM' : currentRole === 'ACCOUNTANT' ? 'ACC' : currentRole === 'VENDOR' ? 'VND' : 'EMP'}
          </span>
        </div>
      )}

      {/* Scrollable Navigation Container */}
      <nav className="sidebar-nav">
        {visibleNav.map(({ label, icon: Icon, adminOnly }) => {
          const isActive = activePage === label;
          return (
            <button
              key={label}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''} ${isEffectivelyCollapsed ? 'collapsed-item' : ''}`}
              onClick={() => onNavigate(label)}
              title={label}
            >
              <Icon size={19} className="flex-shrink-0" />
              {!isEffectivelyCollapsed && <span className="truncate flex-1 font-semibold">{label}</span>}
              {!isEffectivelyCollapsed && adminOnly && <span className="admin-dot flex-shrink-0">A</span>}
            </button>
          );
        })}
      </nav>

      {/* Persistent Footer with User info and Mobile Logout */}
      {!isEffectivelyCollapsed ? (
        <div className="sidebar-footer relative z-10 flex items-center gap-2.5">
          <div className="leaf-badge flex-shrink-0">
            <Leaf size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <strong className="truncate">{user?.name || 'SAFAL Workspace'}</strong>
            <span className="truncate block text-[11px] text-emerald-200/80">
              {user?.role === 'ADMIN'
                ? 'Full Administrator'
                : user?.role === 'ACCOUNTANT'
                ? 'Accountant'
                : user?.role === 'VENDOR'
                ? 'Vendor Partner'
                : 'Field Operations'}
            </span>
          </div>
          {/* Mobile Sign Out Button */}
          <button
            type="button"
            onClick={logout}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/20 hover:bg-red-500/30 active:scale-90 text-red-200 transition-transform cursor-pointer flex-shrink-0"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      ) : (
        <div
          className="sidebar-footer collapsed-footer relative z-10 flex justify-center py-2.5"
          title="SAFAL Workspace FY 2026"
        >
          <div className="leaf-badge">
            <Leaf size={16} />
          </div>
        </div>
      )}

      {/* Decorative Wave Accent at Bottom */}
      <div className="sidebar-wave-decoration pointer-events-none absolute bottom-0 left-0 right-0 overflow-hidden leading-none z-0">
        <svg
          viewBox="0 0 228 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto opacity-70 transform translate-y-2"
        >
          <path d="M0 50 C60 15, 150 90, 228 35 L228 100 L0 100 Z" fill="#187A44" />
          <path d="M0 70 C75 35, 140 95, 228 55 L228 100 L0 100 Z" fill="#2FB366" />
        </svg>
      </div>
    </aside>
  );
};

