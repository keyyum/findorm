import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorCode, errorMessage } from "../lib/api";
import { peso } from "../lib/format";
import { useToast } from "../context/ToastContext";
import { Page } from "../components/Layout";
import { HomeIcon, ImageIcon, MinusIcon, PenIcon, PlusIcon, TrashIcon, WarningIcon } from "../components/Icons";
import { Button, ConfirmDialog, EmptyState, FullBadge, PageTitle, Pagination, Skel, Spinner, useStagger } from "../components/ui";

const LIMIT = 12;

/** FR-04, FR-06 · The owner's listings with quick availability controls. */
export default function MyListings() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    let off = false;
    setState((s) => ({ ...s, status: s.data ? "refreshing" : "loading" }));
    api
      .get("/listings/mine", { params: { page, limit: LIMIT } })
      .then(({ data }) => {
        if (off) return;
        if (data.items.length === 0 && page > 1) setPage(page - 1);
        else setState({ status: "ready", data, error: "" });
      })
      .catch((err) => !off && setState({ status: "error", data: null, error: errorMessage(err) }));
    return () => { off = true; };
  }, [page]);
  useEffect(load, [load]);

  const replaceItem = (item) =>
    setState((s) => ({ ...s, data: { ...s.data, items: s.data.items.map((x) => (x._id === item._id ? { ...x, ...item } : x)) } }));

  async function doDelete() {
    setDeleting(true);
    try {
      await api.delete(`/listings/${confirm._id}`);
      toast.success(`${confirm.name} deleted`);
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn’t delete the listing."));
      if (err.response?.status === 404) { setConfirm(null); load(); }
      else if (errorCode(err) === "LISTING_HAS_ACCEPTED") setConfirm(null);
    } finally {
      setDeleting(false);
    }
  }

  const items = state.data?.items || [];
  const stagger = useStagger(state.status);
  return (
    <Page width={1200}>
      <PageTitle title="My Listings" sub={state.data ? `${state.data.total} ${state.data.total === 1 ? "listing" : "listings"}` : " "}>
        <Link to="/owner/listings/new" className="press inline-flex h-11 items-center gap-2 rounded-[10px] bg-navy px-[18px] text-sm font-medium text-white hover:bg-navy-900">
          <PlusIcon size={18} /> Create listing
        </Link>
      </PageTitle>

      <div className="mt-7">
        {state.status === "loading" ? (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading your listings">
            {[1, 2, 3].map((i) => <Skel key={i} className="h-[104px] !rounded-[14px]" />)}
          </div>
        ) : state.status === "error" ? (
          <EmptyState icon={WarningIcon} title="Couldn’t load your listings" action={<Button variant="ghost" onClick={load}>Try again</Button>}>{state.error}</EmptyState>
        ) : items.length === 0 ? (
          <EmptyState icon={HomeIcon} title="No listings yet"
            action={<Link to="/owner/listings/new" className="press inline-flex h-12 items-center gap-2 rounded-xl bg-navy px-6 text-[15px] font-medium text-white hover:bg-navy-900"><PlusIcon size={18} /> Create your first listing</Link>}>
            Add your dorm or boarding house so seekers in Metro Manila can find it.
          </EmptyState>
        ) : (
          <>
            <ul className="fade flex flex-col gap-3">
              {items.map((l, i) => (
                <ListingRow key={l._id} l={l} onUpdated={replaceItem} onDelete={() => setConfirm(l)} stagger={stagger(i)} />
              ))}
            </ul>
            <div className="mt-6">
              <Pagination page={state.data.page} totalPages={state.data.totalPages} total={state.data.total} limit={state.data.limit} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      <ConfirmDialog open={!!confirm} icon={TrashIcon} title={`Delete ${confirm?.name}?`} confirmLabel="Delete" busyLabel="Deleting…" busy={deleting}
        onConfirm={doDelete} onCancel={() => setConfirm(null)}>
        This also deletes all its reservation requests and inquiries. This can’t be undone.
      </ConfirmDialog>
    </Page>
  );
}

function ListingRow({ l, onUpdated, onDelete, stagger }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function setSlots(n) {
    if (saving || n < 0 || n > l.capacity) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/listings/${l._id}/availability`, { availableSlots: n });
      onUpdated({ availableSlots: data.availableSlots, isFull: data.isFull ?? data.availableSlots === 0, _id: l._id });
      if (data.availableSlots === 0) toast.info(`${l.name} is now Full`);
    } catch (err) {
      toast.error(errorMessage(err, "Couldn’t update availability."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <li style={stagger.style} className={`${stagger.className} flex items-center gap-5 rounded-[14px] border border-line bg-white p-4 max-md:grid max-md:grid-cols-[80px_1fr] max-md:items-start max-md:gap-x-3 max-md:gap-y-3`}>
      <div className="h-[72px] w-24 shrink-0 max-md:h-16 max-md:w-20 overflow-hidden rounded-lg bg-haze">
        {l.photo ? <img src={l.photo} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-hint"><ImageIcon /></div>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Link to={`/listings/${l._id}`} className="truncate text-base font-semibold hover:underline">{l.name}</Link>
          {l.isFull && <FullBadge />}
        </div>
        <p className="text-[13px] text-steel">
          {l.propertyType} · {l.city} · {l.genderCategory === "Any" ? "Mixed" : `${l.genderCategory} only`} · <span className="font-medium text-ink">{peso(l.monthlyRent)}</span> / month
        </p>
      </div>

      <div className="flex flex-col items-center gap-1 max-md:col-span-2 max-md:flex-row max-md:justify-between max-md:border-t max-md:border-haze max-md:pt-3">
        <span className="text-[11px] font-semibold tracking-wide text-steel uppercase">Available slots</span>
        <div className="flex items-center gap-1.5" role="group" aria-label={`Available slots for ${l.name}`}>
          <button type="button" aria-label="One fewer slot" disabled={saving || l.availableSlots <= 0} onClick={() => setSlots(l.availableSlots - 1)}
            className="press flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9dcef] text-navy hover:border-navy disabled:opacity-40 max-md:h-10 max-md:w-10">
            <MinusIcon size={16} />
          </button>
          <span aria-live="polite" className="flex w-16 items-center justify-center gap-1 text-sm font-semibold tabular-nums">
            {saving ? <Spinner /> : <>{l.availableSlots}<span className="font-normal text-steel">/ {l.capacity}</span></>}
          </span>
          <button type="button" aria-label="One more slot" disabled={saving || l.availableSlots >= l.capacity} onClick={() => setSlots(l.availableSlots + 1)}
            className="press flex h-8 w-8 items-center justify-center rounded-lg border border-[#c9dcef] text-navy hover:border-navy disabled:opacity-40 max-md:h-10 max-md:w-10">
            <PlusIcon size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 pl-2 max-md:col-span-2 max-md:justify-end max-md:pl-0">
        <Link to={`/owner/listings/${l._id}/edit`} className="press inline-flex h-[34px] items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-navy hover:bg-haze">
          <PenIcon size={16} /> Edit
        </Link>
        <button type="button" onClick={onDelete} className="press inline-flex h-[34px] items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-danger hover:bg-[#fbeceb]">
          <TrashIcon size={16} /> Delete
        </button>
      </div>
    </li>
  );
}
