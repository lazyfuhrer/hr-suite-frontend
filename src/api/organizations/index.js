import axiosInstance from "../axiosInstance";

export const getOrganizationSettings = async () => {
  const res = await axiosInstance.get("/api/organizations");
  return res.data;
};

export const updateOrganizationSettings = async (payload) => {
  const isMultipart = payload instanceof FormData;
  const res = await axiosInstance.put("/api/organizations", payload, {
    headers: isMultipart ? { "Content-Type": "multipart/form-data" } : undefined,
  });
  return res.data;
};
