import axiosInstance from "../axiosInstance";


// --- Office Locations ---
export const getOfficeLocations = async () => {
  const res = await axiosInstance.get("/api/office-locations");
  return res.data;
};

export const createOfficeLocation = async (payload) => {
  const res = await axiosInstance.post("/api/office-locations", payload);
  return res.data;
};

export const updateOfficeLocation = async (id, payload) => {
  const res = await axiosInstance.put(`/api/office-locations/${id}`, payload);
  return res.data;
};

export const deleteOfficeLocation = async (id) => {
  const res = await axiosInstance.delete(`/api/office-locations/${id}`);
  return res.data;
};

export const getWorkShifts = async () => {
  const res = await axiosInstance.get("/api/work-shifts");
  return res.data;
};

export const createWorkShift = async (payload) => {
  const res = await axiosInstance.post("/api/work-shifts", payload);
  return res.data;
};

export const updateWorkShift = async (id, payload) => {
  const res = await axiosInstance.put(`/api/work-shifts/${id}`, payload);
  return res.data;
};

export const deleteWorkShift = async (id) => {
  const res = await axiosInstance.delete(`/api/work-shifts/${id}`);
  return res.data;
};

// --- Organization Documents ---

export const getOrgDocuments = async () => {
  const res = await axiosInstance.get('/api/organization-documents');
  return res.data;
};

export const createOrgDocument = async (formData) => {
  const res = await axiosInstance.post('/api/organization-documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const updateOrgDocument = async (id, formData) => {
  const res = await axiosInstance.put(`/api/organization-documents/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const deleteOrgDocument = async (id) => {
  const res = await axiosInstance.delete(`/api/organization-documents/${id}`);
  return res.data;
};
export const createLeave = async (payload) => {
  const res = await axiosInstance.post(`/api/leaves/types`, payload);
  return res.data;
};
export const getLeave = async () => {
  const res = await axiosInstance.get(`/api/leaves/types`);
  return res.data;
};
export const updateLeave = async (id, payload) => {
  const res = await axiosInstance.put(`/api/leaves/types/${id}`, payload);
  return res.data;
};
export const deleteLeave = async (id) => {
  const res = await axiosInstance.delete(`/api/leaves/types/${id}`);
  return res.data;
};

export const getHolidays = async () => {
  const res = await axiosInstance.get('/api/holidays');
  return res.data;
};

export const createHolidays = async (payload) => {
  const res = await axiosInstance.post('/api/holidays', payload);
  return res.data;
};

export const deleteHoliday = async (id) => {
  const res = await axiosInstance.delete(`/api/holidays/${id}`);
  return res.data;
};

export const updateOrganizationProfile = async (formData) => {
  const res = await axiosInstance.put('/api/organizations', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
