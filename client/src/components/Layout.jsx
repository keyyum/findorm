import { Outlet, useMatch } from "react-router-dom";
import Navbar from "./Navbar";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-[1440px] px-[120px] py-6 text-[13px] text-steel max-xl:px-10">© {new Date().getFullYear()} FINDorm · Metro Manila</div>
    </footer>
  );
}

/** Navbar + page + footer for every screen except login/register. */
export default function Layout() {
  // The conversation screen fills the window, with its own reply bar at the bottom.
  const fullHeight = useMatch("/inquiries/:id");
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      {!fullHeight && <Footer />}
    </div>
  );
}

/** Centered page column used by most screens. */
export function Page({ width = 1200, className = "", children }) {
  return (
    <main className={`fade mx-auto w-full px-6 pt-10 pb-16 ${className}`} style={{ maxWidth: width + 48 }}>
      {children}
    </main>
  );
}
