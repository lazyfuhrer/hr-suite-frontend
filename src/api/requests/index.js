import axiosInstance from "../axiosInstance";

export const getRequestsCombined = async (params = { page: 1, limit: 10 }) => {
  const res = await axiosInstance.get(`/api/requests/combined`, { params });
  return res.data;
};

export const getLeaveRequests = async (params = { page: 1, limit: 10 }) => {
  const res = await axiosInstance.get(`/api/leaves/requests`, { params });
  return res.data;
};

export const getAttendanceRequests = async (params = { page: 1, limit: 10 }) => {
  const res = await axiosInstance.get(`/api/attendance/requests`, { params });
  return res.data;
};

export const updateLeaveRequestStatus = async (leaveRequestId, payload) => {
  const res = await axiosInstance.patch(`/api/leaves/requests/${leaveRequestId}/status`, payload);
  return res.data;
};

export const updateAttendanceRequestStatus = async (requestId, payload) => {
  const res = await axiosInstance.patch(`/api/attendance/requests/${requestId}/status`, payload);
  return res.data;
};

export const getReimbursementRequests = async (params = { page: 1, limit: 10 }) => {
  const res = await axiosInstance.get(`/api/reimbursements/requests`, { params });
  return res.data;
};

export const updateReimbursementRequestStatus = async (requestId, payload) => {
  const res = await axiosInstance.patch(`/api/reimbursements/requests/${requestId}/status`, payload);
  return res.data;
};

export const getWfhRequests = async (params = { page: 1, limit: 10 }) => {
  const res = await axiosInstance.get(`/api/wfh/requests`, { params });
  return res.data;
};

export const getWfhRequestById = async (requestId) => {
  const res = await axiosInstance.get(`/api/wfh/requests/${requestId}`);
  return res.data;
};

export const updateWfhRequestStatus = async (requestId, payload) => {
  const res = await axiosInstance.patch(`/api/wfh/requests/${requestId}/status`, payload);
  return res.data;
};
