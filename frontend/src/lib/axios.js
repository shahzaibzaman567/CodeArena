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

export default axiosInstance;
