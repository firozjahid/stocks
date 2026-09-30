import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Box,
  Wrench,
  ArrowRightLeft,
  MapPin,
  CheckCircle2,
  ChevronRight,
  User
} from 'lucide-react';
import { InventoryItem } from '../types/inventory.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

interface GlobalSearchModalProps {
  onClose: () => void;
  onSelectItem: (item: InventoryItem) => void;
  onRequestItem: (item: InventoryItem) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  onClose,
  onSelectItem,
  onRequestItem,
}) => {
  const { user, canRequestItem } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      try {
        setLoading(true);
        const res = await api.getInventory({ search: query.trim() });
        setResults(res.items || []);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-20">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 bg-slate-900 text-white flex items-center gap-3 shrink-0">
          <Search className="w-5 h-5 text-blue-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type Item Code (e.g. 487122), Name, Officer (e.g. Jahid), Team, Tool..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder:text-slate-400 focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          >
            Esc
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Searching central inventory database...</span>
            </div>
          ) : query.trim() && results.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No matching spare parts or tools found for "<strong>{query}</strong>".
            </div>
          ) : !query.trim() ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              <p className="font-semibold text-slate-600">AC R&amp;I Instant Universal Search</p>
              <p className="mt-1 text-slate-400">
                Try searching <code className="bg-slate-100 px-1 rounded text-slate-700">487122</code>, <code className="bg-slate-100 px-1 rounded text-slate-700">Testo</code>, <code className="bg-slate-100 px-1 rounded text-slate-700">Jahid</code>, or <code className="bg-slate-100 px-1 rounded text-slate-700">Cooling</code>.
              </p>
            </div>
          ) : (
            results.map(item => {
              const isMyItem = item.responsibleEmployeeId === user?.employeeId;

              return (
                <div
                  key={item.id}
                  className="py-3 px-2 hover:bg-blue-50/40 rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
                      ) : item.type === 'TOOL_EQUIPMENT' ? (
                        <Wrench className="w-5 h-5 text-slate-400" />
                      ) : (
                        <Box className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {item.itemCode}
                        </span>
                        <span className="font-bold text-slate-900 truncate">{item.itemName}</span>
                      </div>

                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-800 font-semibold">{item.responsiblePerson}</span>
                        <span>(ID: {item.responsibleEmployeeId})</span>
                        <span>•</span>
                        <span className="text-blue-600 font-medium">{item.team}</span>
                      </div>

                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>Rack: {item.rack} ({item.shelf})</span>
                        <span>•</span>
                        <span>Condition: <strong>{item.condition}</strong></span>
                        {item.givable && (
                          <span className="text-emerald-700 font-semibold">• Givable</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stock & Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-800">
                        {item.availableQuantity} {item.unit} available
                      </div>
                      <div className="text-[10px] text-slate-400">Total: {item.totalQuantity}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isMyItem && item.availableQuantity > 0 && canRequestItem && (
                        <button
                          onClick={() => {
                            onClose();
                            onRequestItem(item);
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded text-xs shadow-xs"
                        >
                          Request
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onClose();
                          onSelectItem(item);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs flex items-center gap-1"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Search answers: What is available? Who has it? Which team? Where is it?</span>
          <span>{results.length} matches</span>
        </div>
      </div>
    </div>
  );
};
