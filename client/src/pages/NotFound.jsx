import { Link } from "react-router-dom";
import { ChevronLeftIcon } from "../components/Icons";

/** The * route. */
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="flex w-[560px] flex-col items-center gap-4 text-center">
        <span aria-hidden="true" className="bg-[linear-gradient(180deg,#6a8fb8_0%,#ddeaf6_100%)] bg-clip-text text-[120px] leading-none font-bold tracking-[-0.06em] text-transparent">404</span>
        <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-[-0.02em]">Page not found</h1>
        <p className="text-base leading-relaxed text-navy">The page you’re looking for doesn’t exist or may have been moved.</p>
        <Link to="/" className="press mt-2 inline-flex h-11 items-center gap-2 rounded-[10px] bg-navy px-5 text-[15px] font-medium text-white hover:bg-navy-900">
          <ChevronLeftIcon size={18} /> Back to home
        </Link>
      </div>
    </main>
  );
}
