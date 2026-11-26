const UNKNOWN_GROUP_KEY = 'unknown';

export function getReimbursementExpenseDate(item) {
  return item?.request_date ?? item?.details?.request_date ?? item?.record?.request_date ?? null;
}

export function getReimbursementAmount(item) {
  const value = item?.amount ?? item?.details?.amount ?? item?.record?.amount;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatReimbursementMonthLabel(year, month) {
  if (!year || !month) return 'Unknown';
  const d = new Date(year, month - 1, 1);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function parseExpenseMonthYear(expenseDate) {
  if (!expenseDate) return null;
  const d = new Date(expenseDate);
  if (Number.isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function normalizeRequestStatus(status) {
  return String(status || 'PENDING').toUpperCase();
}

export function getReimbursementPaymentStatus(item) {
  return String(
    item?.payment_status ?? item?.record?.payment_status ?? ''
  ).toUpperCase();
}

function getItemPaymentStatus(item) {
  return getReimbursementPaymentStatus(item);
}

export function formatReimbursementPaymentLabel(item) {
  if (normalizeRequestStatus(item?.status) !== 'APPROVED') return '-';
  const paymentStatus = getReimbursementPaymentStatus(item);
  if (paymentStatus === 'PAID') return 'Paid';
  return 'Unpaid';
}

export function reimbursementItemPaymentBadgeClass(paymentStatus) {
  const normalized = String(paymentStatus || '').toUpperCase();
  if (normalized === 'PAID') return 'bg-emerald-50 text-emerald-700';
  if (normalized === 'UNPAID') return 'bg-blue-50 text-blue-700';
  return 'bg-gray-100 text-gray-600';
}

export function reimbursementGroupApprovalBadgeClass() {
  return 'bg-gray-100 text-gray-600';
}

export function shouldShowPendingApprovalBadge(group) {
  const status = String(group?.paymentStatus || '').toUpperCase();
  return Boolean(group?.hasPendingApproval) && ['PAID', 'UNPAID', 'PARTIALLY_PAID'].includes(status);
}

export function computeReimbursementGroupPaymentStatus(items) {
  let hasPendingApproval = false;
  let approvedCount = 0;
  let paidApprovedCount = 0;
  let unpaidApprovedCount = 0;

  for (const item of items) {
    const approvalStatus = normalizeRequestStatus(item?.status);
    if (approvalStatus === 'PENDING') {
      hasPendingApproval = true;
    }
    if (approvalStatus !== 'APPROVED') continue;

    approvedCount += 1;
    const paymentStatus = getItemPaymentStatus(item);
    if (paymentStatus === 'PAID') {
      paidApprovedCount += 1;
    } else {
      unpaidApprovedCount += 1;
    }
  }

  if (approvedCount === 0) {
    if (hasPendingApproval) {
      return { status: 'PENDING_APPROVAL', label: 'Pending approval', hasPendingApproval };
    }
    return { status: 'NO_PAYABLE', label: 'No payable', hasPendingApproval };
  }

  if (paidApprovedCount === approvedCount) {
    return { status: 'PAID', label: 'Paid', hasPendingApproval };
  }
  if (paidApprovedCount > 0 && unpaidApprovedCount > 0) {
    return { status: 'PARTIALLY_PAID', label: 'Partially paid', hasPendingApproval };
  }
  return { status: 'UNPAID', label: 'Unpaid', hasPendingApproval };
}

export function canMarkReimbursementMonthGroupPaid(group) {
  if (!group?.year || !group?.month) return false;
  return (group.items || []).some(
    (item) =>
      normalizeRequestStatus(item?.status) === 'APPROVED' &&
      getReimbursementPaymentStatus(item) !== 'PAID'
  );
}

export function computeApprovedReimbursementTotal(items) {
  return items.reduce((sum, item) => {
    if (normalizeRequestStatus(item?.status) !== 'APPROVED') return sum;
    return sum + getReimbursementAmount(item);
  }, 0);
}

export function reimbursementGroupPaymentBadgeClass(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PAID') return 'bg-emerald-50 text-emerald-700';
  if (normalized === 'PARTIALLY_PAID') return 'bg-amber-50 text-amber-700';
  if (normalized === 'UNPAID') return 'bg-blue-50 text-blue-700';
  if (normalized === 'PENDING_APPROVAL') return 'bg-gray-100 text-gray-600';
  return 'bg-gray-100 text-gray-600';
}

function sortItemsByExpenseDateDesc(items) {
  return [...items].sort((a, b) => {
    const da = new Date(getReimbursementExpenseDate(a)).getTime();
    const db = new Date(getReimbursementExpenseDate(b)).getTime();
    const ta = Number.isNaN(da) ? 0 : da;
    const tb = Number.isNaN(db) ? 0 : db;
    return tb - ta;
  });
}

export function groupReimbursementsByExpenseMonth(items = []) {
  const bucketMap = new Map();

  for (const item of items) {
    const parsed = parseExpenseMonthYear(getReimbursementExpenseDate(item));
    const key = parsed ? `${parsed.year}-${String(parsed.month).padStart(2, '0')}` : UNKNOWN_GROUP_KEY;
    const year = parsed?.year ?? null;
    const month = parsed?.month ?? null;
    const label = parsed ? formatReimbursementMonthLabel(year, month) : 'Unknown';

    if (!bucketMap.has(key)) {
      bucketMap.set(key, { key, year, month, label, items: [] });
    }
    bucketMap.get(key).items.push(item);
  }

  const groups = Array.from(bucketMap.values()).map((group) => {
    const sortedItems = sortItemsByExpenseDateDesc(group.items);
    const payment = computeReimbursementGroupPaymentStatus(sortedItems);
    return {
      ...group,
      items: sortedItems,
      approvedTotal: computeApprovedReimbursementTotal(sortedItems),
      paymentStatus: payment.status,
      paymentLabel: payment.label,
      hasPendingApproval: payment.hasPendingApproval
    };
  });

  groups.sort((a, b) => {
    if (a.key === UNKNOWN_GROUP_KEY) return 1;
    if (b.key === UNKNOWN_GROUP_KEY) return -1;
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return groups;
}
