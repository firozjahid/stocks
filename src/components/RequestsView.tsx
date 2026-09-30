import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Send,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ArrowRightLeft,
  Calendar,
  User,
  AlertTriangle,
  MessageSquare,
  Box,
  Wrench,
  Check
} from 'lucide-react';
import { ItemRequest } from '../types/inventory.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { ReturnModal } from './ReturnModal.js';

interface RequestsViewProps {
  initialTab?: 'incoming' | 'my' | 'history';
}

export const RequestsView: React.FC<RequestsViewProps> = ({ initialTab = 'incoming' }) => {
  const { user, isSuperAdmin } = useAuth();
  const [tab, setTab] = useState<'incoming' | 'my' | 'history'>(initialTab);
  const [requests, setRequests] = useState<ItemRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [selectedReviewReq, setSelectedReviewReq] = useState<ItemRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'PARTIAL' | 'REJECT'>('APPROVE');
  const [approvedQty, setApprovedQty] = useState<number>(1);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Return modal state
  const [returnModalReq, setReturnModalReq] = useState<ItemRequest | null>(null);
  const [returnModalMode, setReturnModalMode] = useState<'INITIATE_RETURN' | 'CONFIRM_RECEIPT'>('INITIATE_RETURN');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const queryType = tab === 'incoming' ? 'incoming' : tab === 'my' ? 'my' : 'all';
      const res = await api.getRequests(queryType);
      setRequests(res.requests || []);
    } catch (e) {
      console.error('Failed to load requests:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [tab, user]);

  const handleOpenReview = (req: ItemRequest, action: 'APPROVE' | 'PARTIAL' | 'REJECT') => {
    setSelectedReviewReq(req);
    setReviewAction(action);
    setApprovedQty(req.requestedQuantity);
    setReviewRemarks('');
  };

  const submitReview = async () => {
    if (!selectedReviewReq) return;
    try {
      setSubmittingReview(true);
      await api.reviewRequest(
        selectedReviewReq.id,
        reviewAction,
        reviewAction === 'PARTIAL' ? approvedQty : undefined,
        reviewRemarks
      );
      setSelectedReviewReq(null);
      loadRequests();
    } catch (err: any) {
      alert(err?.message || 'Error processing request review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleOpenReturnModal = (req: ItemRequest, mode: 'INITIATE_RETURN' | 'CONFIRM_RECEIPT') => {
    setReturnModalReq(req);
    setReturnModalMode(mode);
  };

  const incomingCount = requests.filter(r => r.ownerEmployeeId === user?.employeeId && r.status === 'PENDING').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Header & Tabs */}
      <div className="p-4 sm:p-6 bg-white border-b border-slate-200 space-y-4 shrink-0 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Internal Item Requests &amp; Approvals
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Digital borrowing workflows between AC R&amp;I teams with strict ownership retention.
            </p>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-px text-xs font-semibold">
          <button
            onClick={() => setTab('incoming')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
              tab === 'incoming'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Inbox className="w-4 h-4 text-amber-500" />
            <span>Incoming Owner Panel</span>
            {incomingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                {incomingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setTab('my')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
              tab === 'my'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-4 h-4 text-blue-500" />
            <span>My Outgoing Requests</span>
          </button>

          <button
            onClick={() => setTab('history')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition ${
              tab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Request Ledger &amp; History</span>
          </button>
        </div>
      </div>

      {/* Main List Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading requests...</span>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 max-w-md mx-auto shadow-xs">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800">No Requests Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {tab === 'incoming'
                ? 'You have zero pending requests from other teams.'
                : tab === 'my'
                ? 'You have not submitted any active item requests.'
                : 'No historical requests logged.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {requests.map(req => {
              const isOwner = req.ownerEmployeeId === user?.employeeId || isSuperAdmin;
              const isRequester = req.requesterEmployeeId === user?.employeeId || isSuperAdmin;
              const isPending = req.status === 'PENDING' || req.status === 'UNDER REVIEW';
              const isBorrowed = req.status === 'BORROWED' || req.status === 'OVERDUE';
              const isReturnRequested = req.status === 'RETURN REQUESTED';

              return (
                <div
                  key={req.id}
                  className={`bg-white border rounded-xl p-4 shadow-xs transition hover:border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isPending && isOwner ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                  }`}
                >
                  {/* Left Column: ID, Item, Specs */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                        {req.id}
                      </span>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        req.status === 'PENDING'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : req.status === 'BORROWED'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : req.status === 'RETURN REQUESTED'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : req.status === 'RETURNED' || req.status === 'CLOSED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : req.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {req.status}
                      </span>

                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {req.requestType.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>{req.itemName}</span>
                      <span className="font-mono text-xs text-slate-500 font-normal">[{req.itemCode}]</span>
                    </div>

                    {/* Parties involved */}
                    <div className="text-xs text-slate-600 flex items-center gap-1 flex-wrap">
                      <span>Requester:</span>
                      <strong className="text-slate-800">{req.requesterName}</strong>
                      <span className="text-[11px] text-slate-400">({req.requesterTeam.replace('R&I ', '')})</span>
                      <span className="text-slate-400 mx-1">➔</span>
                      <span>Owner:</span>
                      <strong className="text-slate-800">{req.ownerName}</strong>
                      <span className="text-[11px] text-slate-400">({req.ownerTeam.replace('R&I ', '')})</span>
                    </div>

                    {/* Purpose & Remarks */}
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                      <div className="font-medium text-slate-800">
                        <span className="text-slate-400 font-normal">Purpose:</span> {req.purpose}
                      </div>
                      {req.remarks && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          <span className="font-semibold text-slate-600">Requester note:</span> {req.remarks}
                        </div>
                      )}
                      {req.ownerRemarks && (
                        <div className="text-[11px] text-amber-900 font-medium mt-1 bg-amber-50 p-1.5 rounded border border-amber-200">
                          <span>Owner response:</span> {req.ownerRemarks}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Dates & Quantity */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-4 shrink-0 text-xs">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Qty</div>
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {req.approvedQuantity || req.requestedQuantity} unit(s)
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-500">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span>{req.requiredFrom} ➔ {req.requiredTo}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Submitted: {req.createdAt}</div>
                    </div>

                    {/* ACTION BUTTONS BASED ON WORKFLOW STAGE */}
                    <div className="flex items-center gap-2 mt-2">
                      {/* OWNER ACTIONS FOR PENDING REQUESTS */}
                      {isOwner && isPending && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenReview(req, 'APPROVE')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleOpenReview(req, 'PARTIAL')}
                            className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                            title="Approve Partial Quantity"
                          >
                            <span>Partial</span>
                          </button>
                          <button
                            onClick={() => handleOpenReview(req, 'REJECT')}
                            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {/* BORROWER ACTION TO INITIATE RETURN */}
                      {isRequester && isBorrowed && (
                        <button
                          onClick={() => handleOpenReturnModal(req, 'INITIATE_RETURN')}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Return Item</span>
                        </button>
                      )}

                      {/* OWNER ACTION TO CONFIRM RECEIPT AFTER BORROWER REQUESTS RETURN */}
                      {isOwner && isReturnRequested && (
                        <button
                          onClick={() => handleOpenReturnModal(req, 'CONFIRM_RECEIPT')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition animate-pulse"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm Physical Receipt</span>
                        </button>
                      )}

                      {isRequester && isReturnRequested && (
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-lg">
                          Awaiting Owner Receipt Check
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal (Owner Approve / Reject / Partial) */}
      {selectedReviewReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {reviewAction === 'APPROVE'
                ? `Approve Request #${selectedReviewReq.id}`
                : reviewAction === 'PARTIAL'
                ? `Partial Approval for #${selectedReviewReq.id}`
                : `Reject Request #${selectedReviewReq.id}`}
            </h3>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div><strong>Item:</strong> {selectedReviewReq.itemName}</div>
              <div><strong>Requester:</strong> {selectedReviewReq.requesterName} ({selectedReviewReq.requesterTeam})</div>
              <div><strong>Requested Qty:</strong> {selectedReviewReq.requestedQuantity}</div>
            </div>

            {reviewAction === 'PARTIAL' && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1 text-xs">
                  Approved Quantity (Partial)
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedReviewReq.requestedQuantity}
                  value={approvedQty}
                  onChange={e => setApprovedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>
            )}

            <div>
              <label className="font-semibold text-slate-700 block mb-1 text-xs">
                Owner Remarks / Special Instructions
              </label>
              <textarea
                rows={2}
                value={reviewRemarks}
                onChange={e => setReviewRemarks(e.target.value)}
                placeholder={reviewAction === 'REJECT' ? 'Specify reason for rejection...' : 'Instructions for care/handling...'}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedReviewReq(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReview}
                onClick={submitReview}
                className={`px-4 py-1.5 rounded-lg text-white text-xs font-semibold shadow-xs ${
                  reviewAction === 'REJECT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {submittingReview ? 'Submitting...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModalReq && (
        <ReturnModal
          request={returnModalReq}
          mode={returnModalMode}
          onClose={() => setReturnModalReq(null)}
          onCompleted={loadRequests}
        />
      )}
    </div>
  );
};
