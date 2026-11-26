import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import UserAvatar from '../common/UserAvatar';
import { getProfileImageUrl } from '../../utils/userAvatar';
import { formatReimbursementExpenseType } from '../../utils/reimbursementType';
import {
  formatReimbursementPaymentLabel,
  getReimbursementPaymentStatus,
  reimbursementItemPaymentBadgeClass
} from '../../utils/reimbursementGroups';

const RequestDetailsModal = ({
  open,
  type,
  data,
  onClose,
  onApprove,
  onReject,
  onCancel,
  loading,
  actionsDisabled = false,
  size = 'md'
}) => {
  const [comment, setComment] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setComment('');
  }, [open, data]);

  const employee = data?.employee || data?.user || {};
  const fullName = employee.full_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || '-';
  const designation = employee.designation || '-';
  const department = employee.department?.name;

  const leaveType = data?.details?.leave_type_name || data?.leave_type?.name || 'Leave';
  const reason = data?.reason || data?.summary || '-';
  const startDate = data?.start_date || data?.details?.start_date;
  const endDate = data?.end_date || data?.details?.end_date;
  const requestDate = data?.request_date || data?.details?.request_date;
  const wrongPunch = data?.wrong_punch_type || data?.details?.wrong_punch_type;
  const correctedTime = data?.corrected_time || data?.details?.corrected_time;
  const originalTime = data?.original_time || data?.details?.original_time;
  const attachmentUrl =
    data?.attachment_url ||
    data?.record?.attachment_url ||
    null;
  const amount = data?.amount ?? data?.details?.amount ?? data?.record?.amount;
  const expenseType =
    data?.type ?? data?.details?.type ?? data?.record?.type ?? null;
  const paidAt = data?.paid_at ?? data?.record?.paid_at ?? null;
  const totalDays = data?.total_days ?? data?.record?.total_days ?? null;
  const approverComment = data?.approver_comment || data?.record?.approver_comment || null;

  const formatAmount = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const title =
    type === 'ATTENDANCE'
      ? `${wrongPunch === 'CLOCK_OUT' ? 'Clock OUT' : 'Clock IN'} Request`
      : type === 'REIMBURSEMENT'
        ? 'Reimbursement Request'
        : type === 'WFH'
          ? 'WFH Request'
          : type === 'LEAVE'
            ? `${leaveType} Request`
            : 'Request';
  const status = String(data?.status || '').toUpperCase();
  const isApprovedReimbursement = type === 'REIMBURSEMENT' && status === 'APPROVED';
  const isPending = status === 'PENDING';
  const canApprove = isPending && !actionsDisabled;
  const canReject = isPending && !actionsDisabled;
  const canCancel =
    (type === 'LEAVE' || type === 'ATTENDANCE' || type === 'REIMBURSEMENT' || type === 'WFH') &&
    status === 'APPROVED' &&
    !actionsDisabled &&
    !!onCancel;
  const showNotes = isPending || canCancel;

  const handleApprove = async () => {
    if (!onApprove) return;
    await onApprove(comment);
    setComment('');
  };

  const handleReject = async () => {
    if (!onReject) return;
    await onReject(comment);
    setComment('');
  };

  const handleCancel = async () => {
    if (!onCancel) return;
    await onCancel(comment);
    setComment('');
  };

  if (!open) return null;
  const modalSizeClass = size === 'sm' ? 'max-w-sm p-5' : 'max-w-md p-6';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full bg-white rounded-2xl shadow-xl relative ${modalSizeClass}`}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400 mt-1">Request ID: {data?.id || '-'}</p>

        <div className="mt-4 bg-[#F8F9FA] rounded-xl p-3 flex items-center gap-3">
          <UserAvatar
            size="lg"
            imageUrl={getProfileImageUrl(employee)}
            fullName={fullName}
            firstName={employee.first_name}
            lastName={employee.last_name}
          />
          <div>
            <div className="text-sm font-semibold text-gray-900">{fullName}</div>
            <div className="text-xs text-gray-500">
              {designation}{department ? ` - ${department}` : ''}
            </div>
          </div>
        </div>

        {type === 'LEAVE' ? (
          <>
            <div className="mt-4 border border-gray-100 rounded-xl p-3">
              <div className="text-[10px] text-gray-400 uppercase">Leave Type</div>
              <div className="text-sm text-gray-900">{leaveType}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="text-[10px] text-gray-400 uppercase">From</div>
                <div className="text-sm text-gray-900">{startDate ? new Date(startDate).toLocaleDateString('en-GB') : '-'}</div>
              </div>
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="text-[10px] text-gray-400 uppercase">To</div>
                <div className="text-sm text-gray-900">{endDate ? new Date(endDate).toLocaleDateString('en-GB') : '-'}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-[10px] text-gray-400 uppercase">Reason</div>
              <div className="text-sm text-gray-700 mt-1 bg-[#F8F9FA] rounded-xl p-3">{reason}</div>
            </div>
          </>
        ) : type === 'WFH' ? (
          <>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="text-[10px] text-gray-400 uppercase">From</div>
                <div className="text-sm text-gray-900">{startDate ? new Date(startDate).toLocaleDateString('en-GB') : '-'}</div>
              </div>
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="text-[10px] text-gray-400 uppercase">To</div>
                <div className="text-sm text-gray-900">{endDate ? new Date(endDate).toLocaleDateString('en-GB') : '-'}</div>
              </div>
            </div>
            <div className="mt-3 border border-gray-100 rounded-xl p-3">
              <div className="text-[10px] text-gray-400 uppercase">Total Days</div>
              <div className="text-sm text-gray-900">{totalDays != null ? `${totalDays} Day${Number(totalDays) === 1 ? '' : 's'}` : '-'}</div>
            </div>
            <div className="mt-4">
              <div className="text-[10px] text-gray-400 uppercase">Reason</div>
              <div className="text-sm text-gray-700 mt-1 bg-[#F8F9FA] rounded-xl p-3">{reason}</div>
            </div>
          </>
        ) : type === 'REIMBURSEMENT' ? (
          <>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="text-[10px] text-gray-400 uppercase">Expense Type</div>
                <div className="text-sm text-gray-900">{formatReimbursementExpenseType(expenseType)}</div>
              </div>
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="text-[10px] text-gray-400 uppercase">Expense Date</div>
                <div className="text-sm text-gray-900">{requestDate ? new Date(requestDate).toLocaleDateString('en-GB') : '-'}</div>
              </div>
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="text-[10px] text-gray-400 uppercase">Amount</div>
                <div className="text-sm text-gray-900">{formatAmount(amount)}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-[10px] text-gray-400 uppercase">Reason</div>
              <div className="text-sm text-gray-700 mt-1 bg-[#F8F9FA] rounded-xl p-3">{reason}</div>
            </div>
            {isApprovedReimbursement ? (
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="border border-gray-100 rounded-xl p-3">
                  <div className="text-[10px] text-gray-400 uppercase">Payment status</div>
                  <span
                    className={`inline-flex items-center mt-1 px-3 py-1 rounded-full text-xs font-medium ${reimbursementItemPaymentBadgeClass(getReimbursementPaymentStatus(data))}`}
                  >
                    {formatReimbursementPaymentLabel(data)}
                  </span>
                </div>
                {getReimbursementPaymentStatus(data) === 'PAID' && paidAt ? (
                  <div className="border border-gray-100 rounded-xl p-3">
                    <div className="text-[10px] text-gray-400 uppercase">Paid on</div>
                    <div className="text-sm text-gray-900 mt-1">
                      {new Date(paidAt).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="text-[10px] text-gray-400 uppercase">Wrong Punch</div>
                <div className="text-sm text-gray-900">{wrongPunch || '-'}</div>
              </div>
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="text-[10px] text-gray-400 uppercase">Corrected Time</div>
                <div className="text-sm text-gray-900">{correctedTime || '-'}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="text-[10px] text-gray-400 uppercase">Request Date</div>
                <div className="text-sm text-gray-900">{requestDate ? new Date(requestDate).toLocaleDateString('en-GB') : '-'}</div>
              </div>
              <div className="border border-gray-100 rounded-xl p-3">
                <div className="text-[10px] text-gray-400 uppercase">Original Time</div>
                <div className="text-sm text-gray-900">{originalTime || '-'}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-[10px] text-gray-400 uppercase">Reason</div>
              <div className="text-sm text-gray-700 mt-1 bg-[#F8F9FA] rounded-xl p-3">{reason}</div>
            </div>
          </>
        )}

        <div className="mt-4">
          <div className="text-[10px] text-gray-400 uppercase">Attachment</div>
          {attachmentUrl ? (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center text-sm font-semibold text-[#EB4000] hover:underline break-all"
            >
              Open Attachment
            </a>
          ) : (
            <div className="mt-1 text-sm text-gray-500">No attachment</div>
          )}
        </div>

        {!isPending && approverComment ? (
          <div className="mt-4">
            <div className="text-[10px] text-gray-400 uppercase">Approver Comment</div>
            <div className="text-sm text-gray-700 mt-1 bg-[#F8F9FA] rounded-xl p-3">{approverComment}</div>
          </div>
        ) : null}

        {showNotes && (
          <div className="mt-4">
            <div className="text-[10px] text-gray-400 uppercase">Admin Notes</div>
            <textarea
              rows="3"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment (optional)..."
              className="mt-1 w-full bg-white border border-gray-200 rounded-xl p-3 text-sm text-gray-700 focus:outline-none focus:ring-1 ring-[#EB4000]"
            />
          </div>
        )}

        {isPending && (canApprove || canReject) && (
          <div className="mt-5 flex gap-3">
            {canReject && (
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
              >
                Reject
              </button>
            )}
            {canApprove && (
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
              >
                Approve Request
              </button>
            )}
          </div>
        )}

        {canCancel && (
          <div className="mt-5">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="w-full py-2.5 rounded-xl border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-60"
            >
              Cancel Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestDetailsModal;
