/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Filter, Search, Users, UserPlus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Header from '../common/Header';
import { getDepartmentEmployees, getDepartmentSummary } from '../../api/departments';
import { useLayout } from '../../context/LayoutContext';
import UserAvatar from '../common/UserAvatar';
import { getProfileImageUrl } from '../../utils/userAvatar';

const DepartmentDetails = ({ departmentId, onBack }) => {
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1, page: 1, limit: 10 });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NAME');
  const [sortDir, setSortDir] = useState('ASC');

  const { setHeaderConfig } = useLayout();

  useEffect(() => {
    setHeaderConfig({
      title: "Departments",
      breadcrumb: [{ label: 'Dashboard', path: '/dashboard' },
      { label: 'Employees', path: '/employees' },
      { label: 'Departments', path: '/departments', active: true }],
      onBack: null
    });
  }, [setHeaderConfig])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!departmentId) return;
    const fetchSummary = async () => {
      setSummaryLoading(true);
      try {
        const res = await getDepartmentSummary(departmentId);
        setSummary(res);
      } catch (error) {
        toast.error('Failed to load department summary');
        console.error(error);
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchSummary();
  }, [departmentId]);

  useEffect(() => {
    if (!departmentId) return;
    const fetchEmployees = async () => {
      setEmployeesLoading(true);
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter,
          sort_by: sortBy,
          sort_dir: sortDir
        };
        if (debouncedSearch) params.search = debouncedSearch;
        const res = await getDepartmentEmployees(departmentId, params);
        setEmployees(res.data || []);
        setPagination(prev => ({
          ...prev,
          page: res.page ?? prev.page,
          limit: res.limit ?? prev.limit,
          total: res.total ?? 0,
          total_pages: res.total_pages ?? 1
        }));
      } catch (error) {
        toast.error('Failed to load department employees');
        console.error(error);
      } finally {
        setEmployeesLoading(false);
      }
    };
    fetchEmployees();
  }, [departmentId, pagination.page, pagination.limit, debouncedSearch, statusFilter, sortBy, sortDir]);

  const summaryCards = useMemo(() => {
    const total = summary?.total_employees;
    const newThisMonth = summary?.new_employees_this_month;
    return [
      {
        label: 'Total Employees',
        value: total?.count ?? 0,
        change: total?.change_display ?? '+0.0%',
        icon: Users,
        bg: 'bg-[#FBD9CC]/60',
        pillBg: 'bg-[#2D1A1A] text-white'
      },
      {
        label: 'New Employees (This Month)',
        value: newThisMonth?.count ?? 0,
        change: newThisMonth?.change_display ?? '+0.0%',
        icon: UserPlus,
        bg: 'bg-white',
        pillBg: 'bg-[#FBD9CC] text-[#6B2D0F]'
      }
    ];
  }, [summary]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatLabel = (value) => {
    if (!value) return '-';
    return value.toString().replace(/_/g, ' ');
  };

  const renderPaginationButtons = () => {
    const totalPages = pagination.total_pages || 1;
    const pages = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    } else {
      pages.push(1);
      if (pagination.page > 3) pages.push('...');
      const start = Math.max(2, pagination.page - 1);
      const end = Math.min(totalPages - 1, pagination.page + 1);
      for (let i = start; i <= end; i += 1) pages.push(i);
      if (pagination.page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages.map((page, idx) => (
      page === '...'
        ? <span key={`dots-${idx}`} className="flex items-end px-1 pb-2 tracking-widest opacity-30 text-xs">...</span>
        : (
          <button
            key={page}
            onClick={() => setPagination(prev => ({ ...prev, page }))}
            className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs transition-all ${pagination.page === page
                ? 'bg-[#EB4000] text-white shadow-lg shadow-orange-200'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
              }`}
          >
            {page}
          </button>
        )
    ));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start gap-2">
        <button
          onClick={onBack}
          className="mt-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
       
      </div>

      {/* Summary */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <span className="text-xs text-gray-500 font-semibold">Department</span>
              <span className="text-sm font-bold text-gray-900">{summary?.department?.name || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-semibold">Manager</span>
              <span className="text-sm font-bold text-gray-900">{summary?.managers.length}</span>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
          {summaryCards.map((card, idx) => (
            <div
              key={idx}
              className={`${card.bg} rounded-3xl border border-[#FBD9CC] p-5 shadow-sm transition-transform hover:scale-[1.02] duration-300`}
            >
              <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
                <card.icon className="w-4 h-4 text-[#EB4000]" />
                <span>{card.label}</span>
              </div>
              <div className="flex justify-between items-end mt-4">
                <div className="text-3xl font-bold text-gray-900">{card.value}</div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${card.pillBg}`}>
                    {card.change}
                  </span>
                  <div className="text-[9px] text-gray-500 mt-1 font-medium uppercase">from last month</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-lg text-gray-800">Employee List</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 w-3.5 h-3.5" />
              <input
                type="text"
                placeholder="Search employee"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs w-48 focus:ring-1 ring-orange-200 font-medium"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-semibold border border-gray-100 appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
              >
                <option value="ALL">ALL</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-40 pointer-events-none" />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-gray-500">Sort by:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                  className="text-gray-800 px-3 py-1.5 bg-gray-50 rounded-lg text-xs font-semibold border border-gray-100 appearance-none pr-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
                >
                  <option value="NAME">Name</option>
                  <option value="JOIN_DATE">Join Date</option>
                  <option value="STATUS">Status</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40 pointer-events-none" />
              </div>
            </div>

            {/*
              <button
                onClick={() => toast('New employee flow not connected yet')}
                className="bg-[#EB4000] text-white px-6 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#d43800] transition-all"
              >
                New Employee
              </button>
            */}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-y border-gray-50 text-[10px] text-gray-500 uppercase font-semibold tracking-wide">
                <th className="px-6 py-4">Employee ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Job Title</th>
                <th className="px-6 py-4 text-center">Employment Type</th>
                <th className="px-6 py-4">Work Model</th>
                <th className="px-6 py-4">Join Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summaryLoading || employeesLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-400 text-xs">Loading employees...</td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-400 text-xs">No employees found.</td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-6 py-5 text-xs text-gray-500 font-semibold">{emp.employee_id || 'N/A'}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          size="md"
                          imageUrl={getProfileImageUrl(emp)}
                          fullName={emp.name || emp.full_name}
                          firstName={emp.first_name}
                          lastName={emp.last_name}
                        />
                        <span className="text-xs font-bold text-gray-900">{emp.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs text-gray-500 font-medium">{emp.job_title || '-'}</td>
                    <td className="px-6 py-5 text-center">
                      {emp.employment_type && (
                        <span className="px-3 py-1.5 border rounded-lg text-[9px] font-bold uppercase tracking-tight bg-orange-50 text-[#EB4000] border-orange-100">
                          {formatLabel(emp.employment_type)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-xs text-gray-600 font-bold">
                      {emp.work_mode && (
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.work_mode === 'REMOTE' ? 'bg-[#4D190E]' : emp.work_mode === 'HYBRID' ? 'bg-[#FBD9CC]' : 'bg-[#EB4000]'}`}></span>
                          {formatLabel(emp.work_mode)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-xs text-gray-500 font-medium">{formatDate(emp.join_date)}</td>
                    <td className="px-6 py-5">
                      <span className={`px-4 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-tight ${emp.status === 'ACTIVE' ? 'bg-[#EB4000] text-white shadow-sm' : 'bg-gray-200 text-gray-500'
                        }`}>
                        {emp.status || 'INACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-gray-50 flex justify-between items-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <div className="relative">
              <select
                value={pagination.limit}
                onChange={(e) => setPagination(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                className="text-gray-900 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 appearance-none pr-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40 pointer-events-none" />
            </div>
            <span>of {pagination.total} results</span>
          </div>

          <div className="flex gap-1.5">
            <button
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
              className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-xl text-xs hover:bg-gray-100 transition-all disabled:opacity-50"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {renderPaginationButtons()}

            <button
              disabled={pagination.page === pagination.total_pages || pagination.total_pages === 0}
              onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.page + 1, pagination.total_pages) }))}
              className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-xl text-xs hover:bg-gray-100 transition-all disabled:opacity-50"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetails;
