import axiosInstance from "../axiosInstance";

export async function getAttendanceDashboard(date, months) {
  const params = typeof date === "object" && date !== null
    ? date
    : { date, months };
  const res = await axiosInstance.get("/api/attendance/admin/dashboard", {
    params
  });
  return res.data;
}

export async function getAttendanceEmployees(params) {
  const normalizedParams = { ...(params || {}) };

  if (normalizedParams.status) {
    const rawStatus = String(normalizedParams.status).toUpperCase();

    if (rawStatus === "ON_LEAVE") {
      normalizedParams.status = "LEAVE";
    } else {
      normalizedParams.status = rawStatus;
    }
  }

  const res = await axiosInstance.get("/api/attendance/admin/users", { params: normalizedParams });
  return res.data;
}

export async function getAdminCardsSummary(params) {
  const res = await axiosInstance.get("/api/attendance/admin/cards-summary", { params });
  return res.data;
}

export async function downloadAttendanceExcel(params) {
  const res = await axiosInstance.get("/api/attendance/admin/users/download-excel", {
    params,
    responseType: "blob",
  });
  return res;
}

export async function getUserAllowedLocations(userId) {
  const res = await axiosInstance.get(`/api/attendance/users/${userId}/clock-in-locations`);
  return res.data;
}

export async function createUserAllowedLocation(userId, payload) {
  const res = await axiosInstance.post(`/api/attendance/users/${userId}/allowed-locations`, payload);
  return res.data;
}

export async function deleteUserAllowedLocation(userId, locationId) {
  const res = await axiosInstance.delete(`/api/attendance/users/${userId}/allowed-locations/${locationId}`);
  return res.data;
}

export async function patchUserAllowedLocation(userId, locationId, payload) {
  const res = await axiosInstance.patch(`/api/attendance/users/${userId}/allowed-locations/${locationId}`, payload);
  return res.data;
}
