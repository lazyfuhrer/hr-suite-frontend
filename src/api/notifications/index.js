import axiosInstance from "../axiosInstance";

export const getNotificationSettings = async () => {
  const res = await axiosInstance.get("/api/notifications/settings");
  return res.data;
};

export const updateNotificationSettings = async (payload) => {
  const res = await axiosInstance.patch("/api/notifications/settings", payload);
  return res.data;
};

export const getLocationSnapshots = async (userId, params = { page: 1, limit: 25 }) => {
  const res = await axiosInstance.get("/api/notifications/location-snapshots", {
    params: { userId, ...params },
  });
  return res.data;
};

