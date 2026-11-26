import axiosInstance from "../axiosInstance";

export const getPayrollSummary = async (month, year) => {
  const res = await axiosInstance.get("/api/payroll/admin/dashboard/summary", {
    params: { month, year }
  });
  return res.data;
};

export const getPayrollList = async (params) => {
  const res = await axiosInstance.get("/api/payroll/admin/list", { params });
  return res.data;
};

export const getPayrollAdjust = async (payrollRecordId) => {
  const res = await axiosInstance.get(`/api/payroll/admin/adjust/${payrollRecordId}`);
  return res.data;
};

export const updatePayrollAdjust = async (payrollRecordId, payload) => {
  const res = await axiosInstance.put(`/api/payroll/admin/adjust/${payrollRecordId}`, payload);
  return res.data;
};

export const updatePayrollStatus = async (payrollRecordId, payload) => {
  const res = await axiosInstance.put(`/api/payroll/admin/records/${payrollRecordId}`, payload);
  return res.data;
};

export const downloadPayslip = async (payrollRecordId) => {
  return axiosInstance.get(`/api/payroll/admin/records/${payrollRecordId}/payslip`, {
    responseType: "blob"
  });
};

export const downloadPayrollExcel = async (params) => {
  return axiosInstance.get("/api/payroll/admin/list/download-excel", {
    params,
    responseType: "blob",
  });
};

export const getPayrollSettings = async () => {
  const res = await axiosInstance.get("/api/payroll/settings");
  return res.data;
};

export const updatePayrollSettings = async (payload) => {
  const res = await axiosInstance.put("/api/payroll/settings", payload);
  return res.data;
};
