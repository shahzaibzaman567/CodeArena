import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const isSameOriginApi =
  typeof window !== "undefined" &&
  configuredApiUrl &&
  configuredApiUrl === window.location.origin;

const baseURL = isSameOriginApi || !configuredApiUrl ? "/api" : `${configuredApiUrl}/api`;

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

// Intercept responses to convert non-string error data into a safe string
// so it never reaches React's render pipeline as a raw object
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error?.response?.data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      // Handle nested Vercel error shape: { error: { code, message } }
      const nested = data.error;
      const msg =
        typeof data.message === 'string'        ? data.message
        : typeof nested?.message === 'string'   ? nested.message
        : typeof nested === 'string'             ? nested
        : typeof data.error === 'string'         ? data.error
        : 'Something went wrong';
      error.response.data = { message: msg };
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
