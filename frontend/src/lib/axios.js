import axios from "axios";

/**
 * Vercel fix:
 * VITE_API_URL MUST be your BACKEND vercel domain, not frontend domain.
 * Example:
 * VITE_API_URL=https://code-arena-api.vercel.app
 */
const configuredApiUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// final baseURL => https://BACKEND.vercel.app/api
const baseURL = configuredApiUrl ? `${configuredApiUrl}/api` : "/api";

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

// Normalize error shape so UI doesn't crash
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

      if (error.response) error.response.data = { message };
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;