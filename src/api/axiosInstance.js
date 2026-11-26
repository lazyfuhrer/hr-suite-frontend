import axios from "axios";
import { store } from "../store/index"; // adjust path
import { logout, setCredentials } from "../store/slices/authSlice";

const baseURL = import.meta.env.VITE_BACKEND_URL;

const axiosInstance = axios.create({
  baseURL: baseURL,
});

// ✅ Attach token in every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) {
    throw new Error("No refresh token found");
  }

  const res = await publicApi.post("/api/auth/refresh", {
    refresh_token: refreshToken,
  });

  // Expected response: { token, refresh_token, user }
  const data = res.data;
  store.dispatch(
    setCredentials({
      user: data.user,
      token: data.token,
      refreshToken: data.refresh_token,
    })
  );

  return data;
};

// ✅ Handle expired token globally (401 -> refresh -> retry)
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    if (
      error?.response &&
      error.response.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        } else {
          // Another request already triggered refresh; wait for it.
        }

        await refreshPromise;
        return axiosInstance(originalRequest);
      } catch {
        // Refresh failed -> clear Redux + redirect.
        store.dispatch(logout());
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    // Non-401 errors or retries beyond the first attempt.
    if (error?.response && error.response.status === 401) {
      store.dispatch(logout());
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export const publicApi = axios.create({
  baseURL: baseURL
});

export default axiosInstance;