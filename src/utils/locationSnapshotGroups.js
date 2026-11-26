const UNKNOWN_MONTH_KEY = 'unknown';

export function getSnapshotCapturedAt(item) {
  return item?.captured_at ?? item?.created_at ?? null;
}

export function formatSnapshotMonthLabel(year, month) {
  if (!year || !month) return 'Unknown';
  const d = new Date(year, month - 1, 1);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export function formatSnapshotDateLabel(date) {
  if (!date) return 'Unknown';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function parseCapturedDateParts(capturedAt) {
  if (!capturedAt) return null;
  const d = new Date(capturedAt);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return {
    year,
    month,
    day,
    monthKey: `${year}-${String(month).padStart(2, '0')}`,
    dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    date: d,
  };
}

function sortSnapshotsByCapturedAtDesc(items) {
  return [...items].sort((a, b) => {
    const ta = new Date(getSnapshotCapturedAt(a)).getTime();
    const tb = new Date(getSnapshotCapturedAt(b)).getTime();
    const safeA = Number.isNaN(ta) ? 0 : ta;
    const safeB = Number.isNaN(tb) ? 0 : tb;
    return safeB - safeA;
  });
}

export function formatSnapshotSource(source) {
  const normalized = String(source || '').trim().toLowerCase();
  if (!normalized) return '-';
  if (normalized === 'location_request') return 'Location request';
  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function groupLocationSnapshotsByMonthAndDate(items = []) {
  const monthMap = new Map();

  for (const item of items) {
    const parsed = parseCapturedDateParts(getSnapshotCapturedAt(item));
    const monthKey = parsed?.monthKey ?? UNKNOWN_MONTH_KEY;
    const year = parsed?.year ?? null;
    const month = parsed?.month ?? null;
    const monthLabel = parsed ? formatSnapshotMonthLabel(year, month) : 'Unknown';

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        key: monthKey,
        year,
        month,
        label: monthLabel,
        dateMap: new Map(),
      });
    }

    const monthGroup = monthMap.get(monthKey);
    const dateKey = parsed?.dateKey ?? 'unknown-date';
    const dateLabel = parsed ? formatSnapshotDateLabel(parsed.date) : 'Unknown';

    if (!monthGroup.dateMap.has(dateKey)) {
      monthGroup.dateMap.set(dateKey, {
        key: dateKey,
        label: dateLabel,
        sortDate: parsed?.date?.getTime() ?? 0,
        snapshots: [],
      });
    }

    monthGroup.dateMap.get(dateKey).snapshots.push(item);
  }

  const groups = Array.from(monthMap.values()).map((monthGroup) => {
    const dates = Array.from(monthGroup.dateMap.values()).map((dateGroup) => ({
      ...dateGroup,
      snapshots: sortSnapshotsByCapturedAtDesc(dateGroup.snapshots),
      snapshotCount: dateGroup.snapshots.length,
    }));

    dates.sort((a, b) => b.sortDate - a.sortDate);

    const snapshotCount = dates.reduce((sum, dateGroup) => sum + dateGroup.snapshotCount, 0);

    return {
      key: monthGroup.key,
      year: monthGroup.year,
      month: monthGroup.month,
      label: monthGroup.label,
      snapshotCount,
      dates,
    };
  });

  groups.sort((a, b) => {
    if (a.key === UNKNOWN_MONTH_KEY) return 1;
    if (b.key === UNKNOWN_MONTH_KEY) return -1;
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return groups;
}
