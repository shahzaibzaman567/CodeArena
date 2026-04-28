import axios from "axios";

// 🔥 DIRECT BACKEND URL (NO ENV)
const baseURL = "https://code-arena11.vercel.app/api";

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

// Debug (optional)
console.log("✅ API BASE URL:", baseURL);

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