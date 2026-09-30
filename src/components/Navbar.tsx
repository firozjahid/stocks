import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Shield,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  Palette
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { api } from '../services/api.js';
import { NotificationItem, User } from '../types/inventory.js';
import { WaltonLogo } from './WaltonLogo.js';

interface NavbarProps {
  onOpenSearch: () => void;
  onNavigate: (view: string, filter?: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSearch, onNavigate }) => {
  const { user, logout } = useAuth();
  const { openThemesModal } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
    } catch (e) {
      // Ignore
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotifClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      await api.markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    setShowNotifMenu(false);
    if (notif.linkUrl) {
      if (notif.linkUrl.includes('requests')) onNavigate('requests');
      else if (notif.linkUrl.includes('transactions')) onNavigate('transactions');
      else if (notif.linkUrl.includes('inventory')) onNavigate('inventory');
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-md">
      {/* Brand & System Title */}
      <div className="flex items-center gap-3">
        <div className="p-1 px-2 rounded-xl bg-white shadow-xs inline-flex items-center justify-center shrink-0">
          <WaltonLogo className="h-7 sm:h-8" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-base sm:text-lg text-white">R.A.C R&amp;I Store Center</span>
          </div>
          <p className="text-[11px] text-cyan-300 font-mono font-medium hidden sm:block">Walton Hi-Tech Industries PLC.</p>
        </div>
      </div>

      {/* Global Fast Search Input Bar */}
      <div className="flex-1 max-w-xl mx-4 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 rounded-lg px-3.5 py-2 text-sm text-slate-300 flex items-center justify-between shadow-inner transition group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition" />
            <span className="text-slate-400 group-hover:text-slate-300">
              Search by Code (e.g. SP-0001), Name, Owner, Rack...
            </span>
          </div>
          <kbd className="hidden lg:inline-flex items-center gap-1 text-[11px] font-mono bg-slate-700/60 border border-slate-600 px-2 py-0.5 rounded text-slate-300">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right Controls: Sync Excel, Themes, Quick Search, Notifications, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Themes Button */}
        <button
          onClick={openThemesModal}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-cyan-300 hover:text-white text-xs font-semibold shadow-xs transition"
          title="Customize Theme & Background Wallpaper"
        >
          <Palette className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Themes</span>
        </button>

        {/* Mobile Search Button */}
        <button
          onClick={onOpenSearch}
          className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
          title="Search Inventory"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Internal Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 text-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500 text-white font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No notifications yet.</div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`p-3.5 hover:bg-slate-800/90 transition cursor-pointer flex gap-3 ${
                        !n.read ? 'bg-blue-950/20' : ''
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'ALERT' ? (
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                        ) : n.type === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : n.type === 'WARNING' ? (
                          <Clock className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Bell className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-200 flex items-center justify-between">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{n.createdAt?.substring(11, 16)}</span>
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-white leading-tight flex items-center justify-end gap-1.5">
              <span>{user?.name || 'Officer'}</span>
              {user?.role === 'OFFICER' ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Officer
                </span>
              ) : (user?.role === 'SUPER ADMIN' || user?.employeeId?.toLowerCase() === 'jhfboss') ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                  Super Admin
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-800 text-amber-300/90 border border-slate-700">
                  {user?.role} • View Only
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1 mt-0.5">
              <span className="font-mono">ID: {user?.employeeId}</span>
              <span>•</span>
              <span className="text-blue-400 font-medium">{user?.team}</span>
            </div>
          </div>

          <div className="relative group">
            <button
              onClick={() => onNavigate('profile')}
              className="w-9 h-9 rounded-full ring-2 ring-slate-700 group-hover:ring-blue-500 overflow-hidden bg-slate-800 flex items-center justify-center transition"
              title="View Profile"
            >
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-sm text-slate-300">{user?.name?.charAt(0) || 'U'}</span>
              )}
            </button>
          </div>

          <button
            onClick={() => logout()}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};
