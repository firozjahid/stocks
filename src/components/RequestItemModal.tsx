import React, { useState } from 'react';
import {
  X,
  Send,
  Calendar,
  AlertCircle,
  ArrowRightLeft,
  User,
  Layers,
  Box,
  Wrench
} from 'lucide-react';
import { InventoryItem, RequestType } from '../types/inventory.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

interface RequestItemModalProps {
  item: InventoryItem;
  onClose: () => void;
  onRequestSubmitted: () => void;
}

export const RequestItemModal: React.FC<RequestItemModalProps> = ({
  item,
  onClose,
  onRequestSubmitted,
}) => {
  const { user, canRequestItem } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [requestedQuantity, setRequestedQuantity] = useState(1);
  const [requestType, setRequestType] = useState<RequestType>('TEMPORARY_BORROW');
  const [purpose, setPurpose] = useState('');
  const [requiredFrom, setRequiredFrom] = useState(todayStr);
  const [requiredTo, setRequiredTo] = useState(nextWeek);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canRequestItem) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl border border-slate-200">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1.5">View-Only Access Mode</h3>
          <p className="text-xs text-slate-600 mb-5 leading-relaxed">
            Per AC R&amp;I laboratory policy, item requisition is restricted to Officers and Super Admin. Engineers, HODs, In-Charges, Model Managers, and Technicians have view-only access.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
          >
            Acknowledge &amp; Close
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!purpose.trim()) {
      setError('Please provide a specific purpose for this request.');
      return;
    }

    if (requestedQuantity > item.availableQuantity) {
      setError(`Requested quantity (${requestedQuantity}) exceeds available stock (${item.availableQuantity} ${item.unit}).`);
      return;
    }

    try {
      setSubmitting(true);
      await api.createRequest({
        itemId: item.id,
        requestedQuantity,
        purpose: purpose.trim(),
        requiredFrom,
        requiredTo,
        requestType,
        remarks: remarks.trim(),
      });

      onRequestSubmitted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit item request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Inter-Team Request</h2>
              <p className="text-xs text-slate-400">
                Item belongs to <strong>{item.responsiblePerson}</strong> ({item.team})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Item Summary Box */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.itemName} className="w-full h-full object-cover" />
              ) : item.type === 'TOOL_EQUIPMENT' ? (
                <Wrench className="w-5 h-5 text-slate-400" />
              ) : (
                <Box className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-900 truncate">{item.itemName}</div>
              <div className="flex items-center gap-2 text-slate-500 mt-0.5">
                <span className="font-mono font-bold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                  {item.itemCode}
                </span>
                <span>• Available: <strong className="text-emerald-700">{item.availableQuantity} {item.unit}</strong></span>
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                Owner: <strong>{item.responsiblePerson}</strong> (ID: {item.responsibleEmployeeId}) • {item.team}
              </div>
            </div>
          </div>

          {/* Requester Identity Confirmation */}
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-800 block">Requesting Officer</span>
              <div className="font-bold text-slate-900">{user?.name} (ID: {user?.employeeId})</div>
              <div className="text-blue-700 text-[11px] font-medium">{user?.team}</div>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              Automatic digital transfer upon approval
            </div>
          </div>

          {/* Quantity & Request Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Requested Quantity <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={item.availableQuantity}
                  required
                  value={requestedQuantity}
                  onChange={e => setRequestedQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden"
                />
                <span className="text-slate-500 font-medium shrink-0">{item.unit}</span>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Request Type</label>
              <select
                value={requestType}
                onChange={e => setRequestType(e.target.value as RequestType)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-hidden"
              >
                <option value="TEMPORARY_BORROW">Temporary Borrow (Return Required)</option>
                <option value="PERMANENT_TRANSFER">Permanent Transfer</option>
                <option value="EXCHANGE">Component Exchange</option>
                <option value="GIVABLE">Givable / Consumable</option>
              </select>
            </div>
          </div>

          {/* Required Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Required From Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={requiredFrom}
                onChange={e => setRequiredFrom(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Expected Return Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={requiredTo}
                onChange={e => setRequiredTo(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Purpose */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Test / Project Purpose <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="e.g. Thermodynamic calorimetry testing on calorimeter bench for R32 Inverter cycle"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Additional Remarks / Message to Owner</label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Will take utmost care and return before due date"
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit Request to Owner'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
