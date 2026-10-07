import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { cap, fullName, initials, shortName } from "../lib/format";
import logoWhite from "../assets/logo-white.png";
import { ChevronDownIcon, CloseIcon, LogoutIcon, MenuIcon, UserIcon } from "./Icons";

/** Links per role (NFR-02: hide what a role can't use). */
function linksFor(role) {
  const browse = { to: "/", label: "Browse", end: true };
  if (role === "seeker") return [browse, { to: "/requests", label: "My Requests" }, { to: "/inquiries", label: "Inquiries" }];
  if (role === "owner")
    return [browse, { to: "/owner/listings", label: "My Listings" }, { to: "/owner/requests", label: "Requests", count: true }, { to: "/inquiries", label: "Inquiries" }];
  if (role === "admin") return [browse, { to: "/admin", label: "Admin" }];
  return [browse];
}

export const REQUESTS_CHANGED = "findorm:requests-changed";

function usePendingCount(user) {
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);
  const { pathname } = useLocation();
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(REQUESTS_CHANGED, bump);
    return () => window.removeEventListener(REQUESTS_CHANGED, bump);
  }, []);
  useEffect(() => {
    if (user?.role !== "owner") return;
    let off = false;
    api
      .get("/reservations/incoming", { params: { status: "Pending", limit: 1 } })
      .then(({ data }) => !off && setCount(data.total || 0))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [user, pathname, tick]);
  return user?.role === "owner" ? count : 0;
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const pending = usePendingCount(user);
  const [open, setOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useRef(null);
  const { pathname } = useLocation();
  const links = linksFor(user?.role);

  useEffect(() => {
    setOpen(false);
    setNavOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e) => e.key === "Escape" && setNavOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => menuRef.current && !menuRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const linkCls = ({ isActive }) =>
    `inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
      isActive ? "bg-navy-800 text-white" : "text-[#a8c2dc] hover:bg-navy-900 hover:text-white"
    }`;
  const drawerLinkCls = ({ isActive }) =>
    `flex h-12 items-center justify-between rounded-lg px-3 text-base font-medium transition-colors ${
      isActive ? "bg-navy-800 text-white" : "text-[#c3d7ea] hover:bg-navy-900 hover:text-white"
    }`;
  const badge = (l, cls) =>
    l.count && pending > 0 ? (
      <span aria-label={`${pending} pending`} className={cls}>
        {pending}
      </span>
    ) : null;
  const badgeCls = "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sky px-1.5 text-[11px] font-semibold text-ink";

  return (
    <header className="relative z-30 bg-ink text-mist">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-[120px] max-xl:px-10 max-md:px-4">
        <div className="flex items-center gap-9 max-lg:gap-3">
          <button
            type="button"
            onClick={() => setNavOpen((o) => !o)}
            aria-expanded={navOpen}
            aria-controls="mobile-nav"
            aria-label={navOpen ? "Close menu" : "Open menu"}
            className="press -ml-2 flex h-11 w-11 items-center justify-center rounded-lg hover:bg-navy-900 lg:hidden"
          >
            {navOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
          </button>
          <Link to="/" className="block rounded-md" aria-label="FINDorm home">
            <img src={logoWhite} alt="FINDorm" className="h-[38px] w-[148px] object-contain object-left max-md:w-[120px]" />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1 max-lg:hidden">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>
                {l.label}
                {badge(l, badgeCls)}
              </NavLink>
            ))}
          </nav>
        </div>

        {!user ? (
          <div className="flex items-center gap-5 max-md:gap-2">
            <Link to="/login" className="inline-flex h-9 items-center rounded-lg px-2 text-sm font-medium hover:bg-navy-900 hover:text-white max-sm:hidden">
              Log in
            </Link>
            <Link to="/register" className="press inline-flex h-[38px] items-center rounded-[10px] bg-white px-4 text-sm font-medium text-ink hover:bg-mist">
              Sign up
            </Link>
          </div>
        ) : (
          <div ref={menuRef} className="relative flex items-center gap-3">
            <span className="rounded-full bg-navy-800 px-2.5 py-0.5 text-xs font-medium text-[#a8c2dc] max-md:hidden">{cap(user.role)}</span>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls="user-menu"
              className={`press flex h-11 items-center gap-2.5 rounded-[10px] border pr-2.5 pl-3.5 text-sm font-medium hover:bg-navy-800 max-md:pl-2.5 ${
                open || pathname === "/account" ? "border-sky bg-navy-800" : "border-navy"
              }`}
            >
              <span className="max-md:hidden">{shortName(user)}</span>
              <span aria-hidden="true" className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-sky text-xs font-semibold text-ink">
                {initials(user)}
              </span>
              <ChevronDownIcon size={16} className={`text-[#a8c2dc] transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`} />
            </button>
            <div id="user-menu" role="menu" aria-label="Account" data-open={open} className="pop absolute top-14 right-0 z-50 w-[264px] origin-top-right max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white p-1.5 text-ink shadow-[0_16px_40px_rgba(5,10,24,0.22)]">
              <div className="mb-1.5 flex flex-col gap-0.5 border-b border-haze px-3 pt-2.5 pb-3">
                <span className="text-sm font-semibold">{fullName(user)}</span>
                <span className="truncate text-[13px] text-steel">{user.email}</span>
              </div>
              <Link role="menuitem" to="/account" className="flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-page">
                <UserIcon size={18} className="text-steel" />
                My account
              </Link>
              <button role="menuitem" type="button" onClick={logout} className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-danger transition-colors hover:bg-page">
                <LogoutIcon size={18} />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>

      <nav id="mobile-nav" aria-label="Main" data-open={navOpen} className="drop absolute inset-x-0 top-full z-40 border-t border-navy-800 bg-ink px-4 pt-2 pb-4 shadow-[0_24px_40px_-12px_rgba(5,10,24,0.6)] lg:hidden">
        <div className="mx-auto flex max-w-[640px] flex-col gap-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={drawerLinkCls}>
              {l.label}
              {badge(l, badgeCls)}
            </NavLink>
          ))}
          {!user && (
            <NavLink to="/login" className={`${drawerLinkCls({ isActive: false })} sm:hidden`}>
              Log in
            </NavLink>
          )}
        </div>
      </nav>
    </header>
  );
}
