import { useEffect, useMemo, useState } from 'react';
import { Circle, GoogleMap, InfoWindow, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';

const DEFAULT_CENTER = { lat: 22.5726, lng: 88.3639 };
const MARKER_CAP = 100;

const hasCoordinateValue = (value) =>
  value !== null && value !== undefined && `${value}`.trim() !== '' && `${value}`.toLowerCase() !== 'null';

const toLatLng = (latitude, longitude) => {
  if (!hasCoordinateValue(latitude) || !hasCoordinateValue(longitude)) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
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

const formatEventType = (eventType) => {
  const normalized = String(eventType || '').trim().toLowerCase();
  if (normalized === 'in') return 'In';
  if (normalized === 'out') return 'Out';
  return eventType || '-';
};

const getMarkerIcon = (eventType) => {
  const normalized = String(eventType || '').trim().toLowerCase();
  const color = normalized === 'in' ? '#16A34A' : normalized === 'out' ? '#EA580C' : '#EB4000';
  return {
    path: window.google?.maps?.SymbolPath?.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 2,
    scale: 8,
  };
};

export default function EmployeeGeofenceEventsMap({ events = [], geofences = [], loading = false }) {
  const googleMapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim();
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: ['places'],
  });
  const [map, setMap] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const eventPoints = useMemo(() => {
    return (Array.isArray(events) ? events : [])
      .map((event) => {
        const position = toLatLng(event.latitude, event.longitude);
        if (!position) return null;
        return { ...event, position };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = new Date(a?.recorded_at || 0).getTime();
        const bTime = new Date(b?.recorded_at || 0).getTime();
        return aTime - bTime;
      });
  }, [events]);

  const path = useMemo(
    () => eventPoints.map((point) => point.position),
    [eventPoints]
  );

  const markersToShow = useMemo(() => {
    if (eventPoints.length <= MARKER_CAP) return eventPoints;
    const first = eventPoints[0];
    const last = eventPoints[eventPoints.length - 1];
    if (first?.id === last?.id) return [first];
    return [first, last].filter(Boolean);
  }, [eventPoints]);

  const selectedPoint = useMemo(
    () => eventPoints.find((point) => point.id === selectedId) || null,
    [eventPoints, selectedId]
  );

  const geofenceCircles = useMemo(() => {
    const seen = new Set();
    const circles = [];

    const addGeofence = (geofence) => {
      if (!geofence?.id || seen.has(geofence.id)) return;
      const position = toLatLng(geofence.latitude, geofence.longitude);
      const radius = Number(geofence.radius_meters);
      if (!position || !Number.isFinite(radius) || radius <= 0) return;
      seen.add(geofence.id);
      circles.push({
        id: geofence.id,
        position,
        radius,
        landmark: geofence.landmark || '',
      });
    };

    (Array.isArray(geofences) ? geofences : []).forEach(addGeofence);
    (Array.isArray(events) ? events : []).forEach((event) => {
      if (event?.geofence) addGeofence(event.geofence);
    });

    return circles;
  }, [events, geofences]);

  const center = path[0] || geofenceCircles[0]?.position || DEFAULT_CENTER;

  useEffect(() => {
    setSelectedId(null);
  }, [events]);

  useEffect(() => {
    if (!map || typeof window === 'undefined' || !window.google?.maps) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasBounds = false;

    path.forEach((coord) => {
      bounds.extend(coord);
      hasBounds = true;
    });

    geofenceCircles.forEach((circle) => {
      bounds.extend(circle.position);
      hasBounds = true;
    });

    if (!hasBounds) return;

    if (path.length === 1 && geofenceCircles.length === 0) {
      map.setCenter(path[0]);
      map.setZoom(15);
      return;
    }

    map.fitBounds(bounds, 48);
  }, [map, path, geofenceCircles]);

  if (!googleMapsApiKey) {
    return (
      <div className="w-full h-80 rounded-xl border border-gray-100 overflow-hidden bg-[#F8F9FA] flex items-center justify-center text-sm text-gray-500">
        Google Maps is not configured
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-80 rounded-xl border border-gray-100 overflow-hidden bg-[#F8F9FA] flex items-center justify-center text-sm text-red-600 font-medium">
        Failed to load Google Maps. Check API key restrictions and enabled APIs.
      </div>
    );
  }

  if (loading || !isLoaded) {
    return (
      <div className="w-full h-80 rounded-xl border border-gray-100 overflow-hidden bg-[#F8F9FA] flex items-center justify-center text-sm text-gray-500">
        Loading map...
      </div>
    );
  }

  if (eventPoints.length === 0 && geofenceCircles.length === 0) {
    return (
      <div className="w-full h-80 rounded-xl border border-gray-100 overflow-hidden bg-[#F8F9FA] flex items-center justify-center text-sm text-gray-500">
        No geofence events to show on map
      </div>
    );
  }

  return (
    <div className="w-full h-80 rounded-xl border border-gray-100 overflow-hidden">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={13}
        onLoad={setMap}
        onUnmount={() => setMap(null)}
        options={{
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
        }}
      >
        {geofenceCircles.map((circle) => (
          <Circle
            key={circle.id}
            center={circle.position}
            radius={circle.radius}
            options={{
              strokeColor: '#EB4000',
              fillColor: '#EB4000',
              fillOpacity: 0.1,
              strokeOpacity: 0.6,
              strokeWeight: 2,
            }}
          />
        ))}

        {path.length >= 2 && (
          <Polyline
            path={path}
            options={{
              strokeColor: '#EB4000',
              strokeOpacity: 0.9,
              strokeWeight: 3,
            }}
          />
        )}

        {markersToShow.map((point) => (
          <Marker
            key={point.id}
            position={point.position}
            icon={typeof window !== 'undefined' && window.google?.maps ? getMarkerIcon(point.event_type) : undefined}
            onClick={() => setSelectedId(point.id)}
          />
        ))}

        {selectedPoint && (
          <InfoWindow
            position={selectedPoint.position}
            onCloseClick={() => setSelectedId(null)}
          >
            <div className="text-xs space-y-1 min-w-[140px]">
              <div className="font-semibold text-gray-900">
                {formatDateTime(selectedPoint.recorded_at)}
              </div>
              <div className="text-gray-600">
                Event: {formatEventType(selectedPoint.event_type)}
              </div>
              <div className="text-gray-600">
                Landmark: {selectedPoint.geofence?.landmark || '-'}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
