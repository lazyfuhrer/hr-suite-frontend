import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Mail,
  MapPin,
  Phone,
  Search,
  ChevronDown,
  Edit3,
  Eye,
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  Plus,
  Upload,
  Trash2,
  X,
  KeyRound,
  LogOut,
  Pencil,
  XCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import {
  getUserById,
  getEmployeeBankAndAsset,
  getEmployeeDocuments,
  getEmployeeProfile,
  getEmployeeLeavesSummary,
  getEmployeePayrolls,
  getEmployeeRequestsCombined,
  getEmployeeLeaveRequests,
  getEmployeeAttendanceRequests,
  getEmployeeWfhRequests,
  getEmployeeReimbursementRequests,
  markEmployeeReimbursementMonthPaid,
  getOnboardingStatus,
  getEmployeeExit,
  cancelEmployeeExit
} from '../../api/emoloyees/addEmployees';
import {
  updateLeaveRequestStatus,
  updateAttendanceRequestStatus,
  updateReimbursementRequestStatus,
  updateWfhRequestStatus,
  getWfhRequestById
} from '../../api/requests';
import {
  getPayrollAdjust,
  updatePayrollAdjust,
  updatePayrollStatus,
  downloadPayslip
} from '../../api/payroll';
import EditEmployeeModal from './EditEmployee';
import EditPayrollModal from './EditPayrollModal';
import AppraisalsPayrollModal from './AppraisalsPayrollModal';
import ReplaceEmployeeDocumentModal from './ReplaceEmployeeDocumentModal';
import UploadEmployeeDocumentModal from './UploadEmployeeDocumentModal';
import EditBankDetailsModal from './EditBankDetailsModal';
import { useLayout } from '../../context/LayoutContext';
import { useBranding } from '../../context/BrandingContext';
import UserAvatar from '../common/UserAvatar';
import { getProfileImageUrl } from '../../utils/userAvatar';
import { formatReimbursementExpenseType } from '../../utils/reimbursementType';
import {
  groupReimbursementsByExpenseMonth,
  getReimbursementExpenseDate,
  getReimbursementAmount,
  getReimbursementPaymentStatus,
  formatReimbursementPaymentLabel,
  reimbursementGroupPaymentBadgeClass,
  reimbursementGroupApprovalBadgeClass,
  reimbursementItemPaymentBadgeClass,
  canMarkReimbursementMonthGroupPaid,
  shouldShowPendingApprovalBadge
} from '../../utils/reimbursementGroups';
import RequestDetailsModal from '../requests/RequestDetailsModal';
import EmployeeAllowedLocationsTab from './EmployeeAllowedLocationsTab';
import EmployeeLocationSnapshotsTab from './EmployeeLocationSnapshotsTab';
import EmployeeHolidaysTab from './EmployeeHolidaysTab';
import SendTemporaryPasswordModal from './SendTemporaryPasswordModal';
import EmployeeExitModal from './EmployeeExitModal';
import CancelExitConfirmModal from './CancelExitConfirmModal';
import { isPayrollHiddenForUser } from '../../utils/payrollVisibility';
import {
  isScheduledExit,
  isEmployeeActionsLocked,
  formatEmployeeStatusLabel,
  formatExitTypeLabel,
  formatExitDate
} from '../../utils/employeeExit';

const REQUIRED_UPLOAD_DOC_TYPES = [
  { value: 'AADHAR_FRONT', label: 'Aadhar Front', category: 'IDENTITY' },
  { value: 'AADHAR_BACK', label: 'Aadhar Back', category: 'IDENTITY' },
  { value: 'PASSPORT_SIZE_PHOTO', label: 'Passport Size Photo', category: 'IDENTITY' },
  { value: 'PAN_CARD', label: 'PAN Card', category: 'IDENTITY' },
  { value: 'SIGNED_JOINING_LETTER', label: 'Signed Joining Letter', category: 'LEGAL' },
];

function resolveEmployeeEmail(profile) {
  if (!profile) return '';
  return (
    profile?.user?.email ||
    profile?.official_email ||
    profile?.user?.official_email ||
    profile?.personal_email ||
    ''
  ).trim();
}

function getCancelledChequeInfo(bankAsset) {
  const bd = bankAsset?.bank_details;
  if (!bd?.bank_proof_url && !bd?.bank_proof_key) return null;
  const fileUrl = bd.bank_proof_url || '';
  const fileKey = bd.bank_proof_key || '';
  const label = fileKey.split('/').filter(Boolean).pop() || 'Cancelled cheque';
  return {
    fileUrl,
    label,
  };
}

export default function EmployeeByID({ employeeId, employeeStatus, onBack, onResume }) {
  const { user } = useSelector((state) => state.auth);
  const { branding } = useBranding();
  const hideOt =
    branding?.organization?.display_ot === true || branding?.organization?.display_ot === 'true';
  const isManagerView = user?.role === 'manager';
  const canMarkReimbursementMonthPaid = ['admin', 'hr', 'manager'].includes(
    String(user?.role || '').toLowerCase()
  );
  const canSendTemporaryPassword = ['admin', 'hr'].includes(
    String(user?.role || '').toLowerCase()
  );
  const canManageEmployeeExit = ['admin', 'hr'].includes(
    String(user?.role || '').toLowerCase()
  );
  const shouldHidePayroll = isPayrollHiddenForUser(user);
  const [activeTab, setActiveTab] = useState('Personal Details');
  const [tabLoading, setTabLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [employeeSummary, setEmployeeSummary] = useState(null);
  const [documentsData, setDocumentsData] = useState(null);
  const [documentsRefreshKey, setDocumentsRefreshKey] = useState(0);
  const [replaceDocOpen, setReplaceDocOpen] = useState(false);
  const [replaceDocTarget, setReplaceDocTarget] = useState(null);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState(null);
  const [uploadDocCategory, setUploadDocCategory] = useState(null);
  const [documentsAllForRequiredCheck, setDocumentsAllForRequiredCheck] = useState([]);
  const [bankAssetData, setBankAssetData] = useState(null);
  const [editBankDetailsOpen, setEditBankDetailsOpen] = useState(false);
  const [leaveData, setLeaveData] = useState(null);
  const [payrollData, setPayrollData] = useState(null);
  const [requestsTab, setRequestsTab] = useState('All');
  const [requestsCombined, setRequestsCombined] = useState(null);
  const [requestsLeaves, setRequestsLeaves] = useState(null);
  const [requestsAttendance, setRequestsAttendance] = useState(null);
  const [requestsWfh, setRequestsWfh] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [sendPasswordModalOpen, setSendPasswordModalOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [exitModalMode, setExitModalMode] = useState('create');
  const [exitData, setExitData] = useState(null);
  const [cancelExitModalOpen, setCancelExitModalOpen] = useState(false);
  const [cancelExitLoading, setCancelExitLoading] = useState(false);
  const [calendarView, setCalendarView] = useState({ month: null, year: null });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [editPayrollOpen, setEditPayrollOpen] = useState(false);
  const [appraisalsOpen, setAppraisalsOpen] = useState(false);
  const [selectedPayrollRecord, setSelectedPayrollRecord] = useState(null);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [markPaidLoading, setMarkPaidLoading] = useState({});
  const [downloadLoading, setDownloadLoading] = useState({});
  const [adjustForm, setAdjustForm] = useState({
    salary_per_month: '',
    fixed_salary: '',
    added_amount: '',
    incentives: [],
    extra_deductions: []
  });

  const [documentsPage, setDocumentsPage] = useState(1);
  const [documentsLimit, setDocumentsLimit] = useState(10);
  const [documentsSearch, setDocumentsSearch] = useState('');
  const [documentsDebouncedSearch, setDocumentsDebouncedSearch] = useState('');
  const [reimbursementsData, setReimbursementsData] = useState(null);
  const [expandedReimbursementGroups, setExpandedReimbursementGroups] = useState(() => new Set());
  const [markReimbursementMonthPaidLoading, setMarkReimbursementMonthPaidLoading] = useState({});

  const { setHeaderConfig } = useLayout();

  useEffect(() => {
    setHeaderConfig({
      title: "Employee Details",
      breadcrumb: [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Employees', path: '/employees' },
        { label: 'Employee Details', path: `/employees/${employeeId}`, active: true }
      ],
      onBack: null
    });
  }, [setHeaderConfig])
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!employeeId) return;
    setActiveTab('Personal Details');
    setProfile(null);
    setEmployeeSummary(null);
    setDocumentsData(null);
    setBankAssetData(null);
    setLeaveData(null);
    setPayrollData(null);
    setRequestsTab('All');
    setRequestsCombined(null);
    setRequestsLeaves(null);
    setRequestsAttendance(null);
    setRequestsWfh(null);
    setReimbursementsData(null);
    setExpandedReimbursementGroups(new Set());
    setCalendarView({ month: null, year: null });
    setAdjustOpen(false);
    setSelectedPayrollRecord(null);
    setAdjustForm({
      salary_per_month: '',
      fixed_salary: '',
      added_amount: '',
      incentives: [],
      extra_deductions: []
    });
    setMarkPaidLoading({});
    setMarkReimbursementMonthPaidLoading({});
    setDownloadLoading({});
    setExitData(null);
    setExitModalOpen(false);
    setCancelExitModalOpen(false);
    setEditBankDetailsOpen(false);
    setResolvedStatus(employeeStatus ?? null);
  }, [employeeId, employeeStatus]);

  const fetchEmployeeExit = async () => {
    if (!employeeId || !canManageEmployeeExit) return;
    try {
      const res = await getEmployeeExit(employeeId);
      setExitData(res?.exit ?? null);
    } catch (error) {
      console.error('Failed to fetch employee exit', error);
    }
  };

  const fetchEmployeeSummary = async () => {
    if (!employeeId) return;
    try {
      const res = await getUserById(employeeId);
      const employee = res?.employee ?? res?.data?.employee ?? null;
      setEmployeeSummary(employee);
      const status = employee?.status ?? null;
      if (status) setResolvedStatus(status);
    } catch (error) {
      console.error('Failed to fetch employee summary', error);
    }
  };

  const refreshExitAndProfile = () => {
    setProfile(null);
    setOnboardingStatus(null);
    fetchEmployeeExit();
    fetchEmployeeSummary();
  };

  useEffect(() => {
    fetchEmployeeExit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, canManageEmployeeExit]);

  const handleCancelExit = async () => {
    setCancelExitLoading(true);
    try {
      const res = await cancelEmployeeExit(employeeId);
      toast.success(res?.message || 'Exit cancelled successfully');
      setCancelExitModalOpen(false);
      refreshExitAndProfile();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to cancel exit');
    } finally {
      setCancelExitLoading(false);
    }
  };

  const canEditBankAndAsset = canSendTemporaryPassword && !isManagerView;

  const [resolvedStatus, setResolvedStatus] = useState(employeeStatus ?? null);

  useEffect(() => {
    setResolvedStatus(employeeStatus ?? null);
  }, [employeeId, employeeStatus]);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getUserById(employeeId);
        if (cancelled) return;
        const employee = res?.employee ?? res?.data?.employee ?? null;
        setEmployeeSummary(employee);
        const status = employee?.status ?? null;
        if (status) setResolvedStatus(status);
      } catch (error) {
        console.error('Failed to fetch employee summary', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const actionsLocked = isEmployeeActionsLocked(resolvedStatus);
  const lockedTitle = actionsLocked
    ? `Actions are disabled while this employee is ${formatEmployeeStatusLabel(resolvedStatus)}`
    : undefined;

  useEffect(() => {
    if (!employeeId) return;
    const fetchTab = async () => {
      setTabLoading(true);
      try {
        if (activeTab === 'Personal Details' && !profile) {
          const res = await getEmployeeProfile(employeeId);
          setProfile(res?.data ?? res);
        }
        if (activeTab === 'Bank Details' && !bankAssetData) {
          const res = await getEmployeeBankAndAsset(employeeId);
          setBankAssetData(res?.data ?? res);
        }
        if (activeTab === 'Leaves') {
          const monthToFetch = calendarView.month || leaveData?.calendar?.month || new Date().getMonth() + 1;
          const yearToFetch = calendarView.year || leaveData?.calendar?.year || new Date().getFullYear();
          const shouldFetchLeaves =
            !leaveData ||
            leaveData?.calendar?.month !== monthToFetch ||
            leaveData?.calendar?.year !== yearToFetch;
          if (shouldFetchLeaves) {
            const res = await getEmployeeLeavesSummary(employeeId, { month: monthToFetch, year: yearToFetch });
            setLeaveData(res?.data ?? res);
          }
        }
        if (activeTab === 'Payroll' && !shouldHidePayroll && !payrollData) {
          const res = await getEmployeePayrolls(employeeId);
          setPayrollData(res?.items ?? res);
        }
        if (activeTab === 'Requests') {
          if (requestsTab === 'All' && !requestsCombined) {
            const res = await getEmployeeRequestsCombined(employeeId);
            setRequestsCombined(res);
          }
          if (requestsTab === 'Leaves' && !requestsLeaves) {
            const res = await getEmployeeLeaveRequests(employeeId);
            setRequestsLeaves(res);
          }
          if (requestsTab === 'Attendance' && !requestsAttendance) {
            const res = await getEmployeeAttendanceRequests(employeeId);
            setRequestsAttendance(res);
          }
          if (requestsTab === 'WFH' && !requestsWfh) {
            const res = await getEmployeeWfhRequests(employeeId);
            setRequestsWfh(res);
          }
        }

        // Fetch Onboarding Status once to check if we can resume
        if (activeTab === 'Personal Details' && !onboardingStatus) {
          try {
            const statusRes = await getOnboardingStatus(employeeId);
            setOnboardingStatus(statusRes);
          } catch (err) {
            console.error("Failed to fetch onboarding status", err);
          }
        }
      } catch (error) {
        toast.error('Failed to load tab data');
        console.error(error);
      } finally {
        setTabLoading(false);
      }
    };
    fetchTab();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTab,
    employeeId,
    profile,
    bankAssetData,
    leaveData,
    payrollData,
    requestsTab,
    requestsCombined,
    requestsLeaves,
    requestsAttendance,
    requestsWfh,
    calendarView.month,
    calendarView.year,
    refreshKey,
    shouldHidePayroll,
  ]);

  // Dedicated effect for documents tab to avoid repeated calls
  useEffect(() => {
    if (!employeeId || activeTab !== 'Documents') return;
    const fetchDocuments = async () => {
      setTabLoading(true);
      try {
        const res = await getEmployeeDocuments(employeeId, {
          page: documentsPage,
          limit: documentsLimit,
          search: documentsDebouncedSearch || undefined,
        });
        setDocumentsData(res?.data ?? res);
      } catch (error) {
        toast.error('Failed to load documents');
        console.error(error);
      } finally {
        setTabLoading(false);
      }
    };
    fetchDocuments();
  }, [employeeId, activeTab, documentsPage, documentsLimit, documentsDebouncedSearch, documentsRefreshKey]);

  useEffect(() => {
    if (!employeeId || activeTab !== 'Documents') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getEmployeeDocuments(employeeId, { page: 1, limit: 100 });
        if (cancelled) return;
        const data = res?.data ?? res;
        setDocumentsAllForRequiredCheck(data?.documents || []);
      } catch (error) {
        if (!cancelled) console.error('Failed to load documents for required check', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employeeId, activeTab, documentsRefreshKey]);

  const fetchReimbursements = useCallback(async () => {
    if (!employeeId) return;
    setTabLoading(true);
    try {
      const limit = 100;
      let page = 1;
      let allItems = [];
      let lastPage = null;

      // API max limit is 100; fetch all pages for month grouping
      while (page <= 50) {
        const res = await getEmployeeReimbursementRequests(employeeId, { page, limit });
        const data = res?.data ?? res;
        lastPage = data;
        const items = Array.isArray(data) ? data : data?.items || data?.data || [];
        allItems = allItems.concat(items);

        const totalPages = data?.total_pages ?? 1;
        if (page >= totalPages || items.length === 0) break;
        page += 1;
      }

      if (Array.isArray(lastPage)) {
        setReimbursementsData(allItems);
      } else {
        setReimbursementsData({
          ...(lastPage && typeof lastPage === 'object' ? lastPage : {}),
          items: allItems,
          total: lastPage?.total ?? allItems.length,
          page: 1,
          limit: allItems.length,
          total_pages: 1
        });
      }
    } catch (error) {
      toast.error('Failed to load reimbursement requests');
      console.error(error);
    } finally {
      setTabLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId || activeTab !== 'Reimbursements') return;
    fetchReimbursements();
  }, [employeeId, activeTab, fetchReimbursements]);

  const markReimbursementMonthAsPaid = async (group) => {
    if (!employeeId || !group?.year || !group?.month) return;
    const groupKey = group.key;
    setMarkReimbursementMonthPaidLoading((prev) => ({ ...prev, [groupKey]: true }));
    try {
      const res = await markEmployeeReimbursementMonthPaid(employeeId, {
        year: group.year,
        month: group.month
      });
      const updatedCount = res?.updated_count ?? 0;
      if (updatedCount > 0) {
        toast.success(
          `Marked ${updatedCount} reimbursement${updatedCount === 1 ? '' : 's'} as paid for ${group.label}`
        );
      } else {
        toast.success(`No unpaid approved requests to mark for ${group.label}`);
      }
      await fetchReimbursements();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to mark as paid');
      console.error(error);
    } finally {
      setMarkReimbursementMonthPaidLoading((prev) => ({ ...prev, [groupKey]: false }));
    }
  };

  const formatDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value) => {
    const num = Number(value || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatReimbursementAmount = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const tabs = useMemo(() => {
    const baseTabs = ['Personal Details', 'Documents', 'Bank Details', 'Leaves', 'Holidays', 'Requests', 'Reimbursements', 'Payroll', 'Location', 'Location Snapshots'];
    if (!shouldHidePayroll) return baseTabs;
    return baseTabs.filter((tab) => tab !== 'Payroll');
  }, [shouldHidePayroll]);

  const documentsList = useMemo(() => {
    return documentsData?.documents || [];
  }, [documentsData]);

  const missingRequiredDocTypes = useMemo(() => {
    const existing = new Set(
      (documentsAllForRequiredCheck || []).map((d) => String(d.doc_type || '').trim())
    );
    return REQUIRED_UPLOAD_DOC_TYPES.filter((t) => !existing.has(t.value));
  }, [documentsAllForRequiredCheck]);

  useEffect(() => {
    if (!shouldHidePayroll) return;
    if (activeTab === 'Payroll') setActiveTab('Personal Details');
  }, [shouldHidePayroll, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDocumentsDebouncedSearch(documentsSearch);
      setDocumentsPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [documentsSearch]);

  const renderDocumentsPaginationButtons = () => {
    const totalPages = documentsData?.total_pages || 1;
    const page = documentsPage;
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
          <span key={`docs-dots-${idx}`} className="px-2 text-gray-400 text-xs">
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => setDocumentsPage(p)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
              page === p
                ? 'bg-[var(--brand-primary)] text-white'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        )
    );
  };

  const leaveSummary = leaveData?.leave_summary || {};
  const calendarData = leaveData?.calendar || {};
  const defaultCalendarMonth = new Date().getMonth() + 1;
  const defaultCalendarYear = new Date().getFullYear();

  const formatLabel = (value) => {
    if (!value) return '-';
    return String(value)
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const leaveCardColors = (index) => {
    const palette = [
      { panel: 'var(--brand-soft-alt)', ring: 'var(--brand-primary)', ringTrack: 'var(--brand-soft-border)' },
      { panel: '#F0F9FF', ring: '#0369A1', ringTrack: '#BAE6FD' },
      { panel: '#F0FDF4', ring: '#15803D', ringTrack: '#BBF7D0' },
      { panel: '#FAF5FF', ring: '#7E22CE', ringTrack: '#E9D5FF' },
      { panel: '#FFFBEB', ring: '#B45309', ringTrack: '#FDE68A' },
      { panel: '#FDF2F8', ring: '#BE185D', ringTrack: '#FBCFE8' }
    ];
    if (index < palette.length) return palette[index];
    const hue = (index * 47) % 360;
    return {
      panel: `hsl(${hue} 70% 96%)`,
      ring: `hsl(${hue} 62% 40%)`,
      ringTrack: `hsl(${hue} 45% 84%)`
    };
  };

  const leaveCards = useMemo(() => {
    const cards = [{
      id: 'all-leaves',
      label: 'All Leaves',
      used: Number(leaveSummary?.all_leaves?.used || 0),
      quota: Number(leaveSummary?.all_leaves?.quota || 0)
    }];
    const dynamicTypes = Array.isArray(leaveSummary?.types) ? leaveSummary.types : [];
    dynamicTypes.forEach((type, idx) => {
      cards.push({
        id: type?.id || `leave-type-${idx}`,
        label: type?.name || `Leave Type ${idx + 1}`,
        used: Number(type?.used || 0),
        quota: Number(type?.quota || 0)
      });
    });
    return cards;
  }, [leaveSummary]);

  const normalizeStatusKey = (value) => String(value || '').trim().toUpperCase();

  const calendarEntries = useMemo(() => {
    const map = {};
    (calendarData.entries || []).forEach((e) => {
      map[e.date] = e.status;
    });
    return map;
  }, [calendarData]);

  const legendCountByStatus = useMemo(() => {
    const map = {};
    const legend = calendarData?.legend || {};
    Object.entries(legend).forEach(([key, count]) => {
      map[normalizeStatusKey(key)] = Number(count || 0);
    });
    return map;
  }, [calendarData?.legend]);

  const statusKeys = useMemo(() => {
    const keys = new Set(Object.keys(legendCountByStatus));
    (calendarData.entries || []).forEach((entry) => {
      const normalized = normalizeStatusKey(entry?.status);
      if (normalized) keys.add(normalized);
    });
    const preferredOrder = ['PRESENT', 'LATE', 'ON_LEAVE', 'ABSENT'];
    return [
      ...preferredOrder.filter((k) => keys.has(k)),
      ...Array.from(keys).filter((k) => !preferredOrder.includes(k))
    ];
  }, [calendarData.entries, legendCountByStatus]);

  const statusColorByKey = useMemo(() => {
    const presets = {
      PRESENT: { bg: 'var(--brand-soft-alt)', text: 'var(--brand-primary)', dot: 'var(--brand-soft-border)' },
      LATE: { bg: 'var(--brand-primary)', text: '#FFFFFF', dot: 'var(--brand-primary)' },
      ON_LEAVE: { bg: '#4D190E', text: '#FFFFFF', dot: '#4D190E' },
      ABSENT: { bg: '#E5E7EB', text: '#4B5563', dot: '#D1D5DB' }
    };
    const result = {};
    let dynamicIndex = 0;
    statusKeys.forEach((statusKey) => {
      if (presets[statusKey]) {
        result[statusKey] = presets[statusKey];
        return;
      }
      const hue = (dynamicIndex * 61 + 20) % 360;
      result[statusKey] = {
        bg: `hsl(${hue} 85% 92%)`,
        text: `hsl(${hue} 60% 32%)`,
        dot: `hsl(${hue} 72% 42%)`
      };
      dynamicIndex += 1;
    });
    return result;
  }, [statusKeys]);

  const getStatusStyle = (status) => {
    const statusKey = normalizeStatusKey(status);
    const colors = statusColorByKey[statusKey];
    if (!colors) return {};
    return {
      backgroundColor: colors.bg,
      color: colors.text
    };
  };

  useEffect(() => {
    if (!calendarData?.month || !calendarData?.year) return;
    setCalendarView({ month: calendarData.month, year: calendarData.year });
  }, [calendarData?.month, calendarData?.year]);

  const displayedMonth = calendarView.month || calendarData.month || defaultCalendarMonth;
  const displayedYear = calendarView.year || calendarData.year || defaultCalendarYear;
  const displayMonthIndex = displayedMonth - 1;
  const displayMonthName = new Date(displayedYear, displayMonthIndex, 1).toLocaleString('en-US', { month: 'long' });
  const displayDaysInMonth = new Date(displayedYear, displayMonthIndex + 1, 0).getDate();
  const displayFirstDay = new Date(displayedYear, displayMonthIndex, 1).getDay();
  const displayDayCells = Array.from({ length: displayFirstDay }, () => null).concat(
    Array.from({ length: displayDaysInMonth }, (_, i) => i + 1)
  );

  const handleCalendarNav = (direction) => {
    const baseMonth = calendarView.month || calendarData.month || defaultCalendarMonth;
    const baseYear = calendarView.year || calendarData.year || defaultCalendarYear;
    const nextDate = new Date(baseYear, baseMonth - 1 + direction, 1);
    setCalendarView({ month: nextDate.getMonth() + 1, year: nextDate.getFullYear() });
  };

  console.log("checking the payroll", payrollData);
  const payrollItems = payrollData || [];

  const employeeDisplay = useMemo(() => {
    const firstName = employeeSummary?.first_name ?? profile?.first_name ?? '';
    const lastName = employeeSummary?.last_name ?? profile?.last_name ?? '';
    const fullName =
      employeeSummary?.full_name ||
      `${firstName} ${lastName}`.trim() ||
      '-';
    const designation = employeeSummary?.designation ?? profile?.designation ?? '-';
    const departmentName =
      employeeSummary?.department?.name ?? profile?.department?.name ?? '';
    const employeeIdLabel =
      employeeSummary?.employee_id ??
      onboardingStatus?.employee_id ??
      profile?.employee_id ??
      '-';
    const imageUrl =
      getProfileImageUrl(employeeSummary) ||
      getProfileImageUrl(profile);

    return {
      firstName,
      lastName,
      fullName,
      designation,
      departmentName,
      employeeIdLabel,
      imageUrl,
    };
  }, [employeeSummary, profile, onboardingStatus]);

  const employeeName = employeeDisplay.fullName;
  const employeeAccountEmail = useMemo(() => resolveEmployeeEmail(profile), [profile]);
  const statusLabel = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (!normalized) return 'Pending';
    if (normalized === 'APPROVED') return 'Verified';
    if (normalized === 'PAID') return 'Paid';
    if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'Cancelled';
    return normalized.replace(/_/g, ' ');
  };

  const statusBadgeClass = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'APPROVED') return 'bg-[var(--brand-primary)] text-white';
    if (normalized === 'PAID') return 'bg-[var(--brand-primary)] text-white';
    if (normalized === 'PENDING') return 'bg-gray-200 text-gray-600';
    if (normalized === 'REJECTED') return 'bg-red-100 text-red-600';
    if (normalized === 'CANCELLED' || normalized === 'CANCELED') return 'bg-gray-100 text-gray-600';
    if (normalized === 'N/A') return 'bg-gray-100 text-gray-500';
    return 'bg-gray-100 text-gray-600';
  };

  const getPayrollStatusBadge = (status) => {
    if (status === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--brand-primary)] text-white rounded-full text-xs font-medium">
          <Check className="w-3 h-3" /> Paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#F3F4F6] text-gray-600 rounded-full text-xs font-medium">
        <span className="w-2 h-2 rounded-full bg-gray-400"></span> Pending
      </span>
    );
  };

  const refreshEmployeePayrolls = async () => {
    const res = await getEmployeePayrolls(employeeId);
    setPayrollData(res?.items ?? res);
  };

  const openAdjust = async (record) => {
    setSelectedPayrollRecord(record);
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
      setSelectedPayrollRecord((prev) => ({ ...prev, adjustData: data }));
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
    setSelectedPayrollRecord(null);
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
    if (!selectedPayrollRecord?.id) return;
    const fixedSalary = Number(adjustForm.fixed_salary || 0);
    const addedAmount = Number(adjustForm.added_amount || 0);
    const deductions = Number(selectedPayrollRecord?.adjustData?.net_payable?.deductions || 0);
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
      await updatePayrollAdjust(selectedPayrollRecord.id, payload);
      toast.success('Payroll adjusted');
      closeAdjust();
      await refreshEmployeePayrolls();
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
      await refreshEmployeePayrolls();
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

  const adjustData = selectedPayrollRecord?.adjustData;
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

  const requestTabs = ['All', 'Leaves', 'Attendance', 'WFH'];
  const combinedRequests = useMemo(() => {
    if (Array.isArray(requestsCombined)) return requestsCombined;
    return requestsCombined?.data || requestsCombined?.items || [];
  }, [requestsCombined]);
  const leaveRequests = useMemo(() => {
    if (Array.isArray(requestsLeaves)) return requestsLeaves;
    return requestsLeaves?.data || requestsLeaves?.items || [];
  }, [requestsLeaves]);
  const attendanceRequests = useMemo(() => {
    if (Array.isArray(requestsAttendance)) return requestsAttendance;
    return requestsAttendance?.items || requestsAttendance?.data || [];
  }, [requestsAttendance]);
  const wfhRequests = useMemo(() => {
    if (Array.isArray(requestsWfh)) return requestsWfh;
    return requestsWfh?.items || requestsWfh?.data || [];
  }, [requestsWfh]);
  const reimbursementItems = useMemo(() => {
    if (Array.isArray(reimbursementsData)) return reimbursementsData;
    return reimbursementsData?.items || reimbursementsData?.data || [];
  }, [reimbursementsData]);

  const reimbursementMonthGroups = useMemo(
    () => groupReimbursementsByExpenseMonth(reimbursementItems),
    [reimbursementItems]
  );

  const toggleReimbursementGroup = (groupKey) => {
    setExpandedReimbursementGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const openRequestModal = async (type, data) => {
    const normalizedType = String(type || '').toUpperCase();
    setSelectedRequest({ type: normalizedType, data });
    if (normalizedType === 'WFH' && data?.id) {
      try {
        const detail = await getWfhRequestById(data.id);
        setSelectedRequest((prev) =>
          prev?.data?.id === data.id && prev?.type === 'WFH'
            ? { type: 'WFH', data: { ...data, ...detail } }
            : prev
        );
      } catch (error) {
        console.error(error);
      }
    }
  };

  const closeRequestModal = () => {
    setSelectedRequest(null);
  };

  const buildRequestStatusPayload = (status, comment) => {
    const payload = { status };
    const trimmed = (comment || '').trim();
    if (trimmed) payload.comment = trimmed;
    return payload;
  };

  const handleRequestApprove = async (comment) => {
    if (!selectedRequest) return;
    const payload = buildRequestStatusPayload('APPROVED', comment);
    setRequestActionLoading(true);
    try {
      if (selectedRequest.type === 'LEAVE') {
        await updateLeaveRequestStatus(selectedRequest.data.id, payload);
        setRequestsLeaves(null);
      } else if (selectedRequest.type === 'REIMBURSEMENT') {
        await updateReimbursementRequestStatus(selectedRequest.data.id, payload);
        if (activeTab === 'Reimbursements') {
          await fetchReimbursements();
        } else {
          setReimbursementsData(null);
        }
      } else if (selectedRequest.type === 'WFH') {
        await updateWfhRequestStatus(selectedRequest.data.id, payload);
        setRequestsWfh(null);
      } else if (selectedRequest.type === 'ATTENDANCE') {
        await updateAttendanceRequestStatus(selectedRequest.data.id, payload);
        setRequestsAttendance(null);
      } else {
        return;
      }
      setRequestsCombined(null);
      toast.success('Request approved');
      closeRequestModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to approve');
      console.error(error);
    } finally {
      setRequestActionLoading(false);
    }
  };

  const handleRequestReject = async (comment) => {
    if (!selectedRequest) return;
    const payload = buildRequestStatusPayload('REJECTED', comment);
    setRequestActionLoading(true);
    try {
      if (selectedRequest.type === 'LEAVE') {
        await updateLeaveRequestStatus(selectedRequest.data.id, payload);
        setRequestsLeaves(null);
      } else if (selectedRequest.type === 'REIMBURSEMENT') {
        await updateReimbursementRequestStatus(selectedRequest.data.id, payload);
        if (activeTab === 'Reimbursements') {
          await fetchReimbursements();
        } else {
          setReimbursementsData(null);
        }
      } else if (selectedRequest.type === 'WFH') {
        await updateWfhRequestStatus(selectedRequest.data.id, payload);
        setRequestsWfh(null);
      } else if (selectedRequest.type === 'ATTENDANCE') {
        await updateAttendanceRequestStatus(selectedRequest.data.id, payload);
        setRequestsAttendance(null);
      } else {
        return;
      }
      setRequestsCombined(null);
      toast.success('Request rejected');
      closeRequestModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to reject');
      console.error(error);
    } finally {
      setRequestActionLoading(false);
    }
  };

  const handleRequestCancel = async (comment) => {
    if (!selectedRequest) return;
    const payload = buildRequestStatusPayload('CANCELLED', comment);
    setRequestActionLoading(true);
    try {
      if (selectedRequest.type === 'LEAVE') {
        await updateLeaveRequestStatus(selectedRequest.data.id, payload);
        setRequestsLeaves(null);
      } else if (selectedRequest.type === 'REIMBURSEMENT') {
        await updateReimbursementRequestStatus(selectedRequest.data.id, payload);
        if (activeTab === 'Reimbursements') {
          await fetchReimbursements();
        } else {
          setReimbursementsData(null);
        }
      } else if (selectedRequest.type === 'ATTENDANCE') {
        await updateAttendanceRequestStatus(selectedRequest.data.id, payload);
        setRequestsAttendance(null);
      } else if (selectedRequest.type === 'WFH') {
        await updateWfhRequestStatus(selectedRequest.data.id, payload);
        setRequestsWfh(null);
      } else {
        return;
      }
      setRequestsCombined(null);
      toast.success('Request cancelled');
      closeRequestModal();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to cancel request');
      console.error(error);
    } finally {
      setRequestActionLoading(false);
    }
  };


  return (
    <div className="bg-[#F8F9FA] min-h-screen p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-3">
            <UserAvatar
              size="xl"
              shape="rounded"
              imageUrl={employeeDisplay.imageUrl}
              fullName={employeeDisplay.fullName}
              firstName={employeeDisplay.firstName}
              lastName={employeeDisplay.lastName}
            />
            <div>
              <div className="text-lg font-semibold text-gray-900">{employeeName}</div>
              <div className="text-xs text-gray-500">
                {employeeDisplay.designation}
                {employeeDisplay.departmentName ? ` • ${employeeDisplay.departmentName}` : ''}
              </div>
            </div>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {canSendTemporaryPassword && !isManagerView && (
            <button
              type="button"
              onClick={() => setSendPasswordModalOpen(true)}
              disabled={actionsLocked || !employeeAccountEmail}
              title={
                actionsLocked
                  ? lockedTitle
                  : employeeAccountEmail
                    ? undefined
                    : 'No email on file for this employee'
              }
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <KeyRound size={16} />
              Send Temporary Password
            </button>
          )}
          {canManageEmployeeExit && !isManagerView && !isScheduledExit(exitData) && (
            <button
              type="button"
              disabled={actionsLocked}
              title={lockedTitle}
              onClick={() => {
                setExitModalMode('create');
                setExitModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={16} />
              Initiate Exit
            </button>
          )}
          {canManageEmployeeExit && !isManagerView && isScheduledExit(exitData) && (
            <>
              <button
                type="button"
                disabled={actionsLocked}
                title={lockedTitle}
                onClick={() => {
                  setExitModalMode('edit');
                  setExitModalOpen(true);
                }}
                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Pencil size={16} />
                Edit Exit
              </button>
              <button
                type="button"
                disabled={actionsLocked}
                title={lockedTitle}
                onClick={() => setCancelExitModalOpen(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-red-200 text-red-700 rounded-xl text-sm font-bold hover:bg-red-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle size={16} />
                Cancel Exit
              </button>
            </>
          )}
          {onboardingStatus && !onboardingStatus?.admin_step_completion?.documents_complete && (
            <button
              type="button"
              disabled={actionsLocked}
              title={lockedTitle}
              onClick={onResume}
              className="flex items-center gap-2 px-6 py-2.5 bg-[var(--brand-primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--brand-strong)] transition-all shadow-lg shadow-orange-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Resume Onboarding
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-2 flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${activeTab === tab ? 'bg-[var(--brand-primary)] text-white' : 'bg-[#F8F9FA] text-gray-600'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {
        activeTab === 'Personal Details' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h3 className="text-lg font-bold text-gray-900">Personal Details</h3>
              {!isManagerView && (
                <button
                  type="button"
                  disabled={actionsLocked}
                  title={lockedTitle}
                  onClick={() => setIsEditModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--brand-primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--brand-strong)] transition-all shadow-lg shadow-orange-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit3 size={16} />
                  Edit Profile
                </button>
              )}
            </div>
            {tabLoading && !profile ? (
              <div className="py-10 text-center text-gray-400 text-sm">Loading...</div>
            ) : (
              <>
            {isScheduledExit(exitData) && canManageEmployeeExit && !isManagerView && (
              <div className="mb-6 p-4 rounded-xl border border-amber-100 bg-amber-50">
                <h4 className="text-sm font-bold text-amber-900 mb-2">Scheduled Exit</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-amber-700 font-semibold uppercase">Exit Type</span>
                    <p className="text-gray-900 font-medium">{formatExitTypeLabel(exitData.exit_type)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-amber-700 font-semibold uppercase">Status</span>
                    <p className="text-gray-900 font-medium">{exitData.status}</p>
                  </div>
                  <div>
                    <span className="text-xs text-amber-700 font-semibold uppercase">Notice Start</span>
                    <p className="text-gray-900 font-medium">{formatExitDate(exitData.notice_start_date)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-amber-700 font-semibold uppercase">Last Working Day</span>
                    <p className="text-gray-900 font-medium">{formatExitDate(exitData.last_working_day)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-xs text-amber-700 font-semibold uppercase">Reason</span>
                    <p className="text-gray-900 font-medium">{exitData.exit_reason || '-'}</p>
                  </div>
                </div>
              </div>
            )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <InfoItem label="First Name" value={profile?.first_name} />
                <InfoItem label="Last Name" value={profile?.last_name} />
                <InfoItem label="Official Email" value={profile?.official_email} icon={<Mail className="w-4 h-4 text-gray-400" />} />
                <InfoItem label="Personal Email" value={profile?.personal_email} icon={<Mail className="w-4 h-4 text-gray-400" />} />
                <InfoItem label="Phone" value={profile?.phone_number} icon={<Phone className="w-4 h-4 text-gray-400" />} />
                <InfoItem label="Date of Birth" value={formatDate(profile?.date_of_birth)} />
                <InfoItem label="Gender" value={profile?.gender} />
                <InfoItem label="Marital Status" value={profile?.marital_status} />
                <InfoItem label="Blood Group" value={profile?.blood_group} />
                <InfoItem label="Nationality" value={profile?.nationality} />
                <InfoItem label="Designation" value={profile?.designation} />
                <InfoItem label="Date of Joining" value={formatDate(profile?.date_of_joining)} />
              </div>

            <div className="mt-8">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contacts</h4>
              {(profile?.emergency_contacts || []).length === 0 ? (
                <div className="text-sm text-gray-400">No emergency contacts</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.emergency_contacts.map((c) => (
                    <div key={c.id} className="border border-gray-100 rounded-xl p-4 text-sm">
                      <div className="font-semibold text-gray-900">{c.name}</div>
                      <div className="text-gray-500">{c.relationship}</div>
                      <div className="text-gray-500">{c.phone_number}</div>
                      <div className="text-gray-500">{c.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-8">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Addresses</h4>
              {(profile?.addresses || []).length === 0 ? (
                <div className="text-sm text-gray-400">No addresses</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.addresses.map((addr) => (
                    <div key={addr.id} className="border border-gray-100 rounded-xl p-4 text-sm">
                      <div className="flex items-center gap-2 font-semibold text-gray-900">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {addr.address_type}
                      </div>
                      <div className="text-gray-500">{addr.street}</div>
                      <div className="text-gray-500">{addr.city}, {addr.state} {addr.postal_code}</div>
                      <div className="text-gray-500">{addr.country}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
              </>
            )}
          </div>
        )
      }

      {
        activeTab === 'Documents' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Documents</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={actionsLocked}
                  title={lockedTitle}
                  onClick={() => {
                    if (actionsLocked) return;
                    setUploadDocType(null);
                    setUploadDocCategory(null);
                    setUploadDocOpen(true);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--brand-primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--brand-strong)] transition-all shadow-lg shadow-orange-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={16} />
                  Upload Document
                </button>
                {missingRequiredDocTypes.length > 0 ? (
                  <select
                    disabled={actionsLocked}
                    title={lockedTitle}
                    defaultValue=""
                    onChange={(e) => {
                      const value = e.target.value;
                      e.target.value = '';
                      if (!value || actionsLocked) return;
                      const selected = REQUIRED_UPLOAD_DOC_TYPES.find((t) => t.value === value);
                      setUploadDocType(value);
                      setUploadDocCategory(selected?.category || 'IDENTITY');
                      setUploadDocOpen(true);
                    }}
                    className="px-4 py-2.5 bg-[#F8F9FA] border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>
                      Upload required document
                    </option>
                    {missingRequiredDocTypes.map((doc) => (
                      <option key={doc.value} value={doc.value}>
                        {doc.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="pl-9 pr-4 py-2 bg-[#F8F9FA] rounded-xl text-sm w-56"
                    value={documentsSearch}
                    onChange={(e) => setDocumentsSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
                    <th className="py-3 px-4 rounded-l-xl">Document Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Uploaded Date</th>
                    <th className="py-3 px-4">View</th>
                    <th className="py-3 px-4 rounded-r-xl">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tabLoading && !documentsData ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center text-gray-400 text-sm">Loading...</td>
                    </tr>
                  ) : (documentsList || []).length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-10 text-center text-gray-400 text-sm">No documents found</td>
                    </tr>
                  ) : (
                    documentsList.map((doc, idx) => (
                      <tr key={`${doc.file_key || doc.doc_type}-${idx}`} className="hover:bg-gray-50">
                        <td className="py-4 px-4 text-sm font-medium text-gray-900">{doc.doc_type || '-'}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">{doc.doc_category || '-'}</td>
                        <td className="py-4 px-4 text-sm text-gray-600">{formatDateTime(doc.uploaded_at)}</td>
                        <td className="py-4 px-4">
                          <a
                            href={doc.file_url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#00B5B5] text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </a>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            type="button"
                            disabled={actionsLocked}
                            title={lockedTitle}
                            onClick={() => {
                              if (actionsLocked) return;
                              setReplaceDocTarget(doc);
                              setReplaceDocOpen(true);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--brand-soft)] text-gray-700 hover:bg-[var(--brand-soft-border)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Replace
                          </button>
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
                  value={documentsLimit}
                  onChange={(e) => {
                    setDocumentsLimit(Number(e.target.value));
                    setDocumentsPage(1);
                  }}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--brand-primary-rgb),0.2)]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-sm font-medium text-gray-600">
                  of {documentsData?.total_count || documentsList.length} results
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={documentsPage === 1}
                  onClick={() => setDocumentsPage((prev) => Math.max(prev - 1, 1))}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                {renderDocumentsPaginationButtons()}
                <button
                  type="button"
                  disabled={documentsPage === (documentsData?.total_pages || 1) || (documentsData?.total_pages || 1) === 0}
                  onClick={() => setDocumentsPage((prev) => Math.min(prev + 1, documentsData?.total_pages || 1))}
                  className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )
      }

      <ReplaceEmployeeDocumentModal
        open={replaceDocOpen}
        employeeId={employeeId}
        doc={replaceDocTarget}
        onClose={() => {
          setReplaceDocOpen(false);
          setReplaceDocTarget(null);
        }}
        onSuccess={() => {
          setReplaceDocOpen(false);
          setReplaceDocTarget(null);
          setDocumentsData(null);
          setDocumentsRefreshKey((prev) => prev + 1);
        }}
      />

      <UploadEmployeeDocumentModal
        open={uploadDocOpen}
        employeeId={employeeId}
        docType={uploadDocType}
        docCategory={uploadDocCategory ?? 'IDENTITY'}
        onClose={() => {
          setUploadDocOpen(false);
          setUploadDocType(null);
          setUploadDocCategory(null);
        }}
        onSuccess={() => {
          setUploadDocOpen(false);
          setUploadDocType(null);
          setUploadDocCategory(null);
          setDocumentsData(null);
          setDocumentsAllForRequiredCheck([]);
          setDocumentsRefreshKey((prev) => prev + 1);
        }}
      />

      {
        activeTab === 'Bank Details' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900">Bank Details</h3>
              {canEditBankAndAsset && bankAssetData && !tabLoading && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionsLocked}
                    title={lockedTitle}
                    onClick={() => setEditBankDetailsOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--brand-primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--brand-strong)] transition-all shadow-lg shadow-orange-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Edit3 size={16} />
                    Edit Bank Details
                  </button>
                </div>
              )}
            </div>
            {tabLoading && !bankAssetData ? (
              <div className="py-10 text-center text-gray-400 text-sm">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="font-semibold text-gray-900 mb-2">Bank</div>
                  <InfoItem label="Bank Name" value={bankAssetData?.bank_details?.bank_name} />
                  <InfoItem label="Account Holder" value={bankAssetData?.bank_details?.account_holder_name} />
                  <InfoItem label="Account Number" value={bankAssetData?.bank_details?.account_number} />
                  <InfoItem label="IFSC" value={bankAssetData?.bank_details?.ifsc_code} />
                </div>
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="font-semibold text-gray-900 mb-2">Asset</div>
                  <InfoItem label="Device Preference" value={bankAssetData?.asset_details?.asset_device_pref} />
                  <InfoItem label="Agreement Accepted" value={bankAssetData?.asset_details?.asset_agreement_accepted ? 'Yes' : 'No'} />
                  <InfoItem label="Device Serial Number" value={bankAssetData?.asset_details?.device_serial_number} />
                </div>
                <div className="border border-gray-100 rounded-xl p-4">
                  <div className="font-semibold text-gray-900 mb-2">Payroll</div>
                  <InfoItem label="UAN Number" value={bankAssetData?.payroll_details?.uan_number} />
                  <InfoItem label="PF Number" value={bankAssetData?.payroll_details?.pf_number} />
                </div>
                {(() => {
                  const cancelledCheque = getCancelledChequeInfo(bankAssetData);
                  return (
                    <div className="border border-gray-100 rounded-xl p-4">
                      <div className="font-semibold text-gray-900 mb-2">Cancelled Cheque</div>
                      {cancelledCheque?.fileUrl ? (
                        <>
                          <div className="text-xs text-gray-400 font-medium mb-1">Document</div>
                          <div className="text-sm text-gray-600 truncate mb-2" title={cancelledCheque.label}>
                            {cancelledCheque.label}
                          </div>
                          <a
                            href={cancelledCheque.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#00B5B5] text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </a>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400 mt-2">No cancelled cheque uploaded</div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )
      }

      {
        activeTab === 'Requests' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Requests</h3>
            <div className="bg-[#F8F9FA] rounded-xl p-2 flex gap-2 mb-4">
              {requestTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRequestsTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${requestsTab === tab ? 'bg-[var(--brand-primary)] text-white' : 'bg-white text-gray-600'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {requestsTab === 'All' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
                      <th className="py-3 px-4 rounded-l-xl">Type</th>
                      <th className="py-3 px-4">Summary</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tabLoading && !requestsCombined ? (
                      <tr>
                        <td colSpan="6" className="py-10 text-center text-gray-400 text-sm">Loading...</td>
                      </tr>
                    ) : combinedRequests.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-10 text-center text-gray-400 text-sm">No requests found</td>
                      </tr>
                    ) : (
                      combinedRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="py-4 px-4 text-sm font-medium text-gray-900">{req.request_type || '-'}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {req.request_type === 'REIMBURSEMENT'
                              ? `${formatReimbursementExpenseType(req.type ?? req.details?.type ?? req.record?.type)} — ${req.reason || req.summary || '-'}`
                              : req.reason || req.summary || '-'}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {req.request_type === 'LEAVE' || req.request_type === 'WFH'
                              ? `${formatDate(req.details?.start_date || req.start_date)} - ${formatDate(req.details?.end_date || req.end_date)}`
                              : req.request_type === 'REIMBURSEMENT'
                                ? `${formatDate(req.details?.request_date)} - ₹${Number(req.details?.amount ?? req.amount ?? 0).toLocaleString('en-IN')}`
                                : `${formatDate(req.details?.request_date)} - ${req.details?.wrong_punch_type || '-'}${req.details?.corrected_time ? ` (${req.details.corrected_time})` : ''}`}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{formatDateTime(req.created_at)}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(req.status)}`}>
                              {statusLabel(req.status)}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => openRequestModal(req.request_type, req)}
                              className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--brand-soft)] text-gray-700"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {requestsTab === 'Leaves' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
                      <th className="py-3 px-4 rounded-l-xl">Type</th>
                      <th className="py-3 px-4">Submitted</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tabLoading && !requestsLeaves ? (
                      <tr>
                        <td colSpan="7" className="py-10 text-center text-gray-400 text-sm">Loading...</td>
                      </tr>
                    ) : leaveRequests.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-10 text-center text-gray-400 text-sm">No leave requests found</td>
                      </tr>
                    ) : (
                      leaveRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="py-4 px-4 text-sm font-medium text-gray-900">{req.details?.leave_type_name || req.leave_type?.name || '-'}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{formatDate(req.created_at || req.applied_at)}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {formatDate(req.details?.start_date || req.start_date)} - {formatDate(req.details?.end_date || req.end_date)}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{req.record?.total_days || req.total_days || 0} Days</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{req.reason || '-'}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(req.status)}`}>
                              {statusLabel(req.status)}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => openRequestModal('LEAVE', req)}
                              className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--brand-soft)] text-gray-700"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {requestsTab === 'Attendance' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
                      <th className="py-3 px-4 rounded-l-xl">Request Date</th>
                      <th className="py-3 px-4">Wrong Punch</th>
                      <th className="py-3 px-4">Corrected Time</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tabLoading && !requestsAttendance ? (
                      <tr>
                        <td colSpan="6" className="py-10 text-center text-gray-400 text-sm">Loading...</td>
                      </tr>
                    ) : attendanceRequests.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-10 text-center text-gray-400 text-sm">No attendance requests found</td>
                      </tr>
                    ) : (
                      attendanceRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="py-4 px-4 text-sm text-gray-600">{formatDate(req.request_date || req.details?.request_date)}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{req.wrong_punch_type || req.details?.wrong_punch_type || '-'}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{req.corrected_time || req.details?.corrected_time || '-'}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{req.reason || '-'}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(req.status)}`}>
                              {statusLabel(req.status)}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => openRequestModal('ATTENDANCE', req)}
                              className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--brand-soft)] text-gray-700"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {requestsTab === 'WFH' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
                      <th className="py-3 px-4 rounded-l-xl">Submitted</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tabLoading && !requestsWfh ? (
                      <tr>
                        <td colSpan="6" className="py-10 text-center text-gray-400 text-sm">Loading...</td>
                      </tr>
                    ) : wfhRequests.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-10 text-center text-gray-400 text-sm">No WFH requests found</td>
                      </tr>
                    ) : (
                      wfhRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="py-4 px-4 text-sm text-gray-600">{formatDate(req.created_at)}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {formatDate(req.details?.start_date || req.start_date)} - {formatDate(req.details?.end_date || req.end_date)}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{req.record?.total_days || req.total_days || 0} Days</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{req.reason || '-'}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(req.status)}`}>
                              {statusLabel(req.status)}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => openRequestModal('WFH', req)}
                              className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--brand-soft)] text-gray-700"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      }

      {
        activeTab === 'Reimbursements' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reimbursements</h3>
            {tabLoading && !reimbursementsData ? (
              <div className="py-10 text-center text-gray-400 text-sm">Loading...</div>
            ) : reimbursementMonthGroups.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No reimbursement requests found</div>
            ) : (
              <div className="space-y-3">
                {reimbursementMonthGroups.map((group) => {
                  const isExpanded = expandedReimbursementGroups.has(group.key);
                  return (
                    <div
                      key={group.key}
                      className="border border-gray-100 rounded-xl overflow-hidden"
                    >
                      <div className="flex flex-wrap items-center gap-4 px-4 py-3.5 bg-[#F8F9FA]">
                        <button
                          type="button"
                          onClick={() => toggleReimbursementGroup(group.key)}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-lg hover:bg-gray-100/80 transition-colors -ml-1 pl-1 pr-2 py-1"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500 shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-gray-900">{group.label}</span>
                        </button>
                        <div className="text-right shrink-0 min-w-[120px]">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-tight">
                            Approved total
                          </p>
                          <p className="text-sm font-bold text-gray-900 tabular-nums leading-tight mt-0.5">
                            {formatReimbursementAmount(group.approvedTotal)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 min-w-[180px]">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${reimbursementGroupPaymentBadgeClass(group.paymentStatus)}`}
                          >
                            {group.paymentLabel}
                          </span>
                          {shouldShowPendingApprovalBadge(group) ? (
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${reimbursementGroupApprovalBadgeClass()}`}
                            >
                              Pending approval
                            </span>
                          ) : null}
                        </div>
                        {canMarkReimbursementMonthPaid && canMarkReimbursementMonthGroupPaid(group) ? (
                          <button
                            type="button"
                            disabled={Boolean(markReimbursementMonthPaidLoading[group.key])}
                            onClick={() => markReimbursementMonthAsPaid(group)}
                            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#EB4000] text-white hover:bg-[#d63800] disabled:opacity-50"
                          >
                            {markReimbursementMonthPaidLoading[group.key] ? 'Saving...' : 'Mark as paid'}
                          </button>
                        ) : null}
                      </div>
                      {isExpanded && (
                        <div className="overflow-x-auto border-t border-gray-100">
                          <table className="w-full min-w-[700px]">
                            <thead>
                              <tr className="bg-white text-left text-xs text-gray-500 font-medium">
                                <th className="py-3 px-4">Type</th>
                                <th className="py-3 px-4">Expense Date</th>
                                <th className="py-3 px-4">Amount</th>
                                <th className="py-3 px-4">Submit Date</th>
                                <th className="py-3 px-4">Reason</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Payment</th>
                                <th className="py-3 px-4">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {group.items.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="py-4 px-4 text-sm text-gray-600">
                                    {formatReimbursementExpenseType(
                                      item.type ?? item.details?.type ?? item.record?.type
                                    )}
                                  </td>
                                  <td className="py-4 px-4 text-sm text-gray-600">
                                    {formatDate(getReimbursementExpenseDate(item))}
                                  </td>
                                  <td className="py-4 px-4 text-sm font-medium text-gray-900">
                                    {formatReimbursementAmount(getReimbursementAmount(item))}
                                  </td>
                                  <td className="py-4 px-4 text-sm text-gray-600">
                                    {formatDate(item.created_at)}
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className="px-3 py-1 bg-[#F8F9FA] rounded-md text-xs text-gray-600 block w-fit truncate max-w-[200px]">
                                      {item.reason || '-'}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusBadgeClass(item.status)}`}>
                                      {statusLabel(item.status)}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4">
                                    {formatReimbursementPaymentLabel(item) === '-' ? (
                                      <span className="text-sm text-gray-400">-</span>
                                    ) : (
                                      <div>
                                        <span
                                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${reimbursementItemPaymentBadgeClass(getReimbursementPaymentStatus(item))}`}
                                        >
                                          {formatReimbursementPaymentLabel(item)}
                                        </span>
                                        {getReimbursementPaymentStatus(item) === 'PAID' && item.paid_at ? (
                                          <p className="text-[10px] text-gray-500 mt-1">
                                            {formatDate(item.paid_at)}
                                          </p>
                                        ) : null}
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-4 px-4">
                                    <button
                                      type="button"
                                      onClick={() => openRequestModal('REIMBURSEMENT', item)}
                                      className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--brand-soft)] text-gray-700"
                                    >
                                      View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      }

      {
        activeTab === 'Leaves' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Leave</h3>
            {tabLoading && !leaveData ? (
              <div className="py-10 text-center text-gray-400 text-sm">Loading...</div>
            ) : (
              <div className="flex gap-4 items-start flex-wrap xl:flex-nowrap">
                <div className="flex-1 min-w-[360px] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {leaveCards.map((item, idx) => {
                    const colors = leaveCardColors(idx);
                    return (
                      <div key={item.id} className="rounded-2xl p-4 text-center" style={{ backgroundColor: colors.panel }}>
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <div
                          className="my-3 w-20 h-20 mx-auto rounded-full border-[8px] flex items-center justify-center"
                          style={{ borderColor: colors.ring, borderTopColor: colors.ringTrack }}
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-900">{item.used}</p>
                            <p className="text-[10px] text-gray-500">/{item.quota} Days</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="w-full xl:w-[260px] bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold text-gray-900">{displayMonthName} {displayedYear}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCalendarNav(-1)}
                        className="w-7 h-7 rounded-lg bg-[var(--brand-soft-alt)] text-[var(--brand-primary)] flex items-center justify-center"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCalendarNav(1)}
                        className="w-7 h-7 rounded-lg bg-[var(--brand-soft-alt)] text-[var(--brand-primary)] flex items-center justify-center"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 text-[10px] text-gray-400 text-center mb-2">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-[10px] text-center">
                    {displayDayCells.map((day, idx) => {
                      if (!day) return <span key={`empty-${idx}`} className="text-transparent">.</span>;
                      const dateKey = `${displayedYear}-${String(displayMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const status = calendarEntries[dateKey];
                      return (
                        <span
                          key={dateKey}
                          className="w-7 h-7 flex items-center justify-center rounded-md"
                          style={getStatusStyle(status)}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-3 text-[10px] text-gray-500 grid grid-cols-2 gap-2">
                    {statusKeys.map((statusKey) => (
                      <div key={statusKey} className="flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: statusColorByKey[statusKey]?.dot || '#D1D5DB' }}
                        />
                        {formatLabel(statusKey)} {legendCountByStatus[statusKey] || 0}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      }

      {
        activeTab === 'Holidays' && (
          <EmployeeHolidaysTab employeeId={employeeId} actionsDisabled={actionsLocked} />
        )
      }

      {
        activeTab === 'Payroll' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h3 className="text-lg font-bold text-gray-900">Payrolls</h3>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={actionsLocked}
                  title={lockedTitle}
                  onClick={() => setAppraisalsOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#FBD9CC] text-[#6B2D0F] rounded-xl text-sm font-bold hover:bg-[#F3C9B8] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit3 size={16} />
                  Appraisals
                </button>
                <button
                  type="button"
                  disabled={actionsLocked}
                  title={lockedTitle}
                  onClick={() => setEditPayrollOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--brand-primary)] text-white rounded-xl text-sm font-bold hover:bg-[var(--brand-strong)] transition-all shadow-lg shadow-orange-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit3 size={16} />
                  Edit Payroll
                </button>
              </div>
            </div>
            {tabLoading && !payrollData ? (
              <div className="py-10 text-center text-gray-400 text-sm">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
                      <th className="py-3 px-4 rounded-l-xl">Name</th>
                      <th className="py-3 px-4">Job Title</th>
                      <th className="py-3 px-4">Salary</th>
                      <th className="py-3 px-4">Net Salary</th>
                      <th className="py-3 px-4">Incen.</th>
                      <th className="py-3 px-4">Deduct.</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 rounded-r-xl">Payslip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(payrollItems || []).length === 0 ? (
                      <tr>
                        <td colSpan="10" className="py-10 text-center text-gray-400 text-sm">No payrolls found</td>
                      </tr>
                    ) : (
                      payrollItems.map((row) => (
                        <tr key={row.id} className="hover:bg-gray-50">
                          <td className="py-4 px-4 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                size="lg"
                                imageUrl={employeeDisplay.imageUrl}
                                fullName={employeeDisplay.fullName}
                                firstName={employeeDisplay.firstName}
                                lastName={employeeDisplay.lastName}
                              />
                              <div>
                                <div>{employeeName}</div>
                                <div className="text-xs text-gray-500">
                                  {employeeDisplay.employeeIdLabel}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            <div className="text-gray-900">{employeeDisplay.designation}</div>
                            <div className="text-xs text-gray-500">{employeeDisplay.departmentName}</div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{formatCurrency(row.gross_salary)}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{formatCurrency(row.net_salary)}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{formatCurrency(row.incentives)}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{formatCurrency(row.deductions)}</td>
                          <td className="py-4 px-4 text-sm font-semibold text-[var(--brand-primary)]">{formatCurrency(row.total)}</td>
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-2">
                              {getPayrollStatusBadge(row.status)}
                              {row.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => markAsPaid(row.id)}
                                  disabled={actionsLocked || markPaidLoading[row.id]}
                                  title={lockedTitle}
                                  className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-[#22C55E] text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {markPaidLoading[row.id] ? 'Updating...' : 'Mark as Paid'}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={actionsLocked}
                                title={lockedTitle}
                                onClick={() => openAdjust(row)}
                                className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-[#F5C04A] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Adjust
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{formatDate(row.date)}</td>
                          <td className="py-4 px-4">
                            {(() => {
                              const isPending = row.status !== 'PAID';
                              const isDownloading = !!downloadLoading[row.id];
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
                                  onClick={() => handleDownloadPayslip(row)}
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
            )}
          </div>
        )
      }

      {
        activeTab === 'Location' && (
          <EmployeeAllowedLocationsTab employeeId={employeeId} actionsDisabled={actionsLocked} />
        )
      }

      {
        activeTab === 'Location Snapshots' && (
          <EmployeeLocationSnapshotsTab employeeId={employeeId} />
        )
      }

      {adjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[460px] max-h-[85vh] rounded-3xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Adjust Salary</h3>
                <p className="text-sm text-gray-500">
                  {employeeName}
                  {' - '}
                  {profile?.department?.name || 'Department'}
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
                        onChange={(e) => setAdjustForm((prev) => ({ ...prev, salary_per_month: e.target.value }))}
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
                          onChange={(e) => setAdjustForm((prev) => ({ ...prev, fixed_salary: e.target.value }))}
                          className="w-full bg-white border border-gray-100 rounded-lg px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500">Added Amount</label>
                        <input
                          type="number"
                          disabled
                          value={adjustForm.added_amount}
                          onChange={(e) => setAdjustForm((prev) => ({ ...prev, added_amount: e.target.value }))}
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

      {!isManagerView && (
        <EditEmployeeModal
          isOpen={isEditModalOpen}
          employeeId={employeeId}
          employeeData={profile}
          onClose={() => setIsEditModalOpen(false)}
          onSaveSuccess={() => {
            setProfile(null);
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}

      {!shouldHidePayroll && (
        <EditPayrollModal
          isOpen={editPayrollOpen}
          userId={employeeId}
          onClose={() => setEditPayrollOpen(false)}
          onSaveSuccess={() => {
            setPayrollData(null);
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}
      {!shouldHidePayroll && (
        <AppraisalsPayrollModal
          isOpen={appraisalsOpen}
          userId={employeeId}
          onClose={() => setAppraisalsOpen(false)}
          onSaveSuccess={() => {
            setPayrollData(null);
            setRefreshKey((prev) => prev + 1);
          }}
        />
      )}
      <RequestDetailsModal
        open={!!selectedRequest}
        type={selectedRequest?.type}
        data={selectedRequest?.data}
        onClose={closeRequestModal}
        onApprove={handleRequestApprove}
        onReject={handleRequestReject}
        onCancel={handleRequestCancel}
        loading={requestActionLoading}
        actionsDisabled={actionsLocked}
        size="sm"
      />
      {sendPasswordModalOpen && employeeAccountEmail && (
        <SendTemporaryPasswordModal
          email={employeeAccountEmail}
          employeeName={employeeName !== '-' ? employeeName : ''}
          onClose={() => setSendPasswordModalOpen(false)}
        />
      )}
      {canEditBankAndAsset && (
        <EditBankDetailsModal
          isOpen={editBankDetailsOpen}
          userId={employeeId}
          initialBankAsset={bankAssetData}
          onClose={() => setEditBankDetailsOpen(false)}
          onSaveSuccess={() => setBankAssetData(null)}
        />
      )}
      {exitModalOpen && (
        <EmployeeExitModal
          userId={employeeId}
          employeeName={employeeName !== '-' ? employeeName : ''}
          modalMode={exitModalMode}
          initialExit={exitModalMode === 'edit' ? exitData : null}
          onClose={() => setExitModalOpen(false)}
          onSuccess={refreshExitAndProfile}
        />
      )}
      {cancelExitModalOpen && (
        <CancelExitConfirmModal
          employeeName={employeeName !== '-' ? employeeName : ''}
          onClose={() => setCancelExitModalOpen(false)}
          onConfirm={handleCancelExit}
          loading={cancelExitLoading}
        />
      )}
    </div>
  );
};

const InfoItem = ({ label, value, icon }) => (
  <div className="flex items-start gap-3">
    {icon}
    <div>
      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{label}</div>
      <div className="text-sm text-gray-900">{value || '-'}</div>
    </div>
  </div>
);
