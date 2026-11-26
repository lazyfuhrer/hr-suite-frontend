import axiosInstance, { publicApi } from "./axiosInstance";


export const loginHandler = async (form) => {
  const res = await axiosInstance.post("/api/auth/login", form);

  return res.data;
};


export const selectOrgHandler = async ({ orgId }) => {
  try {
    const token = localStorage.getItem("temp_token");
    if (!token) {
      throw new Error("No temporary token found in localStorage");
    }


    const res = await publicApi.post(
      "/api/auth/select-org",
      { org_id: orgId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return res.data;
  } catch (error) {
    console.error("Error selecting organization:", error);
    throw error; // rethrow so caller can handle
  }
};

export const resetPasswordHandler = async (form) => {

  const res = await axiosInstance.post("/api/auth/reset-password", form);

  return res.data;
};

export const refreshTokenHandler = async ({ refreshToken }) => {
  if (!refreshToken) {
    throw new Error("No refresh token found");
  }

  const res = await publicApi.post("/api/auth/refresh", {
    refresh_token: refreshToken,
  });

  return res.data;
};

export const getSwitchableOrgs = async () => {
  const res = await axiosInstance.get("/api/auth/switchable-orgs");
  return res.data;
};

export const switchOrgHandler = async ({ orgId, refreshToken }) => {
  const res = await axiosInstance.post("/api/auth/switch-org", {
    org_id: orgId,
    refresh_token: refreshToken,
  });
  return res.data;
};