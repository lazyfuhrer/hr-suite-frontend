import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getLocationSnapshots } from '../../api/notifications';
import {
  formatSnapshotSource,
  getSnapshotCapturedAt,
  groupLocationSnapshotsByMonthAndDate,
} from '../../utils/locationSnapshotGroups';

const hasCoordinateValue = (value) =>
  value !== null && value !== undefined && `${value}`.trim() !== '' && `${value}`.toLowerCase() !== 'null';

const getMapUrl = (lat, lng) => {
  if (!hasCoordinateValue(lat) || !hasCoordinateValue(lng)) return null;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
  return `https://www.google.com/maps?q=${parsedLat},${parsedLng}`;
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
    minute: '2-digit',
  });
};

const formatCoordinates = (latitude, longitude) => {
  if (!hasCoordinateValue(latitude) || !hasCoordinateValue(longitude)) return '-';
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '-';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
};

export default function EmployeeLocationSnapshotsTab({ employeeId }) {
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState([]);
  const [expandedMonths, setExpandedMonths] = useState(() => new Set());
  const [expandedDates, setExpandedDates] = useState(() => new Set());

  const monthGroups = useMemo(
    () => groupLocationSnapshotsByMonthAndDate(snapshots),
    [snapshots]
  );

  const fetchSnapshots = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const limit = 100;
      let page = 1;
      let allItems = [];
      let totalPages = 1;

      while (page <= 50) {
        const res = await getLocationSnapshots(employeeId, { page, limit });
        const items = Array.isArray(res?.data) ? res.data : [];
        allItems = allItems.concat(items);
        totalPages = res?.pagination?.totalPages ?? 1;
        if (page >= totalPages || items.length === 0) break;
        page += 1;
      }

      setSnapshots(allItems);

      const groups = groupLocationSnapshotsByMonthAndDate(allItems);
      if (groups.length > 0) {
        const firstMonth = groups[0];
        setExpandedMonths(new Set([firstMonth.key]));
        if (firstMonth.dates?.length > 0) {
          setExpandedDates(new Set([`${firstMonth.key}:${firstMonth.dates[0].key}`]));
        } else {
          setExpandedDates(new Set());
        }
      } else {
        setExpandedMonths(new Set());
        setExpandedDates(new Set());
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load location snapshots');
      setSnapshots([]);
      setExpandedMonths(new Set());
      setExpandedDates(new Set());
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const toggleMonth = (monthKey) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) next.delete(monthKey);
      else next.add(monthKey);
      return next;
    });
  };

  const toggleDate = (monthKey, dateKey) => {
    const compositeKey = `${monthKey}:${dateKey}`;
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(compositeKey)) next.delete(compositeKey);
      else next.add(compositeKey);
      return next;
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Location Snapshots</h3>

      {loading ? (
        <div className="py-10 text-center text-gray-400 text-sm">Loading...</div>
      ) : monthGroups.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">No location snapshots found</div>
      ) : (
        <div className="space-y-3">
          {monthGroups.map((monthGroup) => {
            const isMonthExpanded = expandedMonths.has(monthGroup.key);
            return (
              <div key={monthGroup.key} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex flex-wrap items-center gap-4 px-4 py-3.5 bg-[#F8F9FA]">
                  <button
                    type="button"
                    onClick={() => toggleMonth(monthGroup.key)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-lg hover:bg-gray-100/80 transition-colors -ml-1 pl-1 pr-2 py-1"
                  >
                    {isMonthExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500 shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-gray-900">{monthGroup.label}</span>
                  </button>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 shrink-0">
                    {monthGroup.snapshotCount} snapshot{monthGroup.snapshotCount === 1 ? '' : 's'}
                  </span>
                </div>

                {isMonthExpanded && (
                  <div className="border-t border-gray-100 p-3 space-y-2 bg-white">
                    {monthGroup.dates.map((dateGroup) => {
                      const dateCompositeKey = `${monthGroup.key}:${dateGroup.key}`;
                      const isDateExpanded = expandedDates.has(dateCompositeKey);
                      return (
                        <div key={dateGroup.key} className="border border-gray-100 rounded-xl overflow-hidden">
                          <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-[#FAFBFC]">
                            <button
                              type="button"
                              onClick={() => toggleDate(monthGroup.key, dateGroup.key)}
                              className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-lg hover:bg-gray-100/80 transition-colors -ml-1 pl-1 pr-2 py-1"
                            >
                              {isDateExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                              )}
                              <span className="text-sm font-medium text-gray-800">{dateGroup.label}</span>
                            </button>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 shrink-0">
                              {dateGroup.snapshotCount} snapshot{dateGroup.snapshotCount === 1 ? '' : 's'}
                            </span>
                          </div>

                          {isDateExpanded && (
                            <div className="overflow-x-auto border-t border-gray-100">
                              <table className="w-full min-w-[640px]">
                                <thead>
                                  <tr className="bg-white text-left text-xs text-gray-500 font-medium">
                                    <th className="py-3 px-4">Time</th>
                                    <th className="py-3 px-4">Coordinates</th>
                                    <th className="py-3 px-4">Map</th>
                                    <th className="py-3 px-4">Source</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {dateGroup.snapshots.map((snapshot) => {
                                    const mapUrl = getMapUrl(snapshot.latitude, snapshot.longitude);
                                    return (
                                      <tr key={snapshot.id} className="hover:bg-gray-50">
                                        <td className="py-4 px-4 text-sm text-gray-600">
                                          {formatDateTime(getSnapshotCapturedAt(snapshot))}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600 font-mono">
                                          {formatCoordinates(snapshot.latitude, snapshot.longitude)}
                                        </td>
                                        <td className="py-4 px-4 text-sm">
                                          {mapUrl ? (
                                            <a
                                              href={mapUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#F3F4F6] text-gray-600 border border-gray-200 hover:bg-gray-100"
                                              title={`${snapshot.latitude}, ${snapshot.longitude}`}
                                            >
                                              <ExternalLink className="w-4 h-4" />
                                            </a>
                                          ) : (
                                            <span className="text-gray-400">-</span>
                                          )}
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">
                                          {formatSnapshotSource(snapshot.source)}
                                        </td>
                                      </tr>
                                    );
                                  })}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
