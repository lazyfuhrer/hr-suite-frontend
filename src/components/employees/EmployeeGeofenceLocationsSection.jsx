import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { ChevronLeft, ChevronRight, ExternalLink, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Autocomplete, Circle, GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import {
  createGeofence,
  deleteGeofence,
  getGeofenceEvents,
  getGeofences,
  updateGeofence,
} from '../../api/geofences';
import EmployeeGeofenceEventsMap from './EmployeeGeofenceEventsMap';

const PAGE_LIMIT = 25;
const DAY_FETCH_LIMIT = 100;
const DAY_FETCH_MAX_PAGES = 50;
const DEFAULT_COORDS = { lat: 22.5726, lng: 88.3639 };

const hasCoordinateValue = (value) =>
  value !== null && value !== undefined && `${value}`.trim() !== '' && `${value}`.toLowerCase() !== 'null';

const getMapUrl = (lat, lng) => {
  if (!hasCoordinateValue(lat) || !hasCoordinateValue(lng)) return null;
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
  return `https://www.google.com/maps?q=${parsedLat},${parsedLng}`;
};

const formatToday = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
    second: '2-digit',
  });
};

const buildFormFromGeofence = (geofence) => ({
  landmark: geofence?.landmark || '',
  radius_meters: geofence?.radius_meters != null ? String(geofence.radius_meters) : '100',
  latitude: hasCoordinateValue(geofence?.latitude) ? Number(geofence.latitude).toFixed(6) : '',
  longitude: hasCoordinateValue(geofence?.longitude) ? Number(geofence.longitude).toFixed(6) : '',
});

const EventTypeBadge = ({ eventType }) => {
  const normalized = String(eventType || '').trim().toLowerCase();
  if (normalized === 'in') {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
        In
      </span>
    );
  }
  if (normalized === 'out') {
    return (
      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700">
        Out
      </span>
    );
  }
  return <span className="text-sm text-gray-600">{eventType || '-'}</span>;
};

export default function EmployeeGeofenceLocationsSection({ employeeId, actionsDisabled = false }) {
  const orgId = useSelector((state) => state.auth.user?.org_id);

  const [geofences, setGeofences] = useState([]);
  const [geofencesLoading, setGeofencesLoading] = useState(true);
  const [formModal, setFormModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [date, setDate] = useState(formatToday);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
  const [listLoading, setListLoading] = useState(false);
  const [dayEvents, setDayEvents] = useState([]);
  const [dayLoading, setDayLoading] = useState(false);

  const fetchGeofences = useCallback(async () => {
    if (!employeeId) return;
    setGeofencesLoading(true);
    try {
      const res = await getGeofences();
      const allGeofences = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setGeofences(allGeofences.filter((item) => item?.user_id === employeeId));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load geofences');
      setGeofences([]);
    } finally {
      setGeofencesLoading(false);
    }
  }, [employeeId]);

  const fetchEvents = useCallback(async () => {
    if (!employeeId || !date) return;
    setListLoading(true);
    try {
      const res = await getGeofenceEvents({
        userId: employeeId,
        date,
        page,
        limit: PAGE_LIMIT,
      });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setPagination({
        page: res?.pagination?.page ?? page,
        limit: res?.pagination?.limit ?? PAGE_LIMIT,
        total: res?.pagination?.total ?? 0,
        totalPages: Math.max(1, res?.pagination?.totalPages ?? 1),
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load geofence events');
      setRows([]);
      setPagination({ page: 1, limit: PAGE_LIMIT, total: 0, totalPages: 1 });
    } finally {
      setListLoading(false);
    }
  }, [employeeId, date, page]);

  const fetchDayEvents = useCallback(async () => {
    if (!employeeId || !date) return;
    setDayLoading(true);
    try {
      let pageNum = 1;
      let allItems = [];
      let totalPages = 1;

      while (pageNum <= DAY_FETCH_MAX_PAGES) {
        const res = await getGeofenceEvents({
          userId: employeeId,
          date,
          page: pageNum,
          limit: DAY_FETCH_LIMIT,
        });
        const items = Array.isArray(res?.data) ? res.data : [];
        allItems = allItems.concat(items);
        totalPages = res?.pagination?.totalPages ?? 1;
        if (pageNum >= totalPages || items.length === 0) break;
        pageNum += 1;
      }

      allItems.sort((a, b) => {
        const aTime = new Date(a?.recorded_at || 0).getTime();
        const bTime = new Date(b?.recorded_at || 0).getTime();
        return aTime - bTime;
      });
      setDayEvents(allItems);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load day map events');
      setDayEvents([]);
    } finally {
      setDayLoading(false);
    }
  }, [employeeId, date]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchGeofences(), fetchEvents(), fetchDayEvents()]);
  }, [fetchGeofences, fetchEvents, fetchDayEvents]);

  useEffect(() => {
    fetchGeofences();
  }, [fetchGeofences]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchDayEvents();
  }, [fetchDayEvents]);

  const geofenceRows = useMemo(() => geofences || [], [geofences]);
  const totalPages = pagination.totalPages || 1;
  const currentPage = pagination.page || page;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4 gap-4">
        <h3 className="text-lg font-bold text-gray-900">Geofence Locations</h3>
        <button
          type="button"
          disabled={actionsDisabled}
          title={
            actionsDisabled
              ? 'Location changes are disabled for employees on notice or inactive'
              : undefined
          }
          onClick={() => {
            if (actionsDisabled) return;
            setFormModal({ mode: 'create' });
          }}
          className="px-4 py-2 rounded-xl bg-[#EB4000] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add Geofence
        </button>
      </div>

      <div className="overflow-x-auto mb-8">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
              <th className="py-3 px-4 rounded-l-xl">Landmark</th>
              <th className="py-3 px-4">Map</th>
              <th className="py-3 px-4">Radius</th>
              <th className="py-3 px-4 rounded-r-xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {geofencesLoading ? (
              <tr>
                <td colSpan="4" className="py-10 text-center text-gray-400 text-sm">
                  Loading...
                </td>
              </tr>
            ) : geofenceRows.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-10 text-center text-gray-400 text-sm">
                  No geofences found
                </td>
              </tr>
            ) : (
              geofenceRows.map((row) => {
                const mapUrl = getMapUrl(row.latitude, row.longitude);
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4 text-sm font-medium text-gray-900">{row.landmark || '-'}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {mapUrl ? (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#F3F4F6] text-gray-600 border border-gray-200 hover:bg-gray-100"
                          title={`${row.latitude}, ${row.longitude}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {row.radius_meters ? `${row.radius_meters} m` : '-'}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionsDisabled}
                          title={
                            actionsDisabled
                              ? 'Location changes are disabled for employees on notice or inactive'
                              : undefined
                          }
                          onClick={() => {
                            if (actionsDisabled) return;
                            setFormModal({ mode: 'edit', geofence: row });
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={actionsDisabled}
                          title={
                            actionsDisabled
                              ? 'Location changes are disabled for employees on notice or inactive'
                              : undefined
                          }
                          onClick={() => {
                            if (actionsDisabled) return;
                            setDeleteTarget(row);
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <h4 className="text-sm font-bold text-gray-900 mb-4">Events</h4>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <label className="inline-flex items-center gap-2 text-sm text-gray-600">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F8F9FA] rounded-xl text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
          />
        </label>
        <span className="text-xs text-gray-400">
          {pagination.total} event{pagination.total === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mb-4">
        <EmployeeGeofenceEventsMap
          events={dayEvents}
          geofences={geofenceRows}
          loading={dayLoading}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
              <th className="py-3 px-4 rounded-l-xl">Time</th>
              <th className="py-3 px-4">Event</th>
              <th className="py-3 px-4">Landmark</th>
              <th className="py-3 px-4">Map</th>
              <th className="py-3 px-4 rounded-r-xl">Radius</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {listLoading ? (
              <tr>
                <td colSpan="5" className="py-10 text-center text-gray-400 text-sm">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-10 text-center text-gray-400 text-sm">
                  No geofence events found
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const mapUrl = getMapUrl(row.latitude, row.longitude);
                return (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4 text-sm text-gray-900 whitespace-nowrap">
                      {formatDateTime(row.recorded_at)}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      <EventTypeBadge eventType={row.event_type} />
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {row.geofence?.landmark || '-'}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {mapUrl ? (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#F3F4F6] text-gray-600 border border-gray-200 hover:bg-gray-100"
                          title={`${row.latitude}, ${row.longitude}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {row.geofence?.radius_meters ? `${row.geofence.radius_meters} m` : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 gap-3">
        <span className="text-xs text-gray-500">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={listLoading || currentPage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>
          <button
            type="button"
            disabled={listLoading || currentPage >= totalPages}
            onClick={() => setPage((prev) => prev + 1)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!!formModal && (
        <GeofenceFormModal
          mode={formModal.mode}
          geofence={formModal.geofence}
          employeeId={employeeId}
          orgId={orgId}
          onClose={() => setFormModal(null)}
          onSuccess={async () => {
            setFormModal(null);
            await refreshAll();
          }}
        />
      )}

      {!!deleteTarget && (
        <DeleteGeofenceConfirmModal
          landmark={deleteTarget.landmark || ''}
          onCancel={() => {
            if (deleting) return;
            setDeleteTarget(null);
          }}
          onConfirm={async () => {
            if (!deleteTarget?.id) return;
            setDeleting(true);
            try {
              await deleteGeofence(deleteTarget.id);
              toast.success('Geofence deleted');
              setDeleteTarget(null);
              await refreshAll();
            } catch (error) {
              toast.error(error?.response?.data?.message || 'Failed to delete geofence');
            } finally {
              setDeleting(false);
            }
          }}
          deleting={deleting}
        />
      )}
    </div>
  );
}

function DeleteGeofenceConfirmModal({ landmark, onCancel, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="text-base font-bold text-gray-900">Delete geofence?</h4>
          <p className="text-sm text-gray-500 mt-1">
            Are you sure you want to delete{' '}
            {landmark ? <span className="font-semibold text-gray-800">{landmark}</span> : 'this geofence'}?
          </p>
        </div>

        <div className="px-6 py-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GeofenceFormModal({ mode = 'create', geofence, employeeId, orgId, onClose, onSuccess }) {
  const isEdit = mode === 'edit';
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => (isEdit ? buildFormFromGeofence(geofence) : {
    landmark: '',
    radius_meters: '100',
    latitude: '',
    longitude: '',
  }));
  const googleMapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: ['places'],
  });
  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);

  const selectedLat = Number(form.latitude);
  const selectedLng = Number(form.longitude);
  const hasSelectedCoords = Number.isFinite(selectedLat) && Number.isFinite(selectedLng);
  const center = hasSelectedCoords ? { lat: selectedLat, lng: selectedLng } : DEFAULT_COORDS;

  const setCoords = useCallback((lat, lng) => {
    setForm((prev) => ({
      ...prev,
      latitude: Number(lat).toFixed(6),
      longitude: Number(lng).toFixed(6),
    }));
  }, []);

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace?.();
    const lat = place?.geometry?.location?.lat?.();
    const lng = place?.geometry?.location?.lng?.();
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setCoords(lat, lng);
      mapRef.current?.panTo?.({ lat, lng });
    }
  };

  const handleSubmit = async () => {
    if (!form.landmark.trim()) {
      toast.error('Landmark is required');
      return;
    }
    const radiusValue = Number(form.radius_meters);
    if (!Number.isFinite(radiusValue) || radiusValue <= 0) {
      toast.error('Radius must be greater than 0');
      return;
    }
    if (!form.latitude || !form.longitude) {
      toast.error('Please select location on map');
      return;
    }
    if (!orgId) {
      toast.error('Organization context is missing');
      return;
    }
    if (!employeeId) {
      toast.error('Employee context is missing');
      return;
    }

    const payload = {
      org_id: orgId,
      user_id: employeeId,
      landmark: form.landmark.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius_meters: radiusValue,
    };

    setSaving(true);
    try {
      if (isEdit) {
        if (!geofence?.id) {
          toast.error('Geofence context is missing');
          return;
        }
        await updateGeofence(geofence.id, payload);
        toast.success('Geofence updated');
      } else {
        await createGeofence(payload);
        toast.success('Geofence created');
      }
      onSuccess?.();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          (isEdit ? 'Failed to update geofence' : 'Failed to create geofence')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl max-h-[82vh] rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <h4 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Geofence' : 'Add Geofence'}</h4>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Landmark</label>
              <input
                type="text"
                value={form.landmark}
                onChange={(event) => setForm((prev) => ({ ...prev, landmark: event.target.value }))}
                placeholder="Park Street Gates"
                className="w-full px-3 py-2 bg-[#F8F9FA] rounded-xl text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Radius Meters</label>
              <input
                type="number"
                min="1"
                value={form.radius_meters}
                onChange={(event) => setForm((prev) => ({ ...prev, radius_meters: event.target.value }))}
                placeholder="100"
                className="w-full px-3 py-2 bg-[#F8F9FA] rounded-xl text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Search Location</label>
            <div className="flex items-center gap-2">
              {googleMapsApiKey ? (
                isLoaded ? (
                  <Autocomplete
                    onLoad={(instance) => {
                      autocompleteRef.current = instance;
                    }}
                    onPlaceChanged={handlePlaceChanged}
                  >
                    <input
                      type="text"
                      placeholder="Search and then pick exact point in map"
                      className="flex-1 px-3 py-2 bg-[#F8F9FA] rounded-xl text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
                    />
                  </Autocomplete>
                ) : (
                  <input
                    type="text"
                    placeholder="Loading Google Places..."
                    className="flex-1 px-3 py-2 bg-[#F8F9FA] rounded-xl text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
                    disabled
                  />
                )
              ) : (
                <input
                  type="text"
                  placeholder="Set VITE_GOOGLE_MAPS_API_KEY to enable search"
                  className="flex-1 px-3 py-2 bg-[#F8F9FA] rounded-xl text-sm border border-gray-100 focus:outline-none focus:ring-2 focus:ring-[#EB4000]/20"
                  disabled
                />
              )}
            </div>
            {!!loadError && (
              <div className="text-xs text-red-600 font-medium">
                Failed to load Google Maps. Check API key restrictions and enabled APIs.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 inline-flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Map
            </label>
            <div className="relative">
              {googleMapsApiKey ? (
                isLoaded ? (
                  <div className="w-full h-56 rounded-xl border border-gray-100 overflow-hidden">
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={center}
                      zoom={hasSelectedCoords ? 15 : 13}
                      onLoad={(map) => {
                        mapRef.current = map;
                      }}
                      onClick={(event) => {
                        const lat = event?.latLng?.lat?.();
                        const lng = event?.latLng?.lng?.();
                        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                        setCoords(lat, lng);
                      }}
                      options={{
                        streetViewControl: false,
                        fullscreenControl: false,
                        mapTypeControl: false,
                      }}
                    >
                      <Marker
                        position={center}
                        draggable
                        onDragEnd={(event) => {
                          const lat = event?.latLng?.lat?.();
                          const lng = event?.latLng?.lng?.();
                          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                          setCoords(lat, lng);
                        }}
                      />
                      <Circle
                        center={center}
                        radius={Number.isFinite(Number(form.radius_meters)) ? Number(form.radius_meters) : 0}
                        options={{
                          strokeColor: '#EB4000',
                          fillColor: '#EB4000',
                          fillOpacity: 0.15,
                          strokeOpacity: 0.8,
                          strokeWeight: 2,
                        }}
                      />
                    </GoogleMap>
                  </div>
                ) : (
                  <div className="w-full h-56 rounded-xl border border-gray-100 overflow-hidden bg-[#F8F9FA] flex items-center justify-center text-sm text-gray-500">
                    Loading map...
                  </div>
                )
              ) : (
                <div className="w-full h-56 rounded-xl border border-gray-100 overflow-hidden bg-[#F8F9FA] flex items-center justify-center text-sm text-gray-500">
                  Google Maps is not configured
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-[#EB4000] text-white text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
