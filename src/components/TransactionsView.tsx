import React, { useState, useEffect } from 'react';
import {
  FileText,
  ArrowRightLeft,
  RotateCcw,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  Box,
  Wrench,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { MovementTransaction } from '../types/inventory.js';
import { api } from '../services/api.js';

interface TransactionsViewProps {
  initialFilter?: any;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ initialFilter = {} }) => {
  const [transactions, setTransactions] = useState<MovementTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>(initialFilter.type || 'ALL');
  const [search, setSearch] = useState('');

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterType !== 'ALL') params.type = filterType;
      const res = await api.getTransactions(params);
      setTransactions(res.transactions || []);
    } catch (e) {
      console.error('Failed to load movement transactions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [filterType]);

  const filtered = transactions.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      t.itemCode.toLowerCase().includes(q) ||
      t.itemName.toLowerCase().includes(q) ||
      t.fromPerson.toLowerCase().includes(q) ||
      t.toPerson.toLowerCase().includes(q) ||
      t.fromTeam.toLowerCase().includes(q) ||
      t.toTeam.toLowerCase().includes(q) ||
      t.purpose.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="p-4 sm:p-6 bg-white border-b border-slate-200 space-y-4 shrink-0 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Movement &amp; Custody Transfer Ledger
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Permanent immutable transaction history of every borrow, physical return, and inter-team transfer.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-md transition ${
                filterType === 'ALL' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Movements ({transactions.length})
            </button>
            <button
              onClick={() => setFilterType('BORROW')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                filterType === 'BORROW' ? 'bg-white text-blue-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Borrowed Items</span>
            </button>
            <button
              onClick={() => setFilterType('RETURN')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                filterType === 'RETURN' ? 'bg-white text-emerald-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Returned Items</span>
            </button>
          </div>

          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by ID, Code, Officer, Team..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading transactions...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 max-w-md mx-auto shadow-xs">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800">No Transactions Found</h3>
            <p className="text-xs text-slate-400 mt-1">No transaction history matching your criteria.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3.5">Transaction ID</th>
                    <th className="py-3 px-3.5">Date &amp; Type</th>
                    <th className="py-3 px-3.5">Item &amp; Code</th>
                    <th className="py-3 px-3.5">From Officer (Owner)</th>
                    <th className="py-3 px-3.5">To Officer (Recipient)</th>
                    <th className="py-3 px-3.5">Qty</th>
                    <th className="py-3 px-3.5">Purpose &amp; Remarks</th>
                    <th className="py-3 px-3.5">Condition</th>
                    <th className="py-3 px-3.5">Due / Return Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(t => {
                    const isOverdue = t.transactionType === 'BORROW' && !t.returnedDate && t.dueDate && t.dueDate < new Date().toISOString().split('T')[0];

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-3.5 font-mono text-[11px] font-bold text-slate-700">
                          {t.id}
                        </td>
                        <td className="py-3 px-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            t.transactionType === 'BORROW'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {t.transactionType}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">{t.date}</div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-900 truncate max-w-[200px]">{t.itemName}</div>
                          <span className="font-mono text-[10px] text-slate-500 font-bold">[{t.itemCode}]</span>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-medium text-slate-800">{t.fromPerson}</div>
                          <div className="text-[10px] text-slate-500">{t.fromTeam}</div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-medium text-slate-800">{t.toPerson}</div>
                          <div className="text-[10px] text-slate-500">{t.toTeam}</div>
                        </td>
                        <td className="py-3 px-3.5 font-bold font-mono text-slate-900 text-sm">
                          {t.quantity}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 max-w-[220px]">
                          <div className="truncate font-medium text-slate-700" title={t.purpose}>
                            {t.purpose}
                          </div>
                          {t.remarks && (
                            <div className="text-[10px] text-slate-400 truncate" title={t.remarks}>
                              Note: {t.remarks}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3.5">
                          {t.conditionBefore && (
                            <span className="text-[10px] text-slate-600">Before: {t.conditionBefore}</span>
                          )}
                          {t.conditionAfter && (
                            <div className="text-[10px] font-bold text-emerald-700">After: {t.conditionAfter}</div>
                          )}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-[11px]">
                          {t.returnedDate ? (
                            <div className="text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{t.returnedDate}</span>
                            </div>
                          ) : t.dueDate ? (
                            <div className={`flex items-center gap-1 ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                              {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                              <span>Due: {t.dueDate}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
