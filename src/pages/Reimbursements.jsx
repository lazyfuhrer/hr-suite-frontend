import React, { useEffect, useMemo, useState } from 'react';
import { Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLayout } from '../context/LayoutContext';
import RequestDetailsModal from '../components/requests/RequestDetailsModal';
import DateRangeDropdown, { getRangeParams } from '../components/common/DateRangeDropdown';
import {
  getReimbursementRequests,
  updateReimbursementRequestStatus
} from '../api/requests';
import UserAvatar from '../components/common/UserAvatar';
import { getProfileImageUrl } from '../utils/userAvatar';
import { formatReimbursementExpenseType } from '../utils/reimbursementType';

const formatReimbursementAmount = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const statusBadgeClass = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'APPROVED') return 'bg-emerald-50 text-emerald-700';
  if (normalized === 'REJECTED') return 'bg-[#F3495D] text-white';
  if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'bg-gray-100 text-gray-600';
  return 'bg-gray-100 text-gray-600';
};

const Reimbursements = () => {
  const { setHeaderConfig } = useLayout();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    total_pages: 1,
    page: 1,
    limit: 10
  });

  useEffect(() => {
    setHeaderConfig({
      title: 'Reimbursements',
      breadcrumb: [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Reimbursements', path: '/reimbursements', active: true }
      ],
      onBack: null
    });
  }, [setHeaderConfig]);

  const fetchReimbursements = async (overrides = {}) => {
    setLoading(true);
    try {
      const page = overrides.page ?? pagination.page;
      const limit = overrides.limit ?? pagination.limit;
      const rangeParams = dateFilter ? getRangeParams(dateFilter) : {};
      const res = await getReimbursementRequests({ page, limit, ...rangeParams });
      setData(res);
      setPagination((prev) => ({
        ...prev,
        page: res.page ?? prev.page,
        limit: res.limit ?? prev.limit,
        total: res.total ?? 0,
        total_pages: res.total_pages ?? 1
      }));
    } catch (error) {
      toast.error('Failed to load reimbursement requests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReimbursements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  const items = data?.items || [];

  const pendingCount = useMemo(
    () => items.filter((r) => String(r.status || '').toUpperCase() === 'PENDING').length,
    [items]
  );

  const attentionCount = useMemo(
    () => items.filter((r) => String(r.status || '').toUpperCase() === 'REJECTED').length,
    [items]
  );

  const handleOpenModal = (item) => {
    setSelected({ type: 'REIMBURSEMENT', data: item });
  };

  const handleCloseModal = () => {
    setSelected(null);
  };

  const buildStatusPayload = (status, note) => {
    const payload = { status };
    const trimmed = (note || '').trim();
    if (trimmed) payload.comment = trimmed;
    return payload;
  };

  const handleApprove = async (note) => {
    if (!selected?.data?.id) return;
    setActionLoading(true);
    try {
      await updateReimbursementRequestStatus(
        selected.data.id,
        buildStatusPayload('APPROVED', note)
      );
      await fetchReimbursements();
      toast.success('Request approved');
      handleCloseModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (note) => {
    if (!selected?.data?.id) return;
    setActionLoading(true);
    try {
      await updateReimbursementRequestStatus(
        selected.data.id,
        buildStatusPayload('REJECTED', note)
      );
      await fetchReimbursements();
      toast.success('Request rejected');
      handleCloseModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (note) => {
    if (!selected?.data?.id) return;
    setActionLoading(true);
    try {
      await updateReimbursementRequestStatus(
        selected.data.id,
        buildStatusPayload('CANCELLED', note)
      );
      await fetchReimbursements();
      toast.success('Request cancelled');
      handleCloseModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to cancel request');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePageChange = (nextPage) => {
    setPagination((prev) => ({ ...prev, page: nextPage }));
    fetchReimbursements({ page: nextPage });
  };

  const handleLimitChange = (nextLimit) => {
    setPagination((prev) => ({ ...prev, limit: nextLimit, page: 1 }));
    fetchReimbursements({ page: 1, limit: nextLimit });
  };

  const renderPaginationButtons = () => {
    const { page, total_pages } = pagination;
    const totalPages = total_pages || 1;
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i += 1) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages.map((p, idx) =>
      p === '...' ? (
        <span key={`dots-${idx}`} className="px-2 text-gray-400 text-xs">
          ...
        </span>
      ) : (
        <button
          key={p}
          type="button"
          onClick={() => handlePageChange(p)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
            page === p
              ? 'bg-[#EB4000] text-white'
              : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          {p}
        </button>
      )
    );
  };

  return (
    <div className="bg-[#F8F9FA] min-h-screen p-6">
      <div className="bg-white rounded-2xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF4F0] flex items-center justify-center">
            <Receipt className="w-5 h-5 text-[#EB4000]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Reimbursements</h2>
        </div>
        <div className="flex gap-3">
          <div className="bg-[#FFF4F0] rounded-xl px-4 py-2 text-center">
            <div className="text-[10px] text-gray-500">Pending</div>
            <div className="text-lg font-bold text-[#EB4000]">{pendingCount}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-4 py-2 text-center">
            <div className="text-[10px] text-gray-500">Attention</div>
            <div className="text-lg font-bold text-gray-900">{attentionCount}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm mt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">Reimbursement Activity</h2>
          <DateRangeDropdown
            value={dateFilter}
            onApply={(next) => {
              setDateFilter(next);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
                <th className="py-3 px-4 rounded-l-xl">Name</th>
                <th className="py-3 px-4">Job Title</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Expense Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Submit Date</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          size="md"
                          imageUrl={getProfileImageUrl(item.employee)}
                          fullName={item.employee?.full_name}
                          firstName={item.employee?.first_name}
                          lastName={item.employee?.last_name}
                        />
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            {item.employee?.full_name || '-'}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {item.employee?.employee_id || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-xs font-medium text-gray-900">
                        {item.employee?.designation || '-'}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {item.employee?.department?.name || '-'}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-600">
                      {formatReimbursementExpenseType(
                        item.type ?? item.details?.type ?? item.record?.type
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-600">
                      {item.request_date || item.details?.request_date
                        ? new Date(
                            item.request_date || item.details?.request_date
                          ).toLocaleDateString('en-GB')
                        : '-'}
                    </td>
                    <td className="py-4 px-4 text-xs font-medium text-gray-900">
                      {formatReimbursementAmount(
                        item.amount ?? item.details?.amount ?? item.record?.amount
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs text-gray-600">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString('en-GB')
                        : '-'}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-3 py-1 bg-[#F8F9FA] rounded-md text-xs text-gray-600 block w-fit truncate max-w-[120px]">
                        {item.reason}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(item.status)}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(item)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-[#FBD9CC] text-gray-700"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-gray-400 text-sm">
                    {loading ? 'Loading...' : 'No reimbursement requests found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Show</span>
              <select
                value={pagination.limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm font-medium text-gray-600">
                of {pagination.total} results
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(Math.max(pagination.page - 1, 1))}
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              {renderPaginationButtons()}
              <button
                type="button"
                disabled={
                  pagination.page === pagination.total_pages ||
                  pagination.total_pages === 0
                }
                onClick={() =>
                  handlePageChange(
                    Math.min(pagination.page + 1, pagination.total_pages || 1)
                  )
                }
                className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <RequestDetailsModal
        open={!!selected}
        type={selected?.type}
        data={selected?.data}
        onClose={handleCloseModal}
        onApprove={handleApprove}
        onReject={handleReject}
        onCancel={handleCancel}
        loading={actionLoading}
      />
    </div>
  );
};

export default Reimbursements;
