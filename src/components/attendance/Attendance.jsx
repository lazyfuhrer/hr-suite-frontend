import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  downloadAttendanceExcel,
  getAttendanceDashboard,
  getAttendanceEmployees,
} from '../../api/attendance';
import { getDepartments } from '../../api/departments';
import DateRangeDropdown, { buildRangeFromPreset, getRangeParams } from '../common/DateRangeDropdown';
import UserAvatar from '../common/UserAvatar';
import { getProfileImageUrl } from '../../utils/userAvatar';
import { useBranding } from '../../context/BrandingContext';

const Attendance = () => {
  const { branding } = useBranding();
  const hideOt =
    branding?.organization?.display_ot === true || branding?.organization?.display_ot === 'true';
  const [selectedMonth, setSelectedMonth] = useState(6);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('NAME');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortDir] = useState('ASC');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [overview, setOverview] = useState([]);
  const [employeeData, setEmployeeData] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(() => buildRangeFromPreset('today'));
  const [exporting, setExporting] = useState(false);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);

  const formatDepartments = (department) => {
    const deptArray = Array.isArray(department)
      ? department
      : department
        ? [department]
        : [];

    const names = deptArray.map((d) => d?.name).filter(Boolean);
    return names.length ? names.join(', ') : '—';
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await getDepartments();
        const departmentsList = response?.data?.data || response?.data || [];
        setDepartments(Array.isArray(departmentsList) ? departmentsList : []);
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };

    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      setSummaryLoading(true);
      try {
        const rangeParams = getRangeParams(dateFilter);
        const res = await getAttendanceDashboard({
          ...rangeParams,
          date: rangeParams.to_date,
          months: selectedMonth
        });
        setSummary(res?.summary_today || null);
        setOverview(res?.overview?.by_month || []);
      } catch (error) {
        toast.error('Failed to load attendance dashboard');
        console.error(error);
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedMonth, dateFilter]);

  useEffect(() => {
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const params = {
          page,
          limit,
          sort_by: sortBy,
          sort_dir: sortDir,
          ...getRangeParams(dateFilter)
        };

        if (statusFilter.startsWith('LEAVE_SESSION_')) {
          params.status = 'ALL';
          params.leave_session = statusFilter.replace('LEAVE_SESSION_', '');
        } else {
          params.status = statusFilter;
        }

        if (debouncedSearch) params.search = debouncedSearch;
        if (selectedDepartmentId) params.department = selectedDepartmentId;
        const res = await getAttendanceEmployees(params);
        setEmployeeData(res?.data || []);
        setPagination({ total: res?.total || 0, total_pages: res?.total_pages || 1 });
      } catch (error) {
        toast.error('Failed to load attendance list');
        console.error(error);
      } finally {
        setEmployeesLoading(false);
      }
    };
    fetchEmployees();
  }, [page, limit, statusFilter, sortBy, sortDir, debouncedSearch, dateFilter, selectedDepartmentId]);

  const summaryData = useMemo(() => {
    const present = summary?.present || {};
    const onLeave = summary?.on_leave || {};
    const onHalfDay = summary?.on_halfday || {};
    const absent = summary?.absent || {};
    return {
      present: {
        count: present.count ?? 0,
        change: present.change_vs_yesterday ?? 0,
        onTime: present.on_time ?? 0,
        late: present.late ?? 0,
        halfDayWorkedCount: present.half_day_worked_count ?? 0
      },
      onLeave: {
        count: onLeave.count ?? 0,
        change: onLeave.change_vs_yesterday ?? 0,
        types: onLeave.by_type || []
      },
      onHalfDay: {
        count: onHalfDay.count ?? 0,
        change: onHalfDay.change_vs_yesterday ?? 0,
        types: onHalfDay.by_type || []
      },
      absent: {
        count: absent.count ?? 0,
        change: absent.change_vs_yesterday ?? 0
      }
    };
  }, [summary]);

  const attendanceOverview = useMemo(() => {
    return (overview || []).map((m) => {
      const date = new Date(Date.UTC(m.year, m.month - 1, 1));
      const label = date.toLocaleString('en-US', { month: 'short' });
      return {
        label,
        present: m.present_percentage || 0,
        onLeave: m.on_leave_percentage || 0,
        onHalfDay: m.on_halfday_percentage || 0,
        absent: m.absent_percentage || 0
      };
    });
  }, [overview]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'ON_TIME':
        return 'bg-[var(--brand-primary)] text-white';
      case 'LATE':
        return 'bg-[var(--brand-soft-alt)] text-[var(--brand-primary)]';
      case 'ON_LEAVE':
        return 'bg-gray-100 text-gray-600';
      case 'HALF_DAY':
        return 'bg-amber-100 text-amber-900';
      case 'ABSENT':
        return 'bg-[#5C2E1C] text-white';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const renderAttendanceStatus = (row) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold ${getStatusColor(row.status)}`}>
        {formatStatusLabel(row.status)}
      </span>
      {row.is_on_halfday_leave && ['ON_TIME', 'LATE'].includes(row.status) && (
        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
          Half Day
        </span>
      )}
    </div>
  );

  const getWorkModelIcon = () => '●';

  const getWorkModelColor = (model) => {
    if (model === 'REMOTE') return 'text-gray-900';
    if (model === 'ONSITE') return 'text-[var(--brand-primary)]';
    return 'text-gray-400';
  };

  const formatDelta = (value) => {
    if (value === null || value === undefined) return '+0';
    const num = Number(value);
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num}`;
  };

  const formatTypeLabel = (value) => {
    if (!value) return 'Others';
    return value
      .toString()
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (m) => m.toUpperCase());
  };

  const formatSeconds = (seconds) => {
    if (seconds === null || seconds === undefined) return '—';
    const s = Math.max(0, Number(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h === 0 && m === 0) return '0m';
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatStatusLabel = (status) => {
    if (!status) return 'Unknown';
    if (status === 'HALF_DAY') return 'Half Day';
    return status.toString().replace(/_/g, ' ');
  };

  const formatShiftTime = (value) => {
    if (!value) return '—';
    const parts = value.split(':');
    if (parts.length < 2) return value;
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${minutes} ${period}`;
  };

  const renderWorkShifts = (workShifts) => {
    const shifts = Array.isArray(workShifts) ? workShifts : [];
    if (!shifts.length) return <span className="text-sm text-gray-400">—</span>;

    return (
      <div className="space-y-2">
        {shifts.map((shift) => (
          <div key={shift.id || `${shift.name}-${shift.start_time}`}>
            <div className="text-sm font-semibold text-gray-900">{shift.name || '—'}</div>
            <div className="text-xs text-gray-500">
              {formatShiftTime(shift.start_time)} - {formatShiftTime(shift.end_time)}
            </div>
          </div>
        ))}
      </div>
    );
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
        <span className="text-sm font-medium text-gray-900">{time || '—'}</span>
        {mapUrl ? (
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            title={title}
            className="w-9 h-9 rounded-lg bg-[#F3F4F6] text-gray-600 border border-gray-200 inline-flex items-center justify-center hover:bg-gray-100"
          >
            <ExternalLink className="w-4 h-4" />
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
          <span className="text-sm font-medium text-gray-900">{time || '—'}</span>
          <span className="inline-flex w-fit rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
            {label}
          </span>
        </div>
      );
    }

    return <span className="text-sm font-medium text-gray-900">{time || '—'}</span>;
  };

  const renderPaginationButtons = () => {
    const totalPages = pagination.total_pages || 1;
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

    return pages.map((p, idx) => (
      p === '...'
        ? <span key={`dots-${idx}`} className="px-2 text-gray-400">...</span>
        : (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm ${
              page === p
                ? 'bg-[var(--brand-primary)] text-white'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        )
    ));
  };

  const getFileNameFromDisposition = (disposition) => {
    if (!disposition) return null;
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
    const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] || null;
  };

  const handleExportAttendance = async () => {
    const rangeParams = getRangeParams(dateFilter);
    if (!rangeParams?.from_date || !rangeParams?.to_date) {
      toast.error('Please select a valid date range before export');
      return;
    }

    try {
      setExporting(true);
      const exportParams = {
        from_date: rangeParams.from_date,
        to_date: rangeParams.to_date,
      };
      if (selectedDepartmentId) {
        exportParams.department = selectedDepartmentId;
      }
      const res = await downloadAttendanceExcel(exportParams);

      const contentDisposition = res?.headers?.['content-disposition'];
      const fileName =
        getFileNameFromDisposition(contentDisposition) ||
        `attendance-${rangeParams.from_date}-to-${rangeParams.to_date}.xlsx`;

      const blob = new Blob([res.data], {
        type:
          res?.headers?.['content-type'] ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Attendance exported');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to export attendance');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full min-h-[872px] space-y-5">
    
      {/* Upper Section - Summary Cards & Charts */}
          <div className="flex gap-5 w-full h-[252px]">
        
        {/* --- Summary Cards Group --- */}
          <div className="flex gap-5">
          
          {/* Card 1: Present */}
          <div className="w-[160px] h-full bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col transition-transform hover:scale-[1.02] duration-300">
            {/* Colored Header */}
            <div className="h-[85px] bg-[var(--brand-soft)] p-5 flex items-start">
               <h3 className="text-base font-bold text-gray-800">Present</h3>
            </div>
            {/* White Body */}
            <div className="flex-1 p-5 flex flex-col justify-between">
               <div className="flex items-center gap-2">
                  <span className="text-5xl font-bold text-[#3C2E29]">{summaryLoading ? '—' : summaryData.present.count}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--brand-soft-alt)] text-xs font-bold text-[var(--brand-primary)]">{summaryLoading ? '+0' : formatDelta(summaryData.present.change)}</span>
               </div>
               
               <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                  <span>Employees</span>
                  <span className="text-gray-400 font-normal">vs yesterday</span>
               </div>

               {!summaryLoading && summaryData.present.halfDayWorkedCount > 0 && (
                 <p className="text-[10px] text-gray-500">
                   incl. {summaryData.present.halfDayWorkedCount} half-day worked
                 </p>
               )}

               <div className="mt-2 bg-[#F8F9FA] rounded-lg p-2 flex justify-between text-[10px] font-semibold text-gray-700">
                  <span><span className="text-[#3C2E29] font-bold">{summaryLoading ? 0 : summaryData.present.onTime}</span> On-Time</span>
                  <span><span className="text-[#3C2E29] font-bold">{summaryLoading ? 0 : summaryData.present.late}</span> Late</span>
               </div>
            </div>
          </div>

          {/* Card 2: On Leave */}
          <div className="w-[220px] h-full bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col transition-transform hover:scale-[1.02] duration-300">
            {/* Colored Header */}
            <div className="h-[85px] bg-[var(--brand-primary)] p-5 flex items-start">
               <h3 className="text-base font-bold text-white">On Leave</h3>
            </div>
            {/* White Body */}
            <div className="flex-1 p-5 flex flex-col justify-between">
               <div className="flex items-center gap-2">
                  <span className="text-5xl font-bold text-[#3C2E29]">{summaryLoading ? '—' : summaryData.onLeave.count}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--brand-soft-alt)] text-xs font-bold text-[var(--brand-primary)]">{summaryLoading ? '+0' : formatDelta(summaryData.onLeave.change)}</span>
               </div>

               <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                  <span>Employees</span>
                  <span className="text-gray-400 font-normal">vs yesterday</span>
               </div>

               <div className="mt-2 bg-[#F8F9FA] rounded-lg p-2 flex gap-3 text-[10px] text-gray-600">
                  {summaryLoading || summaryData.onLeave.types.length === 0 ? (
                    <span><span className="font-bold text-gray-900">0</span> Others</span>
                  ) : (
                    summaryData.onLeave.types.slice(0, 3).map((t, idx) => (
                      <span key={idx}>
                        <span className="font-bold text-gray-900">{t.count ?? 0}</span> {formatTypeLabel(t.type)}
                      </span>
                    ))
                  )}
               </div>
            </div>
          </div>

          {/* Card 3: Half Day Leave */}
          <div className="w-[220px] h-full bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col transition-transform hover:scale-[1.02] duration-300">
            <div className="h-[85px] bg-[#B8860B] p-5 flex items-start">
               <h3 className="text-base font-bold text-white">Half Day Leave</h3>
            </div>
            <div className="flex-1 p-5 flex flex-col justify-between">
               <div className="flex items-center gap-2">
                  <span className="text-5xl font-bold text-[#3C2E29]">{summaryLoading ? '—' : summaryData.onHalfDay.count}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[var(--brand-soft-alt)] text-xs font-bold text-[var(--brand-primary)]">{summaryLoading ? '+0' : formatDelta(summaryData.onHalfDay.change)}</span>
               </div>

               <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                  <span>Employees</span>
                  <span className="text-gray-400 font-normal">vs yesterday</span>
               </div>

               <div className="mt-2 bg-[#F8F9FA] rounded-lg p-2 flex gap-3 text-[10px] text-gray-600">
                  {summaryLoading || summaryData.onHalfDay.types.length === 0 ? (
                    <span><span className="font-bold text-gray-900">0</span> Others</span>
                  ) : (
                    summaryData.onHalfDay.types.slice(0, 3).map((t, idx) => (
                      <span key={idx}>
                        <span className="font-bold text-gray-900">{t.count ?? 0}</span> {formatTypeLabel(t.type)}
                      </span>
                    ))
                  )}
               </div>
            </div>
          </div>

          {/* Card 4: Absent */}
          <div className="w-[120px] h-full bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col transition-transform hover:scale-[1.02] duration-300">
            {/* Colored Header */}
            <div className="h-[85px] bg-[#4A2520] p-5 flex items-start">
               <h3 className="text-base font-bold text-white">Absent</h3>
            </div>
            {/* White Body */}
            <div className="flex-1 p-5 flex flex-col justify-between">
               <div className="flex items-center gap-2">
                  <span className="text-5xl font-bold text-[#3C2E29]">{summaryLoading ? '—' : summaryData.absent.count}</span>
               </div>

               <div className="flex flex-col gap-1 text-[11px] font-semibold text-gray-500">
                  <span>Employees</span>
                  <div className="flex items-center gap-1">
                     <span className="px-1.5 py-0.5 rounded bg-[var(--brand-soft-alt)] text-[10px] font-bold text-[var(--brand-primary)] w-fit">{summaryLoading ? '+0' : formatDelta(summaryData.absent.change)}</span>
                     <span className="text-[9px] text-gray-400 font-normal whitespace-nowrap">vs yesterday</span>
                  </div>
               </div>
            </div>
          </div>

        </div>

        {/* --- Attendance Overview Chart --- */}
        <div className="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col relative h-full transition-transform hover:scale-[1.02] duration-300">
          
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-gray-900">Attendance Overview</h3>
            <div className="relative">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="pl-3 pr-8 py-1.5 bg-[#F8F9FA] border-none rounded-lg text-xs font-semibold text-gray-700 appearance-none cursor-pointer focus:outline-none"
              >
                <option value={6}>Last 6 Months</option>
                <option value={3}>Last 3 Months</option>
              </select>
               <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
               </div>
            </div>
          </div>

          <div className="flex items-end justify-between flex-1 gap-4 pl-8 relative">
             {/* Y-Axis Labels */}
            <div className="absolute left-0 top-4 bottom-8 flex flex-col justify-between text-[10px] font-medium text-gray-300">
              <span>100%</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0%</span>
            </div>

            {/* Bars */}
            {attendanceOverview.map((data, index) => (
              <div key={index} className="flex-1 h-full flex flex-col justify-end group">
                <div className="w-full flex flex-col gap-1 h-[80%] justify-end">
                    {/* Absent (Top Segment) */}
                    <div 
                        className="w-full bg-[#4A2520] rounded-md transition-all hover:opacity-90"
                        style={{ height: `${data.absent}%` }}
                    ></div>
                    {/* Half Day Leave */}
                    <div 
                        className="w-full bg-[#B8860B] rounded-md transition-all hover:opacity-90"
                        style={{ height: `${data.onHalfDay}%` }}
                    ></div>
                    {/* On Leave (Middle Segment) */}
                    <div 
                        className="w-full bg-[var(--brand-primary)] rounded-md transition-all hover:opacity-90"
                        style={{ height: `${data.onLeave}%` }}
                    ></div>
                    {/* Present (Bottom Segment) */}
                    <div 
                        className="w-full bg-[var(--brand-soft-alt)] rounded-md transition-all hover:opacity-90"
                        style={{ height: `${data.present}%` }}
                    ></div>
                </div>
                {/* Month Label */}
                <span className="text-[10px] font-medium text-gray-400 text-center mt-3">{data.label}</span>
              </div>
            ))}
          </div>

           <div className="flex gap-4 mt-1">
             <div className="flex items-center gap-2">
               <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-soft-border)]"></span>
               <span className="text-[10px] text-gray-500 font-medium">Present</span>
             </div>
             <div className="flex items-center gap-2">
               <span className="w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)]"></span>
               <span className="text-[10px] text-gray-500 font-medium">On Leave</span>
             </div>
             <div className="flex items-center gap-2">
               <span className="w-2.5 h-2.5 rounded-full bg-[#B8860B]"></span>
               <span className="text-[10px] text-gray-500 font-medium">Half Day Leave</span>
             </div>
             <div className="flex items-center gap-2">
               <span className="w-2.5 h-2.5 rounded-full bg-[#4A2520]"></span>
               <span className="text-[10px] text-gray-500 font-medium">Absent</span>
             </div>
           </div>

        </div>
      </div>

      {/* Lower Section - Employee Attendance Table */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        {/* Table Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Employee Attendance</h2>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)] w-64"
              />
            </div>

            {/* Department */}
            <div className="relative">
              <select
                value={selectedDepartmentId}
                onChange={(e) => {
                  setSelectedDepartmentId(e.target.value);
                  setPage(1);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold border border-gray-200 appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)]"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-soft-alt)] text-[var(--brand-primary)] rounded-xl text-sm font-semibold border border-[var(--brand-soft-border)] appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)]"
              >
                <option value="ALL">ALL</option>
                <option value="ON_TIME">ON TIME</option>
                <option value="LATE">LATE</option>
                <option value="ON_LEAVE">ON LEAVE</option>
                <option value="LEAVE_SESSION_ANY_HALF">HALF DAY</option>
                <option value="ABSENT">ABSENT</option>
              </select>
              <Filter className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-primary)] pointer-events-none" />
            </div>

            {/* Sort By */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Sort by:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                  className="px-4 py-2 bg-[var(--brand-soft-alt)] text-[var(--brand-primary)] rounded-xl text-sm font-semibold appearance-none pr-10 cursor-pointer border-none focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)]"
                >
                  <option value="NAME">Name</option>
                  {/* <option value="JOB_TITLE">Job Title</option> */}
                  <option value="STATUS">Status</option>
                  <option value="DATE">Date</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--brand-primary)] pointer-events-none" />
              </div>
            </div>

           <DateRangeDropdown
              value={dateFilter}
              onApply={(next) => {
                setDateFilter(next);
                setPage(1);
              }}
            />

            <button
              type="button"
              onClick={handleExportAttendance}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--brand-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--brand-strong)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                  Job Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                  Work Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                  Work Shifts
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                  Clock In
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                  Clock Out
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                  Duration <ChevronDown className="w-3 h-3 inline ml-1 opacity-40" />
                </th>
                {!hideOt && (
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                    Overtime
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employeesLoading ? (
                <tr>
                  <td colSpan={hideOt ? 9 : 10} className="text-center py-10 text-gray-400 text-sm">Loading attendance...</td>
                </tr>
              ) : employeeData.length === 0 ? (
                <tr>
                  <td colSpan={hideOt ? 9 : 10} className="text-center py-10 text-gray-400 text-sm">No records found.</td>
                </tr>
              ) : employeeData.map((employee) => (
                <tr key={employee.employee?.id || employee.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        size="lg"
                        imageUrl={getProfileImageUrl(employee.employee)}
                        fullName={employee.employee?.full_name}
                        firstName={employee.employee?.first_name}
                        lastName={employee.employee?.last_name}
                      />
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{employee.employee?.full_name || '-'}</div>
                        <div className="text-xs text-gray-500 font-medium">{employee.employee?.employee_id || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-gray-900 text-sm">{employee.employee?.designation || '-'}</div>
                    <div className="text-xs text-gray-500 font-medium">
                      {formatDepartments(employee.employee?.department)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-gray-900">{formatDate(employee.date)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${getWorkModelColor(employee.employee?.work_model)}`}>
                        {getWorkModelIcon(employee.employee?.work_model)}
                      </span>
                      <span className="text-sm font-medium text-gray-600">
                        {(employee.employee?.work_model || '').replace(/_/g, ' ') || '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {renderWorkShifts(employee.employee?.work_shifts)}
                  </td>
                  <td className="px-4 py-4">
                    {renderTimeWithMap(
                      employee.clock_in_time,
                      employee.clock_in_latitude,
                      employee.clock_in_longitude,
                      'Open clock-in location'
                    )}
                  </td>
                  <td className="px-4 py-4">
                    {renderClockOutInfo(
                      employee.clock_out_time,
                      employee.clock_out_latitude,
                      employee.clock_out_longitude ?? employee.clock_ot_longitude,
                      employee.clock_out_type
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold text-gray-900">{formatSeconds(employee.duration_seconds)}</span>
                  </td>
                  {!hideOt && (
                    <td className="px-4 py-4">
                      <span className="text-sm font-medium text-gray-600">{formatSeconds(employee.overtime_seconds)}</span>
                    </td>
                  )}
                  <td className="px-4 py-4">
                    {renderAttendanceStatus(employee)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Show</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm font-medium text-gray-600">of {pagination.total} results</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            {renderPaginationButtons()}
            <button
              disabled={page === pagination.total_pages || pagination.total_pages === 0}
              onClick={() => setPage(prev => Math.min(prev + 1, pagination.total_pages))}
              className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
