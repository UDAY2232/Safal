import React from 'react';
import {
  Home,
  ShoppingCart,
  FileText,
  ReceiptIndianRupee,
  ClipboardCheck,
  WalletCards,
  Users,
  Truck,
  BarChart3,
  BriefcaseBusiness,
  Clock3,
  Settings,
  Leaf,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  roles: Array<'ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE'>;
  adminOnly?: boolean;
}

const navItems: NavEntry[] = [
  { label: 'Dashboard', icon: Home, roles: ['ADMIN', 'ACCOUNTANT', 'EMPLOYEE'] },
  { label: 'Purchase Order (PO)', icon: ShoppingCart, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Invoices', icon: FileText, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Employee Expenses', icon: ReceiptIndianRupee, roles: ['ADMIN', 'ACCOUNTANT', 'EMPLOYEE'] },
  { label: 'Bill Clearance', icon: ClipboardCheck, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Wages & Salary', icon: WalletCards, roles: ['ADMIN'], adminOnly: true },
  { label: 'Employees', icon: Users, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Suppliers', icon: Truck, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'ACCOUNTANT'] },
  { label: 'Accountant Performance', icon: BriefcaseBusiness, roles: ['ADMIN'], adminOnly: true },
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
  const { user } = useAuth();
  const currentRole = user?.role || 'EMPLOYEE';

  const visibleNav = navItems.filter((item) => item.roles.includes(currentRole));

  return (
    <aside
      className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}
      aria-label="Sidebar Navigation"
    >
      {/* Mobile drawer header */}
      <div className="sidebar-mobile-header">
        <span>SAFAL Workspace</span>
        <button onClick={close} aria-label="Close sidebar">
          <X size={20} />
        </button>
      </div>

      {/* Access Scope Banner & Desktop Collapse Toggle */}
      {!isCollapsed ? (
        <div className="flex items-center justify-between px-3 py-2 mb-2 bg-white/5 rounded-xl border border-white/10 flex-shrink-0">
          <div className="min-w-0 pr-1">
            <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">Access Scope</span>
            <p className="text-xs font-semibold text-white truncate">
              {currentRole === 'ADMIN'
                ? 'Full Administrator'
                : currentRole === 'ACCOUNTANT'
                ? 'Accountant Console'
                : 'Employee Self-Service'}
            </p>
          </div>
          {toggleCollapse && (
            <button
              onClick={toggleCollapse}
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-emerald-200/80 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
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
              className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 transition-colors"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen size={18} />
            </button>
          )}
          <span className="text-[9px] font-black text-emerald-300 uppercase tracking-tighter mt-1">
            {currentRole === 'ADMIN' ? 'ADM' : currentRole === 'ACCOUNTANT' ? 'ACC' : 'EMP'}
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
              className={`nav-item ${isActive ? 'active' : ''} ${isCollapsed ? 'collapsed-item' : ''}`}
              onClick={() => onNavigate(label)}
              title={label}
            >
              <Icon size={19} className="flex-shrink-0" />
              {!isCollapsed && <span className="truncate flex-1">{label}</span>}
              {!isCollapsed && adminOnly && <span className="admin-dot flex-shrink-0">A</span>}
            </button>
          );
        })}
      </nav>

      {/* Persistent Footer */}
      {!isCollapsed ? (
        <div className="sidebar-footer relative z-10">
          <div className="leaf-badge flex-shrink-0">
            <Leaf size={18} />
          </div>
          <div className="min-w-0">
            <strong className="truncate">SAFAL Workspace</strong>
            <span className="truncate">FY 2026 · Live System</span>
          </div>
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

