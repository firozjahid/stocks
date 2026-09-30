import React from 'react';
import {
  LayoutDashboard,
  Box,
  Wrench,
  Package,
  Layers,
  Inbox,
  ArrowRightLeft,
  HardDrive,
  Palette,
  KeyRound,
  BarChart3,
  Shield,
  Users,
  FileSpreadsheet,
  History,
  Settings,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  currentView: string;
  currentFilter?: any;
  onNavigate: (view: string, filter?: any) => void;
  incomingPendingCount: number;
  onOpenChangePassword?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  currentFilter,
  onNavigate,
  incomingPendingCount,
  onOpenChangePassword,
}) => {
  const { user, isSuperAdmin } = useAuth();
  const { openThemesModal } = useTheme();

  const isNavActive = (view: string, filterKey?: string, filterVal?: string) => {
    if (currentView !== view) return false;
    if (!filterKey) return true;
    return currentFilter && currentFilter[filterKey] === filterVal;
  };

  const navClass = (view: string, filterKey?: string, filterVal?: string) => {
    const active = isNavActive(view, filterKey, filterVal);
    return `w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition group ${
      active
        ? 'bg-blue-600 text-white font-semibold shadow-sm'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
    }`;
  };

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto select-none">
      <div className="p-3 space-y-5 flex-1">
        
        {/* 1. OVERVIEW */}
        <div>
          <button
            onClick={() => onNavigate('dashboard')}
            className={navClass('dashboard')}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4 text-blue-400" />
              <span>Executive Dashboard</span>
            </div>
          </button>
        </div>

        {/* 2. INVENTORY MANAGEMENT (MERGED - NO DUPLICATE MENUS) */}
        <div>
          <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Inventory Management
          </div>
          <div className="space-y-0.5">
            <button
              onClick={() => onNavigate('inventory', {})}
              className={navClass('inventory')}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>All Inventory Catalog</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('inventory', { type: 'SPARE_PART' })}
              className={navClass('inventory', 'type', 'SPARE_PART')}
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Spare Parts</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('inventory', { type: 'TOOL_EQUIPMENT' })}
              className={navClass('inventory', 'type', 'TOOL_EQUIPMENT')}
            >
              <div className="flex items-center gap-2.5">
                <Wrench className="w-4 h-4 text-blue-400" />
                <span>Tools &amp; Equipment</span>
              </div>
            </button>
          </div>
        </div>

        {/* 3. REQUISITIONS & MOVEMENTS (MERGED) */}
        <div>
          <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Requisitions &amp; Ledger
          </div>
          <div className="space-y-0.5">
            <button
              onClick={() => onNavigate('requests', { tab: 'incoming' })}
              className={navClass('requests')}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="w-4 h-4 text-amber-400" />
                <span>Item Requests</span>
              </div>
              {incomingPendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                  {incomingPendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigate('transactions', {})}
              className={navClass('transactions')}
            >
              <div className="flex items-center gap-2.5">
                <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                <span>Movement Ledger</span>
              </div>
            </button>
          </div>
        </div>

        {/* 4. UNIVERSAL SYSTEM TOOLS (FOR ALL USER PANELS) */}
        {/* Requirement: "sobar panel e backup restore menu, themes menu, change password menu" */}
        <div>
          <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span>System &amp; Tools</span>
            <span className="text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 px-1 rounded border border-emerald-500/30">
              Universal
            </span>
          </div>
          <div className="space-y-0.5">
            <button
              onClick={() => onNavigate('backup')}
              className={navClass('backup')}
            >
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>Backup &amp; Restore</span>
              </div>
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                Auto
              </span>
            </button>

            <button
              onClick={openThemesModal}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition group"
            >
              <div className="flex items-center gap-2.5">
                <Palette className="w-4 h-4 text-cyan-400" />
                <span>Themes &amp; Wallpaper</span>
              </div>
              <Sparkles className="w-3 h-3 text-cyan-400" />
            </button>

            <button
              onClick={() => onOpenChangePassword ? onOpenChangePassword() : onNavigate('change-password')}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition group"
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Change Password</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('reports')}
              className={navClass('reports')}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <span>System Reports</span>
              </div>
            </button>
          </div>
        </div>

        {/* 5. SUPER ADMIN CONTROL SUITE (SUPER ADMIN ONLY) */}
        {isSuperAdmin && (
          <div className="pt-2 border-t border-slate-800/80">
            <div className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Super Admin Suite</span>
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => onNavigate('admin', { tab: 'users' })}
                className={navClass('admin', 'tab', 'users')}
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-amber-400" />
                  <span>Users &amp; Passwords</span>
                </div>
              </button>

              <button
                onClick={() => onNavigate('admin', { tab: 'import' })}
                className={navClass('admin', 'tab', 'import')}
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                  <span>Excel Master Sync</span>
                </div>
              </button>

              <button
                onClick={() => onNavigate('admin', { tab: 'audit' })}
                className={navClass('admin', 'tab', 'audit')}
              >
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-purple-400" />
                  <span>Audit Trail Logs</span>
                </div>
              </button>

              <button
                onClick={() => onNavigate('admin', { tab: 'locations' })}
                className={navClass('admin', 'tab', 'locations')}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Locations &amp; Teams</span>
                </div>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* User Status Footer in Sidebar */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/90 text-xs">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Logged in as:</span>
          <span className="font-semibold text-white truncate max-w-[120px]">{user?.name}</span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
          <span>Role: {user?.role}</span>
          <span>{user?.employeeId}</span>
        </div>
      </div>
    </aside>
  );
};
