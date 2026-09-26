import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../lib/api";
import { dateOnly, peso, shortDate } from "../lib/format";
import { useToast } from "../context/ToastContext";
import { Page } from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import { BedIcon, CalendarIcon, ChatIcon, RefreshIcon, TrashIcon, WarningIcon } from "../components/Icons";
import { Button, ConfirmDialog, EmptyState, PageTitle, Pagination, Skel } from "../components/ui";

const TABS = ["", "Pending", "Accepted", "Rejected"];
const LIMIT = 10;

/** FR-13, FR-15 · The seeker's reservation requests and their status. */
export default function MyRequests() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    let off = false;
    setState((s) => ({ ...s, status: "loading" }));
    const params = { page, limit: LIMIT };
    if (status) params.status = status;
    api
      .get("/reservations/mine", { params })
      .then(({ data }) => {
        if (off) return;
        if (data.items.length === 0 && page > 1) setPage(page - 1);
        else setState({ status: "ready", data, error: "" });
      })
      .catch((err) => !off && setState({ status: "error", data: null, error: errorMessage(err) }));
    return () => { off = true; };
  }, [page, status]);
  useEffect(load, [load]);

  async function withdraw() {
    setBusy(true);
    try {
      await api.delete(`/reservations/${confirm._id}`);
      toast.success("Request withdrawn");
    } catch (err) {
      toast.error(err.response?.status === 409 ? "The owner already responded, so it can’t be withdrawn." : errorMessage(err));
    } finally {
      setBusy(false);
      setConfirm(null);
      load();
    }
  }

  const items = state.data?.items || [];
  return (
    <Page width={960}>
      <PageTitle title="My Requests" sub="Your reservation requests and what the owner decided.">
        <Button variant="ghost" onClick={load} disabled={state.status === "loading"}><RefreshIcon size={16} /> Refresh</Button>
      </PageTitle>

      <div role="tablist" aria-label="Filter by status" className="mt-6 flex gap-1.5">
        {TABS.map((t) => (
          <button key={t || "all"} role="tab" type="button" aria-selected={status === t} onClick={() => { setStatus(t); setPage(1); }}
            className={`h-9 rounded-full px-4 text-sm font-medium ${status === t ? "bg-navy text-white" : "border border-line bg-white text-navy hover:border-sky"}`}>
            {t || "All"}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {state.status === "loading" ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading requests">{[1, 2, 3].map((i) => <Skel key={i} className="h-[132px] !rounded-[14px]" />)}</div>
        ) : state.status === "error" ? (
          <EmptyState icon={WarningIcon} title="Couldn’t load your requests" action={<Button variant="ghost" onClick={load}>Try again</Button>}>{state.error}</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState icon={BedIcon} title={status ? `No ${status.toLowerCase()} requests` : "No requests yet"}
            action={!status && <Link to="/" className="inline-flex h-12 items-center rounded-xl bg-navy px-6 text-[15px] font-medium text-white hover:bg-navy-900">Browse listings</Link>}>
            {status ? "Try another status." : "Find a place you like and request a slot from its listing page."}
          </EmptyState>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {items.map((r) => (
                <li key={r._id} className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-col gap-1">
                      <Link to={`/listings/${r.listing?._id}`} className="truncate text-[17px] font-semibold tracking-tight hover:underline">{r.listing?.name}</Link>
                      <p className="text-[13px] text-steel">{r.listing?.city} · {peso(r.listing?.monthlyRent)} / month · Sent {shortDate(r.createdAt)}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-navy">
                    <span className="flex items-center gap-1.5"><CalendarIcon size={16} className="text-steel" /> Move-in: {r.moveInDate ? dateOnly(r.moveInDate) : "Not set"}</span>
                    {r.respondedAt && <span>Owner responded {shortDate(r.respondedAt)}</span>}
                  </div>
                  {r.message && <p className="rounded-[10px] bg-page px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line text-navy">“{r.message}”</p>}
                  <StatusNote r={r} onWithdraw={() => setConfirm(r)} />
                </li>
              ))}
            </ul>
            <div className="mt-6"><Pagination page={state.data.page} totalPages={state.data.totalPages} total={state.data.total} limit={state.data.limit} onChange={setPage} /></div>
          </>
        )}
      </div>

      <ConfirmDialog open={!!confirm} icon={TrashIcon} title="Withdraw this request?" confirmLabel="Withdraw" busyLabel="Withdrawing…" busy={busy} onConfirm={withdraw} onCancel={() => setConfirm(null)}>
        Your request for {confirm?.listing?.name} will be removed. You can send a new one later.
      </ConfirmDialog>
    </Page>
  );
}

function StatusNote({ r, onWithdraw }) {
  if (r.status === "Pending")
    return (
      <div className="flex items-center justify-between border-t border-haze pt-3">
        <span className="text-[13px] text-steel">Waiting for the owner to accept or reject.</span>
        <Button variant="dangerGhost" size="sm" onClick={onWithdraw}><TrashIcon size={16} /> Withdraw</Button>
      </div>
    );
  if (r.status === "Accepted")
    return (
      <div className="flex items-center justify-between border-t border-haze pt-3">
        <span className="text-[13px] text-success">The owner accepted. Arrange payment and move-in with them directly.</span>
        <Link to={`/listings/${r.listing?._id}`} className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-sky-300 px-3 text-[13px] font-medium text-navy hover:bg-haze">
          <ChatIcon size={16} /> Message owner
        </Link>
      </div>
    );
  return (
    <div className="flex items-center justify-between border-t border-haze pt-3">
      <span className="text-[13px] text-steel">The owner couldn’t take this request. You can request this place again.</span>
      <Link to={`/listings/${r.listing?._id}`} className="text-[13px] font-medium text-navy underline underline-offset-4">View listing</Link>
    </div>
  );
}
