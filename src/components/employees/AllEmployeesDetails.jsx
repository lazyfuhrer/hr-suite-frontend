import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';

import {
    getEmployeeStatistics,
    getEmployeesList,
    getDepartmentStatistics,
    downloadEmployeesExcel
} from '../../api/emoloyees/addEmployees';
import { getDepartments } from '../../api/departments';

import Users from "../../assets/employees/Users.svg";
import UserPlus from "../../assets/employees/UserPlus.svg";
import UserMinus from "../../assets/employees/UserMinus.svg";
import { ChevronDown, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { useLayout } from '../../context/LayoutContext';
import UserAvatar from '../common/UserAvatar';
import { getProfileImageUrl } from '../../utils/userAvatar';

const AllEmployeesDetails = ({ onAddNew, onInvite, onDraft, onBulkUpload, onSync, onRowClick, listRefreshKey = 0 }) => {
    const [loading, setLoading] = useState(true);

    // Filters & Pagination State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [resultsPerPage, setResultsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [exporting, setExporting] = useState(false);

    // Data State
    const [statsData, setStatsData] = useState(null);
    const [employeeData, setEmployeeData] = useState([]);
    const [departmentData, setDepartmentData] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [paginationInfo, setPaginationInfo] = useState({ total: 0, total_pages: 1 });

    // Debounce for search to prevent too many API calls
    const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
    const { setHeaderConfig } = useLayout();
    const { user } = useSelector((state) => state.auth);
    const canManageEmployees = ['admin', 'hr', 'manager'].includes(String(user?.role || '').toLowerCase());

    useEffect(() => {
        setHeaderConfig({
            title: "Employees",
            breadcrumb:
                [
                    { label: 'Dashboard', path: '/dashboard' },
                    { label: 'Employees', path: '/employees', active: true }
                ],
            onBack: null
        });
    }, [setHeaderConfig])
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to page 1 on new search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    /* 1. FETCH DASHBOARD STATS & DEPARTMENTS (Run once on mount) */
    useEffect(() => {
        const fetchStaticData = async () => {
            try {
                const [statsRes, deptRes] = await Promise.all([
                    getEmployeeStatistics(),
                    getDepartmentStatistics()
                ]);

                // Process Stats
                setStatsData(statsRes);

                // Process Departments (Combine departments + unassigned)
                const combinedDepts = [
                    ...statsRes.filter?.role === 'employee' ? [] : [], // Just safeguard
                    ...(deptRes.departments || []),
                    ...(deptRes.unassigned ? [deptRes.unassigned] : [])
                ];

                // Sort by percentage descending for better chart visualization
                combinedDepts.sort((a, b) => b.percentage - a.percentage);
                setDepartmentData(combinedDepts);

            } catch (error) {
                console.error("Error fetching static data:", error);
            }
        };
        fetchStaticData();
    }, [listRefreshKey]);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await getDepartments();
                const departmentsList = response?.data?.data || response?.data || [];
                setDepartments(Array.isArray(departmentsList) ? departmentsList : []);
            } catch (error) {
                console.error("Error fetching departments:", error);
            }
        };

        fetchDepartments();
    }, []);

    /* 2. FETCH EMPLOYEE LIST (Run on filter/page change) */
    useEffect(() => {
        const fetchEmployees = async () => {
            setLoading(true);
            try {
                const params = {
                    page: currentPage,
                    limit: resultsPerPage,
                    search: debouncedSearch,
                    sortBy: sortBy
                };

                if (selectedDepartmentId) {
                    params.department = selectedDepartmentId;
                }

                const res = await getEmployeesList(params);

                setEmployeeData(res.data || []);
                setPaginationInfo({
                    total: res.total,
                    total_pages: res.total_pages
                });
            } catch (error) {
                console.error("Error fetching employees:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, [currentPage, resultsPerPage, debouncedSearch, selectedDepartmentId, sortBy, listRefreshKey]);

    const getFileNameFromDisposition = (disposition) => {
        if (!disposition) return null;
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
        const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
        return plainMatch?.[1] || null;
    };

    const handleExportEmployees = async () => {
        try {
            setExporting(true);

            const exportParams = {
                search: debouncedSearch,
                sortBy: sortBy
            };

            if (selectedDepartmentId) {
                exportParams.department = selectedDepartmentId;
            }

            const res = await downloadEmployeesExcel(exportParams);

            const contentDisposition = res?.headers?.['content-disposition'];
            const fileName =
                getFileNameFromDisposition(contentDisposition) ||
                `employees-${new Date().toISOString().slice(0, 10)}.xlsx`;

            const blob = new Blob([res.data], {
                type: res?.headers?.['content-type'] ||
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
            toast.success('Employees exported');
        } catch (error) {
            // With responseType 'blob' the error body is a Blob, so the message is not readable directly
            if (error?.response?.status === 404) {
                toast.error('No employees found');
            } else {
                toast.error('Failed to export employees');
            }
            console.error("Error exporting employees:", error);
        } finally {
            setExporting(false);
        }
    };


    /* HELPER: Format Trend Percentage */
    const renderTrend = (val) => {
        const num = val === null || val === undefined ? 0 : val;
        const sign = num > 0 ? '+' : '';
        const colorClass = num >= 0 ? 'bg-[#2D1A1A] text-white' : 'bg-red-100 text-red-600';
        return (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
                {sign}{num}%
            </span>
        );
    };

    /* HELPER: Prepare Stats Cards */
    // Default values used if API hasn't loaded yet
    // Row 1: Total + Past | Row 2: New + Resigned (grid-cols-2 order)
    const statsCards = [
        {
            label: 'Total Employees',
            value: statsData?.total_users || 0,
            trend: statsData?.total_users_change_pct_from_last_month,
            isPrimary: true,
            icon: Users
        },
        {
            label: 'Past Employees',
            value: statsData?.past_users_count ?? 0,
            trend: null,
            hideTrend: true,
            isPrimary: false,
            icon: Users
        },
        {
            label: 'New Employees (This Month)',
            value: statsData?.new_users_this_month || 0,
            trend: statsData?.new_users_change_pct_from_last_month,
            isPrimary: false,
            icon: UserPlus
        },
        {
            label: 'Resigned Employees (This Month)',
            value: statsData?.resigned_users_this_month || 0,
            trend: statsData?.resigned_users_change_pct_from_last_month,
            isPrimary: false,
            icon: UserMinus
        },
    ];

    /* HELPER: Prepare Chart Data */
    const getDynamicColor = (index, total) => {
        // Base brand palette (Preferred colors)
        const brandPalette = ['#4D190E', '#EB4000', '#FBD9CC', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'];

        // If we have fewer departments than the palette, use the palette
        if (index < brandPalette.length) {
            return brandPalette[index];
        }

        // If we have MORE departments than the palette, generate distinct colors
        // We start shifting Hue to generate new colors that aren't in the palette
        const step = 360 / (total - brandPalette.length);
        const hue = (index * step) % 360;
        return `hsl(${hue}, 70%, 55%)`;
    };

    let cumulativePercent = 0;
    const chartSegments = departmentData.map((dept, index) => {
        // Generate color based on total count
        const color = getDynamicColor(index, departmentData.length);

        const offset = cumulativePercent;
        const percentage = dept.percentage || 0;
        cumulativePercent += percentage;

        return {
            ...dept,
            color, // Assign the dynamically generated color
            offset: -offset,
            strokeDasharray: `${percentage} ${100 - percentage}`
        };
    });

    // --- DYNAMIC PAGINATION GENERATOR ---
    const renderPaginationButtons = () => {
        const totalPages = paginationInfo.total_pages;
        const pages = [];

        if (totalPages <= 7) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage > 3) pages.push('...');

            // Show current, prev, next
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            if (currentPage < totalPages - 2) pages.push('...');

            // Always show last page
            pages.push(totalPages);
        }

        return pages.map((page, index) => (
            page === '...' ? (
                <span key={`dots-${index}`} className="flex items-end px-1 pb-2 tracking-widest opacity-30 text-xs">...</span>
            ) : (
                <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs transition-all ${currentPage === page
                        ? 'bg-[var(--brand-primary)] text-white shadow-lg shadow-orange-200'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                        }`}
                >
                    {page}
                </button>
            )
        ));
    };

    const renderDepartments = (department) => {
        const deptArray = Array.isArray(department)
            ? department
            : department
                ? [department]
                : [];

        if (!deptArray.length) {
            return <span className="text-xs text-gray-400 font-medium">Unassigned</span>;
        }

        return (
            <div className="flex flex-wrap gap-1">
                {deptArray.map((dept) => (
                    <span
                        key={dept.id || dept.name}
                        className="px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-semibold text-gray-700"
                    >
                        {dept.name}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6 p-6 bg-gray-200/4">
            {/* 1. Top Section: Stats & Departments */}
            <div className="grid grid-cols-12 gap-6">

                {/* Left Side: Stat Cards */}
                <div className="col-span-12 lg:col-span-7 grid grid-cols-2 gap-4">
                    {statsCards.map((item, idx) => (
                        <div key={idx} className={`${item.isPrimary ? 'bg-[var(--brand-soft)] border-[var(--brand-soft-border)]' : 'bg-white border-gray-100'} p-5 rounded-3xl border shadow-sm transition-transform hover:scale-[1.02] duration-300`}>
                            <div className="flex items-center gap-2 mb-4">
                                <img src={item.icon} alt={item.label} className="w-5 h-5 text-[var(--brand-primary)]" />
                                <span className="text-gray-500 text-xs font-medium">{item.label}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <h2 className="text-4xl font-bold text-gray-900">{item.value}</h2>
                                {!item.hideTrend && (
                                    <div className="text-right">
                                        {renderTrend(item.trend)}
                                        <p className="text-[9px] text-gray-500 mt-1 font-medium uppercase">from last month</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Side: Departments Breakdown */}
                <div className="col-span-12 lg:col-span-5 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative transition-transform hover:scale-[1.02] duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 text-lg">Departments</h3>
                    </div>

                    <div className="flex gap-6 items-center">
                        {/* DYNAMIC CHART */}
                        <div className="relative w-36 h-36 shrink-0">
                            {departmentData.length > 0 ? (
                                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                    {/* BACKGROUND TRACK (Gray Circle for Emptiness) */}
                                    <circle
                                        cx="18"
                                        cy="18"
                                        r="15.915"
                                        fill="transparent"
                                        stroke="#f3f4f6" /* Gray color for empty space */
                                        strokeWidth="4.5"
                                        strokeDasharray="100 0"
                                    ></circle>

                                    {/* DATA SEGMENTS */}
                                    {chartSegments.map((seg, i) => (
                                        <circle
                                            key={i}
                                            cx="18"
                                            cy="18"
                                            r="15.915"
                                            fill="transparent"
                                            stroke={seg.color}
                                            strokeWidth="4.5"
                                            strokeDasharray={seg.strokeDasharray}
                                            strokeDashoffset={seg.offset}
                                        ></circle>
                                    ))}
                                </svg>
                            ) : (
                                <div className="w-full h-full rounded-full border-4 border-gray-100 flex items-center justify-center text-[10px] text-gray-400">No Data</div>
                            )}
                        </div>

                        {/* Department Legend */}
                        <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4 max-h-[140px] overflow-y-auto custom-scrollbar">
                            {chartSegments.map((dept, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: dept.color }}></div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-900 leading-tight truncate max-w-[80px]" title={dept.department_name}>
                                            {dept.department_name}
                                        </p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <img src={Users} className="w-2.5 h-2.5 opacity-40" alt="" />
                                            <span className="text-[10px] text-gray-500 font-medium">
                                                {dept.user_count} — {Math.round(dept.percentage)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Bottom Section: Employee List Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="font-bold text-lg text-gray-800">Employee List</h3>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 w-3.5 h-3.5" />
                            <input type="text" placeholder="Search employee" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs w-48 focus:ring-1 ring-orange-200 font-medium" />
                        </div>

                        {/* Department Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedDepartmentId}
                                onChange={(e) => {
                                    setSelectedDepartmentId(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-semibold border border-gray-100 appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)]"
                            >
                                <option value="">All Departments</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                        </div>

                        {/* Sort By Dropdown */}
                        <div className="flex items-center gap-1">
                            <span className="text-[11px] font-semibold text-gray-500">Sort by:</span>
                            <div className="relative">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="text-gray-800 px-3 py-1.5 bg-gray-50 rounded-lg text-xs font-semibold border border-gray-100 appearance-none pr-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)]"
                                >
                                    <option value="name">Name</option>
                                    <option value="joinDate">Join Date</option>
                                    <option value="status">Status</option>
                                </select>
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none">▼</span>
                            </div>
                        </div>

                        {/* Invite Employee + New Employee Buttons */}
                        {canManageEmployees && (
                            <>
                                <button
                                    onClick={onBulkUpload}
                                    className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all"
                                >
                                    Bulk Upload
                                </button>
                                <button
                                    onClick={onInvite}
                                    className="bg-[var(--brand-soft-alt)] border border-[var(--brand-soft-border)] text-[#4D190E] px-6 py-2.5 rounded-xl text-xs font-semibold hover:bg-[var(--brand-soft)] transition-all"
                                >
                                    Invite Employee
                                </button>
                                <button
                                    onClick={onDraft}
                                    className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all"
                                >
                                    Draft Employee
                                </button>
                                <button
                                    onClick={onAddNew}
                                    className="bg-[var(--brand-primary)] text-white px-6 py-2.5 rounded-xl text-xs font-semibold hover:bg-[var(--brand-strong)] transition-all"
                                >
                                    New Employee
                                </button>
                                <button
                                    onClick={onSync}
                                    className="bg-white border border-gray-200 text-gray-700 px-6 py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all"
                                >
                                    Sync Employee
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={handleExportEmployees}
                            disabled={exporting}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--brand-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--brand-strong)] disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            <Download className="w-4 h-4" />
                            {exporting ? 'Exporting...' : 'Export'}
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-y border-gray-50 text-[10px] text-gray-500 uppercase font-semibold tracking-wide">
                                <th className="px-6 py-4">Employee ID</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Job Title</th>
                                <th className="px-6 py-4">Department</th>
                                <th className="px-6 py-4 text-center">Employment Type</th>
                                <th className="px-6 py-4">Work Model</th>
                                <th className="px-6 py-4">Join Date</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-10 text-gray-400 text-xs">Loading employees...</td>
                                </tr>
                            ) : employeeData.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center py-10 text-gray-400 text-xs">No employees found.</td>
                                </tr>
                            ) : (
                                employeeData.map((emp) => (
                                    <tr
                                        key={emp.id}
                                        onClick={() => onRowClick(emp.id, emp.status)}
                                        className="hover:bg-orange-50/30 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-5 text-xs text-gray-500 font-semibold">
                                            {emp.employee_id || ' '}
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar
                                                    size="md"
                                                    imageUrl={getProfileImageUrl(emp)}
                                                    fullName={emp.full_name}
                                                    firstName={emp.first_name}
                                                    lastName={emp.last_name}
                                                />
                                                <span className="text-xs font-bold text-gray-900">{emp.full_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-xs text-gray-500 font-medium">{emp.designation || '-'}</td>
                                        <td className="px-6 py-5 text-xs text-gray-500 font-medium">
                                            {renderDepartments(emp.department)}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {emp.employment_type && (
                                                <span className={`px-3 py-1.5 border rounded-lg text-[9px] font-bold uppercase tracking-tight ${emp.employment_type === 'Part-Time' ? 'bg-orange-50 text-orange-400 border-orange-100' : 'bg-orange-50 text-[var(--brand-primary)] border-orange-100'
                                                    }`}>
                                                    {emp.employment_type}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-xs text-gray-600 font-bold">
                                            {emp.work_mode && (
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${emp.work_mode === 'Remote' ? 'bg-[#4D190E]' : 'bg-[var(--brand-soft-border)]'}`}></span>
                                                    {emp.work_mode}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-xs text-gray-500 font-medium">
                                            {emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-tight ${emp.status === 'ACTIVE' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'bg-gray-200 text-gray-500'
                                                }`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Pagination */}
                <div className="p-6 border-t border-gray-50 flex justify-between items-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    <div className="flex items-center gap-2">
                        <span>Show</span>
                        <div className="relative">
                                    <select value={resultsPerPage} onChange={(e) => { setResultsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="text-gray-900 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 appearance-none pr-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)]">
                                <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-40 pointer-events-none" />
                        </div>
                        <span>of {paginationInfo.total} results</span>
                    </div>

                    <div className="flex gap-1.5">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-xl text-xs hover:bg-gray-100 transition-all disabled:opacity-50">
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        {renderPaginationButtons()}

                        <button disabled={currentPage === paginationInfo.total_pages || paginationInfo.total_pages === 0} onClick={() => setCurrentPage(prev => Math.min(prev + 1, paginationInfo.total_pages))} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-xl text-xs hover:bg-gray-100 transition-all disabled:opacity-50">
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AllEmployeesDetails;

