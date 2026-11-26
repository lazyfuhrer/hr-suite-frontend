export function toDateInputValue(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function isScheduledExit(exit) {
  if (!exit) return false;
  return exit.status === 'SCHEDULED' && !exit.cancelled_at;
}

export function mapExitToNoticeForm(exit) {
  if (!exit) {
    return {
      exit_type: 'RESIGNATION',
      exit_reason: '',
      notice_start_date: '',
      last_working_day: ''
    };
  }
  return {
    exit_type: exit.exit_type || 'RESIGNATION',
    exit_reason: exit.exit_reason || '',
    notice_start_date: toDateInputValue(exit.notice_start_date),
    last_working_day: toDateInputValue(exit.last_working_day)
  };
}

export function formatExitTypeLabel(exitType) {
  const labels = {
    RESIGNATION: 'Resignation',
    RETIREMENT: 'Retirement',
    END_OF_CONTRACT: 'End of Contract',
    TERMINATION: 'Termination'
  };
  return labels[exitType] || exitType || '-';
}

export function isEmployeeActionsLocked(status) {
  const s = String(status || '').trim().toUpperCase();
  return s === 'ON_NOTICE' || s === 'INACTIVE';
}

export function formatEmployeeStatusLabel(status) {
  const s = String(status || '').trim().toUpperCase();
  if (s === 'ON_NOTICE') return 'On notice';
  if (s === 'INACTIVE') return 'Inactive';
  if (s === 'ACTIVE') return 'Active';
  return s || '-';
}

export function formatExitDate(isoString) {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}
