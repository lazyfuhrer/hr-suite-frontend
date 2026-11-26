import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useLayout } from '../context/LayoutContext';
import RequestDetailsModal from '../components/requests/RequestDetailsModal';
import DateRangeDropdown, { getRangeParams } from '../components/common/DateRangeDropdown';
import {
  getRequestsCombined,
  getLeaveRequests,
  getAttendanceRequests,
  getWfhRequestById,
  updateLeaveRequestStatus,
  updateAttendanceRequestStatus,
  updateReimbursementRequestStatus,
  updateWfhRequestStatus
} from '../api/requests';
import UserAvatar from '../components/common/UserAvatar';
import { getProfileImageUrl } from '../utils/userAvatar';
import { formatReimbursementExpenseType } from '../utils/reimbursementType';

const RequestsApprovals = () => {
  const { setHeaderConfig } = useLayout();
  const [activeTab, setActiveTab] = useState('All');
  const [combinedData, setCombinedData] = useState(null);
  const [leaveData, setLeaveData] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tabPagination, setTabPagination] = useState({
    All: { total: 0, total_pages: 1, page: 1, limit: 10 },
    Leaves: { total: 0, total_pages: 1, page: 1, limit: 10 },
    Attendance: { total: 0, total_pages: 1, page: 1, limit: 10 }
  });
  const [tabDateFilters, setTabDateFilters] = useState({
    All: null,
    Leaves: null,
    Attendance: null
  });
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    setHeaderConfig({
      title: "Requests & Approvals",
      breadcrumb: [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Requests & Approvals', path: '/requests-approvals', active: true }
      ],
      onBack: null
    });
  }, [setHeaderConfig]);

  useEffect(() => {
    if (activeTab === 'All') fetchCombined();
    if (activeTab === 'Leaves') fetchLeaves();
    if (activeTab === 'Attendance') fetchAttendance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, tabDateFilters, statusFilter]);

  const fetchCombined = async (overrides = {}) => {
    setLoading(true);
    try {
      const page = overrides.page ?? tabPagination.All.page;
      const limit = overrides.limit ?? tabPagination.All.limit;
      const rangeParams = tabDateFilters.All ? getRangeParams(tabDateFilters.All) : {};
      const res = await getRequestsCombined({
        page,
        limit,
        ...rangeParams,
        status: statusFilter === 'ALL' ? undefined : statusFilter
      });
      setCombinedData(res);
      setTabPagination((prev) => ({
        ...prev,
        All: {
          ...prev.All,
          page: res.page ?? prev.All.page,
          limit: res.limit ?? prev.All.limit,
          total: res.total ?? 0,
          total_pages: res.total_pages ?? 1
        }
      }));
    } catch (error) {
      toast.error('Failed to load requests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaves = async (overrides = {}) => {
    setLoading(true);
    try {
      const page = overrides.page ?? tabPagination.Leaves.page;
      const limit = overrides.limit ?? tabPagination.Leaves.limit;
      const rangeParams = tabDateFilters.Leaves ? getRangeParams(tabDateFilters.Leaves) : {};
      const res = await getLeaveRequests({
        page,
        limit,
        ...rangeParams,
        status: statusFilter === 'ALL' ? undefined : statusFilter
      });
      setLeaveData(res);
      setTabPagination((prev) => ({
        ...prev,
        Leaves: {
          ...prev.Leaves,
          page: res.page ?? prev.Leaves.page,
          limit: res.limit ?? prev.Leaves.limit,
          total: res.total ?? 0,
          total_pages: res.total_pages ?? 1
        }
      }));
    } catch (error) {
      toast.error('Failed to load leave requests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (overrides = {}) => {
    setLoading(true);
    try {
      const page = overrides.page ?? tabPagination.Attendance.page;
      const limit = overrides.limit ?? tabPagination.Attendance.limit;
      const rangeParams = tabDateFilters.Attendance ? getRangeParams(tabDateFilters.Attendance) : {};
      const res = await getAttendanceRequests({
        page,
        limit,
        ...rangeParams,
        status: statusFilter === 'ALL' ? undefined : statusFilter
      });
      setAttendanceData(res);
      setTabPagination((prev) => ({
        ...prev,
        Attendance: {
          ...prev.Attendance,
          page: res.page ?? prev.Attendance.page,
          limit: res.limit ?? prev.Attendance.limit,
          total: res.total ?? 0,
          total_pages: res.total_pages ?? 1
        }
      }));
    } catch (error) {
      toast.error('Failed to load attendance requests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = async (type, data) => {
    const normalizedType = String(type || '').toUpperCase();
    setSelected({ type: normalizedType, data });
    if (normalizedType === 'WFH' && data?.id) {
      try {
        const detail = await getWfhRequestById(data.id);
        setSelected((prev) =>
          prev?.data?.id === data.id && prev?.type === 'WFH'
            ? { type: 'WFH', data: { ...data, ...detail } }
            : prev
        );
      } catch (error) {
        console.error(error);
      }
    }
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
    if (!selected) return;
    const payload = buildStatusPayload('APPROVED', note);
    setActionLoading(true);
    try {
      if (selected.type === 'LEAVE') {
        await updateLeaveRequestStatus(selected.data.id, payload);
        await fetchLeaves();
      } else if (selected.type === 'REIMBURSEMENT') {
        await updateReimbursementRequestStatus(selected.data.id, payload);
      } else if (selected.type === 'WFH') {
        await updateWfhRequestStatus(selected.data.id, payload);
      } else if (selected.type === 'ATTENDANCE') {
        await updateAttendanceRequestStatus(selected.data.id, payload);
        await fetchAttendance();
      } else {
        return;
      }
      await fetchCombined();
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
    if (!selected) return;
    const payload = buildStatusPayload('REJECTED', note);
    setActionLoading(true);
    try {
      if (selected.type === 'LEAVE') {
        await updateLeaveRequestStatus(selected.data.id, payload);
        await fetchLeaves();
      } else if (selected.type === 'REIMBURSEMENT') {
        await updateReimbursementRequestStatus(selected.data.id, payload);
      } else if (selected.type === 'WFH') {
        await updateWfhRequestStatus(selected.data.id, payload);
      } else if (selected.type === 'ATTENDANCE') {
        await updateAttendanceRequestStatus(selected.data.id, payload);
        await fetchAttendance();
      } else {
        return;
      }
      await fetchCombined();
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
    if (!selected) return;
    const payload = buildStatusPayload('CANCELLED', note);
    setActionLoading(true);
    try {
      if (selected.type === 'LEAVE') {
        await updateLeaveRequestStatus(selected.data.id, payload);
        await fetchLeaves();
      } else if (selected.type === 'REIMBURSEMENT') {
        await updateReimbursementRequestStatus(selected.data.id, payload);
      } else if (selected.type === 'ATTENDANCE') {
        await updateAttendanceRequestStatus(selected.data.id, payload);
        await fetchAttendance();
      } else if (selected.type === 'WFH') {
        await updateWfhRequestStatus(selected.data.id, payload);
      } else {
        return;
      }
      await fetchCombined();
      toast.success('Request cancelled');
      handleCloseModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to cancel request');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const activeItems = useMemo(() => {
    if (activeTab === 'Leaves') return leaveData?.items || [];
    if (activeTab === 'Attendance') return attendanceData?.items || [];
    return combinedData?.items || [];
  }, [activeTab, attendanceData?.items, combinedData?.items, leaveData?.items]);

  const pendingCount = useMemo(() => {
    return activeItems.filter((r) => String(r.status || '').toUpperCase() === 'PENDING').length;
  }, [activeItems]);

  const attentionCount = useMemo(() => {
    return activeItems.filter((r) => String(r.status || '').toUpperCase() === 'REJECTED').length;
  }, [activeItems]);

  const statusBadgeClass = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'APPROVED') return 'bg-emerald-50 text-emerald-700';
    if (normalized === 'REJECTED') return 'bg-[#F3495D] text-white';
    if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'bg-gray-100 text-gray-600';
    return 'bg-gray-100 text-gray-600';
  };

  const handlePageChange = (tabKey, nextPage) => {
    setTabPagination((prev) => ({
      ...prev,
      [tabKey]: {
        ...prev[tabKey],
        page: nextPage
      }
    }));
    if (tabKey === 'All') fetchCombined({ page: nextPage });
    if (tabKey === 'Leaves') fetchLeaves({ page: nextPage });
    if (tabKey === 'Attendance') fetchAttendance({ page: nextPage });
  };

  const handleLimitChange = (tabKey, nextLimit) => {
    setTabPagination((prev) => ({
      ...prev,
      [tabKey]: {
        ...prev[tabKey],
        limit: nextLimit,
        page: 1
      }
    }));
    if (tabKey === 'All') fetchCombined({ page: 1, limit: nextLimit });
    if (tabKey === 'Leaves') fetchLeaves({ page: 1, limit: nextLimit });
    if (tabKey === 'Attendance') fetchAttendance({ page: 1, limit: nextLimit });
  };

  const renderPaginationButtons = (tabKey) => {
    const { page, total_pages } = tabPagination[tabKey];
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
      p === '...'
        ? (
          <span key={`${tabKey}-dots-${idx}`} className="px-2 text-gray-400 text-xs">
            ...
          </span>
          )
        : (
          <button
            key={p}
            type="button"
            onClick={() => handlePageChange(tabKey, p)}
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

  const tabs = ['All', 'Leaves', 'Attendance'];

  return (
    <div className="bg-[#F8F9FA] min-h-screen p-6">
      <div className="bg-white rounded-2xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF4F0] flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-[#EB4000]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Requests & Approvals</h2>
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

      <div className="bg-white rounded-2xl p-2 flex gap-2 mt-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${activeTab === tab ? 'bg-[#EB4000] text-white' : 'bg-[#F8F9FA] text-gray-600'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm mt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">
            {activeTab === 'Leaves'
              ? 'Leave Activity'
              : activeTab === 'Attendance'
                ? 'Attendance Activity'
                : 'All Requests'}
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setTabPagination((prev) => ({
                  ...prev,
                  [activeTab]: {
                    ...prev[activeTab],
                    page: 1
                  }
                }));
              }}
              className="px-4 py-2 bg-[#F8F9FA] rounded-xl text-sm font-medium text-gray-700 border border-gray-100 appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-1 ring-[#EB4000]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <DateRangeDropdown
              value={tabDateFilters[activeTab]}
              onApply={(next) => {
                setTabDateFilters((prev) => ({ ...prev, [activeTab]: next }));
                setTabPagination((prev) => ({
                  ...prev,
                  [activeTab]: {
                    ...prev[activeTab],
                    page: 1
                  }
                }));
              }}
            />
          </div>
        </div>

        {activeTab === 'All' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
                  <th className="py-3 px-4 rounded-l-xl">Type</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Summary</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(combinedData?.items || []).length > 0 ? (
                  (combinedData?.items || []).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4 text-xs font-medium text-gray-700">{item.request_type || '-'}</td>
                      <td className="py-4 px-4 text-xs text-gray-600">{item.employee?.full_name || '-'}</td>
                      <td className="py-4 px-4 text-xs text-gray-600">
                        {item.request_type === 'REIMBURSEMENT'
                          ? `${formatReimbursementExpenseType(item.type ?? item.details?.type ?? item.record?.type)} — ${item.reason || '-'}`
                          : item.request_type === 'WFH'
                            ? `${item.start_date || item.details?.start_date
                              ? new Date(item.start_date || item.details?.start_date).toLocaleDateString('en-GB')
                              : '-'} - ${item.end_date || item.details?.end_date
                              ? new Date(item.end_date || item.details?.end_date).toLocaleDateString('en-GB')
                              : '-'} (${item.total_days ?? item.record?.total_days ?? 0}d) — ${item.reason || '-'}`
                            : item.reason || '-'}
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600">
                        {item.created_at ? new Date(item.created_at).toLocaleString('en-GB') : '-'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleOpenModal(item.request_type, item)}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-[#FBD9CC] text-gray-700"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-gray-400 text-sm">
                      {loading ? 'Loading...' : 'No requests found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Show</span>
                <select
                  value={tabPagination.All.limit}
                  onChange={(e) => handleLimitChange('All', Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm font-medium text-gray-600">
                  of {tabPagination.All.total} results
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={tabPagination.All.page === 1}
                  onClick={() => handlePageChange('All', Math.max(tabPagination.All.page - 1, 1))}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                {renderPaginationButtons('All')}
                <button
                  type="button"
                  disabled={tabPagination.All.page === tabPagination.All.total_pages || tabPagination.All.total_pages === 0}
                  onClick={() => handlePageChange('All', Math.min(tabPagination.All.page + 1, tabPagination.All.total_pages || 1))}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Leaves' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
                  <th className="py-3 px-4 rounded-l-xl">Name</th>
                  <th className="py-3 px-4">Job Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Submit Date</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(leaveData?.items || []).length > 0 ? (
                  (leaveData?.items || []).map((item) => (
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
                        <div>
                          <p className="text-xs font-medium text-gray-900">
                            {item.employee?.designation || '-'}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {item.employee?.department?.name || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-medium text-gray-700">
                        {item.details?.leave_type_name || item.leave_type?.name || '-'}
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600">
                        {item.details?.start_date ? new Date(item.details.start_date).toLocaleDateString('en-GB') : '-'}
                        {item.details?.end_date && item.details.end_date !== item.details.start_date
                          ? ` - ${new Date(item.details.end_date).toLocaleDateString('en-GB')}`
                          : ''}
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600">{item.record?.total_days ? `${item.record.total_days} Days` : '-'}</td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 bg-[#F8F9FA] rounded-md text-xs text-gray-600 block w-fit truncate max-w-[120px]">
                          {item.reason}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleOpenModal('LEAVE', item)}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-[#FBD9CC] text-gray-700"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="py-10 text-center text-gray-400 text-sm">
                      {loading ? 'Loading...' : 'No leave requests found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Show</span>
                <select
                  value={tabPagination.Leaves.limit}
                  onChange={(e) => handleLimitChange('Leaves', Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm font-medium text-gray-600">
                  of {tabPagination.Leaves.total} results
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={tabPagination.Leaves.page === 1}
                  onClick={() => handlePageChange('Leaves', Math.max(tabPagination.Leaves.page - 1, 1))}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                {renderPaginationButtons('Leaves')}
                <button
                  type="button"
                  disabled={tabPagination.Leaves.page === tabPagination.Leaves.total_pages || tabPagination.Leaves.total_pages === 0}
                  onClick={() => handlePageChange('Leaves', Math.min(tabPagination.Leaves.page + 1, tabPagination.Leaves.total_pages || 1))}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Attendance' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
                  <th className="py-3 px-4 rounded-l-xl">Name</th>
                  <th className="py-3 px-4">Job Title</th>
                  <th className="py-3 px-4">Request Date</th>
                  <th className="py-3 px-4">Wrong Punch</th>
                  <th className="py-3 px-4">Corrected Time</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(attendanceData?.items || []).length > 0 ? (
                  (attendanceData?.items || []).map((item) => (
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
                        <div>
                          <p className="text-xs font-medium text-gray-900">
                            {item.employee?.designation || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600">
                        {item.request_date ? new Date(item.request_date).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600">{item.wrong_punch_type || '-'}</td>
                      <td className="py-4 px-4 text-xs text-gray-600">{item.corrected_time || '-'}</td>
                      <td className="py-4 px-4">
                        <span className="px-3 py-1 bg-[#F8F9FA] rounded-md text-xs text-gray-600 block w-fit truncate max-w-[120px]">
                          {item.reason}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleOpenModal('ATTENDANCE', item)}
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
                      {loading ? 'Loading...' : 'No attendance requests found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Show</span>
                <select
                  value={tabPagination.Attendance.limit}
                  onChange={(e) => handleLimitChange('Attendance', Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm font-medium text-gray-600">
                  of {tabPagination.Attendance.total} results
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={tabPagination.Attendance.page === 1}
                  onClick={() => handlePageChange('Attendance', Math.max(tabPagination.Attendance.page - 1, 1))}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                {renderPaginationButtons('Attendance')}
                <button
                  type="button"
                  disabled={tabPagination.Attendance.page === tabPagination.Attendance.total_pages || tabPagination.Attendance.total_pages === 0}
                  onClick={() => handlePageChange('Attendance', Math.min(tabPagination.Attendance.page + 1, tabPagination.Attendance.total_pages || 1))}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}
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

export default RequestsApprovals;
