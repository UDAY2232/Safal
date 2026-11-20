import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  ChevronDown,
  LogOut,
  ArrowRight,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Megaphone,
} from 'lucide-react';
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

  const navRef = useRef<HTMLDivElement>(null);

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

  // Dismiss dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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
      {/* 1. Executive Top App Navigation Bar */}
      <div ref={navRef} className="safal-top-nav">
        {/* Left: Mobile Menu / Desktop Sidebar Toggle + Brand Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile Drawer Button */}
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="md:hidden w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#064D2B] flex items-center justify-center transition active:scale-95 cursor-pointer flex-shrink-0"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
          )}

          {/* Desktop Sidebar Toggle */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden md:inline-flex w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#064D2B] items-center justify-center transition active:scale-95 cursor-pointer flex-shrink-0"
              title={isSidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}

          {/* Brand Identity / Home Navigation */}
          <div
            onClick={() => onNavigate('Dashboard')}
            className="flex items-center gap-2 cursor-pointer select-none group min-w-0"
            title="SAFAL EXPORT AND IMPORT PVT LTD - Go to Dashboard"
          >
            <img
              src="/safal-globe-logo.png"
              alt="SAFAL"
              className="w-7 h-7 object-contain rounded-md flex-shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col text-left leading-none min-w-0">
              <span className="font-extrabold text-xs sm:text-sm text-[#064D2B] tracking-tight group-hover:text-[#087a3e] transition truncate">
                SAFAL EXPORT &amp; IMPORT
              </span>
              <span className="text-[9px] font-bold text-gray-400 tracking-wider hidden sm:block">
                ENTERPRISE ERP PLATFORM · FY 2026-27
              </span>
            </div>
          </div>
        </div>

        {/* Right: Operational Controls & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Hub 1 Live Status */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-200 text-[11px] text-[#064D2B] font-bold select-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Hub 1 Live</span>
          </div>

          {/* Admin / Accountant Broadcast Notice Button */}
          {(user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT') && (
            <button
              type="button"
              onClick={() => setShowNoticeModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#087a3e] hover:bg-[#066131] active:scale-95 text-white text-xs font-bold transition cursor-pointer shadow-xs"
              title="Broadcast notice to employees"
            >
              <Megaphone size={12} /> Send Notice
            </button>
          )}

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              className="relative w-8 h-8 rounded-xl bg-gray-50 hover:bg-emerald-50 text-gray-700 hover:text-[#064D2B] flex items-center justify-center transition cursor-pointer border border-gray-200 active:scale-95"
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 bg-red-500 text-white text-[9px] font-extrabold rounded-full border-2 border-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Panel Dropdown */}
            {showNotifications && (
              <div className="notification-panel">
                <div className="notification-panel-head flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <strong className="text-xs font-bold text-gray-800">System Notifications</strong>
                    {(user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT') && (
                      <button
                        type="button"
                        onClick={() => setShowNoticeModal(true)}
                        className="px-2 py-0.5 rounded-md bg-[#087a3e] hover:bg-[#066131] text-white text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Send Notice to Staff"
                      >
                        <Megaphone size={10} /> Notice
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
                        className={`notification-row cursor-pointer transition p-2 rounded-lg hover:bg-gray-50 ${
                          !n.isRead ? 'bg-emerald-50/50' : ''
                        }`}
                        onClick={() => {
                          if (n.linkUrl) onNavigate(n.linkUrl.replace('/', ''));
                          setShowNotifications(false);
                        }}
                      >
                        <div className="notification-symbol">
                          <Bell size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <strong className="text-xs text-gray-900 block truncate">{n.title}</strong>
                          <p className="text-[11px] text-gray-600 my-0.5 leading-snug line-clamp-2">{n.message}</p>
                          <span className="text-[10px] text-gray-400">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
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
                  className="w-full text-center text-xs text-[#087a3e] font-bold py-2 mt-1 hover:underline cursor-pointer flex items-center justify-center gap-1"
                >
                  View all audit logs <ArrowRight size={13} />
                </button>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-1.5 sm:gap-2 py-1 px-1.5 sm:px-2 rounded-xl hover:bg-gray-100 transition cursor-pointer border border-transparent hover:border-gray-200 active:scale-95"
            >
              <div className="w-7 h-7 rounded-full bg-[#087a3e] text-white font-bold text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                {getInitials(user?.name)}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <strong className="text-xs text-gray-800 font-bold truncate max-w-[110px]">
                  {user?.name || 'User'}
                </strong>
                <span className="text-[10px] text-gray-500 font-medium">
                  {user?.role === 'ADMIN'
                    ? 'Administrator'
                    : user?.role === 'ACCOUNTANT'
                    ? 'Accountant'
                    : 'Employee'}
                </span>
              </div>
              <ChevronDown size={13} className="text-gray-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-11 w-56 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-70 text-gray-800">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Signed in as</p>
                  <p className="text-xs font-bold text-gray-800 truncate">{user?.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                    {user?.role === 'ADMIN' ? 'Full Administrator' : user?.role === 'ACCOUNTANT' ? 'Accountant Console' : 'Employee Operations'}
                  </span>
                </div>
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onNavigate('Settings');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg text-left cursor-pointer transition mt-1"
                  >
                    <Shield size={14} /> Application Settings
                  </button>
                )}
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg text-left mt-1 cursor-pointer transition font-medium"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Full-Bleed Edge-to-Edge SAFAL Brand Banner (Matching Reference Design 2) */}
      <div
        className="safal-corporate-banner-wrap group"
        onClick={() => onNavigate('Dashboard')}
        role="button"
        tabIndex={0}
        aria-label="SAFAL EXPORT AND IMPORT PVT LTD - Go to Dashboard"
        title="SAFAL EXPORT AND IMPORT PVT LTD - Click to return to Dashboard"
      />

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
