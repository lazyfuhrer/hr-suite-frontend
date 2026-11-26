import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Check, Download, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Header from '../common/Header';
import { useSelector } from 'react-redux';
import {
  getPayrollSummary,
  getPayrollList,
  getPayrollAdjust,
  updatePayrollAdjust,
  updatePayrollStatus,
  downloadPayslip,
  downloadPayrollExcel
} from '../../api/payroll';
import { useLayout } from '../../context/LayoutContext';
import UserAvatar from '../common/UserAvatar';
import { getProfileImageUrl } from '../../utils/userAvatar';
import { useBranding } from '../../context/BrandingContext';

const Payroll = () => {
  const monthOptions = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 8 }, (_, index) => currentYear - 4 + index);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NAME');
  const [sortDir] = useState('ASC');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [summary, setSummary] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [markPaidLoading, setMarkPaidLoading] = useState({});
  const [downloadLoading, setDownloadLoading] = useState({});
  const [exporting, setExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { user } = useSelector((state) => state.auth);
  const { branding } = useBranding();
  const hideOt =
    branding?.organization?.display_ot === true || branding?.organization?.display_ot === 'true';

  const getFileNameFromDisposition = (disposition) => {
    if (!disposition) return null;
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
    const plainMatch = disposition.match(/filename="?([^"]+)"?/i);
    return plainMatch?.[1] || null;
  };

  const handleExportPayroll = async () => {
    try {
      setExporting(true);
      const res = await downloadPayrollExcel({
        month: selectedMonth,
        year: selectedYear,
        sort_by: sortBy,
        sort_dir: sortDir,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: debouncedSearch || undefined,
      });

      const contentDisposition = res?.headers?.['content-disposition'];
      const fileName =
        getFileNameFromDisposition(contentDisposition) ||
        `payroll-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`;

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
      toast.success('Payroll exported');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to export payroll');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const [adjustForm, setAdjustForm] = useState({
    salary_per_month: '',
    fixed_salary: '',
    added_amount: '',
    incentives: [],
    extra_deductions: []
  });

  const { setHeaderConfig } = useLayout();

  useEffect(() => {
    setHeaderConfig({
      title: "Payroll",
      breadcrumb: [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Payroll', path: '/payroll', active: true }
      ],
      onBack: null
    });
  }, [setHeaderConfig])


  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const data = await getPayrollSummary(selectedMonth, selectedYear);
        setSummary(data);
      } catch (error) {
        toast.error('Failed to load payroll summary');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchList = async () => {
      setListLoading(true);
      try {
        const data = await getPayrollList({
          page,
          limit,
          month: selectedMonth,
          year: selectedYear,
          sort_by: sortBy,
          sort_dir: sortDir,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: debouncedSearch || undefined
        });
        setList(data.items || []);
        setTotalPages(data.total_pages || 1);
        setTotalResults(data.total || 0);
      } catch (error) {
        toast.error('Failed to load payroll list');
        console.error(error);
      } finally {
        setListLoading(false);
      }
    };
    fetchList();
  }, [page, limit, selectedMonth, selectedYear, sortBy, sortDir, statusFilter, debouncedSearch]);

  const filteredList = useMemo(() => list, [list]);

  const formatCurrency = (value) => {
    const num = Number(value || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };
  const formatHours = (value) => {
    const num = Number(value || 0);
    return (
      <div className="flex items-center gap-1.5 justify-center md:justify-start">
        {/* <span className="text-[#EB4000] font-bold">🕒</span> */}
        <span>{num}h</span>
      </div>
    );
  };

  const stats = [
    {
      label: 'Total Salary',
      value: formatCurrency(summary?.total_salary?.value || 0),
      change: summary?.total_salary?.change_display || '+0.0%',
      changeText: summary?.total_salary?.previous_month ? `from ${summary.total_salary.previous_month}` : 'from last month',
      icon: 'dollar'
    },
    {
      label: 'Total Allowances',
      value: formatCurrency(summary?.total_allowances?.value || 0),
      change: summary?.total_allowances?.change_display || '+0.0%',
      changeText: summary?.total_allowances?.previous_month ? `from ${summary.total_allowances.previous_month}` : 'from last month',
      icon: 'gift'
    },
    ...(!hideOt
      ? [
          {
            label: 'Total Overtime',
            value: formatHours(summary?.total_overtime?.value || 0),
            change: summary?.total_overtime?.change_display || '+0.0%',
            changeText: summary?.total_overtime?.previous_month ? `from ${summary.total_overtime.previous_month}` : 'from last month',
            icon: 'clock'
          }
        ]
      : []),
    {
      label: 'Total Incentives',
      value: formatCurrency(summary?.total_incentives?.value || 0),
      change: summary?.total_incentives?.change_display || '+0.0%',
      changeText: summary?.total_incentives?.previous_month ? `from ${summary.total_incentives.previous_month}` : 'from last month',
      icon: 'chart'
    }
  ];

  const renderIcon = (type) => {
    switch (type) {
      case 'dollar':
        return (
          <svg className="w-8 h-8 text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v12M9 9h6M9 15h6" />
          </svg>
        );
      case 'gift':
        return (
          <svg className="w-8 h-8 text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
          </svg>
        );
      case 'clock':
        return (
          <svg className="w-8 h-8 text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        );
      case 'chart':
        return (
          <svg className="w-8 h-8 text-[var(--brand-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18M7 16l4-4 4 4 5-6" />
          </svg>
        );
      default:
        return null;
    }
  };

  const openAdjust = async (record) => {
    setSelectedRecord(record);
    setAdjustOpen(true);
    setAdjustLoading(true);
    try {
      const data = await getPayrollAdjust(record.id);
      setAdjustForm({
        salary_per_month: data?.net_payable?.salary_per_month || '',
        fixed_salary: data?.net_payable?.fixed_salary || '',
        added_amount: data?.net_payable?.added_amount || '',
        incentives: data?.incentives || [],
        extra_deductions: data?.extra_deductions || []
      });
      setSelectedRecord((prev) => ({ ...prev, adjustData: data }));
    } catch (error) {
      toast.error('Failed to load adjustment data');
      setAdjustForm({
        salary_per_month: '',
        fixed_salary: '',
        added_amount: '',
        incentives: [],
        extra_deductions: []
      });
      console.error(error);
    } finally {
      setAdjustLoading(false);
    }
  };

  const closeAdjust = () => {
    setAdjustOpen(false);
    setSelectedRecord(null);
  };

  const updateListItem = (key, index, field, value) => {
    setAdjustForm((prev) => ({
      ...prev,
      [key]: prev[key].map((item, i) => (i === index ? { ...item, [field]: value } : item))
    }));
  };

  const addListItem = (key) => {
    setAdjustForm((prev) => ({
      ...prev,
      [key]: [...prev[key], { name: '', amount: '' }]
    }));
  };

  const removeListItem = (key, index) => {
    setAdjustForm((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index)
    }));
  };

  const saveAdjustments = async () => {
    if (!selectedRecord?.id) return;
    const fixedSalary = Number(adjustForm.fixed_salary || 0);
    const addedAmount = Number(adjustForm.added_amount || 0);
    const deductions = Number(selectedRecord?.adjustData?.net_payable?.deductions || 0);
    if (fixedSalary + addedAmount - deductions < 0) return;

    setAdjustSaving(true);
    try {
      const payload = {
        salary_per_month: Number(adjustForm.salary_per_month || 0),
        fixed_salary: Number(adjustForm.fixed_salary || 0),
        added_amount: Number(adjustForm.added_amount || 0),
        incentives: adjustForm.incentives.map((i) => ({
          name: i.name,
          amount: Number(i.amount || 0)
        })),
        extra_deductions: adjustForm.extra_deductions.map((d) => ({
          name: d.name,
          amount: Number(d.amount || 0)
        }))
      };
      await updatePayrollAdjust(selectedRecord.id, payload);
      toast.success('Payroll adjusted');
      closeAdjust();
      const data = await getPayrollList({
        page,
        limit,
        month: selectedMonth,
        year: selectedYear,
        sort_by: sortBy,
        sort_dir: sortDir,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: debouncedSearch || undefined
      });
      setList(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotalResults(data.total || 0);
    } catch (error) {
      toast.error('Failed to save adjustments');
      console.error(error);
    } finally {
      setAdjustSaving(false);
    }
  };

  const markAsPaid = async (recordId) => {
    if (!recordId) return;
    setMarkPaidLoading((prev) => ({ ...prev, [recordId]: true }));
    try {
      await updatePayrollStatus(recordId, { status: 'PAID' });
      toast.success('Marked as paid');
      const data = await getPayrollList({
        page,
        limit,
        month: selectedMonth,
        year: selectedYear,
        sort_by: sortBy,
        sort_dir: sortDir,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: debouncedSearch || undefined
      });
      setList(data.items || []);
      setTotalPages(data.total_pages || 1);
      setTotalResults(data.total || 0);
    } catch (error) {
      toast.error('Failed to mark as paid');
      console.error(error);
    } finally {
      setMarkPaidLoading((prev) => ({ ...prev, [recordId]: false }));
    }
  };

  const getFilenameFromDisposition = (disposition) => {
    if (!disposition) return null;
    const match = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(disposition);
    const filename = match?.[1] || match?.[2] || match?.[3];
    return filename ? decodeURIComponent(filename.trim()) : null;
  };

  const handleDownloadPayslip = async (record) => {
    if (!record?.id) return;
    if (record.status !== 'PAID') return;
    setDownloadLoading((prev) => ({ ...prev, [record.id]: true }));
    try {
      const res = await downloadPayslip(record.id);
      const contentType = res?.headers?.['content-type'] || 'application/pdf';
      const disposition = res?.headers?.['content-disposition'];
      const filename = getFilenameFromDisposition(disposition) || `payslip-${record.id}.pdf`;
      const blob = new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download payslip');
      console.error(error);
    } finally {
      setDownloadLoading((prev) => ({ ...prev, [record.id]: false }));
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'PAID') {
      return (
        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-[var(--brand-primary)] text-white rounded-full text-xs font-medium text-center">
          <Check className="w-3 h-3 shrink-0" />
          <span className="leading-none">Paid</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-[#F3F4F6] text-gray-600 rounded-full text-xs font-medium text-center">
        <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0"></span>
        <span className="leading-none">Pending</span>
      </span>
    );
  };

  const adjustData = selectedRecord?.adjustData;
  const summaryData = adjustData?.summary || {};

  const fixedVal = Number(adjustForm.fixed_salary || 0);
  const addedVal = Number(adjustForm.added_amount || 0);
  const dedVal = Number(adjustData?.net_payable?.deductions || 0);
  const netPayablePreview = fixedVal + addedVal - dedVal;
  const adjustNetSalaryError =
    netPayablePreview < 0 ? 'Net Salary cannot be negative. Please adjust earnings or deductions.' : '';
  const totalBar = fixedVal + addedVal + dedVal || 1;
  const fixedPct = (fixedVal / totalBar) * 100;
  const addedPct = (addedVal / totalBar) * 100;
  const dedPct = (dedVal / totalBar) * 100;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">


      <div className="grid grid-cols-4 gap-5 mb-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between transition-transform hover:scale-[1.02] duration-300"
          >
            <div>
              <p className="text-sm text-gray-500 font-medium mb-2">{stat.label}</p>
              <h2 className="text-3xl font-bold text-gray-900 mb-1">{loading ? '-' : stat.value}</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--brand-primary)] bg-[var(--brand-soft-alt)] px-2 py-0.5 rounded-full">{stat.change}</span>
                {stat.changeText && <span className="text-xs text-gray-400">{stat.changeText}</span>}
              </div>
            </div>
            <div className="w-14 h-14 bg-[var(--brand-soft-alt)] rounded-2xl flex items-center justify-center">
              {renderIcon(stat.icon)}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">Payroll List</h3>
          <div className="flex items-center gap-4">
            <div className="relative">
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee, ID, etc"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl w-64 focus:outline-none focus:border-[var(--brand-soft-border)] text-sm"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 appearance-none pr-8"
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 appearance-none pr-8"
              >
                <option value="NAME">Name</option>
                <option value="JOB_TITLE">Job Title</option>
                <option value="SALARY">Salary</option>
                <option value="TOTAL">Total</option>
                <option value="STATUS">Status</option>
                <option value="DATE">Date</option>
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value));
                  setPage(1);
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 appearance-none pr-8"
              >
                {monthOptions.map((monthLabel, index) => (
                  <option key={monthLabel} value={index + 1}>
                    {monthLabel}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                  setPage(1);
                }}
                className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-medium text-gray-700 appearance-none pr-8"
              >
                {yearOptions.map((yearValue) => (
                  <option key={yearValue} value={yearValue}>
                    {yearValue}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <button
              type="button"
              onClick={handleExportPayroll}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[var(--brand-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--brand-strong)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-4 px-3 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                    Name
                    {/* <ChevronDown className="w-3 h-3" /> */}
                  </div>
                </th>
                <th className="text-left py-4 px-3 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                    Job Title
                    {/* <ChevronDown className="w-3 h-3" /> */}
                  </div>
                </th>
                <th className="text-left py-4 px-3 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                    Salary
                    {/* <ChevronDown className="w-3 h-3" /> */}
                  </div>
                </th>
                <th className="text-left py-4 px-3 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                    Net Salary
                    {/* <ChevronDown className="w-3 h-3" /> */}
                  </div>
                </th>
                <th className="text-left py-4 px-3 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                    Incen.
                    {/* <ChevronDown className="w-3 h-3" /> */}
                  </div>
                </th>
                <th className="text-left py-4 px-3 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                    Deduct.
                    {/* <ChevronDown className="w-3 h-3" /> */}
                  </div>
                </th>
                <th className="text-left py-4 px-3 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                    Total
                    {/* <ChevronDown className="w-3 h-3" /> */}
                  </div>
                </th>
                <th className="text-left py-4 px-3 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                    Status
                    {/* <ChevronDown className="w-3 h-3" /> */}
                  </div>
                </th>
                <th className="text-left py-4 px-3 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                    Date
                    {/* <ChevronDown className="w-3 h-3" /> */}
                  </div>
                </th>
                <th className="text-left py-4 px-3 text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
                    Payslip
                    {/* <ChevronDown className="w-3 h-3" /> */}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan="10" className="py-10 text-center text-gray-400">Loading payroll...</td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-10 text-center text-gray-400">No payroll data found</td>
                </tr>
              ) : (
                filteredList.map((employee) => (
                  <tr key={employee.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          size="lg"
                          imageUrl={getProfileImageUrl(employee) || getProfileImageUrl(employee.name)}
                          fullName={employee.name?.full_name}
                          firstName={employee.name?.first_name}
                          lastName={employee.name?.last_name}
                        />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{employee.name?.full_name || '-'}</p>
                          <p className="text-xs text-gray-400">{employee.name?.employee_id || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <p className="text-sm font-medium text-gray-900">{employee.job_title?.title || '-'}</p>
                      <p className="text-xs text-gray-400">{employee.job_title?.department || '-'}</p>
                    </td>
                    <td className="py-4 px-3 text-sm text-gray-600">{formatCurrency(employee.salary)}</td>
                    <td className="py-4 px-3 text-sm text-gray-600">{formatCurrency(employee.net_salary)}</td>
                    <td className="py-4 px-3 text-sm text-gray-600">{formatCurrency(employee.incentives)}</td>
                    <td className="py-4 px-3 text-sm text-gray-600">{formatCurrency(employee.deductions)}</td>
                    <td className="py-4 px-3 text-sm font-semibold text-[var(--brand-primary)]">{formatCurrency(employee.total)}</td>
                    <td className="py-4 px-3">
                      <div className="flex flex-col gap-2">
                        {getStatusBadge(employee.status)}
                        {['admin', 'hr'].includes(String(user?.role || '').toLowerCase()) && (
                          <>
                            {employee.status === 'PENDING' && (
                              <button
                                onClick={() => markAsPaid(employee.id)}
                                disabled={markPaidLoading[employee.id]}
                                className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-[#22C55E] text-white disabled:opacity-60"
                              >
                                {markPaidLoading[employee.id] ? 'Updating...' : 'Mark as Paid'}
                              </button>
                            )}
                            <button
                              onClick={() => openAdjust(employee)}
                              className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-[#F5C04A] text-white"
                            >
                              Adjust
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-3 text-sm text-gray-600">{employee.date || '-'}</td>
                    <td className="py-4 px-3">
                      {(() => {
                        const isPending = employee.status !== 'PAID';
                        const isDownloading = !!downloadLoading[employee.id];
                        const isDisabled = isPending || isDownloading;
                        const buttonClasses = [
                          'flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors',
                          isPending ? 'opacity-50 blur-[1px] cursor-not-allowed' : 'hover:bg-gray-50',
                          isDownloading ? 'opacity-80 cursor-wait' : ''
                        ]
                          .filter(Boolean)
                          .join(' ');
                        return (
                          <button
                            disabled={isDisabled}
                            onClick={() => handleDownloadPayslip(employee)}
                            className={buttonClasses}
                          >
                            <Download className="w-4 h-4" />
                            {isDownloading ? 'Downloading...' : 'Download'}
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Show</span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm font-medium"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>of {totalResults} results</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 disabled:opacity-50"
            >
              <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium ${page === p ? 'bg-[var(--brand-primary)] text-white' : 'hover:bg-gray-100 text-gray-600'
                  }`}
              >
                {p}
              </button>
            ))}
            {totalPages > 5 && (
              <>
                <span className="px-2 text-gray-400">...</span>
                <button className="w-8 h-8 rounded-lg hover:bg-gray-100 text-sm font-medium text-gray-600">
                  {totalPages}
                </button>
              </>
            )}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 disabled:opacity-50"
            >
              <ChevronUp className="w-4 h-4 rotate-90" />
            </button>
          </div>
        </div>
      </div>

      {adjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[460px] max-h-[85vh] rounded-3xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Adjust Salary</h3>
                <p className="text-sm text-gray-500">
                  {selectedRecord?.name?.full_name || 'Employee'}
                  {' - '}
                  {selectedRecord?.job_title?.department || 'Department'}
                </p>
              </div>
              <button onClick={closeAdjust} className="p-1 rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
            <div className="px-6 pb-4">
              <div className={`grid gap-3 ${hideOt ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <div className="bg-[#EAF9F0] rounded-2xl p-3 text-center">
                  <p className="text-[#1EA768] font-semibold text-sm">Worked</p>
                  <p className="text-xl font-bold text-[#1EA768]">
                    {summaryData.worked_days || 0}/{summaryData.total_working_days || 0}
                  </p>
                  <p className="text-xs text-[#1EA768]">Days</p>
                </div>
                {!hideOt && (
                  <div className="bg-[#FFF5E8] rounded-2xl p-3 text-center">
                    <p className="text-[#EB6B00] font-semibold text-sm">Overtime</p>
                    <p className="text-xl font-bold text-[#EB6B00]">{summaryData.overtime_hours || 0}</p>
                    <p className="text-xs text-[#EB6B00]">Hours</p>
                  </div>
                )}
                <div className="bg-[#FFEFF0] rounded-2xl p-3 text-center">
                  <p className="text-[#E64A19] font-semibold text-sm">Unpaid</p>
                  <p className="text-xl font-bold text-[#E64A19]">{summaryData.unpaid_days || 0} Days</p>
                </div>
              </div>
            </div>

            <div className="px-6 pb-4">
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-bold text-gray-900 mb-2">Net Payable</h4>
                <div className="bg-[#FFF9F7] rounded-2xl p-4">
                  {adjustNetSalaryError && (
                    <p className="text-xs text-red-600 mb-2">{adjustNetSalaryError}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Salary /month</span>
                    <input
                      type="number"
                      disabled
                      value={adjustForm.salary_per_month}
                      onChange={(e) => setAdjustForm(prev => ({ ...prev, salary_per_month: e.target.value }))}
                      className={`w-28 text-right bg-white border rounded-lg px-2 py-1 text-sm font-bold text-gray-900 ${adjustNetSalaryError ? 'border-red-300' : 'border-gray-100'
                        }`}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div>
                      <label className="text-[10px] text-gray-500">Fixed Salary</label>
                      <input
                        type="number"
                        disabled
                        value={adjustForm.fixed_salary}
                        onChange={(e) => setAdjustForm(prev => ({ ...prev, fixed_salary: e.target.value }))}
                        className="w-full bg-white border border-gray-100 rounded-lg px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Added Amount</label>
                      <input
                        type="number"
                        disabled
                        value={adjustForm.added_amount}
                        onChange={(e) => setAdjustForm(prev => ({ ...prev, added_amount: e.target.value }))}
                        className="w-full bg-white border border-gray-100 rounded-lg px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500">Deductions</label>
                      <input
                        type="number"
                        disabled
                        value={adjustData?.net_payable?.deductions || 0}
                        readOnly
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-xs text-gray-500"
                      />
                    </div>
                  </div>
                  <div className="mt-3 h-3 rounded-full overflow-hidden bg-white border border-[var(--brand-soft-border)] flex">
                    <div style={{ width: `${fixedPct}%` }} className="bg-[#F5C04A]"></div>
                    <div style={{ width: `${addedPct}%` }} className="bg-[#22C55E]"></div>
                    <div style={{ width: `${dedPct}%` }} className="bg-[#EF4444]"></div>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-gray-600 mt-2">
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F5C04A]"></span>Fixed: {formatCurrency(adjustForm.fixed_salary || 0)}</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22C55E]"></span>Added: {formatCurrency(adjustForm.added_amount || 0)}</div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>Ded: {formatCurrency(adjustData?.net_payable?.deductions || 0)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <Plus className="w-4 h-4 text-[#22C55E]" /> {hideOt ? 'Incentives' : 'Incentives & Overtime'}
                </div>
                <button onClick={() => addListItem('incentives')} className="text-xs text-[var(--brand-primary)] font-medium">+ Add Items</button>
              </div>
              <div className="bg-[#FFF9F7] rounded-2xl p-4 space-y-3">
                {adjustForm.incentives.length === 0 && (
                  <p className="text-xs text-gray-400">No incentives added</p>
                )}
                {adjustForm.incentives.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={item.name}
                      onChange={(e) => updateListItem('incentives', index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-100 bg-white text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => updateListItem('incentives', index, 'amount', e.target.value)}
                      className="w-28 px-3 py-2 rounded-xl border border-gray-100 bg-white text-sm"
                    />
                    <button onClick={() => removeListItem('incentives', index)} className="p-2 rounded-lg hover:bg-white">
                      <Trash2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <Plus className="w-4 h-4 text-[#EF4444]" /> Extra Deductions
                </div>
                <button onClick={() => addListItem('extra_deductions')} className="text-xs text-[var(--brand-primary)] font-medium">+ Add Items</button>
              </div>
              <div className="bg-[#FFF9F7] rounded-2xl p-4 space-y-3">
                {adjustForm.extra_deductions.length === 0 && (
                  <p className="text-xs text-gray-400">No deductions added</p>
                )}
                {adjustForm.extra_deductions.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={item.name}
                      onChange={(e) => updateListItem('extra_deductions', index, 'name', e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-100 bg-white text-sm"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) => updateListItem('extra_deductions', index, 'amount', e.target.value)}
                      className="w-28 px-3 py-2 rounded-xl border border-gray-100 bg-white text-sm"
                    />
                    <button onClick={() => removeListItem('extra_deductions', index)} className="p-2 rounded-lg hover:bg-white">
                      <Trash2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            </div>

            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100">
              <button onClick={closeAdjust} className="text-sm font-medium text-gray-600">Cancel</button>
              <button
                onClick={saveAdjustments}
                disabled={adjustSaving || adjustLoading || !!adjustNetSalaryError}
                className="px-6 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold disabled:opacity-60"
              >
                {adjustSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {adjustLoading && adjustOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="bg-white px-4 py-2 rounded-lg shadow text-xs text-gray-500">Loading adjustment data...</div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
