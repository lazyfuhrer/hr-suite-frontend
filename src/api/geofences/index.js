import axiosInstance from '../axiosInstance';

export async function getGeofences() {
  const res = await axiosInstance.get('/api/geofences');
  return res.data;
}

export async function createGeofence(payload) {
  const res = await axiosInstance.post('/api/geofences', payload);
  return res.data;
}

export async function updateGeofence(id, payload) {
  const res = await axiosInstance.put(`/api/geofences/${id}`, payload);
  return res.data;
}

export async function deleteGeofence(id) {
  const res = await axiosInstance.delete(`/api/geofences/${id}`);
  return res.data;
}

export async function getGeofenceEvents({ userId, date, page = 1, limit = 25 }) {
  const res = await axiosInstance.get('/api/geofences/events', {
    params: { userId, date, page, limit },
  });
  return res.data;
}
