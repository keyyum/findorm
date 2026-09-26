import { Link } from "react-router-dom";
import logoWhite from "../assets/logo-white.png";
import manila from "../assets/manila.jpg";

/** Dark photo aside + light main, shared by Login and Register. */
export default function AuthShell({ eyebrow = "Metro Manila", heading, sub, children }) {
  return (
    <div className="flex min-h-screen bg-page">
      <aside className="aside-photo sticky top-0 flex h-screen w-[520px] shrink-0 flex-col justify-between p-12 text-mist max-lg:hidden" style={{ "--hero-img": `url(${manila})` }}>
        <Link to="/" aria-label="FINDorm home" className="w-fit rounded-md">
          <img src={logoWhite} alt="FINDorm" className="h-[54px] w-[210px] object-contain object-left" />
        </Link>
        <div className="flex flex-col gap-4">
          <span className="text-[11px] font-semibold tracking-[0.09em] text-[#8aa9cb] uppercase">{eyebrow}</span>
          <h2 className="text-[40px] leading-[1.08] font-semibold tracking-[-0.025em]">{heading}</h2>
          <p className="max-w-[400px] text-[17px] leading-relaxed text-[#c3d7ea]">{sub}</p>
        </div>
      </aside>
      <main className="flex flex-1 items-center justify-center px-12 py-10">{children}</main>
    </div>
  );
}
