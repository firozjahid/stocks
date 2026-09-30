import React, { useEffect, useState } from 'react';
import {
  Box,
  Wrench,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  PlusCircle,
  Search,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

interface DashboardViewProps {
  onNavigate: (view: string, filter?: any) => void;
  onOpenCreate: (type: 'SPARE_PART' | 'TOOL_EQUIPMENT') => void;
  onSelectItem: (item: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenCreate,
  onSelectItem,
}) => {
  const { user, canManageInventory } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardSummary();
      setData(res);
    } catch (e) {
      console.error('Error fetching dashboard summary:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [user]);

  if (loading && !data) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading AC R&amp;I Inventory Dashboard...</span>
        </div>
      </div>
    );
  }

  const m = data?.metrics || {};

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/70 rounded-xl p-5 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-cyan-300 bg-cyan-950/60 px-2.5 py-0.5 rounded border border-cyan-700/40">
              R.A.C R&amp;I Store Center • Walton Hi-Tech Industries PLC.
            </span>
            <span className="text-xs text-slate-400">• {user?.team}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
            Centralized digital tracking for R.A.C R&amp;I Store Center spare parts, tools, and testing equipment across Walton research labs. Search availability, request parts across teams, and record all movements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('search')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 px-3.5 py-2 rounded-lg text-xs font-medium text-white transition shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span>Search Catalog</span>
          </button>

          {canManageInventory && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenCreate('SPARE_PART')}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded-lg text-xs font-medium text-white transition shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Spare Part</span>
              </button>
              <button
                onClick={() => onOpenCreate('TOOL_EQUIPMENT')}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-xs font-medium text-white transition shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Tool</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CORE METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: My Spare Parts */}
        <div
          onClick={() => onNavigate('inventory', { scope: 'my', type: 'SPARE_PART' })}
          className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-emerald-500/60 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">My Spare Parts</span>
            <Box className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m.myTotalSpareParts || 0}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Under your custody</div>
        </div>

        {/* Card 2: My Tools */}
        <div
          onClick={() => onNavigate('inventory', { scope: 'my', type: 'TOOL_EQUIPMENT' })}
          className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-blue-500/60 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">My Tools</span>
            <Wrench className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m.myTotalTools || 0}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">Responsible person</div>
        </div>

        {/* Card 3: Own Team Items */}
        <div
          onClick={() => onNavigate('inventory', { scope: 'own_team' })}
          className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-indigo-500/60 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Own Team Items</span>
            <Layers className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m.ownTeamItemsCount || 0}</div>
          <div className="text-[11px] text-indigo-600 font-medium mt-1">{user?.team}</div>
        </div>

        {/* Card 4: Other Team Items (Borrowed) */}
        <div
          onClick={() => onNavigate('inventory', { scope: 'other_team' })}
          className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-amber-500/60 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Other Team Items</span>
            <ArrowRightLeft className="w-4 h-4 text-amber-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m.otherTeamItemsCount || 0}</div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">Borrowed / In-use</div>
        </div>

        {/* Card 5: Available Stock Units */}
        <div
          onClick={() => onNavigate('inventory', { availability: 'AVAILABLE' })}
          className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-emerald-500/60 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Available Stock</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m.systemTotalAvailableQuantity || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Total catalog units</div>
        </div>

        {/* Card 6: Currently Borrowed Out */}
        <div
          onClick={() => onNavigate('transactions', { type: 'BORROW' })}
          className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-blue-500/60 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Currently Borrowed</span>
            <ArrowRightLeft className="w-4 h-4 text-blue-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m.systemTotalBorrowedQuantity || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Units out on loan</div>
        </div>

        {/* Card 7: Incoming Requests */}
        <div
          onClick={() => onNavigate('requests', { tab: 'incoming' })}
          className={`border rounded-xl p-3.5 transition cursor-pointer group ${
            m.incomingPendingRequests > 0
              ? 'bg-amber-50/50 border-amber-300 hover:border-amber-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Incoming Requests</span>
            <Clock className={`w-4 h-4 ${m.incomingPendingRequests > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m.incomingPendingRequests || 0}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            {m.incomingPendingRequests > 0 ? 'Action required by you' : 'Zero pending approvals'}
          </div>
        </div>

        {/* Card 8: My Outgoing Pending */}
        <div
          onClick={() => onNavigate('requests', { tab: 'my' })}
          className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-blue-500/60 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">My Requests</span>
            <Clock className="w-4 h-4 text-blue-500 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m.myPendingRequests || 0}</div>
          <div className="text-[11px] text-blue-600 font-medium mt-1">Awaiting owner approval</div>
        </div>

        {/* Card 9: Overdue Items */}
        <div
          onClick={() => onNavigate('transactions', { type: 'BORROW' })}
          className={`border rounded-xl p-3.5 transition cursor-pointer group ${
            m.overdueCount > 0
              ? 'bg-rose-50/60 border-rose-300 hover:border-rose-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Overdue Items</span>
            <AlertTriangle className={`w-4 h-4 ${m.overdueCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold mt-2 ${m.overdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {m.overdueCount || 0}
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">Past due return date</div>
        </div>

        {/* Card 10: Damaged / Repair */}
        <div
          onClick={() => onNavigate('inventory', { condition: 'DAMAGED' })}
          className="bg-white border border-slate-200 rounded-xl p-3.5 hover:border-amber-500/60 hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Damaged / Repair</span>
            <RotateCcw className="w-4 h-4 text-amber-600 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{m.damagedCount || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">Under maintenance</div>
        </div>
      </div>

      {/* ANALYTICS SECTION: TEAM BREAKDOWN & CONDITION DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team-wise breakdown */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Team-Wise Inventory Distribution
              </h2>
              <p className="text-xs text-slate-500">AC R&amp;I Labs &amp; Specialty Divisions</p>
            </div>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Full Report</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {data?.teamBreakdown?.map((tb: any) => {
              const maxQty = Math.max(...data.teamBreakdown.map((t: any) => t.totalQuantity || 1), 10);
              const percentage = Math.min(100, Math.round((tb.totalQuantity / maxQty) * 100));
              return (
                <div key={tb.team} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{tb.team}</span>
                    <div className="flex items-center gap-3 text-slate-500 font-mono">
                      <span>{tb.sparePartsCount} parts</span>
                      <span>•</span>
                      <span>{tb.toolsCount} tools</span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {tb.totalQuantity} total qty
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Condition Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Item Condition Breakdown
            </h2>
            <p className="text-xs text-slate-500 mb-4">Quality &amp; Calibration Health</p>

            <div className="space-y-2.5">
              {['NEW', 'EXCELLENT', 'GOOD', 'USED', 'DAMAGED', 'UNDER REPAIR'].map(cond => {
                const count = data?.conditionCounts?.[cond] || 0;
                const total = Object.values(data?.conditionCounts || {}).reduce((a: any, b: any) => a + b, 0) as number || 1;
                const pct = Math.round((count / total) * 100);

                let badgeColor = 'bg-blue-500';
                if (cond === 'NEW') badgeColor = 'bg-emerald-500';
                if (cond === 'EXCELLENT') badgeColor = 'bg-teal-500';
                if (cond === 'GOOD') badgeColor = 'bg-sky-500';
                if (cond === 'DAMAGED') badgeColor = 'bg-rose-500';
                if (cond === 'UNDER REPAIR') badgeColor = 'bg-amber-500';

                return (
                  <div key={cond} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${badgeColor}`} />
                      <span className="font-medium text-slate-700">{cond}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-900 font-bold">{count}</span>
                      <span className="text-slate-400 text-[10px]">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 bg-slate-50/70 p-3 rounded-lg text-xs text-slate-600 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All items undergo digital condition checks upon every borrow and return.</span>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY & RECENT MOVEMENTS DUAL LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transfers & Borrowing */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Recent Movements &amp; Transfers
              </h2>
              <p className="text-xs text-slate-500">Live digital transfer ledger</p>
            </div>
            <button
              onClick={() => onNavigate('transactions')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View all
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {(!data?.recentTransfers || data.recentTransfers.length === 0) ? (
              <div className="text-xs text-slate-400 py-6 text-center">No transfers recorded yet.</div>
            ) : (
              data.recentTransfers.map((t: any) => (
                <div key={t.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        t.transactionType === 'BORROW' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {t.transactionType}
                      </span>
                      <span className="font-semibold text-slate-900 truncate">{t.itemName}</span>
                      <span className="text-[10px] font-mono text-slate-500">[{t.itemCode}]</span>
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      <span className="font-medium text-slate-800">{t.fromPerson}</span> ({t.fromTeam})
                      <span className="mx-1 text-slate-400">➔</span>
                      <span className="font-medium text-slate-800">{t.toPerson}</span> ({t.toTeam})
                    </div>
                    <div className="text-slate-400 text-[10px]">Purpose: {t.purpose}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                      {t.quantity} unit(s)
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">{t.date}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit Log / Recent System Activity */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Recent Audit Trail
              </h2>
              <p className="text-xs text-slate-500">Immutable permanent activity log</p>
            </div>
            {user?.role === 'SUPER ADMIN' && (
              <button
                onClick={() => onNavigate('admin', { tab: 'audit' })}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Inspect logs
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {(!data?.recentActivities || data.recentActivities.length === 0) ? (
              <div className="text-xs text-slate-400 py-6 text-center">No activity recorded yet.</div>
            ) : (
              data.recentActivities.slice(0, 6).map((log: any) => (
                <div key={log.id} className="py-2.5 flex items-start gap-2.5 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-700 font-medium leading-snug">{log.details}</p>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>By: <strong className="text-slate-600">{log.user}</strong> (#{log.employeeId})</span>
                      <span>•</span>
                      <span>{log.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Developer Credit Footer Card */}
      <div className="mt-8 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-sans">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Walton AC R&amp;I Store &amp; Inventory Suite</span>
          <span>•</span>
          <span>Research &amp; Innovation Department</span>
        </div>
        <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs font-mono text-cyan-600 font-semibold text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
          <span>Software Development by Jahid AC R&amp;I (ID-38250)</span>
        </div>
      </div>
    </div>
  );
};
