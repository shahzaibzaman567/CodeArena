import axios from "axios";

// 🔥 DYNAMIC BACKEND URL
// In production: uses VITE_API_URL
// In local dev: uses relative path /api (proxied by Vite to localhost:4000)
const baseURL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, "")}/api`
  : "/api";

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
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