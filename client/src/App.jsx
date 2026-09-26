import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import ProtectedRoute, { GuestOnly } from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ListingDetails from "./pages/ListingDetails";
import Account from "./pages/Account";
import MyListings from "./pages/MyListings";
import ListingForm from "./pages/ListingForm";
import IncomingRequests from "./pages/IncomingRequests";
import MyRequests from "./pages/MyRequests";
import Inbox from "./pages/Inbox";
import Thread from "./pages/Thread";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminListings from "./pages/admin/AdminListings";
import NotFound from "./pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

const seeker = ["seeker"];
const owner = ["owner"];
const admin = ["admin"];
const talkers = ["seeker", "owner"];

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* FR-01, FR-02 */}
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

        <Route element={<Layout />}>
          {/* Public (D-10): FR-07 to FR-10 */}
          <Route path="/" element={<Home />} />
          <Route path="/listings/:id" element={<ListingDetails />} />

          {/* FR-03 */}
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />

          {/* Owner: FR-04 to FR-06, FR-14 */}
          <Route path="/owner/listings" element={<ProtectedRoute roles={owner}><MyListings /></ProtectedRoute>} />
          <Route path="/owner/listings/new" element={<ProtectedRoute roles={owner}><ListingForm mode="create" /></ProtectedRoute>} />
          <Route path="/owner/listings/:id/edit" element={<ProtectedRoute roles={owner}><ListingForm mode="edit" /></ProtectedRoute>} />
          <Route path="/owner/requests" element={<ProtectedRoute roles={owner}><IncomingRequests /></ProtectedRoute>} />

          {/* Seeker: FR-13, FR-15 */}
          <Route path="/requests" element={<ProtectedRoute roles={seeker}><MyRequests /></ProtectedRoute>} />

          {/* Inquiries: FR-11, FR-12 (admins never see them) */}
          <Route path="/inquiries" element={<ProtectedRoute roles={talkers}><Inbox /></ProtectedRoute>} />
          <Route path="/inquiries/:id" element={<ProtectedRoute roles={talkers}><Thread /></ProtectedRoute>} />

          {/* Admin: FR-17 */}
          <Route path="/admin" element={<ProtectedRoute roles={admin}><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="listings" element={<AdminListings />} />
          </Route>
          <Route path="/admin/listings/:id/edit" element={<ProtectedRoute roles={admin}><ListingForm mode="edit" asAdmin /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  );
}
