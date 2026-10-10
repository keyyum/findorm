import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import logoWhite from "../assets/logo-white.png";
import manila from "../assets/manila.jpg";

/** Dark photo aside + light main, shared by Login and Register. */
export default function AuthShell({ heading, sub, children }) {
  return (
    <div className="flex min-h-[100dvh] bg-page">
      <aside className="aside-photo sticky top-0 flex h-[100dvh] w-[520px] shrink-0 flex-col justify-between p-12 text-mist max-lg:hidden" style={{ "--hero-img": `url(${manila})` }}>
        <Link to="/" aria-label="FINDorm home" className="w-fit rounded-md">
          <img src={logoWhite} alt="FINDorm" className="h-[54px] w-[210px] object-contain object-left" />
        </Link>
        <div className="flex flex-col gap-4">
          <h2 className="text-[40px] leading-[1.08] font-semibold tracking-[-0.025em]">{heading}</h2>
          <p className="max-w-[400px] text-[17px] leading-relaxed text-[#c3d7ea]">{sub}</p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center px-6 max-md:px-4 lg:hidden">
          <Link to="/" aria-label="FINDorm home" className="rounded-md">
            <img src={logo} alt="FINDorm" className="h-[34px] w-[132px] object-contain object-left" />
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-12 py-10 max-lg:px-6 max-lg:pt-4 max-md:px-4 max-md:pb-8">{children}</main>
      </div>
    </div>
  );
}
