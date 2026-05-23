import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "/api";

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

async function resolveAuthToken() {
  if (typeof window === "undefined") return null;

  if (typeof window.__clerk_refresh_token === "function") {
    try {
      const refreshed = await window.__clerk_refresh_token();
      if (refreshed) return refreshed;
    } catch {
      // Fall through to cached token
    }
  }

  return window.__clerk_token || window.localStorage.getItem("__clerk_token");
}

axiosInstance.interceptors.request.use(async (config) => {
  const token = await resolveAuthToken();

  if (token) {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error?.config;

    if (
      error?.response?.status === 401 &&
      config &&
      !config._authRetried &&
      typeof window !== "undefined" &&
      typeof window.__clerk_refresh_token === "function"
    ) {
      config._authRetried = true;

      try {
        const token = await window.__clerk_refresh_token();
        if (token) {
          window.__clerk_token = token;
          window.localStorage.setItem("__clerk_token", token);
          config.headers = {
            ...(config.headers || {}),
            Authorization: `Bearer ${token}`,
          };
          return axiosInstance(config);
        }
      } catch {
        // Continue to normalized error handling
      }
    }

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
