import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  User,
  Box,
  Wrench,
  Clock,
  ArrowRightLeft,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Layers,
  History,
  Tag,
  ShieldCheck,
  FileText,
  Eye
} from 'lucide-react';
import { InventoryItem, MovementTransaction, ItemRequest } from '../types/inventory.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';

interface ItemDetailsModalProps {
  item: InventoryItem;
  onClose: () => void;
  onRequestItem: (item: InventoryItem) => void;
  onOpenReturn: (item: InventoryItem) => void;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  item: initialItem,
  onClose,
  onRequestItem,
  onOpenReturn,
}) => {
  const { user, canRequestItem } = useAuth();
  const [item, setItem] = useState<InventoryItem>(initialItem);
  const [history, setHistory] = useState<MovementTransaction[]>([]);
  const [activeRequests, setActiveRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await api.getItemDetails(initialItem.id);
        setItem(res.item);
        setHistory(res.history || []);
        setActiveRequests(res.activeRequests || []);
      } catch (err) {
        console.error('Failed to load item details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [initialItem.id]);

  const isOwnTeam = item.team === user?.team;
  const isMyResponsible = item.responsibleEmployeeId === user?.employeeId;
  const isCurrentlyBorrowing = item.currentHolderEmployeeId === user?.employeeId;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Top Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${item.type === 'TOOL_EQUIPMENT' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
              {item.type === 'TOOL_EQUIPMENT' ? <Wrench className="w-5 h-5 text-white" /> : <Box className="w-5 h-5 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-bold border border-slate-700">
                  {item.itemCode}
                </span>
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  {item.type === 'TOOL_EQUIPMENT' ? 'Tool & Equipment Profile' : 'Spare Part Master Specification'}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">{item.itemName}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Hero Grid: 300x300 Square Image + Core Specs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* 300x300 Square Preview */}
            <div className="flex flex-col items-center">
              <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shadow-sm flex items-center justify-center relative">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.itemName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-4 text-slate-400">
                    {item.type === 'TOOL_EQUIPMENT' ? (
                      <Wrench className="w-16 h-16 mx-auto mb-2 text-slate-300" />
                    ) : (
                      <Box className="w-16 h-16 mx-auto mb-2 text-slate-300" />
                    )}
                    <span className="text-xs">No image uploaded</span>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 text-[10px] bg-slate-900/80 text-white px-2 py-0.5 rounded font-mono">
                  300 x 300 px
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-3 flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  item.availability === 'AVAILABLE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : item.availability === 'PARTIALLY AVAILABLE'
                    ? 'bg-teal-100 text-teal-800 border border-teal-300'
                    : item.availability === 'BORROWED'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {item.availability}
                </span>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  item.condition === 'NEW'
                    ? 'bg-emerald-100 text-emerald-800'
                    : item.condition === 'EXCELLENT'
                    ? 'bg-teal-100 text-teal-800'
                    : item.condition === 'GOOD'
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  Condition: {item.condition}
                </span>
              </div>
            </div>

            {/* Core Specifications Column */}
            <div className="md:col-span-2 space-y-4">
              <div>
                <h3 className="text-xs uppercase font-bold tracking-wider text-slate-400">Technical Description</h3>
                <p className="text-sm text-slate-700 mt-1 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {item.description || 'No technical remarks provided.'}
                </p>
              </div>

              {/* Attribute Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Category</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{item.category}</span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Brand / Model</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {item.brand || item.model ? `${item.brand || ''} ${item.model || ''}` : 'N/A'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Serial Number</span>
                  <span className="font-bold font-mono text-slate-800 mt-0.5 block">
                    {item.serialNumber || 'N/A'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Ton / Capacity</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {item.tonCapacity || 'Standard'}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Total Stock</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {item.totalQuantity} {item.unit}
                  </span>
                </div>

                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-emerald-700 font-semibold block uppercase text-[10px]">Available Now</span>
                  <span className="font-bold text-emerald-900 mt-0.5 block text-sm">
                    {item.availableQuantity} {item.unit}
                  </span>
                </div>
              </div>

              {/* Ownership & Physical Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                {/* Ownership Card */}
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl">
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold mb-1">
                    <User className="w-4 h-4 text-blue-600" />
                    <span>Responsible Officer</span>
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">{item.responsiblePerson}</div>
                  <div className="text-slate-600 mt-0.5">
                    Employee ID: <span className="font-mono font-semibold">{item.responsibleEmployeeId}</span>
                  </div>
                  <div className="text-blue-700 font-medium mt-0.5">{item.team}</div>

                  {item.currentHolderPerson && (
                    <div className="mt-2 pt-2 border-t border-blue-200 text-slate-700">
                      <span className="text-[10px] uppercase font-bold text-amber-700 block">Current Holder / Borrower:</span>
                      <span className="font-semibold text-slate-900">{item.currentHolderPerson}</span> (ID: {item.currentHolderEmployeeId})
                      <div className="text-[11px] text-slate-500">{item.currentHolderTeam}</div>
                    </div>
                  )}
                </div>

                {/* Storage Location Card */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold mb-1">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>Physical Storage Location</span>
                  </div>
                  <div className="font-semibold text-slate-900">{item.storageLocation}</div>
                  <div className="grid grid-cols-3 gap-1 mt-2 text-[11px] font-mono">
                    <div className="bg-white p-1 rounded border border-slate-200 text-center">
                      <span className="text-[9px] text-slate-400 block">RACK</span>
                      <strong>{item.rack}</strong>
                    </div>
                    <div className="bg-white p-1 rounded border border-slate-200 text-center">
                      <span className="text-[9px] text-slate-400 block">SHELF</span>
                      <strong>{item.shelf}</strong>
                    </div>
                    <div className="bg-white p-1 rounded border border-slate-200 text-center">
                      <span className="text-[9px] text-slate-400 block">CARTON/BIN</span>
                      <strong>{item.carton}</strong>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    Storage Type: <span className="font-medium text-slate-800">{item.storedType}</span>
                  </div>
                </div>
              </div>

              {/* Sharing Permissions Bar */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Inter-Team Sharing:</span>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded font-bold ${item.transferable ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-500'}`}>
                    Transferable: {item.transferable ? 'YES' : 'NO'}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold ${item.givable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                    Givable: {item.givable ? 'YES' : 'NO'}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold ${item.exchangeable ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-500'}`}>
                    Exchangeable: {item.exchangeable ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* MOVEMENT & TRANSACTION HISTORY FOR THIS ITEM */}
          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-blue-600" />
              <span>Complete Movement &amp; Borrowing History</span>
            </h3>

            {history.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                No movements or inter-team transfers recorded yet for this item.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">From</th>
                      <th className="py-2.5 px-3">To</th>
                      <th className="py-2.5 px-3">Qty</th>
                      <th className="py-2.5 px-3">Purpose</th>
                      <th className="py-2.5 px-3">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{t.date}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            t.transactionType === 'BORROW' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {t.transactionType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {t.fromPerson} <span className="text-[10px] text-slate-400">({t.fromTeam.replace('R&I ', '')})</span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {t.toPerson} <span className="text-[10px] text-slate-400">({t.toTeam.replace('R&I ', '')})</span>
                        </td>
                        <td className="py-2.5 px-3 font-bold font-mono">{t.quantity}</td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={t.purpose}>
                          {t.purpose}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{t.recordedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Internal ID: <span className="font-mono text-slate-700">{item.id}</span>
          </div>

          <div className="flex items-center gap-2.5">
            {isCurrentlyBorrowing && (
              <button
                onClick={() => {
                  onClose();
                  onOpenReturn(item);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Initiate Return</span>
              </button>
            )}

            {/* Only Officers can request items. Engineers, HODs, In-Charges, Model Managers are View-Only */}
            {!isMyResponsible && item.availableQuantity > 0 && !isCurrentlyBorrowing && canRequestItem && (
              <button
                onClick={() => {
                  onClose();
                  onRequestItem(item);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Request Item from {item.team}</span>
              </button>
            )}

            {!isMyResponsible && !canRequestItem && (
              <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-xs font-medium flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                <span>View-Only (Requests restricted to Officers)</span>
              </div>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
