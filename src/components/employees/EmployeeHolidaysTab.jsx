import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getUserHolidays, updateUserHolidays } from '../../api/emoloyees/addEmployees';

const formatHolidayDate = (value) => {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const flattenHolidayRows = (items) => {
  const rows = [];
  (Array.isArray(items) ? items : []).forEach((item) => {
    const title = item?.title || '-';
    const dates = Array.isArray(item?.dates) ? item.dates : [];
    dates.forEach((entry) => {
      if (!entry?.holiday_id) return;
      rows.push({
        holiday_id: entry.holiday_id,
        title,
        date: entry.date || '',
        enabled: Boolean(entry.enabled),
      });
    });
  });
  return rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
};

export default function EmployeeHolidaysTab({ employeeId, actionsDisabled = false }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [toggleLoadingById, setToggleLoadingById] = useState({});

  const fetchHolidays = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await getUserHolidays(employeeId);
      setRows(flattenHolidayRows(res?.items));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load holidays');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const holidayRows = useMemo(() => rows || [], [rows]);

  const setRowEnabled = useCallback((holidayId, enabled) => {
    setRows((prev) =>
      (Array.isArray(prev) ? prev : []).map((row) =>
        row?.holiday_id === holidayId ? { ...row, enabled } : row
      )
    );
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Holidays</h3>
          <p className="text-sm text-gray-500 mt-1">Enable or disable holidays for this employee.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
              <th className="py-3 px-4 rounded-l-xl">Holiday</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 rounded-r-xl">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan="3" className="py-10 text-center text-gray-400 text-sm">Loading...</td>
              </tr>
            ) : holidayRows.length === 0 ? (
              <tr>
                <td colSpan="3" className="py-10 text-center text-gray-400 text-sm">No holidays found</td>
              </tr>
            ) : (
              holidayRows.map((row) => {
                const isEnabled = Boolean(row.enabled);
                const isToggleLoading = !!toggleLoadingById?.[row.holiday_id];
                return (
                  <tr key={row.holiday_id} className="hover:bg-gray-50">
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">{row.title || '-'}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{formatHolidayDate(row.date)}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      <label className={`inline-flex items-center gap-2 ${isToggleLoading ? 'opacity-70' : ''}`}>
                        <span className="text-xs font-semibold text-gray-600">
                          {isToggleLoading ? 'Updating…' : isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <button
                          type="button"
                          disabled={actionsDisabled || isToggleLoading}
                          title={
                            actionsDisabled
                              ? 'Holiday changes are disabled for employees on notice or inactive'
                              : undefined
                          }
                          onClick={async () => {
                            if (actionsDisabled) return;
                            if (!employeeId || !row?.holiday_id) return;
                            const nextEnabled = !isEnabled;
                            setToggleLoadingById((prev) => ({ ...prev, [row.holiday_id]: true }));
                            setRowEnabled(row.holiday_id, nextEnabled);
                            try {
                              await updateUserHolidays(employeeId, [
                                { holiday_id: row.holiday_id, enabled: nextEnabled },
                              ]);
                            } catch (error) {
                              setRowEnabled(row.holiday_id, isEnabled);
                              toast.error(error?.response?.data?.message || 'Failed to update holiday');
                            } finally {
                              setToggleLoadingById((prev) => ({ ...prev, [row.holiday_id]: false }));
                            }
                          }}
                          aria-pressed={isEnabled}
                          aria-label={`Set holiday ${isEnabled ? 'disabled' : 'enabled'}`}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors border ${
                            isEnabled
                              ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]'
                              : 'bg-gray-200 border-gray-200'
                          } disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                              isEnabled ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </label>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
