import axios from "axios";

/**
 * Shared API client. Use this instead of calling axios directly so the base URL
 * and auth token are handled in one place.
 *
 *   import api from "../lib/api";
 *   const { data } = await api.get("/listings");
 */
const api = axios.create({
  baseURL: "/api",
});

// Attaches the JWT to every request once the accounts module stores one (FR-02).
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("findorm_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
