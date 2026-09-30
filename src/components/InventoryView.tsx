import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  ArrowRightLeft,
  RotateCcw,
  Eye,
  Edit2,
  Trash2,
  Box,
  Wrench,
  Layers,
  MapPin,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Download,
  Share2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { InventoryItem } from '../types/inventory.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

interface InventoryViewProps {
  initialFilter?: any;
  onSelectItem: (item: InventoryItem) => void;
  onRequestItem: (item: InventoryItem) => void;
  onOpenCreate: (type: 'SPARE_PART' | 'TOOL_EQUIPMENT') => void;
  onOpenEdit: (item: InventoryItem) => void;
  onOpenReturn: (item: InventoryItem) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  initialFilter = {},
  onSelectItem,
  onRequestItem,
  onOpenCreate,
  onOpenEdit,
  onOpenReturn,
}) => {
  const { user, canManageInventory, canRequestItem, canEditItem, canDeleteItem } = useAuth();
  const [masterItems, setMasterItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>(initialFilter.type || 'ALL');
  const [selectedScope, setSelectedScope] = useState<string>(initialFilter.scope || 'ALL');
  const [selectedCondition, setSelectedCondition] = useState<string>(initialFilter.condition || '');
  const [selectedTeam, setSelectedTeam] = useState<string>(initialFilter.team || '');
  const [selectedAvailability, setSelectedAvailability] = useState<string>(initialFilter.availability || '');
  const [onlyGivable, setOnlyGivable] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [deleteConfirmation, setDeleteConfirmation] = useState<InventoryItem | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getInventory();
      setMasterItems(res.items || []);
    } catch (e) {
      console.error('Failed to load inventory items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Sync initialFilter prop changes
  useEffect(() => {
    if (initialFilter.type !== undefined) setSelectedType(initialFilter.type || 'ALL');
    if (initialFilter.scope !== undefined) setSelectedScope(initialFilter.scope || 'ALL');
    if (initialFilter.condition !== undefined) setSelectedCondition(initialFilter.condition || '');
    if (initialFilter.team !== undefined) setSelectedTeam(initialFilter.team || '');
    if (initialFilter.availability !== undefined) setSelectedAvailability(initialFilter.availability || '');
  }, [initialFilter]);

  // Extract unique teams
  const teams = useMemo(() => {
    return Array.from(new Set(masterItems.map(i => i.team))).filter(Boolean);
  }, [masterItems]);

  // High-performance instant client-side filtering (<1ms response time)
  const filteredItems = useMemo(() => {
    let result = masterItems;

    // Type filter
    if (selectedType === 'SPARE_PART' || selectedType === 'TOOL_EQUIPMENT') {
      result = result.filter(i => i.type === selectedType);
    }

    // Scope filter
    if (selectedScope === 'my') {
      result = result.filter(i => i.responsibleEmployeeId === user?.employeeId);
    } else if (selectedScope === 'own_team') {
      result = result.filter(i => i.team === user?.team);
    } else if (selectedScope === 'other_team') {
      result = result.filter(
        i => i.team !== user?.team && (i.currentHolderEmployeeId === user?.employeeId || i.currentHolderTeam === user?.team)
      );
    }

    // Search filter across key attributes
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(i =>
        i.itemCode.toLowerCase().includes(q) ||
        i.itemName.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.brand && i.brand.toLowerCase().includes(q)) ||
        (i.model && i.model.toLowerCase().includes(q)) ||
        (i.serialNumber && i.serialNumber.toLowerCase().includes(q)) ||
        i.responsiblePerson.toLowerCase().includes(q) ||
        i.team.toLowerCase().includes(q) ||
        i.storageLocation.toLowerCase().includes(q) ||
        i.rack.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
      );
    }

    // Structured filters
    if (selectedTeam) {
      result = result.filter(i => i.team === selectedTeam);
    }
    if (selectedCondition) {
      result = result.filter(i => i.condition === selectedCondition);
    }
    if (selectedAvailability) {
      result = result.filter(i => i.availability === selectedAvailability);
    }
    if (onlyGivable) {
      result = result.filter(i => i.givable);
    }

    return result;
  }, [masterItems, selectedType, selectedScope, search, selectedTeam, selectedCondition, selectedAvailability, onlyGivable, user]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedType, selectedScope, search, selectedTeam, selectedCondition, selectedAvailability, onlyGivable]);

  // Fast pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const paginatedItems = useMemo(() => {
    if (pageSize === -1) return filteredItems;
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  const handleDelete = async (item: InventoryItem) => {
    try {
      await api.deleteItem(item.id);
      setDeleteConfirmation(null);
      // Remove from memory immediately for zero delay
      setMasterItems(prev => prev.filter(i => i.id !== item.id));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete item.');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header controls & tabs */}
      <div className="p-4 sm:p-6 bg-white border-b border-slate-200 space-y-4 shrink-0 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {selectedScope === 'my' ? (
                <>My Custody Items</>
              ) : selectedScope === 'own_team' ? (
                <>Own Team Inventory ({user?.team})</>
              ) : selectedScope === 'other_team' ? (
                <>Other Team Items (Borrowed / Assigned)</>
              ) : selectedType === 'SPARE_PART' ? (
                <>Spare Parts Master Catalog</>
              ) : selectedType === 'TOOL_EQUIPMENT' ? (
                <>Tools &amp; Equipment Register</>
              ) : (
                <>AC R&amp;I Central Inventory</>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Live tracking of ownership, storage racks, quantities, and transfer permissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canManageInventory && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenCreate('SPARE_PART')}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Spare Part</span>
                </button>
                <button
                  onClick={() => onOpenCreate('TOOL_EQUIPMENT')}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 px-3.5 py-2 rounded-lg text-xs font-semibold text-white transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tool/Equipment</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Scope and Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Main Scope Switcher (Own Team vs Other Team vs All) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setSelectedScope('ALL')}
              className={`px-3 py-1.5 rounded-md transition ${
                selectedScope === 'ALL' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items ({masterItems.length})
            </button>
            <button
              onClick={() => setSelectedScope('own_team')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                selectedScope === 'own_team' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Own Team</span>
            </button>
            <button
              onClick={() => setSelectedScope('my')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                selectedScope === 'my' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>My Responsible Items</span>
            </button>
            <button
              onClick={() => setSelectedScope('other_team')}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                selectedScope === 'other_team' ? 'bg-white text-amber-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Other Team (Borrowed)</span>
            </button>
          </div>

          {/* Type Toggle: Parts vs Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedType(selectedType === 'SPARE_PART' ? 'ALL' : 'SPARE_PART')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
                selectedType === 'SPARE_PART'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-emerald-600" />
              <span>Spare Parts</span>
            </button>
            <button
              onClick={() => setSelectedType(selectedType === 'TOOL_EQUIPMENT' ? 'ALL' : 'TOOL_EQUIPMENT')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition flex items-center gap-1.5 ${
                selectedType === 'TOOL_EQUIPMENT'
                  ? 'bg-blue-50 border-blue-300 text-blue-800 font-semibold'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-blue-600" />
              <span>Tools &amp; Equipment</span>
            </button>
          </div>
        </div>

        {/* Instant Search Bar & Structured Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Code, Name, Model, Serial, Owner, Rack..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <select
            value={selectedTeam}
            onChange={e => setSelectedTeam(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Teams / Labs</option>
            {teams.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={selectedCondition}
            onChange={e => setSelectedCondition(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Conditions</option>
            <option value="NEW">NEW</option>
            <option value="EXCELLENT">EXCELLENT</option>
            <option value="GOOD">GOOD</option>
            <option value="USED">USED</option>
            <option value="DAMAGED">DAMAGED</option>
            <option value="UNDER REPAIR">UNDER REPAIR</option>
          </select>

          <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 cursor-pointer hover:bg-slate-100 transition select-none">
            <input
              type="checkbox"
              checked={onlyGivable}
              onChange={e => setOnlyGivable(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
            />
            <span className="truncate">Givable / Shareable Only</span>
          </label>
        </div>
      </div>

      {/* Main Table / Grid View */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading inventory records...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 max-w-lg mx-auto mt-6 shadow-xs">
            <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Inventory Items Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              No matching records found for the current search query and filters.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCondition('');
                setSelectedTeam('');
                setSelectedScope('ALL');
                setSelectedType('ALL');
                setOnlyGivable(false);
              }}
              className="mt-4 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-100 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3.5">Item &amp; Code</th>
                    <th className="py-3 px-3.5">Specs / Model</th>
                    <th className="py-3 px-3.5">Team &amp; Responsible Officer</th>
                    <th className="py-3 px-3.5">Stock &amp; Availability</th>
                    <th className="py-3 px-3.5">Location (Rack/Shelf/Box)</th>
                    <th className="py-3 px-3.5">Condition</th>
                    <th className="py-3 px-3.5">Sharing</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedItems.map(item => {
                    const isOwnTeam = item.team === user?.team;
                    const isMyResponsible = item.responsibleEmployeeId === user?.employeeId;
                    const isCurrentlyBorrowing = item.currentHolderEmployeeId === user?.employeeId;
                    const canEdit = canEditItem(item);

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-blue-50/30 transition group ${
                          isCurrentlyBorrowing ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Item Name & Code */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-start gap-3">
                            {/* 300x300 image square thumbnail */}
                            <div
                              onClick={() => onSelectItem(item)}
                              className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer group-hover:ring-2 group-hover:ring-blue-400 transition flex items-center justify-center"
                            >
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.itemName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Fallback to icon
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : item.type === 'TOOL_EQUIPMENT' ? (
                                <Wrench className="w-5 h-5 text-slate-400" />
                              ) : (
                                <Box className="w-5 h-5 text-slate-400" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div
                                onClick={() => onSelectItem(item)}
                                className="font-semibold text-slate-900 hover:text-blue-600 cursor-pointer truncate max-w-xs"
                                title={item.itemName}
                              >
                                {item.itemName}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  {item.itemCode}
                                </span>
                                <span className={`text-[9px] uppercase font-bold px-1 py-0.2 rounded ${
                                  item.type === 'TOOL_EQUIPMENT'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {item.type === 'TOOL_EQUIPMENT' ? 'Tool' : 'Part'}
                                </span>
                                {item.tonCapacity && item.tonCapacity !== 'N/A' && (
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    • {item.tonCapacity}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Specs / Model / Brand */}
                        <td className="py-3 px-3.5 text-slate-600">
                          <div className="font-medium text-slate-800 truncate max-w-[150px]">
                            {item.brand || item.model ? `${item.brand || ''} ${item.model || ''}` : item.category}
                          </div>
                          {item.serialNumber && (
                            <div className="text-[10px] font-mono text-slate-500 truncate">
                              SN: {item.serialNumber}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                            {item.description || 'No description'}
                          </div>
                        </td>

                        {/* Team & Responsible Officer */}
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <span>{item.responsiblePerson}</span>
                            {isMyResponsible && (
                              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            ID: {item.responsibleEmployeeId}
                          </div>
                          <div className="text-[11px] text-blue-600 font-medium truncate max-w-[150px]">
                            {item.team}
                          </div>

                          {/* Show current holder if borrowed out */}
                          {item.currentHolderPerson && (
                            <div className="mt-1 text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                              <ArrowRightLeft className="w-3 h-3 text-amber-600" />
                              <span>Held by: {item.currentHolderPerson} ({item.currentHolderTeam?.replace('R&I ', '')})</span>
                            </div>
                          )}
                        </td>

                        {/* Stock & Availability */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-slate-900">
                              {item.availableQuantity}
                            </span>
                            <span className="text-slate-400 text-xs">/ {item.totalQuantity} {item.unit}</span>
                          </div>

                          {/* Borrowed indicator */}
                          {(item.borrowedQuantity || 0) > 0 && (
                            <div className="text-[10px] text-blue-600 font-medium">
                              ({item.borrowedQuantity} borrowed)
                            </div>
                          )}

                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.availability === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.availability === 'PARTIALLY AVAILABLE'
                              ? 'bg-teal-100 text-teal-800'
                              : item.availability === 'BORROWED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.availability}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-3.5 text-slate-600">
                          <div className="font-medium text-slate-800 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate max-w-[130px]">{item.storageLocation}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                            {item.rack} • {item.shelf}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Bin: {item.carton} ({item.storedType})
                          </div>
                        </td>

                        {/* Condition */}
                        <td className="py-3 px-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.condition === 'NEW'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.condition === 'EXCELLENT'
                              ? 'bg-teal-100 text-teal-800'
                              : item.condition === 'GOOD'
                              ? 'bg-sky-100 text-sky-800'
                              : item.condition === 'USED'
                              ? 'bg-slate-100 text-slate-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.condition}
                          </span>
                        </td>

                        {/* Sharing Flags */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col gap-0.5 text-[10px]">
                            <span className={`font-semibold ${item.givable ? 'text-emerald-700' : 'text-slate-400'}`}>
                              Givable: {item.givable ? 'YES' : 'NO'}
                            </span>
                            <span className={`font-semibold ${item.transferable ? 'text-blue-700' : 'text-slate-400'}`}>
                              Transferable: {item.transferable ? 'YES' : 'NO'}
                            </span>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* If currently borrowing this item, show Return button */}
                            {isCurrentlyBorrowing && (
                              <button
                                onClick={() => onOpenReturn(item)}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-medium text-[11px] flex items-center gap-1 shadow-xs"
                                title="Initiate Return"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Return</span>
                              </button>
                            )}

                            {/* Only Officers can request items from another team. Engineers, HODs, In-Charges, Model Managers are View-Only */}
                            {!isMyResponsible && item.availableQuantity > 0 && !isCurrentlyBorrowing && canRequestItem && (
                              <button
                                onClick={() => onRequestItem(item)}
                                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-[11px] flex items-center gap-1 shadow-xs"
                                title="Request Item from another team"
                              >
                                <ArrowRightLeft className="w-3 h-3" />
                                <span>Request</span>
                              </button>
                            )}

                            {/* View Details */}
                            <button
                              onClick={() => onSelectItem(item)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="View Full Item Details & History"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Edit (Restricted to Owner or Super Admin) */}
                            {canEdit && (
                              <button
                                onClick={() => onOpenEdit(item)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Edit Item Specifications"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete (Soft delete, restricted) */}
                            {canDeleteItem(item) && (
                              <button
                                onClick={() => setDeleteConfirmation(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title="Soft Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom pagination & summary bar */}
            <div className="p-3 bg-slate-50/90 border-t border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span>
                  Showing{' '}
                  <strong className="font-semibold text-slate-800">
                    {filteredItems.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                  </strong>{' '}
                  to{' '}
                  <strong className="font-semibold text-slate-800">
                    {pageSize === -1 ? filteredItems.length : Math.min(currentPage * pageSize, filteredItems.length)}
                  </strong>{' '}
                  of <strong className="font-semibold text-slate-800">{filteredItems.length}</strong> filtered items{' '}
                  <span className="text-slate-400 font-normal">
                    (Total Store: {masterItems.length})
                  </span>
                </span>

                <div className="hidden md:flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-200 text-[11px] text-slate-500">
                  <span>Per page:</span>
                  <select
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 font-medium"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={-1}>All ({filteredItems.length})</option>
                  </select>
                </div>
              </div>

              {/* Page Switcher */}
              {pageSize !== -1 && totalPages > 1 && (
                <div className="flex items-center gap-1.5 self-center sm:self-auto">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-2.5 py-0.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" />
              <span>Confirm Soft Deletion</span>
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to delete <strong>{deleteConfirmation.itemName}</strong> [
              {deleteConfirmation.itemCode}]?
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs text-slate-600 mt-3">
              This record will be safely soft-deleted. Historical movement and borrowing records will remain intact in the audit trail.
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmation)}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
