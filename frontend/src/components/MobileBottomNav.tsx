import React from 'react';
import {
  Home,
  Clock,
  ShoppingCart,
  ReceiptIndianRupee,
  Menu,
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

  const items = [
    { label: 'Dashboard', icon: Home, page: 'Dashboard' },
    isEmployee
      ? { label: 'CD (Due)', icon: ShoppingCart, page: 'Customer Due (CD)' }
      : { label: 'PO', icon: ShoppingCart, page: 'Purchase Order (PO)' },
    { label: 'Attendance', icon: Clock, page: 'Attendance' },
    { label: 'Expenses', icon: ReceiptIndianRupee, page: 'Employee Expenses' },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-35 bg-white/95 backdrop-blur-md border-t border-emerald-100 shadow-[0_-4px_20px_rgba(6,77,43,0.08)] px-2 py-1 flex items-center justify-around select-none"
      aria-label="Mobile Bottom Navigation"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
    >
      {items.map(({ label, icon: Icon, page }) => {
        const isActive = activePage === page;
        return (
          <button
            key={page}
            type="button"
            onClick={() => onNavigate(page)}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-150 active:scale-90 touch-manipulation cursor-pointer ${
              isActive
                ? 'text-[#087a3e] font-extrabold'
                : 'text-gray-500 hover:text-emerald-800 font-medium'
            }`}
          >
            <div
              className={`relative flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'bg-emerald-100 text-[#087a3e] shadow-xs'
                  : 'bg-transparent text-gray-500'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#087a3e] ring-2 ring-white" />
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 leading-tight ${
                isActive ? 'text-[#087a3e] font-extrabold' : 'text-gray-600'
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}

      {/* Menu / Drawer Toggle Button */}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-150 active:scale-90 touch-manipulation text-gray-500 hover:text-emerald-800 cursor-pointer"
        aria-label="Open full menu"
      >
        <div className="flex items-center justify-center w-10 h-8 rounded-xl bg-emerald-50 text-[#087a3e] border border-emerald-200/60 shadow-xs">
          <Menu size={20} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] tracking-tight mt-0.5 leading-tight text-gray-600 font-semibold">
          {isAdmin ? 'More' : 'Menu'}
        </span>
      </button>
    </nav>
  );
};
