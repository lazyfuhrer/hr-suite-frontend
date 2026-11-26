import axiosInstance from "../axiosInstance";


export const getLeaveDashboard = async (month, year) => {
  const params = typeof month === "object" && month !== null ? month : { month, year };
  const res = await axiosInstance.get(`/api/leaves/dashboard`, {
    params
  });
  return res.data;
};

export const getLeaveActivity = async (params = {}) => {
  const res = await axiosInstance.get(`/api/leaves/requests`, { params });
  return res.data;
};

export const updateLeaveStatus = async (leaveRequestId, payload) => {
  const res = await axiosInstance.patch(`/api/leaves/requests/${leaveRequestId}/status`, payload);
  return res.data;
};
