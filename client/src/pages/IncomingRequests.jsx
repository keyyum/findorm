import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../lib/api";
import { dateOnly, fullName, initials, plural, shortDate } from "../lib/format";
import { useToast } from "../context/ToastContext";
import { Page } from "../components/Layout";
import { REQUESTS_CHANGED } from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import { BedIcon, CheckCircleIcon, CloseIcon, RefreshIcon, WarningIcon } from "../components/Icons";
import { Avatar, Button, ConfirmDialog, EmptyState, FullBadge, PageTitle, Pagination, SelectField, Skel, useStagger } from "../components/ui";

const LIMIT = 10;

/** FR-14, FR-16 · Requests for the owner's listings: accept or reject. */
export default function IncomingRequests() {
  const toast = useToast();
  const [status, setStatus] = useState("Pending");
  const [listingId, setListingId] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const [myListings, setMyListings] = useState([]);
  const [confirm, setConfirm] = useState(null); // {r, action}
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/listings/mine", { params: { limit: 50 } }).then(({ data }) => setMyListings(data.items)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    let off = false;
    setState((s) => ({ ...s, status: "loading" }));
    const params = { page, limit: LIMIT };
    if (status) params.status = status;
    if (listingId) params.listingId = listingId;
    api
      .get("/reservations/incoming", { params })
      .then(({ data }) => {
        if (off) return;
        if (data.items.length === 0 && page > 1) setPage(page - 1);
        else setState({ status: "ready", data, error: "" });
      })
      .catch((err) => !off && setState({ status: "error", data: null, error: errorMessage(err) }));
    return () => { off = true; };
  }, [page, status, listingId]);
  useEffect(load, [load]);

  async function respond() {
    const { r, action } = confirm;
    setBusy(true);
    try {
      await api.patch(`/reservations/${r._id}/${action}`);
      toast.success(action === "accept" ? `Accepted ${r.seeker?.firstName}’s request` : `Rejected ${r.seeker?.firstName}’s request`);
    } catch (err) {
      const msg = errorMessage(err);
      if (err.response?.status === 409 && /full|slot/i.test(msg)) toast.error("No slots left. Raise available slots in My Listings to accept more.");
      else if (err.response?.status === 409) toast.error("This request was already answered or withdrawn.");
      else toast.error(msg);
    } finally {
      setBusy(false);
      setConfirm(null);
      load();
      window.dispatchEvent(new Event(REQUESTS_CHANGED));
      // Keep listing slot counts fresh for the filter and Full badges.
      api.get("/listings/mine", { params: { limit: 50 } }).then(({ data }) => setMyListings(data.items)).catch(() => {});
    }
  }

  const items = state.data?.items || [];
  const stagger = useStagger(state.status);
  const listingOptions = myListings.map((l) => ({ value: l._id, label: l.name }));

  return (
    <Page width={1100}>
      <PageTitle title="Requests" sub="Reservation requests for your listings. Accepting one uses up one slot.">
        <Button variant="ghost" onClick={load} disabled={state.status === "loading"}><RefreshIcon size={16} /> Refresh</Button>
      </PageTitle>

      <div className="mt-6 flex items-end gap-3 max-md:flex-col max-md:items-stretch">
        <div role="tablist" aria-label="Filter by status" className="flex flex-1 flex-wrap gap-1.5">
          {["Pending", "Accepted", "Rejected", ""].map((t) => (
            <button key={t || "all"} role="tab" type="button" aria-selected={status === t} onClick={() => { setStatus(t); setPage(1); }}
              className={`press h-9 rounded-full px-4 text-sm font-medium ${status === t ? "bg-navy text-white" : "border border-line bg-white text-navy hover:border-sky"}`}>
              {t || "All"}
            </button>
          ))}
        </div>
        <SelectField label="Listing" className="w-[280px] max-md:w-full" placeholder="All listings" options={listingOptions} value={listingId}
          onChange={(e) => { setListingId(e.target.value); setPage(1); }} />
      </div>

      <div className="mt-5">
        {state.status === "loading" ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading requests">{[1, 2, 3].map((i) => <Skel key={i} className="h-[120px] !rounded-[14px]" />)}</div>
        ) : state.status === "error" ? (
          <EmptyState icon={WarningIcon} title="Couldn’t load requests" action={<Button variant="ghost" onClick={load}>Try again</Button>}>{state.error}</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState icon={BedIcon} title={status ? `No ${status.toLowerCase()} requests` : "No requests yet"}>
            {status === "Pending" ? "New requests from seekers will show up here." : "Try another status or listing."}
          </EmptyState>
        ) : (
          <>
            <ul className="fade flex flex-col gap-3">
              {items.map((r, i) => {
                const full = r.listing?.isFull;
                return (
                  <li key={r._id} {...stagger(i, "flex gap-4 rounded-[14px] border border-line bg-white p-5 max-sm:gap-3 max-sm:p-4")}>
                    <Avatar text={initials(r.seeker)} size={44} />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <div className="flex items-start justify-between gap-4 max-sm:flex-col max-sm:gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-base font-semibold">{fullName(r.seeker)}</span>
                          <span className="flex items-center gap-2 text-[13px] text-steel">
                            <Link to={`/listings/${r.listing?._id}`} className="font-medium text-navy hover:underline">{r.listing?.name}</Link>
                            · {full ? <FullBadge /> : `${plural(r.listing?.availableSlots ?? 0, "slot")} left`}
                          </span>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      <div className="flex flex-wrap gap-x-5 text-[13px] text-navy">
                        <span>Move-in: {r.moveInDate ? dateOnly(r.moveInDate) : "Not set"}</span>
                        <span className="text-steel">Sent {shortDate(r.createdAt)}</span>
                        {r.respondedAt && <span className="text-steel">Answered {shortDate(r.respondedAt)}</span>}
                      </div>
                      {r.message && <p className="rounded-[10px] bg-page px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line text-navy">“{r.message}”</p>}
                      {r.status === "Pending" && (
                        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-haze pt-3">
                          {full && <span className="mr-auto text-[13px] text-warning">Listing is full. Raise available slots to accept.</span>}
                          <Button variant="dangerGhost" size="sm" onClick={() => setConfirm({ r, action: "reject" })}><CloseIcon size={16} /> Reject</Button>
                          <Button size="sm" disabled={full} title={full ? "No slots left" : undefined} onClick={() => setConfirm({ r, action: "accept" })}>
                            <CheckCircleIcon size={16} /> Accept
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6"><Pagination page={state.data.page} totalPages={state.data.totalPages} total={state.data.total} limit={state.data.limit} onChange={setPage} /></div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        tone={confirm?.action === "accept" ? "success" : "danger"}
        icon={confirm?.action === "accept" ? CheckCircleIcon : CloseIcon}
        title={confirm?.action === "accept" ? `Accept ${fullName(confirm?.r.seeker)}?` : `Reject ${fullName(confirm?.r.seeker)}?`}
        confirmLabel={confirm?.action === "accept" ? "Accept" : "Reject"}
        busyLabel={confirm?.action === "accept" ? "Accepting…" : "Rejecting…"}
        busy={busy}
        onConfirm={respond}
        onCancel={() => setConfirm(null)}
      >
        {confirm?.action === "accept"
          ? `This uses 1 of the ${confirm?.r.listing?.availableSlots} open slots at ${confirm?.r.listing?.name}. Accepted requests can’t be undone.`
          : "The seeker will see this request as Rejected. Slots don’t change. This can’t be undone."}
      </ConfirmDialog>
    </Page>
  );
}
