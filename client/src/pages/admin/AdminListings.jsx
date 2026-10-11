import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../../lib/api";
import { CITIES, GENDER_CATEGORIES, PROPERTY_TYPES } from "../../lib/constants";
import { fullName, peso } from "../../lib/format";
import { useToast } from "../../context/ToastContext";
import { ChevronDownIcon, CloseIcon, ImageIcon, SearchIcon, TrashIcon, WarningIcon } from "../../components/Icons";
import { Button, ConfirmDialog, EmptyState, FieldError, FullBadge, PageTitle, Pagination, Skel } from "../../components/ui";

const LIMIT = 12;
const KEYS = ["q", "city", "propertyType", "gender", "available", "minPrice", "maxPrice", "ownerId"];

function Select({ label, value, onChange, options, all, width }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-medium text-steel" style={{ width }}>
      {label}
      <span className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full cursor-pointer appearance-none rounded-md border border-sky bg-white pr-8 pl-2.5 text-sm text-ink hover:border-navy">
        <option value="">{all}</option>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          return <option key={v} value={v}>{typeof o === "string" ? o : o.label}</option>;
        })}
      </select>
      <ChevronDownIcon size={16} className="pointer-events-none absolute top-3 right-2.5 text-steel" />
      </span>
    </label>
  );
}

/** FR-17 · All listings: filter (same as search + owner), view, edit, delete. */
export default function AdminListings() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const f = Object.fromEntries(KEYS.map((k) => [k, params.get(k) || ""]));
  const page = Math.max(1, +params.get("page") || 1);
  const [drafts, setDrafts] = useState({ q: f.q, minPrice: f.minPrice, maxPrice: f.maxPrice });
  const [ownerName, setOwnerName] = useState("");
  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const setParam = useCallback((patch) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k);
      if (!("page" in patch)) next.delete("page");
      return next;
    }, { replace: true });
  }, [setParams]);

  const priceError = f.minPrice && f.maxPrice && +f.minPrice > +f.maxPrice ? "Min price can’t be more than max price." : "";

  const load = useCallback(() => {
    if (priceError) return;
    let off = false;
    setState((s) => ({ ...s, status: "loading" }));
    const query = { page, limit: LIMIT };
    for (const k of KEYS) if (params.get(k)) query[k] = params.get(k);
    api
      .get("/admin/listings", { params: query })
      .then(({ data }) => !off && setState({ status: "ready", data, error: "" }))
      .catch((err) => !off && setState({ status: "error", data: null, error: errorMessage(err) }));
    return () => { off = true; };
  }, [params, page, priceError]);
  useEffect(load, [load]);

  // Debounced keyword.
  useEffect(() => {
    const t = setTimeout(() => { if (drafts.q.trim() !== f.q) setParam({ q: drafts.q.trim() }); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts.q]);

  async function doDelete() {
    setBusy(true);
    try {
      await api.delete(`/listings/${confirm._id}`);
      toast.success(`${confirm.name} deleted`);
      setConfirm(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Couldn’t delete the listing."));
      setConfirm(null);
      load();
    } finally {
      setBusy(false);
    }
  }

  const hasFilters = KEYS.some((k) => f[k]);
  const clear = () => { setDrafts({ q: "", minPrice: "", maxPrice: "" }); setParams({}, { replace: true }); };
  const items = state.data?.items || [];
  const th = "h-11 px-3 text-left text-xs font-semibold text-steel border-b border-line";
  const td = "px-3 border-b border-haze";
  const priceInput = (k, ph) => (
    <label className="flex w-[96px] flex-col gap-1.5 text-xs font-medium text-steel">
      {k === "minPrice" ? "Min price" : "Max price"}
      <span className="relative">
        <span aria-hidden="true" className="absolute top-2.5 left-2.5 text-sm">₱</span>
        <input inputMode="numeric" value={drafts[k]} placeholder={ph} aria-invalid={!!priceError}
          onChange={(e) => setDrafts((d) => ({ ...d, [k]: e.target.value.replace(/[^\d]/g, "").slice(0, 6) }))}
          onBlur={() => setParam({ [k]: drafts[k] })} onKeyDown={(e) => e.key === "Enter" && setParam({ [k]: drafts[k] })}
          className={`h-10 w-full rounded-md border bg-white pr-2 pl-6 text-sm text-ink ${priceError ? "border-danger" : "border-sky hover:border-navy"}`} />
      </span>
    </label>
  );

  return (
    <div className="fade">
      <PageTitle title="Listings" sub={state.data ? `${state.data.total} ${state.data.total === 1 ? "listing" : "listings"}${hasFilters ? " match" : ""}` : " "}>
        {hasFilters && <Button variant="ghost" onClick={clear}>Clear filters</Button>}
      </PageTitle>

      <div role="search" aria-label="Filter listings" className="mt-6 flex flex-wrap items-end gap-2.5">
        <label className="flex w-[220px] flex-col gap-1.5 text-xs font-medium text-steel">
          Keyword
          <span className="relative">
            <SearchIcon size={18} className="absolute top-[11px] left-3" />
            <input type="search" value={drafts.q} onChange={(e) => setDrafts((d) => ({ ...d, q: e.target.value }))} placeholder="Name or address" maxLength={100}
              className="h-10 w-full rounded-md border border-sky bg-white pr-2.5 pl-[38px] text-sm text-ink placeholder:text-hint hover:border-navy" />
          </span>
        </label>
        <Select label="City" width={150} value={f.city} onChange={(v) => setParam({ city: v })} options={CITIES} all="All cities" />
        <Select label="Type" width={144} value={f.propertyType} onChange={(v) => setParam({ propertyType: v })} options={PROPERTY_TYPES} all="All types" />
        <Select label="Gender" width={112} value={f.gender} onChange={(v) => setParam({ gender: v })} options={GENDER_CATEGORIES} all="All" />
        <Select label="Availability" width={130} value={f.available} onChange={(v) => setParam({ available: v })} options={[{ value: "true", label: "Available" }]} all="All" />
        {priceInput("minPrice", "0")}
        {priceInput("maxPrice", "Any")}
      </div>
      {priceError && <div className="mt-2"><FieldError>{priceError}</FieldError></div>}

      {f.ownerId && (
        <div className="mt-3 flex items-center gap-2 text-[13px] text-steel">
          Showing listings by
          <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-navy pr-1 pl-3 text-[13px] font-medium text-white">
            Owner: {ownerName || "selected owner"}
            <button type="button" aria-label="Remove owner filter" onClick={() => setParam({ ownerId: "" })} className="press flex h-6 w-6 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
              <CloseIcon size={14} />
            </button>
          </span>
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-[14px] border border-line bg-white">
        {priceError ? (
          <div className="p-6"><EmptyState icon={WarningIcon} title="Check the price range" dashed={false}>Min price can’t be more than max price.</EmptyState></div>
        ) : state.status === "error" ? (
          <div className="p-6"><EmptyState icon={WarningIcon} title="Couldn’t load listings" dashed={false} action={<Button variant="ghost" onClick={clear}>Clear filters</Button>}>{state.error}</EmptyState></div>
        ) : state.status === "ready" && items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={SearchIcon} title="No listings match these filters" dashed={false} action={hasFilters && <Button variant="ghost" onClick={clear}>Clear filters</Button>}>
              Try another city, price range or owner.
            </EmptyState>
          </div>
        ) : (
          <table className="w-full min-w-[1000px] table-fixed border-collapse text-sm">
            <colgroup><col className="w-[84px]" /><col /><col className="w-[140px]" /><col className="w-[108px]" /><col className="w-[124px]" /><col className="w-[88px]" /><col className="w-[92px]" /><col className="w-[176px]" /></colgroup>
            <thead className="bg-page">
              <tr>
                <th scope="col" className={`${th} pl-5`}>Photo</th><th scope="col" className={th}>Name</th><th scope="col" className={th}>Owner</th>
                <th scope="col" className={th}>City</th><th scope="col" className={th}>Type</th><th scope="col" className={`${th} text-right`}>Rent</th>
                <th scope="col" className={th}>Slots</th><th scope="col" className={`${th} pr-5 text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.status === "loading"
                ? Array.from({ length: 8 }, (_, i) => (
                    <tr key={i}>
                      <td className={`${td} h-[68px] pl-5`}><Skel className="h-11 w-[60px] !rounded-lg" /></td>
                      {Array.from({ length: 7 }, (_, j) => <td key={j} className={td}><Skel className="h-3.5 w-3/4" /></td>)}
                    </tr>
                  ))
                : items.map((l) => (
                    <tr key={l._id} className="hover:bg-[#f9fbfe]">
                      <td className={`${td} h-[68px] pl-5`}>
                        {l.photo ? <img src={l.photo} alt="" className="h-11 w-[60px] rounded-lg bg-haze object-cover" /> : (
                          <span aria-label="No photo" className="flex h-11 w-[60px] items-center justify-center rounded-lg bg-haze text-hint"><ImageIcon /></span>
                        )}
                      </td>
                      <td className={td}><span className="block truncate font-semibold" title={l.name}>{l.name}</span></td>
                      <td className={td}>
                        {l.owner ? (
                          <button type="button" onClick={() => { setOwnerName(fullName(l.owner)); setParam({ ownerId: l.owner._id }); }} title={`Show only ${fullName(l.owner)}’s listings`}
                            className="max-w-full truncate text-left font-medium text-navy hover:text-ink hover:underline">
                            {fullName(l.owner)}
                          </button>
                        ) : "—"}
                      </td>
                      <td className={`${td} text-navy`}>{l.city}</td>
                      <td className={`${td} whitespace-nowrap text-navy`}>{l.propertyType}</td>
                      <td className={`${td} text-right font-semibold tabular-nums`}>{peso(l.monthlyRent)}</td>
                      <td className={td}>
                        {l.isFull ? (
                          <span className="flex items-center gap-1.5"><FullBadge /><span className="text-xs text-steel tabular-nums">0/{l.capacity}</span></span>
                        ) : (
                          <span className="text-navy tabular-nums"><strong className="font-semibold text-ink">{l.availableSlots}</strong>/{l.capacity}</span>
                        )}
                      </td>
                      <td className={`${td} pr-5 text-right whitespace-nowrap`}>
                        <Link to={`/listings/${l._id}`} className="press inline-flex h-8 items-center rounded-md px-2 text-[13px] font-medium text-navy hover:bg-haze">View</Link>
                        <Link to={`/admin/listings/${l._id}/edit`} className="press inline-flex h-8 items-center rounded-md px-2 text-[13px] font-medium text-navy hover:bg-haze">Edit</Link>
                        <button type="button" onClick={() => setConfirm(l)} className="press inline-flex h-8 items-center rounded-md px-2 text-[13px] font-medium text-danger hover:bg-[#fbeceb]">Delete</button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        )}
        {state.status === "ready" && items.length > 0 && !priceError && (
          <div className="border-t border-haze px-5 py-3.5">
            <Pagination page={state.data.page} totalPages={state.data.totalPages} total={state.data.total} limit={state.data.limit} onChange={(p) => setParam({ page: String(p) })} />
          </div>
        )}
      </div>

      <ConfirmDialog open={!!confirm} icon={TrashIcon} title={`Delete ${confirm?.name}?`} confirmLabel="Delete" busyLabel="Deleting…" busy={busy} onConfirm={doDelete} onCancel={() => setConfirm(null)}>
        This also deletes all its reservation requests and inquiries. This can’t be undone.
        {confirm?.owner && <span className="mt-1 block text-[13px] text-steel">Owner: {fullName(confirm.owner)}</span>}
      </ConfirmDialog>
    </div>
  );
}
