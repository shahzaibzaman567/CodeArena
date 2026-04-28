import axios from "axios";

// Get backend URL from environment
const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

// Build base URL safely
const baseURL = configuredApiUrl
  ? `${configuredApiUrl}/api`
  : "/api";

// Create single axios instance
const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

// Global response interceptor (prevents React crash #31)
axiosInstance.interceptors.response.use(
  (response) => response,
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

      error.response.data = { message };
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;