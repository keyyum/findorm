import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import api, { errorMessage, fieldErrors } from "../lib/api";
import { LIMITS } from "../lib/constants";
import { fullName, peso, plural, shortDate, todayISO } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import AmenityIcon from "../components/AmenityIcon";
import { BedIcon, ChatIcon, ChevronLeftIcon, ChevronRightIcon, ImageIcon, MapPinIcon, SearchIcon } from "../components/Icons";
import { Alert, Button, EmptyState, FieldError, FullBadge, Skel, TextArea, TextField } from "../components/ui";
import { Page } from "../components/Layout";

const genderLabel = { Male: "Male only", Female: "Female only", Any: "Mixed (any gender)" };

/** FR-10 · Listing details, plus FR-11 inquiry and FR-13 reservation for seekers. */
export default function ListingDetails() {
  const { id } = useParams();
  const [state, setState] = useState({ status: "loading", listing: null, error: "" });

  useEffect(() => {
    let off = false;
    setState({ status: "loading", listing: null, error: "" });
    api
      .get(`/listings/${id}`)
      .then(({ data }) => !off && setState({ status: "ready", listing: data, error: "" }))
      .catch((err) => {
        if (off) return;
        if (err.response?.status === 404 || err.response?.status === 400) setState({ status: "notfound" });
        else setState({ status: "error", error: errorMessage(err) });
      });
    return () => { off = true; };
  }, [id]);

  if (state.status === "loading") return <DetailsSkeleton />;
  if (state.status === "notfound")
    return (
      <Page width={880}>
        <EmptyState icon={SearchIcon} title="Listing not found" action={<Link to="/" className="inline-flex h-12 items-center rounded-xl bg-navy px-6 text-[15px] font-medium text-white hover:bg-navy-900">Back to search</Link>}>
          This listing doesn’t exist or was removed by its owner.
        </EmptyState>
      </Page>
    );
  if (state.status === "error")
    return (
      <Page width={880}>
        <EmptyState title="Couldn’t load this listing" action={<Button variant="ghost" onClick={() => window.location.reload()}>Try again</Button>}>{state.error}</EmptyState>
      </Page>
    );

  const l = state.listing;
  const setListing = (patch) => setState((s) => ({ ...s, listing: { ...s.listing, ...patch } }));

  return (
    <Page width={1200}>
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:underline">
        <ChevronLeftIcon size={16} /> Back to search
      </Link>

      <div className="mt-5 flex items-start gap-10">
        <div className="min-w-0 flex-1">
          <Gallery photos={l.photos || []} name={l.name} />

          <div className="mt-8 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-haze px-2.5 py-1 text-xs font-semibold text-navy">{l.propertyType}</span>
              <span className="rounded-full bg-haze px-2.5 py-1 text-xs font-semibold text-navy">{genderLabel[l.genderCategory]}</span>
              {l.isFull && <FullBadge />}
            </div>
            <h1 className="text-[34px] leading-tight font-semibold tracking-[-0.02em]">{l.name}</h1>
            <p className="flex items-center gap-2 text-[15px] text-steel">
              <MapPinIcon size={18} /> {l.address}, {l.city}
            </p>
          </div>

          <dl className="mt-6 grid grid-cols-3 overflow-hidden rounded-[14px] border border-line bg-white">
            <Fact label="Monthly rent" value={<>{peso(l.monthlyRent)}<span className="text-sm font-normal text-steel"> / slot</span></>} />
            <Fact label="Available slots" value={l.isFull ? <span className="text-warning">Full</span> : <>{l.availableSlots}<span className="text-sm font-normal text-steel"> of {l.capacity}</span></>} />
            <Fact label="Capacity" value={<>{l.capacity}<span className="text-sm font-normal text-steel"> rooms / beds</span></>} last />
          </dl>

          {l.description && <Section title="About this place"><p className="text-[15px] leading-relaxed whitespace-pre-line text-navy">{l.description}</p></Section>}

          <Section title="Amenities">
            {l.amenities?.length ? (
              <ul className="grid grid-cols-3 gap-3">
                {l.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-haze text-navy"><AmenityIcon name={a} /></span>
                    {a}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] text-steel">The owner hasn’t listed any amenities.</p>
            )}
          </Section>

          <Section title="House rules">
            {l.houseRules ? <p className="text-[15px] leading-relaxed whitespace-pre-line text-navy">{l.houseRules}</p> : <p className="text-[15px] text-steel">No house rules listed. Ask the owner if you have questions.</p>}
          </Section>

          <Section title="Owner">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy text-sm font-semibold text-white">
                {(l.owner?.firstName?.[0] || "") + (l.owner?.lastName?.[0] || "")}
              </span>
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold">{fullName(l.owner)}</span>
                <span className="text-[13px] text-steel">Listed {shortDate(l.createdAt)} · Contact goes through FINDorm messages</span>
              </div>
            </div>
          </Section>
        </div>

        <aside className="sticky top-6 w-[380px] shrink-0">
          <ActionPanel listing={l} setListing={setListing} />
        </aside>
      </div>
    </Page>
  );
}

function Fact({ label, value, last }) {
  return (
    <div className={`flex flex-col gap-1 px-5 py-4 ${last ? "" : "border-r border-line"}`}>
      <dt className="text-xs font-medium text-steel">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-9 border-t border-line pt-7">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Gallery({ photos, name }) {
  const [i, setI] = useState(0);
  if (!photos.length)
    return (
      <div className="flex h-[420px] flex-col items-center justify-center gap-2 rounded-2xl bg-haze text-[#7f9cbc]">
        <ImageIcon size={40} />
        <span className="text-sm font-medium">No photos yet</span>
      </div>
    );
  const idx = Math.min(i, photos.length - 1);
  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[420px] overflow-hidden rounded-2xl bg-haze">
        <img src={photos[idx].url} alt={`${name}, photo ${idx + 1} of ${photos.length}`} className="h-full w-full object-cover" />
        {photos.length > 1 && (
          <>
            <button type="button" aria-label="Previous photo" onClick={() => setI((idx - 1 + photos.length) % photos.length)} className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white">
              <ChevronLeftIcon />
            </button>
            <button type="button" aria-label="Next photo" onClick={() => setI((idx + 1) % photos.length)} className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white">
              <ChevronRightIcon />
            </button>
            <span className="absolute right-3 bottom-3 rounded-full bg-ink/75 px-2.5 py-1 text-xs font-medium text-white tabular-nums">{idx + 1} / {photos.length}</span>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((p, n) => (
            <button key={p._id || n} type="button" onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`} aria-current={n === idx}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${n === idx ? "border-navy" : "border-transparent opacity-70 hover:opacity-100"}`}>
              <img src={p.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Right-hand panel, by role ---------- */

function PanelCard({ children }) {
  return <div className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-6 shadow-[0_8px_24px_-16px_rgba(5,10,24,0.2)]">{children}</div>;
}

function PriceHeader({ l }) {
  return (
    <div className="flex items-end justify-between">
      <p>
        <span className="text-[26px] font-semibold tabular-nums">{peso(l.monthlyRent)}</span>
        <span className="text-sm text-steel"> / month</span>
      </p>
      {l.isFull ? <FullBadge /> : <span className="text-sm font-medium text-success tabular-nums">{plural(l.availableSlots, "slot")} left</span>}
    </div>
  );
}

function ActionPanel({ listing: l, setListing }) {
  const { user } = useAuth();
  const location = useLocation();
  const isMine = user && l.owner?._id === user._id;

  if (!user)
    return (
      <PanelCard>
        <PriceHeader l={l} />
        <p className="text-sm leading-relaxed text-steel">Log in as a seeker to request a slot or message the owner.</p>
        <Link to="/login" state={{ from: location.pathname }} className="inline-flex h-12 items-center justify-center rounded-xl bg-navy text-[15px] font-medium text-white hover:bg-navy-900">
          Log in to reserve or message
        </Link>
        <p className="text-center text-sm text-navy">
          New to FINDorm? <Link to="/register" state={{ from: location.pathname }} className="font-medium underline underline-offset-4">Create an account</Link>
        </p>
      </PanelCard>
    );

  if (user.role === "owner")
    return (
      <PanelCard>
        <PriceHeader l={l} />
        {isMine ? (
          <>
            <p className="text-sm text-steel">This is your listing.</p>
            <Link to={`/owner/listings/${l._id}/edit`} className="inline-flex h-11 items-center justify-center rounded-[10px] bg-navy text-sm font-medium text-white hover:bg-navy-900">Edit listing</Link>
            <Link to="/owner/listings" className="inline-flex h-11 items-center justify-center rounded-[10px] border border-sky-300 text-sm font-medium text-navy hover:bg-haze">Update availability</Link>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-steel">Only seeker accounts can request slots or message owners.</p>
        )}
      </PanelCard>
    );

  if (user.role === "admin")
    return (
      <PanelCard>
        <PriceHeader l={l} />
        <p className="text-sm text-steel">You’re viewing this as an admin.</p>
        <Link to={`/admin/listings/${l._id}/edit`} className="inline-flex h-11 items-center justify-center rounded-[10px] bg-navy text-sm font-medium text-white hover:bg-navy-900">Edit as admin</Link>
      </PanelCard>
    );

  return <SeekerPanel l={l} setListing={setListing} />;
}

function SeekerPanel({ l, setListing }) {
  const [tab, setTab] = useState("reserve");
  return (
    <PanelCard>
      <PriceHeader l={l} />
      <div role="tablist" aria-label="Actions" className="grid grid-cols-2 rounded-xl bg-haze p-1">
        {[["reserve", "Request a slot", BedIcon], ["message", "Message owner", ChatIcon]].map(([k, label, Icon]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} aria-controls={`panel-${k}`} id={`tab-${k}`} onClick={() => setTab(k)}
            className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium ${tab === k ? "bg-white text-ink shadow-sm" : "text-navy hover:text-ink"}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "reserve" ? <ReserveForm l={l} setListing={setListing} /> : <InquiryForm l={l} />}
      </div>
    </PanelCard>
  );
}

function ReserveForm({ l, setListing }) {
  const toast = useToast();
  const [moveInDate, setMoveInDate] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [result, setResult] = useState(null); // {kind:'sent'|'dup'|'full'|'error', text}
  const [busy, setBusy] = useState(false);

  if (l.isFull && result?.kind !== "sent")
    return (
      <Alert tone="warning" title="This listing is full.">
        New requests can’t be sent until the owner opens a slot. You can still message the owner.
      </Alert>
    );

  if (result?.kind === "sent")
    return (
      <Alert tone="success" title="Request sent. It’s now Pending.">
        The owner will accept or reject it. Track it in <Link to="/requests" className="font-medium underline">My Requests</Link>.
      </Alert>
    );

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    const errs = {};
    if (moveInDate && moveInDate < todayISO()) errs.moveInDate = "Pick today or a later date.";
    if (message.length > LIMITS.reservationMessage) errs.message = "Use 500 characters or fewer.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setResult(null);
    const body = { listingId: l._id };
    if (moveInDate) body.moveInDate = moveInDate;
    if (message.trim()) body.message = message.trim();
    try {
      await api.post("/reservations", body);
      setResult({ kind: "sent" });
      toast.success("Reservation request sent");
    } catch (err) {
      const msg = errorMessage(err);
      if (err.response?.status === 409 && /full/i.test(msg)) {
        setListing({ isFull: true, availableSlots: 0 });
        setResult({ kind: "full" });
      } else if (err.response?.status === 409) setResult({ kind: "dup", text: msg });
      else {
        setErrors(fieldErrors(err));
        setResult({ kind: "error", text: msg });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      {result?.kind === "dup" && (
        <Alert tone="warning" title="You already have an open request here.">
          {result.text} See <Link to="/requests" className="font-medium underline">My Requests</Link>.
        </Alert>
      )}
      {result?.kind === "error" && <Alert title={result.text} />}
      <TextField label="Move-in date" optional type="date" min={todayISO()} value={moveInDate}
        onChange={(e) => { setMoveInDate(e.target.value); setErrors((x) => ({ ...x, moveInDate: undefined })); }} error={errors.moveInDate} disabled={busy} />
      <TextArea label="Note to the owner" optional rows={3} maxLength={LIMITS.reservationMessage} value={message} placeholder="Hi! I’m a 2nd year student at UST…"
        onChange={(e) => { setMessage(e.target.value); setErrors((x) => ({ ...x, message: undefined })); }} error={errors.message} disabled={busy} />
      <Button type="submit" size="lg" className="w-full" loading={busy}>{busy ? "Sending…" : "Request 1 slot"}</Button>
      <p className="text-xs leading-relaxed text-steel">One request reserves one slot. No payment happens on FINDorm — you’ll arrange that with the owner.</p>
    </form>
  );
}

function InquiryForm({ l }) {
  const navigate = useNavigate();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const trimmed = body.trim();
  const tooLong = body.length > LIMITS.messageBody;

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    if (!trimmed) return setError("Write a message first.");
    if (tooLong) return setError("Use 1000 characters or fewer.");
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/inquiries", { listingId: l._id, body: trimmed });
      navigate(`/inquiries/${data._id}`);
    } catch (err) {
      setError(fieldErrors(err).body || errorMessage(err, "Couldn’t send. Try again."));
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <TextArea label={`Message ${l.owner?.firstName || "the owner"}`} rows={4} maxLength={LIMITS.messageBody} value={body}
        placeholder="Is water included in the rent? What time is curfew?"
        onChange={(e) => { setBody(e.target.value); setError(""); }} disabled={busy} />
      {error && <FieldError>{error}</FieldError>}
      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!trimmed || tooLong}>{busy ? "Sending…" : "Send inquiry"}</Button>
      <p className="text-xs leading-relaxed text-steel">If you’ve messaged about this place before, this goes into the same conversation.</p>
    </form>
  );
}

function DetailsSkeleton() {
  return (
    <Page width={1200}>
      <div aria-busy="true" aria-label="Loading listing" className="mt-9 flex gap-10">
        <div className="flex-1">
          <Skel className="h-[420px] !rounded-2xl" />
          <Skel className="mt-8 h-5 w-40" />
          <Skel className="mt-4 h-9 w-2/3" />
          <Skel className="mt-4 h-4 w-1/2" />
          <Skel className="mt-6 h-24 !rounded-[14px]" />
        </div>
        <Skel className="h-[380px] w-[380px] !rounded-2xl" />
      </div>
    </Page>
  );
}
