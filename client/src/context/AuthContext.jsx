import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { clearToken, getToken, setSessionEndedHandler, setToken } from "../lib/api";

const AuthContext = createContext(null);

/**
 * Holds the logged-in user. On load, a saved token is checked with
 * GET /api/users/me (api-spec → Accounts). Logout is client-side only (D-13).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!getToken());
  // Why the user was last signed out: "logout" | "session" | null. Protected
  // pages use it to send people to the right place (see ProtectedRoute).
  const [exitReason, setExitReason] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Any 401 anywhere (expired token, deactivated account) lands here.
    setSessionEndedHandler(() => {
      setExitReason("session");
      setUser(null);
      navigate("/login?reason=session", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    // An expired or deactivated token on page load just signs the user out
    // quietly; protected pages then send them to login with a message.
    api
      .get("/users/me", { skipAuthRedirect: true })
      .then(({ data }) => !cancelled && setUser(data))
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 401) {
          clearToken();
          setExitReason("session");
          setUser(null);
        }
        // Network/server errors keep the token; the next request retries.
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password }, { skipAuthRedirect: true });
    setToken(data.token);
    setExitReason(null);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (body) => {
    const { data } = await api.post("/auth/register", body, { skipAuthRedirect: true });
    setToken(data.token);
    setExitReason(null);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setExitReason("logout");
    clearToken();
    setUser(null);
    navigate("/", { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({ user, loading, exitReason, login, register, logout, setUser }),
    [user, loading, exitReason, login, register, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
