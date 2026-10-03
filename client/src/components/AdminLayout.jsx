import { NavLink, Outlet } from "react-router-dom";
import { HomeIcon, UsersIcon } from "./Icons";

/** Sidebar (Users | Listings) + the admin page (FR-17). */
export default function AdminLayout() {
  const cls = ({ isActive }) =>
    `flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm max-lg:flex-1 max-lg:justify-center ${
      isActive ? "bg-white font-semibold text-ink shadow-[0_0_0_1px_#d3e3f2,0_2px_6px_rgba(5,10,24,0.05)]" : "font-medium text-navy hover:bg-haze"
    }`;
  return (
    <div className="mx-auto flex w-full max-w-[1440px] items-start gap-10 px-16 pt-10 pb-16 max-xl:px-8 max-lg:flex-col max-lg:items-stretch max-lg:gap-6 max-md:px-4 max-md:pt-6 max-md:pb-10">
      <nav aria-label="Admin" className="flex w-[232px] shrink-0 flex-col gap-1.5 lg:sticky lg:top-6 max-lg:w-full max-lg:flex-row">
        <span className="px-3 pb-2 text-[11px] max-lg:hidden font-semibold tracking-[0.09em] text-steel uppercase">Admin</span>
        <NavLink to="/admin/users" className={cls}>
          <UsersIcon /> Users
        </NavLink>
        <NavLink to="/admin/listings" className={cls}>
          <HomeIcon /> Listings
        </NavLink>
        <p className="mx-3 mt-3.5 max-lg:hidden border-t border-line pt-4 text-xs leading-relaxed text-steel">
          Users are deactivated, never deleted. Listings can be edited or deleted.
        </p>
      </nav>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
