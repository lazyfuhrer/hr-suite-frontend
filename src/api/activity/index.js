import axiosInstance from "../axiosInstance";

export const getActivities = async (params = { page: 1, limit: 20 }) => {
  const res = await axiosInstance.get("/api/activity", { params });
  return res.data;
};

