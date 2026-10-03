import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../lib/api";
import { fullName, initials, relativeTime } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { Page } from "../components/Layout";
import { ChatIcon, ChevronRightIcon, HomeIcon, RefreshIcon, WarningIcon } from "../components/Icons";
import { Avatar, Button, EmptyState, PageTitle, Pagination, Skel, Spinner } from "../components/ui";

const LIMIT = 20;
export const senderId = (s) => (s && typeof s === "object" ? s._id : s);

/** FR-11, FR-12 · Inquiry threads, most recent activity first. */
export default function Inbox() {
  const { user } = useAuth();
  const isOwner = user.role === "owner";
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const [refreshed, setRefreshed] = useState(false);

  const load = useCallback((isRefresh = false) => {
    let off = false;
    setState((s) => ({ ...s, status: isRefresh && s.data ? "refreshing" : "loading" }));
    api
      .get("/inquiries", { params: { page, limit: LIMIT } })
      .then(({ data }) => {
        if (off) return;
        setState({ status: "ready", data, error: "" });
        if (isRefresh) setRefreshed(true);
      })
      .catch((err) => !off && setState({ status: "error", data: null, error: errorMessage(err) }));
    return () => { off = true; };
  }, [page]);
  useEffect(() => load(false), [load]);

  const items = state.data?.items || [];
  const refreshing = state.status === "refreshing";

  return (
    <Page width={880}>
      <PageTitle title="Inquiries" sub={isOwner ? "Questions from seekers about your listings." : "Your conversations with owners."}>
        <span aria-live="polite" className="text-xs text-steel">{refreshed && !refreshing ? "Updated just now" : ""}</span>
        <Button variant="ghost" onClick={() => { setRefreshed(false); load(true); }} disabled={refreshing || state.status === "loading"}>
          {refreshing ? <Spinner /> : <RefreshIcon size={16} />} Refresh
        </Button>
      </PageTitle>

      <div className="mt-6">
        {state.status === "loading" ? (
          <div aria-busy="true" aria-label="Loading conversations" className="overflow-hidden rounded-[14px] border border-line bg-white">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 border-b border-haze px-5 py-[18px]">
                <Skel className="h-11 w-11 !rounded-full" />
                <div className="flex flex-1 flex-col gap-2"><Skel className="h-4 w-56" /><Skel className="h-3 w-36" /><Skel className="h-3 w-[460px] max-w-full" /></div>
              </div>
            ))}
          </div>
        ) : state.status === "error" ? (
          <EmptyState icon={WarningIcon} title="Couldn’t load inquiries" action={<Button variant="ghost" onClick={() => load(false)}>Try again</Button>}>{state.error}</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState icon={ChatIcon} title="No inquiries yet"
            action={!isOwner && <Link to="/" className="press inline-flex h-12 items-center rounded-xl bg-navy px-6 text-[15px] font-medium text-white hover:bg-navy-900">Browse listings</Link>}>
            {isOwner ? "Messages from seekers about your listings will appear here." : "Have a question about a place? Message the owner from its listing page."}
          </EmptyState>
        ) : (
          <>
            <ul aria-label="Conversations" className="fade overflow-hidden rounded-[14px] border border-line bg-white">
              {items.map((t) => {
                const other = isOwner ? t.seeker : t.owner; // api-spec list has no owner; falls back below
                const otherName = other ? fullName(other) : "Owner of this place";
                const mine = senderId(t.lastMessage?.sender) === user._id;
                return (
                  <li key={t._id} className="border-b border-haze last:border-b-0">
                    <Link to={`/inquiries/${t._id}`} className="flex items-center gap-4 px-5 py-[18px] transition-colors hover:bg-page max-sm:gap-3 max-sm:px-4">
                      {other ? <Avatar text={initials(other)} size={44} /> : (
                        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-haze text-navy"><HomeIcon size={20} /></span>
                      )}
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-base font-semibold tracking-tight">{t.listing?.name || "Deleted listing"}</span>
                          <span className="shrink-0 text-xs text-steel tabular-nums">{relativeTime(t.lastMessageAt)}</span>
                        </span>
                        <span className="text-[13px] text-steel">{isOwner ? "Seeker" : "Owner"} · {otherName}</span>
                        <span className="truncate text-sm text-navy">
                          {mine && <span className="text-steel">You: </span>}
                          {t.lastMessage?.body}
                        </span>
                      </span>
                      <ChevronRightIcon size={18} className="text-sky" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3.5 text-[13px] text-steel">New messages appear when you refresh or reopen a conversation.</p>
            <div className="mt-4"><Pagination page={state.data.page} totalPages={state.data.totalPages} total={state.data.total} limit={state.data.limit} onChange={setPage} /></div>
          </>
        )}
      </div>
    </Page>
  );
}
