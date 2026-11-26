/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-refresh/only-export-components */
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight } from 'lucide-react';

const DATE_PRESETS = [
  { key: 'today', label: 'Today', type: 'fixed', getRange: () => ({ from: new Date(), to: new Date() }) },
  {
    key: 'yesterday',
    label: 'Yesterday',
    type: 'fixed',
    getRange: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return { from: d, to: d };
    }
  },
  { key: 'last7d', label: 'Last 7 days', type: 'rolling', value: 7, unit: 'days' },
  { key: 'last30d', label: 'Last 30 days', type: 'rolling', value: 30, unit: 'days' },
  { key: 'manual', label: 'Manual selecting', type: 'fixed' }
];

const pad = (value) => String(value).padStart(2, '0');

export const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseDateKey = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};
const normalizeDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return normalizeDate(next);
};
const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return normalizeDate(next);
};
const shortDate = (date) => {
  if (!date) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const monthTitle = (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const isSameDay = (a, b) => !!a && !!b && toDateKey(a) === toDateKey(b);
const isBetweenDays = (value, start, end) => {
  if (!value || !start || !end) return false;
  const t = value.getTime();
  return t >= start.getTime() && t <= end.getTime();
};

const getPresetByKey = (key) => DATE_PRESETS.find((item) => item.key === key) || DATE_PRESETS[0];

export const buildRangeFromPreset = (presetKey, includeCurrentPeriod = true) => {
  const preset = getPresetByKey(presetKey);
  const today = normalizeDate(new Date());

  if (preset.type === 'fixed') {
    if (preset.getRange) {
      const result = preset.getRange();
      return {
        fromDate: normalizeDate(result.from),
        toDate: normalizeDate(result.to),
        mode: 'fixed',
        presetKey,
        label: preset.label
      };
    }
    return { fromDate: today, toDate: today, mode: 'fixed', presetKey, label: preset.label };
  }

  const value = Number(preset.value || 30);
  const unit = preset.unit || 'days';
  const to = includeCurrentPeriod ? today : addDays(today, -1);
  const from = unit === 'months' ? addMonths(to, -(value - 1)) : addDays(to, -(value - 1));
  return {
    fromDate: from,
    toDate: to,
    mode: 'rolling',
    presetKey,
    rollingValue: value,
    rollingUnit: unit,
    includeCurrentPeriod,
    label: preset.label
  };
};

export const getRangeParams = (filter) => ({
  from_date: toDateKey(filter?.fromDate || new Date()),
  to_date: toDateKey(filter?.toDate || new Date())
});

const buildCalendarCells = (year, monthIndex) => {
  const first = new Date(year, monthIndex, 1);
  const firstDay = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let i = 1; i <= daysInMonth; i += 1) cells.push(new Date(year, monthIndex, i));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

export default function DateRangeDropdown({
  value,
  onApply,
  className = '',
  buttonClassName = '',
  dropdownAlign = 'right'
}) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState(value?.presetKey || 'today');
  const [draftMode, setDraftMode] = useState(value?.mode || 'fixed');
  const [draftFromDate, setDraftFromDate] = useState(value?.fromDate || new Date());
  const [draftToDate, setDraftToDate] = useState(value?.toDate || new Date());
  const [draftRollingValue, setDraftRollingValue] = useState(value?.rollingValue || 30);
  const [draftRollingUnit, setDraftRollingUnit] = useState(value?.rollingUnit || 'days');
  const [draftIncludeCurrentPeriod, setDraftIncludeCurrentPeriod] = useState(value?.includeCurrentPeriod ?? true);
  const [activeMonthDate, setActiveMonthDate] = useState(value?.fromDate || new Date());

  useEffect(() => {
    if (!open) return undefined;
    const onOut = (event) => {
      const root = document.getElementById('date-range-dropdown-root');
      if (root?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const next = buildRangeFromPreset(activePreset, draftIncludeCurrentPeriod);
    if (activePreset === 'manual') return;
    setDraftMode(next.mode);
    setDraftFromDate(next.fromDate);
    setDraftToDate(next.toDate);
    setDraftRollingValue(next.rollingValue || 30);
    setDraftRollingUnit(next.rollingUnit || 'days');
    setActiveMonthDate(next.fromDate || new Date());
  }, [activePreset, draftIncludeCurrentPeriod, open]);

  const rollingPreview = useMemo(() => {
    const today = normalizeDate(new Date());
    const to = draftIncludeCurrentPeriod ? today : addDays(today, -1);
    const valueNum = Math.max(1, Number(draftRollingValue || 1));
    const from = draftRollingUnit === 'months' ? addMonths(to, -(valueNum - 1)) : addDays(to, -(valueNum - 1));
    return { from, to };
  }, [draftIncludeCurrentPeriod, draftRollingUnit, draftRollingValue]);

  const leftMonth = new Date(activeMonthDate.getFullYear(), activeMonthDate.getMonth(), 1);
  const rightMonth = addMonths(leftMonth, 1);
  const leftCells = buildCalendarCells(leftMonth.getFullYear(), leftMonth.getMonth());
  const rightCells = buildCalendarCells(rightMonth.getFullYear(), rightMonth.getMonth());

  const label = value?.label || getPresetByKey(value?.presetKey || 'today').label || 'Today';

  const openPicker = () => {
    const current = value || buildRangeFromPreset('today');
    setActivePreset(current.presetKey || 'today');
    setDraftMode(current.mode || 'fixed');
    setDraftFromDate(current.fromDate || new Date());
    setDraftToDate(current.toDate || new Date());
    setDraftRollingValue(current.rollingValue || 30);
    setDraftRollingUnit(current.rollingUnit || 'days');
    setDraftIncludeCurrentPeriod(current.includeCurrentPeriod ?? true);
    setActiveMonthDate(current.fromDate || new Date());
    setOpen(true);
  };

  const handleSelectFixedDate = (date) => {
    if (!date) return;
    setDraftMode('fixed');
    setActivePreset('manual');
    if (!draftFromDate || (draftFromDate && draftToDate)) {
      setDraftFromDate(date);
      setDraftToDate(null);
      return;
    }
    if (date.getTime() < draftFromDate.getTime()) {
      setDraftToDate(draftFromDate);
      setDraftFromDate(date);
    } else {
      setDraftToDate(date);
    }
  };

  const apply = () => {
    if (draftMode === 'fixed') {
      const baseFrom = normalizeDate(draftFromDate || new Date());
      const baseTo = normalizeDate(draftToDate || draftFromDate || new Date());
      const from = baseFrom.getTime() <= baseTo.getTime() ? baseFrom : baseTo;
      const to = baseFrom.getTime() <= baseTo.getTime() ? baseTo : baseFrom;
      const next = {
        mode: 'fixed',
        presetKey: activePreset,
        fromDate: from,
        toDate: to,
        label: activePreset === 'manual' ? `${shortDate(from)} - ${shortDate(to)}` : getPresetByKey(activePreset).label
      };
      onApply?.(next);
    } else {
      const valueNum = Math.max(1, Number(draftRollingValue || 1));
      const next = {
        mode: 'rolling',
        presetKey: activePreset,
        fromDate: rollingPreview.from,
        toDate: rollingPreview.to,
        rollingValue: valueNum,
        rollingUnit: draftRollingUnit,
        includeCurrentPeriod: draftIncludeCurrentPeriod,
        label: `Last ${valueNum} ${draftRollingUnit}`
      };
      onApply?.(next);
    }
    setOpen(false);
  };

  const alignClass = dropdownAlign === 'left' ? 'left-0' : 'right-0';

  return (
    <div id="date-range-dropdown-root" className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={`inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 ${buttonClassName}`}
      >
        <CalendarDays className="h-3.5 w-3.5" />
        {label}
      </button>

      {open && (
        <div className={`absolute ${alignClass} z-40 mt-2 w-[92vw] max-w-[620px] max-h-[calc(100vh-140px)] overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-xl`}>
          <div className="grid h-[50vh] min-h-[320px] max-h-[400px] grid-cols-[145px_1fr]">
            <div className="border-r border-gray-200 bg-gray-50">
              <div className="h-full overflow-y-auto p-2">
                {DATE_PRESETS.map((preset) => {
                  const selected = activePreset === preset.key;
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => {
                        setActivePreset(preset.key);
                        if (preset.key === 'manual') setDraftMode('fixed');
                      }}
                      className={`mb-1 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${selected ? 'bg-gray-200 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                      <span>{preset.label}</span>
                      {selected && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="border-b border-gray-200 px-4 py-3">
                <div className="inline-flex rounded-xl bg-gray-100 p-1">
                  <button
                    type="button"
                    onClick={() => setDraftMode('fixed')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${draftMode === 'fixed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftMode('rolling')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${draftMode === 'rolling' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
                  >
                    Rolling
                  </button>
                </div>
              </div>

              <div className="px-4 py-4 overflow-y-auto min-h-0">
                {draftMode === 'rolling' ? (
                  <>
                    <div className="mb-4 flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">Last</span>
                      <input
                        type="number"
                        min={1}
                        value={draftRollingValue}
                        onChange={(e) => setDraftRollingValue(Math.max(1, Number(e.target.value || 1)))}
                        className="w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                      />
                      <select
                        value={draftRollingUnit}
                        onChange={(e) => setDraftRollingUnit(e.target.value)}
                        className="w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                      >
                        <option value="days">Days</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                    <label className="mb-4 inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={draftIncludeCurrentPeriod}
                        onChange={(e) => setDraftIncludeCurrentPeriod(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Include current period
                    </label>
                  </>
                ) : (
                  <div className="mb-4 flex items-center gap-3">
                    <input
                      type="date"
                      value={toDateKey(draftFromDate || new Date())}
                      onChange={(e) => {
                        setDraftFromDate(parseDateKey(e.target.value));
                        setActivePreset('manual');
                      }}
                      className="w-44 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      value={toDateKey(draftToDate || draftFromDate || new Date())}
                      onChange={(e) => {
                        setDraftToDate(parseDateKey(e.target.value));
                        setActivePreset('manual');
                      }}
                      className="w-44 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                    />
                  </div>
                )}

                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveMonthDate(addMonths(activeMonthDate, -1))}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="grid grid-cols-2 gap-6 text-center">
                    <h5 className="text-sm font-semibold text-gray-800">{monthTitle(leftMonth)}</h5>
                    <h5 className="text-sm font-semibold text-gray-800">{monthTitle(rightMonth)}</h5>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveMonthDate(addMonths(activeMonthDate, 1))}
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[leftCells, rightCells].map((cells, gridIndex) => (
                    <div key={gridIndex} className="rounded-xl border border-gray-200 p-2">
                      <div className="mb-2 grid grid-cols-7 text-center text-xs text-gray-500">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                          <span key={day}>{day}</span>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {cells.map((cell, idx) => {
                          if (!cell) return <span key={`${gridIndex}-empty-${idx}`} className="h-7 rounded-md bg-transparent" />;
                          const rangeStart = draftMode === 'rolling' ? rollingPreview.from : normalizeDate(draftFromDate || cell);
                          const rangeEnd = draftMode === 'rolling' ? rollingPreview.to : normalizeDate(draftToDate || draftFromDate || cell);
                          const selectedStart = isSameDay(cell, rangeStart);
                          const selectedEnd = isSameDay(cell, rangeEnd);
                          const inRange = isBetweenDays(cell, rangeStart, rangeEnd);
                          const classes = [
                            'h-7 rounded-md text-sm transition-colors',
                            selectedStart || selectedEnd ? 'bg-gray-800 text-white font-semibold' : '',
                            inRange && !(selectedStart || selectedEnd) ? 'bg-gray-100 text-gray-900' : '',
                            !inRange && !(selectedStart || selectedEnd) ? 'text-gray-700 hover:bg-gray-100' : ''
                          ].filter(Boolean).join(' ');
                          if (draftMode === 'rolling') {
                            return <span key={`${gridIndex}-${toDateKey(cell)}`} className={`flex items-center justify-center ${classes}`}>{cell.getDate()}</span>;
                          }
                          return (
                            <button key={`${gridIndex}-${toDateKey(cell)}`} type="button" onClick={() => handleSelectFixedDate(cell)} className={classes}>
                              {cell.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sticky bottom-0 mt-auto flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-4 py-3">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={apply} className="rounded-xl bg-[#2D2D2D] px-4 py-2 text-sm font-semibold text-white hover:bg-black">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
