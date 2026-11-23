import React from 'react';
import {
  Home,
  Clock,
  ShoppingCart,
  CreditCard,
  ReceiptIndianRupee,
  Menu,
  Scale,
  Truck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MobileBottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onOpenMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePage,
  onNavigate,
  onOpenMenu,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE';
  const isVendor = user?.role === 'VENDOR';

  // Keep labels uniform and short so they never wrap or change button height
  const items = isVendor
    ? [
        { label: 'Dashboard', shortLabel: 'Dashboard', icon: Home, page: 'Dashboard' },
        { label: 'Supply POs', shortLabel: 'Supply PO', icon: ShoppingCart, page: 'Supply Consignments' },
        { label: 'Dispatch', shortLabel: 'Dispatch', icon: Truck, page: 'Ready for Dispatch' },
        { label: 'QC Slips', shortLabel: 'QC', icon: Scale, page: 'Weighbridge & QC Slips' },
      ]
    : isEmployee
    ? [
        { label: 'Dashboard', shortLabel: 'Dashboard', icon: Home, page: 'Dashboard' },
        { label: 'Customer Due', shortLabel: 'CD', icon: CreditCard, page: 'Customer Due (CD)' },
        { label: 'Attendance', shortLabel: 'Attendance', icon: Clock, page: 'Attendance' },
        { label: 'Expenses', shortLabel: 'Expenses', icon: ReceiptIndianRupee, page: 'Employee Expenses' },
      ]
    : [
        { label: 'Dashboard', shortLabel: 'Dashboard', icon: Home, page: 'Dashboard' },
        { label: 'PO', shortLabel: 'PO', icon: ShoppingCart, page: 'Purchase Order (PO)' },
        { label: 'CD', shortLabel: 'CD', icon: CreditCard, page: 'Customer Due (CD)' },
        { label: 'Attendance', shortLabel: 'Attendance', icon: Clock, page: 'Attendance' },
        { label: 'Expenses', shortLabel: 'Expenses', icon: ReceiptIndianRupee, page: 'Employee Expenses' },
      ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200/90 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-1 flex items-center justify-around select-none"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: 'calc(58px + env(safe-area-inset-bottom, 0px))',
      }}
      aria-label="Mobile Bottom Navigation"
    >
      {items.map(({ shortLabel, icon: Icon, page }) => {
        const isActive = activePage === page;
        return (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 px-0.5 transition-colors cursor-pointer touch-manipulation ${
              isActive
                ? 'text-[#087a3e]'
                : 'text-gray-500 hover:text-emerald-800'
            }`}
          >
            <div
              className={`relative flex items-center justify-center w-8 h-6 rounded-lg transition-colors ${
                isActive
                  ? 'bg-emerald-100 text-[#087a3e]'
                  : 'bg-transparent text-gray-500'
              }`}
            >
              <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#087a3e] ring-2 ring-white" />
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 whitespace-nowrap leading-none ${
                isActive ? 'font-bold text-[#087a3e]' : 'font-medium text-gray-600'
              }`}
            >
              {shortLabel}
            </span>
          </button>
        );
      })}

      {/* Menu / Drawer Toggle Button */}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 px-0.5 transition-colors text-gray-500 hover:text-emerald-800 cursor-pointer touch-manipulation"
        aria-label="Open full menu"
      >
        <div className="flex items-center justify-center w-8 h-6 rounded-lg bg-emerald-50 text-[#087a3e] border border-emerald-200/60">
          <Menu size={17} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap leading-none text-gray-600 font-semibold">
          {isAdmin ? 'More' : 'Menu'}
        </span>
      </button>
    </nav>
  );
};
