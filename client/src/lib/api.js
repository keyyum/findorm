import axios from "axios";
import { TOKEN_KEY } from "./constants";

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

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Attaches the JWT to every request once a user has logged in (FR-02).
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Global 401 handler (api-spec → "Errors"): the token is missing, expired, or
 * the account was deactivated (D-08). Clear it and send the user to login.
 *
 * Some calls use 401 to mean something else and opt out with
 * `{ skipAuthRedirect: true }`: logging in (wrong password) and changing the
 * password (wrong current password).
 */
let onSessionEnded = () => {
  window.location.assign("/login?reason=session");
};
export const setSessionEndedHandler = (fn) => {
  onSessionEnded = fn;
};

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const hadToken = !!error.config?.headers?.Authorization;
    if (status === 401 && hadToken && !error.config?.skipAuthRedirect) {
      clearToken();
      onSessionEnded();
    }
    return Promise.reject(error);
  }
);

/** The `message` from an API error, or a fallback for network failures. */
export function errorMessage(error, fallback = "Something went wrong. Try again.") {
  if (!error?.response) return "Can’t reach FINDorm right now. Check your connection and try again.";
  return error.response.data?.message || fallback;
}

/** The per-field `errors` object from a 400 response, or {}. */
export function fieldErrors(error) {
  return error?.response?.data?.errors || {};
}

export default api;
