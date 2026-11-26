import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  UserCheck,
  Frown,
  Palmtree,
  Filter,
  Search,
  Check,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  format,
  parseISO
} from 'date-fns';
import { getLeaveDashboard, getLeaveActivity, updateLeaveStatus } from '../../api/leave/index';
import { useLayout } from '../../context/LayoutContext';
import DateRangeDropdown, { buildRangeFromPreset, getRangeParams } from '../common/DateRangeDropdown';
import UserAvatar from '../common/UserAvatar';
import { getProfileImageUrl } from '../../utils/userAvatar';

const LeaveManagement = () => {
  // State Management
  const [dashboardData, setDashboardData] = useState(null);
  const [leaveActivity, setLeaveActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  // eslint-disable-next-line no-unused-vars
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 2, 18)); // Focus date
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [actionLoading, setActionLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const statusFilter = 'APPROVED';
  const [dateFilter, setDateFilter] = useState(() => buildRangeFromPreset('today'));
  const { setHeaderConfig } = useLayout();

  useEffect(() => {
    setHeaderConfig({
      title: "Leave Management",
      breadcrumb: [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Leave Management', path: '/leave-management', active: true }
      ],
      onBack: null
    });
  }, [setHeaderConfig])
  // Fetch Dashboard Data
  useEffect(() => {
    fetchDashboardData();
  }, [currentDate, dateFilter]);

  // Fetch Leave Activity
  useEffect(() => {
    fetchLeaveActivity();
  }, [page, limit, searchQuery, dateFilter]);

  useEffect(() => {
    if (!dateFilter?.toDate) return;
    setCurrentDate(new Date(dateFilter.toDate));
  }, [dateFilter]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // const month = currentDate.getMonth() + 1;
      // const year = currentDate.getFullYear();
      const data = await getLeaveDashboard({
        // month,
        // year,
        ...getRangeParams(dateFilter)
      });
      setDashboardData(data);

      // Set selected date to focus_date from API
      if (data.focus_date) {
        setSelectedDate(parseISO(data.focus_date));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveActivity = async () => {
    try {
      const data = await getLeaveActivity({
        page,
        limit,
        ...getRangeParams(dateFilter),
        search: searchQuery || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter
      });
      setLeaveActivity(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotalResults(data.total || 0);
    } catch (error) {
      console.error('Error fetching leave activity:', error);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    if (!id) return;
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await updateLeaveStatus(id, { status });
      toast.success(`Leave ${status === 'APPROVED' ? 'approved' : 'rejected'}`);
      fetchLeaveActivity();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update leave status');
      console.error(error);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };


  

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const parsed = parseISO(dateStr);
    if (Number.isNaN(parsed.getTime())) return '-';
    return format(parsed, 'dd MMM yyyy');
  };

  if (loading) {
    return (
      <div className="bg-[#F8F9FA] min-h-screen p-8 font-inter">

        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  const summary = dashboardData?.summary_today || {};
  const leaveTypes = (dashboardData?.summary_today?.by_type || []).map((type) => ({
    ...type,
    count: Number(type?.count || 0),
    percentage: Number(type?.percentage || 0)
  }));
  const typeBreakdownMap = new Map(
    (dashboardData?.types_breakdown || []).map((type) => [String(type?.id || ''), type])
  );

  return (
    <div className="bg-[#F8F9FA] min-h-screen p-6 font-inter">



      {/* Top Row: Summary Cards */}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">

        {/* Card 1: Total On Leave */}
        <div className="bg-[#FBD9CC] rounded-2xl p-4 min-h-[146px] flex flex-col justify-between transition-transform hover:scale-[1.02] duration-300">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-[#EB4000] rounded-lg">
                <CalendarIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-[10px] font-bold text-gray-700 leading-tight">
                Total On Leave
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <h3 className="text-4xl font-bold text-[#1E1E1E]">
                {summary.total_on_leave || 0}
              </h3>
              <span className="text-xs text-gray-600">Employees</span>
            </div>
          </div>
          <div className="mt-1">
            <span className="text-[10px] font-bold text-[#1E1E1E]">
              {summary.percentage_on_leave?.toFixed(1) || 0}%
            </span>
            <span className="text-[9px] text-gray-600 ml-1">from total employee</span>
          </div>
        </div>

        {/* Leave Types (Dynamic) */}
        {leaveTypes.map((type, index) => {
          const iconSet = [UserCheck, Frown, Palmtree, CalendarIcon, Filter];
          const Icon = iconSet[index % iconSet.length];
          const typeBreakdown = typeBreakdownMap.get(String(type?.id || '')) || null;
          const typeEmployeeCount = Number(type?.count ?? typeBreakdown?.employee_count ?? 0);
          const typePercentage = Number(type?.percentage ?? typeBreakdown?.percentage ?? 0);

          return (
            <div
              key={type?.id || `${type?.name || 'leave-type'}-${index}`}
              className="bg-white rounded-2xl p-4 min-h-[146px] flex flex-col justify-between shadow-sm transition-transform hover:scale-[1.02] duration-300"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-[#FFF4F0] rounded-lg">
                    <Icon className="w-6 h-6 text-[#EB4000]" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500">
                    {type?.name || '-'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                  <h3 className="text-4xl font-bold text-[#1E1E1E]">
                    {typeEmployeeCount}
                  </h3>
                  <span className="text-xs text-gray-400">Employees</span>
                </div>
              </div>
              <div className="mt-1">
                <span className="bg-[#FFF4F0] px-1 rounded text-[10px] font-bold text-[#1E1E1E]">
                  {typePercentage.toFixed(1)}%
                </span>
                <span className="text-[9px] text-gray-400 ml-1">of total leave</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leave Activity Table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">Approved Leaves</h2>
          <div className="flex gap-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search employee, ID, etc"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9 pr-4 py-2 bg-[#F8F9FA] rounded-xl text-sm w-64 focus:outline-none focus:ring-1 ring-[#EB4000]"
              />
            </div>
            <DateRangeDropdown
              value={dateFilter}
              onApply={(next) => {
                setDateFilter(next);
                setPage(1);
              }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
                <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Job Title</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Submit Date</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 rounded-r-xl">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leaveActivity.length > 0 ? (
                leaveActivity.map((item) => (
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
                      {item.details?.leave_type_name || '-'}
                    </td>

                    <td className="py-4 px-4 text-xs text-gray-600">
                      {formatDate(item.created_at)}
                    </td>

                    <td className="py-4 px-4 text-xs text-gray-600">
                      {formatDate(item.details?.start_date)}
                      {item.details?.start_date !== item.details?.end_date &&
                        ` - ${formatDate(item.details?.end_date)}`}
                    </td>

                    <td className="py-4 px-4 text-xs text-gray-600">
                      {item.record?.total_days ?? 0} Days
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-3 py-1 bg-[#F8F9FA] rounded-md text-xs text-gray-600 block w-fit truncate max-w-[120px]">
                        {item.reason}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      {String(item.status || '').toUpperCase() === "APPROVED" ? (
                        <span className="bg-[#EB4000] text-white px-3 py-1 rounded-full text-xs font-medium">
                          Approved
                        </span>
                      ) : String(item.status || '').toUpperCase() === "REJECTED" ? (
                        <span className="bg-[#F3495D] text-white px-3 py-1 rounded-full text-xs font-medium">
                          Rejected
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatusUpdate(item.id, "APPROVED")}
                            disabled={actionLoading[item.id]}
                            className="bg-[#FBD9CC] text-[#1E1E1E] px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 disabled:opacity-60"
                          >
                            <Check className="w-3 h-3" /> {actionLoading[item.id] ? 'Updating...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(item.id, "REJECTED")}
                            disabled={actionLoading[item.id]}
                            className="bg-[#FBD9CC] text-[#1E1E1E] w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-60"
                            title="Reject"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-gray-400 text-sm">
                    No leave activity found
                  </td>
                </tr>
              )}
            </tbody>


          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Show</span>
            <select
              className="bg-[#F8F9FA] border-none rounded-lg py-1 px-2 text-gray-700 font-medium"
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            >
              <option>10</option>
              <option>20</option>
              <option>50</option>
            </select>
            <span>of {totalResults} results</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F8F9FA] text-gray-400 disabled:opacity-50"
            >
              &lt;
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg ${page === p
                  ? 'bg-[#EB4000] text-white font-bold'
                  : 'bg-[#F8F9FA] text-gray-600'
                  }`}
              >
                {p}
              </button>
            ))}
            {totalPages > 5 && (
              <>
                <span className="flex items-end px-1 text-gray-400">...</span>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F8F9FA] text-gray-600">
                  {totalPages}
                </button>
              </>
            )}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#F8F9FA] text-gray-600 disabled:opacity-50"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagement;

