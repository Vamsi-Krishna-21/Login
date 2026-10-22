import axios from "axios";

// When deployed separately, set VITE_API_URL to your backend server URL
// (e.g. https://your-backend-api.onrender.com).
// In local dev, if VITE_API_URL is unset, default to http://localhost:5000 (or Vite proxy).
// In production, fallback to relative URL "" so it never depends on localhost.
export const API_BASE_URL = (
  import.meta.env?.VITE_API_URL ||
  (import.meta.env?.DEV ? "http://localhost:5000" : "")
).replace(/\/$/, "");

// Configure default axios base URL and authorization interceptor
axios.defaults.baseURL = API_BASE_URL;

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token") || localStorage.getItem("workspace_token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Helper to build an absolute API URL when using native window.fetch
 */
export function getApiUrl(endpoint) {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}

export default axios;
