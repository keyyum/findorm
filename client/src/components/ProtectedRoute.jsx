import { useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotAllowed from "../pages/NotAllowed";
import { Spinner } from "./ui";

export function PageSpinner() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-1 items-center justify-center py-32">
      <Spinner size={28} />
    </div>
  );
}

/**
 * Wraps routes that need an account, and optionally a role (NFR-02).
 *   <ProtectedRoute roles={["owner"]}><MyListings /></ProtectedRoute>
 * Guests go to /login and come back afterwards; wrong roles see "Not allowed".
 */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading, exitReason } = useAuth();
  const location = useLocation();
  if (loading) return <PageSpinner />;
  if (!user) {
    // Logging out on a protected page goes home, not to login (D-13).
    if (exitReason === "logout") return <Navigate to="/" replace />;
    const to = exitReason === "session" ? "/login?reason=session" : "/login";
    return <Navigate to={to} replace state={{ from: location.pathname + location.search }} />;
  }
  if (roles && !roles.includes(user.role)) return <NotAllowed area={roles[0]} />;
  return children;
}

/**
 * Login/register: users who were already logged in when they opened the page
 * are sent home. Someone who logs in *on* the page is left alone, so the page
 * itself decides where to go next (back to where they came from, or the
 * owner dashboard after an owner signs up).
 */
export function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  const wasLoggedIn = useRef(null);
  if (!loading && wasLoggedIn.current === null) wasLoggedIn.current = !!user;
  if (loading) return <PageSpinner />;
  if (wasLoggedIn.current) return <Navigate to="/" replace />;
  return children;
}
