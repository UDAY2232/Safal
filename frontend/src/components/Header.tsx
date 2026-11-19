import React, { useState, useEffect, useCallback } from 'react';
import { Bell, ChevronDown, LogOut, ArrowRight, Shield, PanelLeftClose, PanelLeftOpen, Menu, Megaphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Notification } from '../types';
import { SendNoticeModal } from './SendNoticeModal';

interface HeaderProps {
  onNavigate: (page: string) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenMobileMenu,
}) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {}
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const getInitials = (name?: string) => {
    if (!name) return 'SH';
    const parts = name.split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <header className="topbar">
      {/* Top Utility / Controls Bar */}
      <div className="w-full h-10 sm:h-11 px-3 sm:px-5 bg-[#064D2B] text-white flex items-center justify-between border-b border-[#086137] shadow-xs select-none relative z-40">
        {/* Left Side: Mobile Menu / Desktop Sidebar Toggle + Brand / Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Hamburger Menu Toggle (Mobile Only) */}
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-800/80 active:bg-emerald-900 text-white flex-shrink-0 cursor-pointer transition hover:bg-emerald-700"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>
          )}

          {/* Desktop Sidebar Toggle */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden md:inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-800/70 hover:bg-emerald-700 text-white transition flex-shrink-0 cursor-pointer"
              title={isSidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
              aria-label="Toggle navigation sidebar"
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}

          {/* System Title & Live Cold Storage Badge */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold tracking-wider text-emerald-100 uppercase hidden sm:inline">
              SAFAL ENTERPRISE ERP
            </span>
            <span className="hidden sm:inline text-emerald-500/70">|</span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-900/70 rounded-full border border-emerald-500/30 text-[11px] text-emerald-200 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Hub 1 Cold Storage · Live</span>
            </div>
          </div>
        </div>

        {/* Right Side: Notice Broadcaster + Notifications + Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin / Accountant Notice Broadcaster */}
          {(user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT') && (
            <button
              type="button"
              onClick={() => setShowNoticeModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold transition cursor-pointer shadow-xs"
              title="Broadcast notice to employees"
            >
              <Megaphone size={12} /> Send Notice
            </button>
          )}

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              className="relative w-8 h-8 rounded-lg bg-emerald-800/70 hover:bg-emerald-700 text-white flex items-center justify-center transition cursor-pointer"
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[17px] h-[17px] px-1 bg-red-500 text-white text-[10px] font-extrabold rounded-full border-2 border-[#064D2B]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* User Profile */}
          <div className="relative">
            <div
              className="flex items-center gap-2 cursor-pointer py-0.5 px-1.5 rounded-lg hover:bg-emerald-800/60 transition"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-[#064D2B] font-bold text-xs flex items-center justify-center border border-emerald-300">
                {getInitials(user?.name)}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <strong className="text-xs text-white font-semibold truncate max-w-[120px]">
                  {user?.name || 'User'}
                </strong>
                <span className="text-[10px] text-emerald-300">
                  {user?.role === 'ADMIN'
                    ? 'Admin'
                    : user?.role === 'ACCOUNTANT'
                    ? 'Accountant'
                    : 'Employee'}
                </span>
              </div>
              <ChevronDown size={13} className="text-emerald-300 hidden sm:block" />
            </div>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-10 w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50 text-gray-800">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Signed in as</p>
                  <p className="text-xs font-bold text-gray-800 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                    {user?.role === 'ADMIN' ? 'Managing Director' : user?.role === 'ACCOUNTANT' ? 'Accountant' : 'Employee'}
                  </span>
                </div>
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('Settings');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg text-left cursor-pointer"
                  >
                    <Shield size={14} /> Application Settings
                  </button>
                )}
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg text-left mt-1 cursor-pointer"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Official Complete SAFAL Billboard Banner */}
      <div
        className="w-full bg-white flex items-center justify-center py-1 sm:py-1.5 px-2 sm:px-4 cursor-pointer overflow-hidden border-b-2 border-emerald-100 shadow-2xs hover:bg-emerald-50/20 transition-colors"
        onClick={() => onNavigate('Dashboard')}
        title="SAFAL EXPORT AND IMPORT PVT LTD · Click to return to Dashboard"
      >
        <img
          src="/safal-header-banner.jpg"
          alt="SAFAL EXPORT AND IMPORT PVT LTD - Freshness Beyond Borders"
          className="h-14 sm:h-18 md:h-22 lg:h-[94px] xl:h-[100px] w-auto max-w-full object-contain mx-auto block filter drop-shadow-2xs select-none"
        />
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="notification-panel">
          <div className="notification-panel-head flex items-center justify-between">
            <div className="flex items-center gap-2">
              <strong>System Notifications</strong>
              {(user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT') && (
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(true)}
                  className="px-2 py-0.5 rounded-md bg-[#087a3e] hover:bg-[#066131] text-white text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Send Notice to Staff"
                >
                  <Megaphone size={10} /> Send Notice
                </button>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-[#087a3e] font-semibold hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400">No new notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notification-row cursor-pointer transition ${!n.isRead ? 'bg-emerald-50/50' : ''}`}
                  onClick={() => {
                    if (n.linkUrl) onNavigate(n.linkUrl.replace('/', ''));
                    setShowNotifications(false);
                  }}
                >
                  <div className="notification-symbol">
                    <Bell size={14} />
                  </div>
                  <div className="flex-1">
                    <strong>{n.title}</strong>
                    <p className="text-[11px] text-gray-600 my-0.5 leading-snug">{n.message}</p>
                    <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => {
              setShowNotifications(false);
              onNavigate('Activity Logs');
            }}
          >
            View all audit logs <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Admin / Accountant Send Notice Modal */}
      {showNoticeModal && (
        <SendNoticeModal
          onClose={() => setShowNoticeModal(false)}
          onSuccess={() => {
            loadNotifications();
          }}
        />
      )}
    </header>
  );
};
