import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useLayout } from '../../context/LayoutContext';
import { getAdminCardsSummary, getAttendanceDashboard, getAttendanceEmployees } from '../../api/attendance';
import { getUpcomingBirthdays } from '../../api/emoloyees/addEmployees';
import DateRangeDropdown, { buildRangeFromPreset, getRangeParams } from '../common/DateRangeDropdown';
import UserAvatar from '../common/UserAvatar';
import { getProfileImageUrl } from '../../utils/userAvatar';

const DASHBOARD_ATTENDANCE_PARAMS = {
  page: 1,
  limit: 10,
  status: 'ALL',
  sort_by: 'NAME',
  sort_dir: 'ASC'
};

const KNOWN_STATUSES = ['ON_TIME', 'LATE', 'ON_LEAVE', 'HALF_DAY', 'ABSENT'];

const Dashboard = () => {
  const { setHeaderConfig } = useLayout();
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceLimit, setAttendanceLimit] = useState(10);
  const [attendancePagination, setAttendancePagination] = useState({ total: 0, total_pages: 1 });
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceSummaryToday, setAttendanceSummaryToday] = useState(null);
  const [attendanceSummaryLoading, setAttendanceSummaryLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [appliedFilter, setAppliedFilter] = useState(() => buildRangeFromPreset('today'));
  const [cardsData, setCardsData] = useState({
    totalEmployees: 0,
    attendancePercentage: 0,
    daysOffCount: 0,
    lateArrivalCount: 0,
    approvedLeaveCount: 0,
    pendingReviewCount: 0
  });
  const [birthdaysLoading, setBirthdaysLoading] = useState(true);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);

  const formatDepartments = (department) => {
    const deptArray = Array.isArray(department)
      ? department
      : department
        ? [department]
        : [];

    const names = deptArray.map((d) => d?.name).filter(Boolean);
    return names.length ? names.join(', ') : '-';
  };

  const getGreetingByTime = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const resolveStatus = (item) => {
    const rawStatus = String(item?.status || '').toUpperCase();

    if (rawStatus === 'LEAVE') return 'ON_LEAVE';
    if (KNOWN_STATUSES.includes(rawStatus)) return rawStatus;

    if (item?.clock_in_time || item?.clock_out_time) {
      return Number(item?.late_by_minutes || 0) > 0 ? 'LATE' : 'ON_TIME';
    }

    return 'ABSENT';
  };

  useEffect(() => {
    const applyGreetingTitle = () => {
      setHeaderConfig((prev) => ({
        ...prev,
        title: getGreetingByTime(),
        breadcrumb: [{ label: 'Dashboard', path: '/dashboard', active: true }],
        onBack: null
      }));
    };

    applyGreetingTitle();

    const interval = setInterval(applyGreetingTitle, 60 * 1000); // every minute
    return () => clearInterval(interval);
  }, [setHeaderConfig]);

  useEffect(() => {
    const fetchCardsSummary = async () => {
      setCardsLoading(true);
      try {
        const res = await getAdminCardsSummary(getRangeParams(appliedFilter));
        const cards = res?.cards || {};
        const attendance = cards?.attendance || {};
        const leaveRequests = cards?.leave_requests || {};

        setCardsData({
          totalEmployees: cards?.total_employees?.value ?? 0,
          attendancePercentage: attendance?.percentage ?? 0,
          daysOffCount: attendance?.days_off_count ?? 0,
          lateArrivalCount: attendance?.late_arrival_count ?? 0,
          approvedLeaveCount: leaveRequests?.approved_count ?? 0,
          pendingReviewCount: leaveRequests?.pending_review_count ?? 0
        });
      } catch (error) {
        console.error('Failed to load dashboard cards summary:', error);
        setCardsData({
          totalEmployees: 0,
          attendancePercentage: 0,
          daysOffCount: 0,
          lateArrivalCount: 0,
          approvedLeaveCount: 0,
          pendingReviewCount: 0
        });
      } finally {
        setCardsLoading(false);
      }
    };

    fetchCardsSummary();
  }, [appliedFilter]);

  useEffect(() => {
    const fetchAttendanceSummary = async () => {
      setAttendanceSummaryLoading(true);
      try {
        const rangeParams = getRangeParams(appliedFilter);
        const res = await getAttendanceDashboard({
          ...rangeParams,
          date: rangeParams?.to_date,
        });
        setAttendanceSummaryToday(res?.summary_today || null);
      } catch (error) {
        console.error('Failed to load attendance summary:', error);
        setAttendanceSummaryToday(null);
      } finally {
        setAttendanceSummaryLoading(false);
      }
    };
    fetchAttendanceSummary();
  }, [appliedFilter]);

  useEffect(() => {
    const fetchAttendance = async () => {
      setAttendanceLoading(true);
      try {
        const params = {
          ...DASHBOARD_ATTENDANCE_PARAMS,
          page: attendancePage,
          limit: attendanceLimit,
          ...getRangeParams(appliedFilter)
        };
        const res = await getAttendanceEmployees(params);
        const rows = (res?.data || []).map((row) => ({
          ...row,
          status: resolveStatus(row)
        }));
        setAttendanceRows(rows);
        setAttendancePagination({
          total: Number(res?.total || 0),
          total_pages: Number(res?.total_pages || 1)
        });
      } catch (error) {
        console.error('Failed to load dashboard attendance:', error);
        setAttendanceRows([]);
        setAttendancePagination({ total: 0, total_pages: 1 });
      } finally {
        setAttendanceLoading(false);
      }
    };

    fetchAttendance();
  }, [appliedFilter, attendancePage, attendanceLimit]);

  useEffect(() => {
    setAttendancePage(1);
  }, [appliedFilter]);

  useEffect(() => {
    const fetchUpcomingBirthdays = async () => {
      setBirthdaysLoading(true);
      try {
        const res = await getUpcomingBirthdays({ days: 30, limit: 10 });
        setUpcomingBirthdays(Array.isArray(res?.items) ? res.items : []);
      } catch (error) {
        console.error('Failed to load upcoming birthdays:', error);
        setUpcomingBirthdays([]);
      } finally {
        setBirthdaysLoading(false);
      }
    };

    fetchUpcomingBirthdays();
  }, []);

  const todaysBirthdays = useMemo(
    () => upcomingBirthdays.filter((item) => Number(item?.days_until) === 0),
    [upcomingBirthdays]
  );

  const birthdayPreview = useMemo(
    () => upcomingBirthdays.slice(0, 3),
    [upcomingBirthdays]
  );

  const formatBirthdayLabel = (daysUntil) => {
    const days = Number(daysUntil);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (Number.isFinite(days) && days > 1) return `in ${days} days`;
    return '-';
  };

  const attendanceStats = useMemo(() => {
    const present = attendanceSummaryToday?.present || {};
    const onLeave = attendanceSummaryToday?.on_leave || {};
    const onHalfDay = attendanceSummaryToday?.on_halfday || {};
    const absent = attendanceSummaryToday?.absent || {};
    return {
      onTime: Number(present?.on_time ?? 0),
      late: Number(present?.late ?? 0),
      presentCount: Number(present?.count ?? 0),
      halfDayWorkedCount: Number(present?.half_day_worked_count ?? 0),
      onLeave: Number(onLeave?.count ?? 0),
      onHalfDay: Number(onHalfDay?.count ?? 0),
      absent: Number(absent?.count ?? 0),
    };
  }, [attendanceSummaryToday]);

  const formatStatusLabel = (status) => {
    switch (status) {
      case 'ON_TIME':
        return 'On-Time';
      case 'LATE':
        return 'Late';
      case 'ON_LEAVE':
        return 'On Leave';
      case 'HALF_DAY':
        return 'Half Day';
      case 'ABSENT':
        return 'Absent';
      default:
        return status || 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ON_TIME':
        return 'bg-orange-500 text-white';
      case 'LATE':
        return 'bg-orange-200 text-orange-900';
      case 'ON_LEAVE':
        return 'bg-gray-200 text-gray-700';
      case 'HALF_DAY':
        return 'bg-amber-100 text-amber-900';
      case 'ABSENT':
        return 'bg-red-900 text-white';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  const renderAttendanceStatus = (row) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
        {formatStatusLabel(row.status)}
      </span>
      {row.is_on_halfday_leave && ['ON_TIME', 'LATE'].includes(row.status) && (
        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
          Half Day
        </span>
      )}
    </div>
  );

  const formatDate = (date) => {
    if (!date) return '-' ;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const buildMapUrl = (latitude, longitude) => {
    const hasLat = latitude !== null && latitude !== undefined && `${latitude}`.trim() !== '' && `${latitude}`.toLowerCase() !== 'null';
    const hasLng = longitude !== null && longitude !== undefined && `${longitude}`.trim() !== '' && `${longitude}`.toLowerCase() !== 'null';
    if (!hasLat || !hasLng) return null;
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  const renderTimeWithMap = (time, latitude, longitude, title) => {
    const mapUrl = buildMapUrl(latitude, longitude);
    return (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-900">{time || '-'}</span>
        {mapUrl ? (
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            title={title}
            className="w-8 h-8 rounded-lg bg-[#F3F4F6] text-gray-600 border border-gray-200 inline-flex items-center justify-center hover:bg-gray-100"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : null}
      </div>
    );
  };

  const renderClockOutInfo = (time, latitude, longitude, clockOutType) => {
    const normalizedType = String(clockOutType || '').toUpperCase();

    if (normalizedType === 'SELF' || normalizedType === '') {
      return renderTimeWithMap(time, latitude, longitude, 'Open clock-out location');
    }

    if (normalizedType === 'SYSTEM' || normalizedType === 'REGULARIZED') {
      const label = normalizedType === 'SYSTEM' ? 'System' : 'Regularized';
      return (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-900">{time || '-'}</span>
          <span className="inline-flex w-fit rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
            {label}
          </span>
        </div>
      );
    }

    return <span className="text-sm font-medium text-gray-900">{time || '-'}</span>;
  };

  const renderAttendancePaginationButtons = () => {
    const totalPages = attendancePagination.total_pages || 1;
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    } else {
      pages.push(1);
      if (attendancePage > 3) pages.push('...');
      const start = Math.max(2, attendancePage - 1);
      const end = Math.min(totalPages - 1, attendancePage + 1);
      for (let i = start; i <= end; i += 1) pages.push(i);
      if (attendancePage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages.map((p, idx) => (
      p === '...'
        ? <span key={`dash-dots-${idx}`} className="px-2 text-gray-400">...</span>
        : (
          <button
            key={p}
            onClick={() => setAttendancePage(p)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm ${
              attendancePage === p
                ? 'bg-[var(--brand-primary)] text-white'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        )
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-[1400px] mx-auto">
        {todaysBirthdays.length > 0 && (
          <div className="bg-[var(--brand-soft)] rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-gray-800 mb-3">
              Happy Birthday{todaysBirthdays.length > 1 ? 's' : ''} today!
            </p>
            <div className="flex flex-wrap gap-4">
              {todaysBirthdays.map((item) => {
                const user = item?.user || {};
                return (
                  <div key={user.id || item.next_birthday} className="flex items-center gap-3">
                    <UserAvatar
                      size="md"
                      imageUrl={getProfileImageUrl(user)}
                      fullName={user.full_name}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{user.full_name || '-'}</p>
                      <p className="text-xs text-gray-600">
                        {formatDepartments(user.department)}
                        {item.turning_age != null ? ` · Turning ${item.turning_age}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg p-6 shadow-sm transition-transform hover:scale-[1.02] duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-500 text-sm mb-1">Total Employees</p>
                <h2 className="text-4xl font-bold">{cardsLoading ? '-' : cardsData.totalEmployees}</h2>
                <p className="text-gray-400 text-sm">Employees</p>
              </div>
            </div>
            <div className="bg-[var(--brand-soft)] rounded-lg p-3 mt-4">
              <p className="text-sm text-gray-700">
                Track employee count and <span className="font-semibold">growth</span> Trends
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm transition-transform hover:scale-[1.02] duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-500 text-sm mb-1">Attendance</p>
                <h2 className="text-4xl font-bold">
                  {cardsLoading ? '-%' : `${cardsData.attendancePercentage}%`}
                </h2>
                <p className="text-gray-400 text-sm">
                  Present{' '}
                  <span className="text-gray-600">
                    - {cardsLoading ? '-' : cardsData.daysOffCount} Days Off,{' '}
                    {cardsLoading ? '-' : cardsData.lateArrivalCount} Late Arrival
                  </span>
                </p>
              </div>
            </div>
            <div className="bg-[var(--brand-soft)] rounded-lg p-3 mt-4">
              <p className="text-sm text-gray-700">
                Monitor overall <span className="font-semibold">attendance</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm transition-transform hover:scale-[1.02] duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-500 text-sm mb-2">Leave Requests</p>
                <div className="flex items-center gap-2">
                  <h2 className="text-4xl font-bold">{cardsLoading ? '-' : cardsData.approvedLeaveCount}</h2>
                  <span className="text-gray-400 text-sm">Approved</span>
                  <h2 className="text-4xl font-bold ml-2">{cardsLoading ? '-' : cardsData.pendingReviewCount}</h2>
                  <span className="text-gray-400 text-sm">Pending Review</span>
                </div>
              </div>
            </div>
            <div className="bg-[var(--brand-soft)] rounded-lg p-3 mt-8">
              <p className="text-sm text-gray-700">
                Overview of employee <span className="font-semibold">leave</span> activities
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm transition-transform hover:scale-[1.02] duration-300">
            <p className="text-gray-500 text-sm mb-3">Upcoming Birthdays</p>
            {birthdaysLoading ? (
              <p className="text-sm text-gray-400 py-2">-</p>
            ) : birthdayPreview.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No upcoming birthdays</p>
            ) : (
              <ul className="space-y-2.5">
                {birthdayPreview.map((item) => {
                  const user = item?.user || {};
                  return (
                    <li key={user.id || `${user.full_name}-${item.next_birthday}`} className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        size="sm"
                        imageUrl={getProfileImageUrl(user)}
                        fullName={user.full_name}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.full_name || '-'}</p>
                        <p className="text-xs text-gray-500">
                          {formatBirthdayLabel(item.days_until)}
                          {item.next_birthday ? ` · ${formatDate(item.next_birthday)}` : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="bg-[var(--brand-soft)] rounded-lg p-3 mt-4">
              <p className="text-sm text-gray-700">
                Next birthdays in the next <span className="font-semibold">30 days</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Employee Attendance</h3>
              <DateRangeDropdown
                value={appliedFilter}
                onApply={setAppliedFilter}
                buttonClassName="rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex items-center gap-2 md:pr-4 md:border-r md:border-gray-200">
                <h4 className="text-4xl font-bold text-[#243A34]">{attendanceSummaryLoading ? '-' : attendanceStats.onTime}</h4>
                <p className="text-lg text-gray-600">On-Time</p>
              </div>
              <div className="flex items-center gap-2 md:px-4 md:border-r md:border-gray-200">
                <h4 className="text-4xl font-bold text-[#243A34]">{attendanceSummaryLoading ? '-' : attendanceStats.late}</h4>
                <p className="text-lg text-gray-600">Late</p>
              </div>
              <div className="flex items-center gap-2 md:px-4 md:border-r md:border-gray-200">
                <h4 className="text-4xl font-bold text-[#243A34]">{attendanceSummaryLoading ? '-' : attendanceStats.onLeave}</h4>
                <p className="text-lg text-gray-600">On Leave</p>
              </div>
              <div className="flex items-center gap-2 md:px-4 md:border-r md:border-gray-200">
                <h4 className="text-4xl font-bold text-[#243A34]">{attendanceSummaryLoading ? '-' : attendanceStats.onHalfDay}</h4>
                <p className="text-lg text-gray-600">Half Day Leave</p>
              </div>
              <div className="flex items-center gap-2 md:pl-4">
                <h4 className="text-4xl font-bold text-[#243A34]">{attendanceSummaryLoading ? '-' : attendanceStats.absent}</h4>
                <p className="text-lg text-gray-600">Absent</p>
              </div>
            </div>

            {!attendanceSummaryLoading && attendanceStats.halfDayWorkedCount > 0 && (
              <p className="mb-4 text-sm text-gray-500">
                {attendanceStats.presentCount} present (incl. {attendanceStats.halfDayWorkedCount} half-day)
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left py-3 px-3 text-sm font-medium text-gray-500 rounded-l-xl">Name</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-gray-500">Job Title</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-gray-500">Check In</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-gray-500">Check Out</th>
                    <th className="text-left py-3 px-3 text-sm font-medium text-gray-500 rounded-r-xl">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLoading ? (
                    <tr>
                      <td colSpan="6" className="py-8 px-2 text-sm text-gray-500 text-center">Loading attendance...</td>
                    </tr>
                  ) : attendanceRows.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 px-2 text-sm text-gray-500 text-center">No attendance data found.</td>
                    </tr>
                  ) : (
                    attendanceRows.map((row) => (
                      <tr key={row.employee?.id || row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              size="lg"
                              imageUrl={getProfileImageUrl(row.employee)}
                              fullName={row.employee?.full_name}
                              firstName={row.employee?.first_name}
                              lastName={row.employee?.last_name}
                            />
                            <div>
                              <p className="font-medium text-sm">{row.employee?.full_name || '-'}</p>
                              <p className="text-xs text-gray-500">{row.employee?.employee_id || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <p className="font-medium text-sm">{row.employee?.designation || '-'}</p>
                          <p className="text-xs text-gray-500">{formatDepartments(row.employee?.department)}</p>
                        </td>
                        <td className="py-4 px-3 text-sm">{formatDate(row.date)}</td>
                        <td className="py-4 px-3">
                          {renderTimeWithMap(
                            row.clock_in_time,
                            row.clock_in_latitude,
                            row.clock_in_longitude,
                            'Open clock-in location'
                          )}
                        </td>
                        <td className="py-4 px-3">
                          {renderClockOutInfo(
                            row.clock_out_time,
                            row.clock_out_latitude,
                            row.clock_out_longitude ?? row.clock_ot_longitude,
                            row.clock_out_type
                          )}
                        </td>
                        <td className="py-4 px-3">
                          {renderAttendanceStatus(row)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600">Show</span>
                <select
                  value={attendanceLimit}
                  onChange={(e) => { setAttendanceLimit(Number(e.target.value)); setAttendancePage(1); }}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm font-medium text-gray-600">of {attendancePagination.total} results</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  disabled={attendancePage === 1}
                  onClick={() => setAttendancePage((prev) => Math.max(prev - 1, 1))}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                {renderAttendancePaginationButtons()}
                <button
                  disabled={attendancePage === attendancePagination.total_pages || attendancePagination.total_pages === 0}
                  onClick={() => setAttendancePage((prev) => Math.min(prev + 1, attendancePagination.total_pages))}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
