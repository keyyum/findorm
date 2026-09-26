import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../lib/api";
import { CITIES, GENDER_CATEGORIES, PAGE_SIZE, PROPERTY_TYPES } from "../lib/constants";
import { useAuth } from "../context/AuthContext";
import manila from "../assets/manila.jpg";
import ListingCard, { ListingCardSkeleton } from "../components/ListingCard";
import { ChevronDownIcon, MapPinIcon, SearchIcon, WarningIcon } from "../components/Icons";
import { Button, EmptyState, FieldError, Pagination, Skel } from "../components/ui";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];
const FILTER_KEYS = ["city", "q", "minPrice", "maxPrice", "propertyType", "gender", "available"];
const POPULAR = [
  { label: "Sampaloc, Manila", city: "Manila", q: "Sampaloc" },
  { label: "Katipunan, QC", city: "Quezon City", q: "Katipunan" },
  { label: "Taft, Pasay", city: "Pasay", q: "Taft" },
  { label: "BGC, Taguig", city: "Taguig", q: "" },
];

function Chip({ checked, onChange, name, value, children }) {
  return (
    <label
      className={`relative inline-flex h-[34px] cursor-pointer items-center rounded-full border px-3.5 text-[13px] font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-navy ${
        checked ? "border-navy bg-navy text-white" : "border-line bg-white text-navy hover:border-sky"
      }`}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

/** FR-07 to FR-09 · Home: landing hero + search, filters, results. Public (D-10). */
export default function Home() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const get = (k) => params.get(k) || "";
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, get(k)]));
  const sort = get("sort") || "newest";
  const page = Math.max(1, parseInt(get("page") || "1", 10) || 1);

  // Hero search drafts (applied on submit).
  const [cityDraft, setCityDraft] = useState(filters.city);
  const [qDraft, setQDraft] = useState(filters.q);
  // Price drafts (applied on blur / Enter).
  const [minDraft, setMinDraft] = useState(filters.minPrice);
  const [maxDraft, setMaxDraft] = useState(filters.maxPrice);
  // Keep each draft in sync with its own URL value only, so applying one field
  // never wipes what the user is typing in another.
  useEffect(() => setCityDraft(filters.city), [filters.city]);
  useEffect(() => setQDraft(filters.q), [filters.q]);
  useEffect(() => setMinDraft(filters.minPrice), [filters.minPrice]);
  useEffect(() => setMaxDraft(filters.maxPrice), [filters.maxPrice]);

  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const resultsRef = useRef(null);

  const priceError =
    filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice)
      ? "Min price can’t be more than max price."
      : "";

  useEffect(() => {
    if (priceError) return;
    let off = false;
    setState((s) => ({ ...s, status: "loading" }));
    const query = { sort, page, limit: PAGE_SIZE };
    for (const k of FILTER_KEYS) if (filters[k]) query[k] = filters[k];
    api
      .get("/listings", { params: query })
      .then(({ data }) => !off && setState({ status: "ready", data, error: "" }))
      .catch((err) => !off && setState({ status: "error", data: null, error: errorMessage(err, "Couldn’t load listings.") }));
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString(), priceError]);

  function update(patch, { keepPage = false } = {}) {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === "" || v === null || v === undefined || v === false) next.delete(k);
      else next.set(k, String(v));
    }
    if (!keepPage) next.delete("page");
    if (next.get("sort") === "newest") next.delete("sort");
    setParams(next);
  }

  function submitHero(e) {
    e.preventDefault();
    update({ city: cityDraft, q: qDraft.trim() });
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const cleanPrice = (s) => s.replace(/[^\d]/g, "").slice(0, 6);
  const applyPrice = () => update({ minPrice: minDraft, maxPrice: maxDraft });

  const activeCount = FILTER_KEYS.filter((k) => filters[k]).length;
  const clearAll = () => setParams(sort !== "newest" ? { sort } : {});

  const data = state.data;
  const items = data?.items || [];

  // A stale ?page= past the last page (e.g. after filters changed) → page 1.
  useEffect(() => {
    if (state.status === "ready" && data.items.length === 0 && data.total > 0 && page > 1) update({ page: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, data]);

  return (
    <>
      {/* Landing hero */}
      <section className="hero-photo text-mist" style={{ "--hero-img": `url(${manila})` }} aria-labelledby="hero-h1">
        <div className="mx-auto flex max-w-[1440px] flex-col px-[120px] pt-20 pb-16 max-xl:px-10">
          <span className="text-xs font-semibold tracking-[0.1em] text-[#8aa9cb] uppercase">Dorms &amp; boarding houses · all 17 cities</span>
          <h1 id="hero-h1" className="mt-4 max-w-[820px] text-[60px] leading-[1.02] font-semibold tracking-[-0.035em] text-white">
            Find your dorm in Metro Manila.
          </h1>
          <p className="mt-5 max-w-[560px] text-lg leading-relaxed text-[#c3d7ea]">
            Compare rent, slots and amenities, message owners directly, and request a slot. No account needed to browse.
          </p>

          <form role="search" onSubmit={submitHero} className="mt-9 flex h-[72px] w-full max-w-[1000px] items-center rounded-2xl bg-white p-2.5 shadow-[0_24px_48px_-16px_rgba(5,10,24,0.6)] focus-within:shadow-[0_0_0_3px_rgba(106,143,184,0.55),0_24px_48px_-16px_rgba(5,10,24,0.6)]">
            <label className="relative flex h-[52px] w-[260px] shrink-0 items-center text-steel">
              <span className="sr-only">City</span>
              <MapPinIcon className="absolute left-4" />
              <select value={cityDraft} onChange={(e) => setCityDraft(e.target.value)} className="h-[52px] w-full cursor-pointer appearance-none bg-transparent pr-9 pl-12 text-base font-medium text-ink focus:outline-none">
                <option value="">All cities</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDownIcon size={16} className="pointer-events-none absolute right-3" />
            </label>
            <span aria-hidden="true" className="h-8 w-px shrink-0 bg-line" />
            <label className="relative flex h-[52px] flex-1 items-center text-steel">
              <span className="sr-only">Keyword</span>
              <SearchIcon className="absolute left-[18px]" />
              <input type="search" value={qDraft} onChange={(e) => setQDraft(e.target.value)} maxLength={100} placeholder="Name, street or area, e.g. Sampaloc"
                className="h-[52px] w-full bg-transparent pr-4 pl-[50px] text-base text-ink placeholder:text-[#7f9cbc] focus:outline-none" />
            </label>
            <Button type="submit" size="lg" className="!h-[52px] !px-8 !text-base">Search</Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 text-[13px] text-[#a8c2dc]">
            <span>Popular:</span>
            {POPULAR.map((p) => (
              <button key={p.label} type="button" onClick={() => { update({ city: p.city, q: p.q }); resultsRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                className="inline-flex h-8 items-center rounded-full border border-[rgba(221,234,246,0.28)] bg-[rgba(221,234,246,0.10)] px-3.5 font-medium text-mist hover:bg-[rgba(221,234,246,0.22)]">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Filters + results */}
      <div ref={resultsRef} className="mx-auto flex w-full max-w-[1440px] scroll-mt-4 items-start gap-10 px-16 pt-10 pb-16 max-xl:px-8">
        <aside aria-label="Filters" className="sticky top-6 flex w-[264px] shrink-0 flex-col">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <h2 className="text-base font-semibold tracking-tight">Filters</h2>
            {activeCount > 0 && <span className="rounded-full bg-mist px-2 py-0.5 text-xs font-medium text-navy">{activeCount} active</span>}
          </div>

          <fieldset className="border-b border-line py-5">
            <legend className="float-left mb-3 w-full text-[13px] font-semibold">Price per month</legend>
            <div className="clear-both grid grid-cols-2 gap-2.5">
              {[["Min", minDraft, setMinDraft, "0"], ["Max", maxDraft, setMaxDraft, "Any"]].map(([lbl, val, setVal, ph]) => (
                <label key={lbl} className="flex flex-col gap-1.5 text-xs text-steel">
                  {lbl}
                  <span className="relative block">
                    <span aria-hidden="true" className="absolute top-2.5 left-[11px] text-sm">₱</span>
                    <input inputMode="numeric" value={val} placeholder={ph} aria-invalid={!!priceError}
                      onChange={(e) => setVal(cleanPrice(e.target.value))} onBlur={applyPrice}
                      onKeyDown={(e) => e.key === "Enter" && applyPrice()}
                      className={`h-10 w-full rounded-md border bg-white pr-2.5 pl-[26px] text-sm text-ink ${priceError ? "border-danger" : "border-sky hover:border-navy"}`} />
                  </span>
                </label>
              ))}
            </div>
            {priceError && <div className="mt-2"><FieldError>{priceError}</FieldError></div>}
          </fieldset>

          <fieldset className="border-b border-line py-5">
            <legend className="float-left mb-3 w-full text-[13px] font-semibold">Property type</legend>
            <div className="clear-both flex flex-wrap gap-2">
              {["", ...PROPERTY_TYPES].map((t) => (
                <Chip key={t || "all"} name="propertyType" value={t} checked={filters.propertyType === t} onChange={() => update({ propertyType: t })}>
                  {t || "All"}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset className="border-b border-line py-5">
            <legend className="float-left mb-3 w-full text-[13px] font-semibold">Gender</legend>
            <div className="clear-both flex flex-wrap gap-2">
              {["", ...GENDER_CATEGORIES].map((g) => (
                <Chip key={g || "all"} name="gender" value={g} checked={filters.gender === g} onChange={() => update({ gender: g })}>
                  {g === "" ? "All" : g === "Any" ? "Mixed only" : g}
                </Chip>
              ))}
            </div>
            <p className="mt-2.5 text-xs leading-relaxed text-steel">Male or Female also includes mixed places.</p>
          </fieldset>

          <div className="border-b border-line py-5">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-navy">
              <span className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold">Available only</span>
                <span className="text-xs text-steel">Hide full listings</span>
              </span>
              <input type="checkbox" role="switch" checked={filters.available === "true"} onChange={(e) => update({ available: e.target.checked ? "true" : "" })} className="sr-only" />
              <span aria-hidden="true" className={`relative h-[22px] w-10 shrink-0 rounded-full border ${filters.available === "true" ? "border-navy bg-navy" : "border-sky-300 bg-haze"}`}>
                <span className={`absolute top-[2px] left-[2px] h-4 w-4 rounded-full bg-white shadow transition-transform ${filters.available === "true" ? "translate-x-[18px]" : ""}`} />
              </span>
            </label>
          </div>

          <Button variant="ghost" className="mt-5 w-full !border-sky" onClick={clearAll} disabled={activeCount === 0}>
            Clear filters
          </Button>
        </aside>

        <section aria-label="Results" className="min-w-0 flex-1">
          <div className="flex h-11 items-center justify-between">
            {state.status === "loading" ? (
              <Skel className="h-[18px] w-40" />
            ) : (
              <p role="status" className="text-[15px] font-semibold">
                {state.status === "ready" ? `${data.total} ${data.total === 1 ? "place" : "places"}${filters.city ? ` in ${filters.city}` : ""}` : ""}
              </p>
            )}
            <label className="flex items-center gap-2.5 text-[13px] text-steel">
              Sort by
              <span className="relative">
                <select value={sort} onChange={(e) => update({ sort: e.target.value })} className="h-10 w-[200px] cursor-pointer appearance-none rounded-md border border-sky bg-white pr-9 pl-3 text-sm text-ink hover:border-navy">
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDownIcon size={16} className="pointer-events-none absolute top-3 right-3" />
              </span>
            </label>
          </div>

          {(filters.q || filters.city) && (
            <div className="mt-2 flex flex-wrap gap-2 text-[13px]">
              {filters.city && <ActiveChip label={`City: ${filters.city}`} onRemove={() => update({ city: "" })} />}
              {filters.q && <ActiveChip label={`“${filters.q}”`} onRemove={() => update({ q: "" })} />}
            </div>
          )}

          <div className="mt-5">
            {priceError ? (
              <EmptyState icon={WarningIcon} title="Check the price range">Min price can’t be more than max price.</EmptyState>
            ) : state.status === "loading" ? (
              <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2" aria-busy="true" aria-label="Loading listings">
                {Array.from({ length: 6 }, (_, i) => <ListingCardSkeleton key={i} />)}
              </div>
            ) : state.status === "error" ? (
              <EmptyState icon={WarningIcon} title="Couldn’t load listings" action={<Button variant="ghost" onClick={clearAll}>Clear filters</Button>}>
                {state.error}
              </EmptyState>
            ) : items.length === 0 ? (
              <EmptyState icon={SearchIcon} title="No listings found" action={activeCount > 0 && <Button variant="ghost" onClick={clearAll}>Clear filters</Button>}>
                {activeCount > 0 ? "Nothing matches these filters. Try another city, a wider price range, or fewer filters." : "There are no listings yet. Check back soon."}
              </EmptyState>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2">
                  {items.map((l) => <ListingCard key={l._id} listing={l} />)}
                </div>
                <div className="mt-8">
                  <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit}
                    onChange={(p) => { update({ page: p }, { keepPage: true }); resultsRef.current?.scrollIntoView({ behavior: "smooth" }); }} />
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {!user && (
        <section className="mx-auto w-full max-w-[1440px] px-16 pb-16 max-xl:px-8">
          <div className="flex items-center justify-between rounded-[18px] bg-[linear-gradient(120deg,#111b2e_0%,#243a5a_100%)] px-12 py-10 text-mist">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold tracking-tight text-white">Own a dorm or boarding house?</h2>
              <p className="text-base text-[#c3d7ea]">List it on FINDorm for free and handle requests and inquiries in one place.</p>
            </div>
            <Link to="/register" className="inline-flex h-12 items-center rounded-xl bg-white px-6 text-[15px] font-medium text-ink hover:bg-mist">List your place</Link>
          </div>
        </section>
      )}
    </>
  );
}

function ActiveChip({ label, onRemove }) {
  return (
    <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full bg-navy pr-1 pl-3 font-medium text-white">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" d="M18 6L6 18M6 6L18 18" /></svg>
      </button>
    </span>
  );
}
