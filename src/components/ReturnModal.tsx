import React, { useState } from 'react';
import {
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Box,
  Wrench
} from 'lucide-react';
import { InventoryItem, ItemRequest, ItemCondition } from '../types/inventory.js';
import { api } from '../services/api.js';

interface ReturnModalProps {
  request?: ItemRequest | null;
  item?: InventoryItem | null;
  mode: 'INITIATE_RETURN' | 'CONFIRM_RECEIPT';
  onClose: () => void;
  onCompleted: () => void;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  request,
  item,
  mode,
  onClose,
  onCompleted,
}) => {
  const [returnRemarks, setReturnRemarks] = useState('');
  const [returnedCondition, setReturnedCondition] = useState<ItemCondition>(item?.condition || 'GOOD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    setError(null);

    try {
      setSubmitting(true);
      if (mode === 'INITIATE_RETURN') {
        await api.requestReturn(request.id, returnRemarks);
      } else {
        await api.confirmReturn(request.id, returnedCondition, returnRemarks);
      }
      onCompleted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to process return.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${mode === 'CONFIRM_RECEIPT' ? 'bg-emerald-600' : 'bg-amber-500'} text-white`}>
              {mode === 'CONFIRM_RECEIPT' ? <CheckCircle2 className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === 'CONFIRM_RECEIPT' ? 'Owner Physical Receipt Verification' : 'Initiate Item Return'}
              </h2>
              <p className="text-xs text-slate-400">Request #{request?.id}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Info Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="font-bold text-slate-900 text-sm">{request?.itemName}</div>
            <div className="text-slate-500 font-mono text-[11px]">
              Code: {request?.itemCode} • Qty: {request?.approvedQuantity || request?.requestedQuantity}
            </div>
            <div className="text-slate-600 text-[11px]">
              Borrower: <strong>{request?.requesterName}</strong> ({request?.requesterTeam}) ➔ Owner: <strong>{request?.ownerName}</strong> ({request?.ownerTeam})
            </div>
          </div>

          {mode === 'CONFIRM_RECEIPT' ? (
            <>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Verified Condition Upon Physical Receipt <span className="text-rose-500">*</span>
                </label>
                <select
                  value={returnedCondition}
                  onChange={e => setReturnedCondition(e.target.value as ItemCondition)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs text-slate-800 focus:bg-white focus:outline-hidden"
                >
                  <option value="NEW">NEW</option>
                  <option value="EXCELLENT">EXCELLENT</option>
                  <option value="GOOD">GOOD</option>
                  <option value="USED">USED</option>
                  <option value="FAIR">FAIR</option>
                  <option value="DAMAGED">DAMAGED (Requires Maintenance)</option>
                  <option value="UNDER REPAIR">UNDER REPAIR</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Condition history entry will be permanently appended to this item.
                </p>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Return Inspection Remarks
                </label>
                <input
                  type="text"
                  required
                  value={returnRemarks}
                  onChange={e => setReturnRemarks(e.target.value)}
                  placeholder="e.g. Received back in clean condition with all sensor probes intact"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  Confirming receipt will restore <strong>{request?.approvedQuantity || 1}</strong> unit(s) back into your available stock.
                </span>
              </div>
            </>
          ) : (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Return Notes / Remarks to Owner
              </label>
              <textarea
                rows={3}
                value={returnRemarks}
                onChange={e => setReturnRemarks(e.target.value)}
                placeholder="e.g. Finished experiment successfully. Item cleaned and packed in its hard protective case."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                The responsible owner will receive a notification to inspect and confirm receipt.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 rounded-lg text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 ${
                mode === 'CONFIRM_RECEIPT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{submitting ? 'Processing...' : mode === 'CONFIRM_RECEIPT' ? 'Confirm Physical Receipt' : 'Submit Return Request'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
