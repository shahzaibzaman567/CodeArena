import axios from "axios";
const baseURL = import.meta.env.VITE_API_URL || "/api";

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

// 🔥 Cross-Domain Auth Fix: Allow manual token injection
axiosInstance.interceptors.request.use(async (config) => {
  const token = typeof window !== "undefined" ? window.__clerk_token : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Error handler
axiosInstance.interceptors.response.use(
  (res) => res,
  (error) => {
    const data = error?.response?.data;

    if (data && typeof data === "object" && !Array.isArray(data)) {
      const nested = data.error;

      const message =
        typeof data.message === "string"
          ? data.message
          : typeof nested?.message === "string"
          ? nested.message
          : typeof nested === "string"
          ? nested
          : typeof data.error === "string"
          ? data.error
          : "Something went wrong";

      if (error.response) {
        error.response.data = { message };
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;