import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bell,
  ChevronDown,
  LogOut,
  ArrowRight,
  ArrowLeft,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Notification as AppNotification } from '../types';
import { SendNoticeModal } from './SendNoticeModal';

interface HeaderProps {
  onNavigate: (
    page: string,
    params?: { orderId?: string; orderNumber?: string; openProof?: boolean }
  ) => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
  activePage?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  onGoBack,
  canGoBack = true,
  activePage = 'Dashboard',
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenMobileMenu,
}) => {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');

  const navRef = useRef<HTMLDivElement>(null);
  const lastNotifIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(Notification.permission);
    } else {
      setPushStatus('unsupported');
    }
  }, []);

  const requestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const res = await Notification.requestPermission();
      setPushStatus(res);
      if (res === 'granted') {
        new Notification('SAFAL Alerts Enabled ✓', {
          body: 'You will now receive instant mobile notifications for orders, dues & approvals.',
          icon: '/favicon.ico',
        });
      }
    } catch (e) {
      console.warn('Notification permission error:', e);
    }
  };

  const sendTestPush = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('SAFAL Mobile Alert (Test)', {
        body: 'Mobile notifications are working perfectly on this device! ✓',
        icon: '/favicon.ico',
      });
    }
  };

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      const list = res.notifications || [];
      const count = res.unreadCount || 0;
      setNotifications(list);
      setUnreadCount(count);

      // Check for newly arrived unread notification to trigger native mobile push
      if (list.length > 0 && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const top = list[0];
        if (!top.isRead && lastNotifIdRef.current && top.id !== lastNotifIdRef.current) {
          try {
            new Notification(top.title || 'SAFAL Update', {
              body: top.message || 'New activity recorded in SAFAL.',
              icon: '/favicon.ico',
              tag: top.id,
            });
          } catch {
            if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
              navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(top.title || 'SAFAL Update', {
                  body: top.message || 'New activity recorded in SAFAL.',
                  icon: '/favicon.ico',
                  tag: top.id,
                });
              });
            }
          }
        }
        lastNotifIdRef.current = top.id;
      }
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

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.isRead) {
      try {
        await api.markNotificationRead(n.id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }

    setShowNotifications(false);

    const title = n.title || '';
    const message = n.message || '';
    const linkUrl = n.linkUrl || '';

    const cdRegex = /CD\/SF\/\d{4}\/\d+/i;
    const poRegex = /PO\/SF\/\d{4}\/\d+/i;
    const expRegex = /EXP\/SF\/\d{4}\/\d+/i;
    const cdMatch = title.match(cdRegex) || message.match(cdRegex);
    const poMatch = title.match(poRegex) || message.match(poRegex);
    const expMatch = title.match(expRegex) || message.match(expRegex);

    const isCD =
      Boolean(cdMatch) ||
      linkUrl.includes('type=CD') ||
      title.toLowerCase().includes('customer due') ||
      message.toLowerCase().includes('customer due');
    const isPO =
      Boolean(poMatch) ||
      (!isCD && (linkUrl.includes('purchase-order') || title.toLowerCase().includes('po')));

    const expIdMatch = linkUrl.match(/\/expenses\/([a-zA-Z0-9_-]+)/) || linkUrl.match(/expenseId=([a-zA-Z0-9_-]+)/);
    const expenseId = expIdMatch ? expIdMatch[1] : undefined;
    const isExpense =
      Boolean(expMatch) ||
      Boolean(expIdMatch) ||
      linkUrl.includes('expenses') ||
      title.toLowerCase().includes('expense') ||
      message.toLowerCase().includes('expense') ||
      title.toLowerCase().includes('claim') ||
      message.toLowerCase().includes('claim');

    const isClearance = linkUrl.includes('clearance') || title.toLowerCase().includes('clearance');
    const isAttendance = linkUrl.includes('attendance') || title.toLowerCase().includes('attendance');
    const isVendor = linkUrl.includes('vendor') || title.toLowerCase().includes('vendor');

    const idMatch = linkUrl.match(/\/purchase-orders\/([a-zA-Z0-9_-]+)/);
    const orderId = idMatch ? idMatch[1] : undefined;
    const orderNumber = cdMatch ? cdMatch[0] : (poMatch ? poMatch[0] : undefined);
    const openProof =
      title.toLowerCase().includes('proof') ||
      message.toLowerCase().includes('proof') ||
      linkUrl.includes('proof=true');

    if (isCD) {
      onNavigate('Customer Due (CD)', { orderId, orderNumber, openProof });
    } else if (isPO) {
      onNavigate('Purchase Order (PO)', { orderId, orderNumber });
    } else if (isExpense) {
      onNavigate('Employee Expenses', {
        expenseId,
        claimNumber: expMatch ? expMatch[0] : undefined,
        openDetail: true,
      });
    } else if (isClearance) {
      onNavigate('Bill Clearance');
    } else if (isAttendance) {
      onNavigate('Attendance');
    } else if (isVendor) {
      onNavigate('Vendors (KYC)');
    } else {
      onNavigate('Dashboard');
    }
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
        {/* Left: Back Navigation + Mobile Menu / Desktop Sidebar Toggle + Brand Identity */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          {/* Back Arrow Button */}
          {onGoBack && canGoBack && (
            <button
              type="button"
              onClick={onGoBack}
              className="h-8 px-2 sm:px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#064D2B] flex items-center gap-1 transition active:scale-95 cursor-pointer flex-shrink-0 font-extrabold text-xs border border-emerald-300 shadow-xs"
              title={activePage === 'Dashboard' ? 'Log out to Login screen' : 'Go back to previous page'}
              aria-label="Go Back"
            >
              <ArrowLeft size={16} strokeWidth={2.8} />
              <span className="text-[11px] font-extrabold">Back</span>
            </button>
          )}

          {/* Mobile Drawer Button (Visible on phones & tablets <= 1024px) */}
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden h-8 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#064D2B] flex items-center gap-1 transition active:scale-95 cursor-pointer flex-shrink-0 font-bold text-xs border border-emerald-200"
              aria-label="Open menu"
            >
              <Menu size={16} />
              <span className="text-[11px] font-bold hidden xs:inline">Menu</span>
            </button>
          )}

          {/* Desktop Sidebar Toggle (Visible only on desktop screens > 1024px) */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden lg:inline-flex w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#064D2B] items-center justify-center transition active:scale-95 cursor-pointer flex-shrink-0"
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
              className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs"
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
              <>
                <div
                  className="fixed inset-0 z-60 bg-black/20 lg:hidden"
                  onClick={() => setShowNotifications(false)}
                />
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

                {/* Mobile Device Push Alerts Banner */}
                <div className="mb-2 p-2 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${pushStatus === 'granted' ? 'bg-emerald-600' : 'bg-amber-500 animate-pulse'}`} />
                    <span className="text-[10px] font-bold text-emerald-950 truncate">
                      {pushStatus === 'granted' ? 'Mobile Phone Alerts: Active ✓' : 'Enable Mobile Device Alerts'}
                    </span>
                  </div>
                  {pushStatus === 'granted' ? (
                    <button
                      type="button"
                      onClick={sendTestPush}
                      className="px-2 py-0.5 rounded-md bg-white border border-emerald-300 text-[10px] font-extrabold text-[#087a3e] hover:bg-emerald-100 transition shrink-0 cursor-pointer"
                    >
                      Test
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={requestPushPermission}
                      className="px-2.5 py-0.5 rounded-md bg-[#087a3e] hover:bg-[#066131] text-[10px] font-extrabold text-white transition shrink-0 cursor-pointer shadow-xs"
                    >
                      Enable
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
                        onClick={() => handleNotificationClick(n)}
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
              </>
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
              <div className="flex flex-col text-left leading-tight">
                <strong className="text-[11px] sm:text-xs text-gray-800 font-extrabold truncate max-w-[80px] xs:max-w-[120px]">
                  {user?.name ? user.name.split(' ')[0] : 'User'}
                </strong>
                <span className="text-[9px] sm:text-[10px] text-emerald-800 font-semibold truncate max-w-[80px] xs:max-w-[120px]">
                  {user?.role === 'ADMIN'
                    ? 'Admin'
                    : user?.role === 'ACCOUNTANT'
                    ? 'Accountant'
                    : user?.role === 'VENDOR'
                    ? 'Vendor Partner'
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
                    {user?.role === 'ADMIN'
                      ? 'Full Administrator'
                      : user?.role === 'ACCOUNTANT'
                      ? 'Accountant Console'
                      : user?.role === 'VENDOR'
                      ? 'Authorized Vendor'
                      : 'Employee Operations'}
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
