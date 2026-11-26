/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit2,
  Trash2,
  Plus,
  Building2,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import AddDepartmentModal from './AddDepartmentModal';
import { getAllDepartments, getDepartmentDashboard } from '../../api/departments';
import { useLayout } from '../../context/LayoutContext';
import { deleteDepartment } from '../../api/emoloyees/addEmployees';
import UserAvatar from '../common/UserAvatar';
import DeleteConfirmModal from '../common/DeleteConfirmModal';
import { getProfileImageUrl } from '../../utils/userAvatar';

// Avatar color palette
const avatarColors = [
  'bg-blue-100 text-blue-700',
  'bg-purple-100 text-purple-700',
  'bg-green-100 text-green-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-red-100 text-red-700',
];

const Departments = ({ onRowClick }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const { setHeaderConfig } = useLayout();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('NAME');
  const [sortDir, setSortDir] = useState('ASC');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const [dashboardData, setDashboardData] = useState(null);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    setHeaderConfig({
      title: "Departments",
      breadcrumb: [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Employees', path: '/employees' },
        { label: 'Departments', path: '/departments', active: true }
      ],
      onBack: null
    });
  }, [setHeaderConfig]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDepartmentDashboard();
      setDashboardData(data);
    } catch (error) {
      toast.error("Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDepartmentsList = useCallback(async () => {
    setDepartmentsLoading(true);
    try {
      const data = await getAllDepartments({ page, limit, search: searchQuery, sort_by: sortBy, sort_dir: sortDir });
      setDepartmentsList(data.data || []);
      setTotalPages(data.total_pages || 1);
      setTotalResults(data.total || 0);
    } catch (error) {
      toast.error("Failed to load department list");
    } finally {
      setDepartmentsLoading(false);
    }
  }, [page, limit, searchQuery, sortBy, sortDir]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  useEffect(() => { fetchDepartmentsList(); }, [fetchDepartmentsList]);

  const handleRefresh = () => { fetchDashboardData(); fetchDepartmentsList(); };
  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleteLoading(true);
    try {
      await deleteDepartment(deleteTarget.id);
      toast.success("Department deleted");
      setDeleteTarget(null);
      handleRefresh();
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setDeleteLoading(false);
      setActiveMenuId(null);
    }
  };
  const handleEdit = (dept) => { setEditingDepartment(dept); setIsModalOpen(true); setActiveMenuId(null); };
  const handleAddNew = () => { setEditingDepartment(null); setIsModalOpen(true); };

  const summaryCards = dashboardData ? [
    {
      title: 'Total Departments',
      number: dashboardData.summary.total_departments || 0,
      percentage: dashboardData.summary.total_departments_change_pct_from_last_month || 0,
      trend: (dashboardData.summary.total_departments_change_pct_from_last_month || 0) >= 0 ? 'up' : 'down',
      bgColor: 'bg-white'
    },
    {
      title: 'New This Month',
      number: dashboardData.summary.new_departments_this_month || 0,
      percentage: dashboardData.summary.new_departments_change_pct_from_last_month || 0,
      trend: (dashboardData.summary.new_departments_change_pct_from_last_month || 0) >= 0 ? 'up' : 'down',
      bgColor: 'bg-[#F5F5F5]'
    },
  ] : [];

  /* PREPARE DEPARTMENT DISTRIBUTION DATA */
  const departmentData = dashboardData?.distribution?.departments || [];

  /* HELPER: Generate Dynamic Colors */
  const getDynamicColor = (index, total) => {
    const brandPalette = [
      '#774618',
      '#808080',
      '#FF5722',
      '#9E9E9E',
      '#FBD9CC',
      '#E8E8E8',
      '#0e454d',
      '#EB4000'
    ];

    if (index < brandPalette.length) {
      return brandPalette[index];
    }

    const step = 360 / (total - brandPalette.length);
    const hue = ((index - brandPalette.length) * step) % 360;
    return `hsl(${hue}, 70%, 55%)`;
  };

  /* PREPARE CHART SEGMENTS WITH COLORS */
  const chartSegments = departmentData.map((dept, index) => {
    const color = getDynamicColor(index, departmentData.length);
    return {
      ...dept,
      color
    };
  });

  /* CALCULATE DONUT CHART SEGMENTS FOR SVG PATH */
  let currentAngle = -90;
  const donutSegments = chartSegments.map(dept => {
    const angle = (dept.percentage / 100) * 360;
    const segment = {
      ...dept,
      startAngle: currentAngle,
      endAngle: currentAngle + angle
    };
    currentAngle += angle;
    return segment;
  });

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  if (loading) {
    return (
      <div className="w-full min-h-[1098px] p-6 gap-5 flex flex-col font-['Plus_Jakarta_Sans',_-apple-system,_BlinkMacSystemFont,_sans-serif] bg-[#FAFAFA]">
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500 text-sm">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 gap-5 flex flex-col font-['Plus_Jakarta_Sans',_-apple-system,_BlinkMacSystemFont,_sans-serif] bg-[#FAFAFA]">
      <div className="w-full">
        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6 items-stretch">
          {/* Summary Cards */}
          {summaryCards.map((card, index) => (
            <div
              key={index}
              className={`col-span-12 md:col-span-6 xl:col-span-3 ${card.bgColor} rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between transition-transform hover:scale-[1.02] duration-300`}
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/60 rounded-xl backdrop-blur-md w-fit">
                <Users size={14} className="text-gray-700" />
                <span className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">{card.title}</span>
              </div>

              <div className="mt-6">
                <h2 className="text-3xl font-black text-gray-900 tracking-tighter">
                  {card.number}
                </h2>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[9px] font-bold text-gray-500 uppercase">vs Last Month</p>
                  <div className={`flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-lg ${
                    card.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {card.trend === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(card.percentage).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Department Distribution Chart */}
          <div className="col-span-12 md:col-span-12 xl:col-span-6 bg-white rounded-xl p-6 border border-gray-100 shadow-sm transition-transform hover:scale-[1.02] duration-300">
            <div className="flex items-center gap-2 mb-6">
              <Building2 size={16} className="text-gray-700" />
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Department Distribution</h3>
            </div>

            <div className="flex flex-col lg:flex-row items-center gap-6">
              {/* Donut Chart Container */}
              <div className="relative shrink-0 flex items-center justify-center">
                {departmentData.length > 0 ? (
                  <>
                    <svg width="120" height="120" viewBox="0 0 156 156" className="transform -rotate-90">
                      <circle cx="78" cy="78" r="65" fill="transparent" stroke="#F9FAFB" strokeWidth="24" />
                      {donutSegments.map((segment, index) => (
                        <path
                          key={index}
                          d={describeArc(78, 78, 65, segment.startAngle, segment.endAngle)}
                          fill="none"
                          stroke={segment.color}
                          strokeWidth="24"
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-black text-gray-900">{departmentData.length}</span>
                      <span className="text-[7px] font-bold text-gray-400 uppercase">Depts</span>
                    </div>
                  </>
                ) : (
                  <div className="w-[120px] h-[120px] rounded-full bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center text-xs font-bold text-gray-400">
                    Empty
                  </div>
                )}
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                {chartSegments.map((dept, index) => (
                  <div key={index} className="flex flex-col p-2 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dept.color }} />
                      <span className="text-[10px] font-extrabold text-gray-800 truncate uppercase">
                        {dept.department_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pl-3 text-[9px] font-bold text-gray-400">
                      <span>{dept.user_count} Users</span>
                      <span className="text-gray-900">{Math.round(dept.percentage)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Department List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="px-6 py-4 border-b border-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">Department List</h3>
            <p className="text-xs text-gray-400 mt-0.5">{totalResults} total departments</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search department…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-56 pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)] focus:border-[var(--brand-soft-border)] focus:bg-white transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Sort — select is full control width (border on select) so native menu matches box */}
            <div className="relative min-w-[150px]">
              <SlidersHorizontal
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10"
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full min-w-[150px] pl-8 pr-7 py-2 bg-gray-50 text-xs font-semibold text-gray-700 border border-gray-200 rounded-xl appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)] focus:border-[var(--brand-soft-border)]"
              >
                <option value="NAME">Name</option>
                <option value="EMPLOYEE_COUNT">Members</option>
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>

            {/* Add Button */}
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-bold hover:bg-[var(--brand-strong)] transition-colors shadow-sm shadow-orange-200"
            >
              <Plus size={15} strokeWidth={2.5} />
              Add Department
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                {['Department', 'Members', 'Manager', 'Created On', 'Status', ''].map((col, i) => (
                  <th
                    key={i}
                    className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {departmentsLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3.5"><div className="w-4 h-4 bg-gray-100 rounded animate-pulse" /></td>
                    {[140, 80, 120, 80, 60].map((w, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className={`h-3.5 bg-gray-100 rounded-full animate-pulse`} style={{ width: w }} />
                      </td>
                    ))}
                    <td className="px-4 py-3.5"><div className="w-6 h-6 bg-gray-100 rounded-full animate-pulse mx-auto" /></td>
                  </tr>
                ))
              ) : departmentsList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-300">
                      <Building2 size={36} strokeWidth={1.5} />
                      <p className="text-sm font-semibold">No departments found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                departmentsList.map((dept, idx) => {
                  const managerList = Array.isArray(dept.managers) ? dept.managers : [];
                  const primaryManager = managerList[0] || null;
                  const visibleManagers = managerList.slice(0, 2);
                  const remainingManagersCount = Math.max(managerList.length - visibleManagers.length, 0);
                  const visibleManagerNames = visibleManagers
                    .map((m) => `${m.first_name || ''} ${m.last_name || ''}`.trim())
                    .filter(Boolean);
                  const colorClass = avatarColors[idx % avatarColors.length];

                  return (
                    <tr
                      key={dept.id}
                      onClick={() => onRowClick?.(dept.id)}
                      className="border-b border-gray-50 last:border-0 cursor-pointer transition-colors duration-150 hover:bg-gray-50/60"
                    >
                      {/* Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[var(--brand-soft-alt)] flex items-center justify-center flex-shrink-0">
                            <Building2 size={14} className="text-[var(--brand-primary)]" />
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{dept.name}</span>
                        </div>
                      </td>

                      {/* Members */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Users size={13} className="text-gray-400" />
                          <span className="text-sm text-gray-600 font-medium">{dept.employee_count || 0}</span>
                        </div>
                      </td>

                      {/* Manager */}
                      <td className="px-4 py-3.5">
                        {primaryManager ? (
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              size="sm"
                              imageUrl={getProfileImageUrl(primaryManager)}
                              firstName={primaryManager.first_name}
                              lastName={primaryManager.last_name}
                              fallbackClassName={`${colorClass} font-bold flex items-center justify-center flex-shrink-0`}
                            />
                            <span className="text-sm text-gray-700 font-medium">
                              {visibleManagerNames.join(', ')}
                              {remainingManagersCount > 0 ? ` +${remainingManagersCount}` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium italic">Unassigned</span>
                        )}
                      </td>

                      {/* Created On */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-gray-400 font-medium tabular-nums">
                          {dept.created_at ? new Date(dept.created_at).toLocaleDateString('en-GB') : '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          dept.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dept.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {dept.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 relative" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === dept.id ? null : dept.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical size={15} className="text-gray-400" />
                        </button>

                        {activeMenuId === dept.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                            <div className="absolute right-8 top-1 w-36 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden py-1.5">
                              <button
                                onClick={() => handleEdit(dept)}
                                className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-[var(--brand-soft-alt)] hover:text-[var(--brand-primary)] transition-colors"
                              >
                                <Edit2 size={13} /> Edit
                              </button>
                              <div className="mx-3 my-1 h-px bg-gray-100" />
                              <button
                                onClick={() => {
                                  setDeleteTarget({ id: dept.id, name: dept.name });
                                  setActiveMenuId(null);
                                }}
                                className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3.5 border-t border-gray-50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none text-gray-700 font-medium cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="ml-1">
              {Math.min((page - 1) * limit + 1, totalResults)}–{Math.min(page * limit, totalResults)} of {totalResults}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={15} />
            </button>

            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                    page === p
                      ? 'bg-[var(--brand-primary)] text-white shadow-sm shadow-orange-200'
                      : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            {totalPages > 5 && <span className="text-gray-400 text-xs px-1">…</span>}

            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      <AddDepartmentModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingDepartment(null); }}
        onSuccess={handleRefresh}
        editData={editingDepartment}
      />

      <DeleteConfirmModal
        open={!!deleteTarget}
        title="Delete department?"
        itemName={deleteTarget?.name}
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        loading={deleteLoading}
      />
    </div>
  );
};

export default Departments;