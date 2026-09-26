import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LockIcon } from "../components/Icons";

const AREA = {
  owner: "Only owner accounts can open this page.",
  admin: "Only FINDorm admins can open this page.",
  seeker: "Only seeker accounts can open this page.",
};

/** 403 · a logged-in user opened a page for another role (NFR-02). */
export default function NotAllowed({ area = "owner" }) {
  const { user } = useAuth();
  const article = user?.role === "owner" || user?.role === "admin" ? "an" : "a";
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="flex w-[560px] flex-col items-center gap-4 text-center">
        <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-haze text-navy"><LockIcon size={30} /></span>
        <span className="text-xs font-semibold tracking-[0.08em] text-steel uppercase">403 · Not allowed</span>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em]">You don’t have access to this page</h1>
        <p className="text-base leading-relaxed text-navy">
          {AREA[area] || AREA.owner} {user && `You’re logged in as ${article} ${user.role}.`}
        </p>
        <Link to="/" className="mt-2 inline-flex h-11 items-center rounded-[10px] bg-navy px-5 text-[15px] font-medium text-white hover:bg-navy-900">Back to home</Link>
      </div>
    </main>
  );
}
