import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, MapPin, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createUserAllowedLocation, deleteUserAllowedLocation, getUserAllowedLocations, patchUserAllowedLocation } from '../../api/attendance';
import { Autocomplete, GoogleMap, Marker, Circle, useJsApiLoader } from '@react-google-maps/api';
import EmployeeGeofenceLocationsSection from './EmployeeGeofenceLocationsSection';

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


export default function EmployeeAllowedLocationsTab({ employeeId, actionsDisabled = false }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggleLoadingById, setToggleLoadingById] = useState({});

  const fetchLocations = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const res = await getUserAllowedLocations(employeeId);
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const locationRows = useMemo(() => rows || [], [rows]);
  const isUserType = useCallback(
    (row) => String(row?.location_type || '').trim().toLowerCase() === 'user',
    []
  );

  const setRowActive = useCallback((locationId, isActive) => {
    setRows((prev) =>
      (Array.isArray(prev) ? prev : []).map((row) =>
        row?.id === locationId ? { ...row, is_active: isActive } : row
      )
    );
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Clock-in Locations</h3>
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
              setIsModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#EB4000] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add New Location
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F8F9FA] text-left text-xs text-gray-500 font-medium">
                <th className="py-3 px-4 rounded-l-xl">Name</th>
                <th className="py-3 px-4">Map</th>
                <th className="py-3 px-4">Radius</th>
                <th className="py-3 px-4 rounded-r-xl">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-gray-400 text-sm">Loading...</td>
                </tr>
              ) : locationRows.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-gray-400 text-sm">No locations found</td>
                </tr>
              ) : (
                locationRows.map((row) => {
                  const mapUrl = getMapUrl(row.latitude, row.longitude);
                  const hasValidCoords = !!mapUrl;
                  const canDelete = isUserType(row);
                  const isActive = row?.is_active ?? true;
                  const isToggleLoading = !!toggleLoadingById?.[row?.id];
                  return (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="py-4 px-4 text-sm font-medium text-gray-900">{row.location_name || row.label || '-'}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {hasValidCoords ? (
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
                      <td className="py-4 px-4 text-sm text-gray-600">{row.radius_meters ? `${row.radius_meters} m` : '-'}</td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        <div className="flex items-center justify-between gap-3">
                          <span className="capitalize">{row.location_type || '-'}</span>
                          {canDelete ? (
                            <div className="flex items-center gap-2">
                              <label className={`inline-flex items-center gap-2 ${isToggleLoading ? 'opacity-70' : ''}`}>
                                <span className="text-xs font-semibold text-gray-600">
                                  {isToggleLoading ? 'Updating…' : isActive ? 'Active' : 'Inactive'}
                                </span>
                                <button
                                  type="button"
                                  disabled={actionsDisabled || isToggleLoading}
                                  onClick={async () => {
                                    if (actionsDisabled) return;
                                    if (!employeeId || !row?.id) return;
                                    const nextActive = !isActive;
                                    setToggleLoadingById((prev) => ({ ...prev, [row.id]: true }));
                                    setRowActive(row.id, nextActive);
                                    try {
                                      await patchUserAllowedLocation(employeeId, row.id, { is_active: nextActive });
                                    } catch (error) {
                                      setRowActive(row.id, isActive);
                                      toast.error(error?.response?.data?.message || 'Failed to update location');
                                    } finally {
                                      setToggleLoadingById((prev) => ({ ...prev, [row.id]: false }));
                                    }
                                  }}
                                  aria-pressed={isActive}
                                  aria-label={`Set location ${isActive ? 'inactive' : 'active'}`}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors border ${
                                    isActive ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : 'bg-gray-200 border-gray-200'
                                  } disabled:opacity-60`}
                                >
                                  <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                                      isActive ? 'translate-x-5' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </label>
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
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {isModalOpen && (
          <CreateLocationModal
            employeeId={employeeId}
            onClose={() => setIsModalOpen(false)}
            onSuccess={async () => {
              setIsModalOpen(false);
              await fetchLocations();
            }}
          />
        )}

        {!!deleteTarget && (
          <DeleteLocationConfirmModal
            locationName={deleteTarget.location_name || deleteTarget.label || ''}
            onCancel={() => {
              if (deleting) return;
              setDeleteTarget(null);
            }}
            onConfirm={async () => {
              if (!employeeId || !deleteTarget?.id) return;
              setDeleting(true);
              try {
                await deleteUserAllowedLocation(employeeId, deleteTarget.id);
                toast.success('Location deleted');
                setDeleteTarget(null);
                await fetchLocations();
              } catch (error) {
                toast.error(error?.response?.data?.message || 'Failed to delete location');
              } finally {
                setDeleting(false);
              }
            }}
            deleting={deleting}
          />
        )}
      </div>

      <EmployeeGeofenceLocationsSection employeeId={employeeId} actionsDisabled={actionsDisabled} />
    </div>
  );
}

function DeleteLocationConfirmModal({ locationName, onCancel, onConfirm, deleting }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h4 className="text-base font-bold text-gray-900">Delete location?</h4>
          <p className="text-sm text-gray-500 mt-1">
            Are you sure you want to delete {locationName ? <span className="font-semibold text-gray-800">{locationName}</span> : 'this location'}?
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

function CreateLocationModal({ employeeId, onClose, onSuccess }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    radius_meters: '',
    latitude: '',
    longitude: ''
  });
  const googleMapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: ['places']
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
      longitude: Number(lng).toFixed(6)
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
    if (!form.name.trim()) {
      toast.error('Name is required');
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

    setSaving(true);
    try {
      await createUserAllowedLocation(employeeId, {
        label: form.name.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radius_meters: radiusValue
      });
      toast.success('Location created');
      onSuccess?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl max-h-[82vh] rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
          <h4 className="text-base font-bold text-gray-900">Add New Location</h4>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Client Site - Gate 1"
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
                placeholder="200"
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
                        mapTypeControl: false
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
                          strokeWeight: 2
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
