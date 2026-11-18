import React, { useState, useEffect } from 'react';
import { Bell, ChevronDown, LogOut, ArrowRight, Shield, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Notification } from '../types';

interface HeaderProps {
  onNavigate: (page: string) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, isSidebarCollapsed = false, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await api.getNotifications();
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      } catch {}
    }
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
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
      {/* Sidebar toggle button (desktop) */}
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="hidden md:inline-flex items-center justify-center w-9 h-9 mr-3 rounded-xl border border-emerald-200/80 bg-emerald-50 text-[#064D2B] hover:bg-emerald-100 hover:text-[#087A3E] transition shadow-xs flex-shrink-0"
          title={isSidebarCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          aria-label="Toggle navigation sidebar"
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
        </button>
      )}

      {/* Left: Official Globe Logo (Image 1) & Clean Company Typography (Image 2) */}
      <div
        className="brand-lockup flex items-center gap-3.5 cursor-pointer flex-shrink-0"
        onClick={() => onNavigate('Dashboard')}
        title="SAFAL Enterprise Workspace"
      >
        {/* Globe Logo with green leaves & airplane from user's Image 1 */}
        <div className="relative flex-shrink-0">
          <img
            src="/safal-globe-logo.png"
            alt="SAFAL Global Logo"
            className="h-16 lg:h-18 w-auto object-contain rounded-xl shadow-xs"
          />
        </div>

        {/* Clean Company Name matching user's Image 2 */}
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center">
            <span className="text-2xl lg:text-3xl font-black text-[#064D2B] font-['Manrope'] tracking-tight">
              SAFAL
            </span>
          </div>
          <span className="text-[11px] lg:text-xs font-black tracking-wider text-[#D32F2F] uppercase mt-0.5 font-['Manrope']">
            EXPORT AND IMPORT PVT LTD
          </span>
          <span className="text-[10px] lg:text-[11px] font-bold text-[#185B30] tracking-wide mt-0.5">
            Fruits Import &amp; Export
          </span>
        </div>
      </div>

      {/* Center Subtitle */}
      <div className="header-company-center text-center flex-1 hidden xl:flex flex-col items-center justify-center px-4">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          Freshness Beyond Borders
        </span>
        <span className="text-[11px] font-semibold text-emerald-800 mt-0.5">
          Consignment Tracking · Workforce · P&amp;L Financial Audit
        </span>
      </div>

      {/* Right Controls: Live status, Notifications, User Profile (NO ROLES SWITCHER) */}
      <div className="topbar-actions flex items-center gap-3 ml-auto z-20">
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-full border border-emerald-200 text-xs text-[#064D2B] font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Hub 1 Cold Storage · Live</span>
        </div>

        {/* Notifications */}
        <button
          className="icon-button notification-button"
          onClick={() => setShowNotifications(!showNotifications)}
          aria-label="Notifications"
        >
          <Bell size={19} />
          {unreadCount > 0 && <span className="notification-dot">{unreadCount}</span>}
        </button>

        {/* User Profile */}
        <div className="relative">
          <div
            className="profile cursor-pointer"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="avatar">{getInitials(user?.name)}</div>
            <div className="profile-text">
              <strong>{user?.name || 'Shanker'}</strong>
              <span>
                {user?.role === 'ADMIN'
                  ? 'Managing Director (Admin)'
                  : 'Employee Operations'}
              </span>
            </div>
            <ChevronDown size={15} />
          </div>

          {showProfileMenu && (
            <div className="absolute right-0 top-12 w-60 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-30">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-[11px] text-gray-400">Signed in as</p>
                <p className="text-xs font-bold text-gray-800 truncate">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                  {user?.role === 'ADMIN' ? 'Managing Director' : 'Employee Operations'}
                </span>
              </div>
              {user?.role === 'ADMIN' && (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigate('Settings');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 rounded-lg text-left"
                >
                  <Shield size={14} /> Application Settings
                </button>
              )}
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg text-left mt-1"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="notification-panel">
          <div className="notification-panel-head">
            <strong>System Notifications</strong>
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
    </header>
  );
};
