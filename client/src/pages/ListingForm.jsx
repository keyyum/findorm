import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errorMessage, fieldErrors } from "../lib/api";
import { AMENITIES, CITIES, GENDER_CATEGORIES, LIMITS, PHOTO_TYPES, PROPERTY_TYPES } from "../lib/constants";
import { fullName } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Page } from "../components/Layout";
import AmenityIcon from "../components/AmenityIcon";
import { ChevronLeftIcon, CloseIcon, ImageIcon, PlusIcon, SearchIcon, ShieldIcon } from "../components/Icons";
import { Alert, Button, EmptyState, FieldError, SelectField, Skel, TextArea, TextField } from "../components/ui";

const EMPTY = {
  name: "", propertyType: "", city: "", address: "", description: "", monthlyRent: "",
  genderCategory: "", amenities: [], houseRules: "", capacity: "", availableSlots: "",
};
const TEXT_KEYS = ["name", "propertyType", "city", "address", "description", "genderCategory", "houseRules"];
const NUM_KEYS = ["monthlyRent", "capacity", "availableSlots"];

const isWhole = (s) => /^\d+$/.test(String(s).trim());

export function validateListing(v) {
  const e = {};
  const name = v.name.trim(), address = v.address.trim();
  if (!name) e.name = "Enter the property name.";
  else if (name.length < LIMITS.listingName[0] || name.length > LIMITS.listingName[1]) e.name = "Use 3 to 100 characters.";
  if (!v.propertyType) e.propertyType = "Choose a property type.";
  if (!v.city) e.city = "Choose a city in Metro Manila.";
  if (!address) e.address = "Enter the address.";
  else if (address.length < LIMITS.address[0] || address.length > LIMITS.address[1]) e.address = "Use 5 to 200 characters.";
  if (v.description.length > LIMITS.longText) e.description = "Use 2000 characters or fewer.";
  if (v.houseRules.length > LIMITS.longText) e.houseRules = "Use 2000 characters or fewer.";
  if (String(v.monthlyRent).trim() === "") e.monthlyRent = "Enter the monthly rent.";
  else if (!isWhole(v.monthlyRent) || +v.monthlyRent < LIMITS.rent[0] || +v.monthlyRent > LIMITS.rent[1]) e.monthlyRent = "Enter whole pesos from 1 to 100,000.";
  if (!v.genderCategory) e.genderCategory = "Choose who can stay.";
  if (String(v.capacity).trim() === "") e.capacity = "Enter the capacity.";
  else if (!isWhole(v.capacity) || +v.capacity < LIMITS.capacity[0] || +v.capacity > LIMITS.capacity[1]) e.capacity = "Enter a whole number from 1 to 500.";
  if (String(v.availableSlots).trim() === "") e.availableSlots = "Enter the available slots.";
  else if (!isWhole(v.availableSlots)) e.availableSlots = "Enter a whole number, 0 or more.";
  else if (!e.capacity && +v.availableSlots > +v.capacity) e.availableSlots = "Can’t be more than the capacity.";
  return e;
}

function toBody(v) {
  const b = {};
  for (const k of TEXT_KEYS) b[k] = v[k].trim();
  for (const k of NUM_KEYS) b[k] = Number(v[k]);
  b.amenities = [...v.amenities];
  return b;
}

function fromListing(l) {
  const v = { ...EMPTY };
  for (const k of TEXT_KEYS) v[k] = l[k] ?? "";
  for (const k of NUM_KEYS) v[k] = l[k] ?? "";
  v.amenities = l.amenities || [];
  return v;
}

/** FR-04, FR-05 · Create or edit a listing. Admins reuse it to edit any listing (FR-17). */
export default function ListingForm({ mode, asAdmin = false }) {
  const edit = mode === "edit";
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const backTo = asAdmin ? "/admin/listings" : "/owner/listings";
  const backLabel = asAdmin ? "Admin · Listings" : "My Listings";

  const [loadState, setLoadState] = useState(edit ? "loading" : "ready");
  const [original, setOriginal] = useState(null);
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState("");
  const [status, setStatus] = useState("idle"); // idle | saving
  const [savingStep, setSavingStep] = useState("");

  // Photos: existing (from server), removed ids, and new files.
  const [existing, setExisting] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [files, setFiles] = useState([]); // {file, url}
  const [photoError, setPhotoError] = useState("");
  const fileInput = useRef(null);
  const canManagePhotos = !asAdmin; // photo endpoints are owner-only (api-spec)

  useEffect(() => {
    if (!edit) return;
    let off = false;
    api
      .get(`/listings/${id}`)
      .then(({ data }) => {
        if (off) return;
        if (!asAdmin && data.owner?._id !== user._id) return setLoadState("notfound");
        setOriginal(data);
        setV(fromListing(data));
        setExisting(data.photos || []);
        setLoadState("ready");
      })
      .catch((err) => !off && setLoadState(err.response?.status === 404 || err.response?.status === 400 ? "notfound" : "error"));
    return () => { off = true; };
  }, [edit, id, asAdmin, user._id]);

  // Revoke object URLs for previews.
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  const dirty = useMemo(() => {
    if (files.length || removed.length) return true;
    const base = edit && original ? fromListing(original) : EMPTY;
    return JSON.stringify(toComparable(v)) !== JSON.stringify(toComparable(base));
  }, [v, files, removed, edit, original]);

  useEffect(() => {
    if (!dirty || status === "saving") return;
    const onBefore = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty, status]);

  const set = (k) => (e) => {
    const val = e.target.value;
    setV((x) => ({ ...x, [k]: val }));
    setErrors((x) => ({ ...x, [k]: undefined, ...(k === "capacity" ? { availableSlots: undefined } : {}) }));
  };
  const setNum = (k) => (e) => {
    const val = e.target.value.replace(/[^\d]/g, "").slice(0, 6);
    setV((x) => ({ ...x, [k]: val }));
    setErrors((x) => ({ ...x, [k]: undefined, ...(k === "capacity" ? { availableSlots: undefined } : {}) }));
  };
  const toggleAmenity = (a) =>
    setV((x) => ({ ...x, amenities: x.amenities.includes(a) ? x.amenities.filter((y) => y !== a) : [...x.amenities, a] }));

  const photoCount = existing.filter((p) => !removed.includes(p._id)).length + files.length;

  function addFiles(list) {
    setPhotoError("");
    const next = [];
    for (const file of list) {
      if (!PHOTO_TYPES.includes(file.type)) { setPhotoError(`${file.name}: use a JPEG, PNG or WebP image.`); continue; }
      if (file.size > LIMITS.photoBytes) { setPhotoError(`${file.name} is over 5 MB.`); continue; }
      if (photoCount + next.length >= LIMITS.photos) { setPhotoError("A listing can have up to 10 photos."); break; }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setFiles((f) => [...f, ...next]);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (status === "saving") return;
    const errs = validateListing(v);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setAlert("Please fix the highlighted fields.");
      document.querySelector("[aria-invalid='true']")?.focus();
      return;
    }
    setAlert("");
    setStatus("saving");
    let listing = original;
    try {
      if (edit) {
        setSavingStep("Saving changes…");
        const body = toBody(v);
        const base = toBody(fromListing(original));
        const changed = {};
        for (const k of Object.keys(body)) if (JSON.stringify(body[k]) !== JSON.stringify(base[k])) changed[k] = body[k];
        if (Object.keys(changed).length) listing = (await api.patch(`/listings/${id}`, changed)).data;
      } else {
        setSavingStep("Creating listing…");
        listing = (await api.post("/listings", toBody(v))).data;
      }
    } catch (err) {
      setStatus("idle");
      const fe = fieldErrors(err);
      setErrors(fe);
      setAlert(errorMessage(err, "Couldn’t save the listing."));
      if (err.response?.status === 404) setLoadState("notfound");
      return;
    }

    // Photos after the listing exists (api-spec: POST /listings/:id/photos).
    let photoFailed = "";
    if (canManagePhotos) {
      try {
        for (const pid of removed) {
          setSavingStep("Removing photos…");
          listing = (await api.delete(`/listings/${listing._id}/photos/${pid}`)).data;
        }
        if (files.length) {
          setSavingStep(`Uploading ${files.length} photo${files.length > 1 ? "s" : ""}…`);
          const fd = new FormData();
          files.forEach((f) => fd.append("photos", f.file));
          listing = (await api.post(`/listings/${listing._id}/photos`, fd)).data;
        }
      } catch (err) {
        photoFailed = errorMessage(err, "Photos couldn’t be uploaded.");
      }
    }

    setStatus("idle");
    if (photoFailed) {
      toast.error(`Listing saved, but ${photoFailed.charAt(0).toLowerCase() + photoFailed.slice(1)}`);
      // Stay on the form, now in edit mode, so the owner can retry photos.
      files.forEach((f) => URL.revokeObjectURL(f.url));
      setFiles([]);
      setRemoved([]);
      if (!edit) navigate(`/owner/listings/${listing._id}/edit`, { replace: true });
      else { setOriginal(listing); setExisting(listing.photos || []); }
      return;
    }
    toast.success(edit ? "Listing saved" : "Listing created");
    setFiles([]);
    setRemoved([]);
    navigate(backTo);
  }

  function cancel() {
    if (dirty && !window.confirm("Leave without saving? Your changes will be lost.")) return;
    navigate(backTo);
  }

  if (loadState === "loading")
    return (
      <Page width={1200}>
        <Skel className="h-4 w-28" />
        <Skel className="mt-5 h-9 w-72" />
        <div className="mt-8 flex flex-col gap-4" aria-busy="true">{[1, 2, 3].map((i) => <Skel key={i} className="h-48 w-full max-w-[800px] !rounded-[14px]" />)}</div>
      </Page>
    );
  if (loadState === "notfound" || loadState === "error")
    return (
      <Page width={880}>
        <EmptyState icon={SearchIcon} title={loadState === "notfound" ? "Listing not found" : "Couldn’t load this listing"}
          action={<Link to={backTo} className="press inline-flex h-12 items-center rounded-xl bg-navy px-6 text-[15px] font-medium text-white">Back to {backLabel}</Link>}>
          {loadState === "notfound" ? "It doesn’t exist, was deleted, or isn’t one of your listings." : "Check your connection and try again."}
        </EmptyState>
      </Page>
    );

  const saving = status === "saving";
  return (
    <Page width={1200}>
      <button type="button" onClick={cancel} className="inline-flex items-center gap-1.5 text-sm font-medium text-navy hover:underline">
        <ChevronLeftIcon size={16} /> {backLabel}
      </button>
      <div className="mt-4 flex flex-col gap-1.5">
        <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em]">{edit ? "Edit listing" : "Create a listing"}</h1>
        <p className="text-[15px] text-steel">
          {edit ? "Changes show on search and the listing page right away." : "Seekers see this on search and on your listing page."} Fields marked <span className="font-semibold text-danger">*</span> are required.
        </p>
      </div>

      {asAdmin && original && (
        <div className="mt-5 max-w-[800px]">
          <Alert tone="info" icon={ShieldIcon} title={`Editing as admin · Owner: ${fullName(original.owner)}`}>
            Changes save to the owner’s listing. Update available slots here; photos can only be managed by the owner.
          </Alert>
        </div>
      )}

      <form noValidate onSubmit={onSubmit} aria-busy={saving} className="fade mt-7 flex w-full max-w-[800px] flex-col gap-6">
        {alert && <Alert title={alert}>{Object.keys(errors).filter((k) => errors[k]).length > 0 && "Check the fields marked below."}</Alert>}

        <Card title="Basics">
          <TextField label="Property name" required maxLength={100} placeholder="e.g. Casa Verde Dormitory" value={v.name} onChange={set("name")} error={errors.name} disabled={saving} />
          <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
            <SelectField label="Property type" required placeholder="Choose a type" options={PROPERTY_TYPES} value={v.propertyType} onChange={set("propertyType")} error={errors.propertyType} disabled={saving} />
            <SelectField label="Gender category" required placeholder="Who can stay?" value={v.genderCategory} onChange={set("genderCategory")} error={errors.genderCategory} disabled={saving}
              options={GENDER_CATEGORIES.map((g) => ({ value: g, label: g === "Any" ? "Any (mixed)" : `${g} only` }))} />
          </div>
          <TextArea label="Description" optional rows={4} maxLength={LIMITS.longText} value={v.description} onChange={set("description")} error={errors.description} disabled={saving}
            placeholder="What’s nearby, room setup, what’s included…" />
        </Card>

        <Card title="Location">
          <SelectField label="City" required placeholder="Choose a city" options={CITIES} value={v.city} onChange={set("city")} error={errors.city} disabled={saving} />
          <TextField label="Address" required maxLength={200} placeholder="Street, barangay and landmarks" value={v.address} onChange={set("address")} error={errors.address} disabled={saving} />
        </Card>

        <Card title="Rent and slots">
          <div className="grid grid-cols-3 gap-5 max-sm:grid-cols-1">
            <TextField label="Monthly rent (₱)" required inputMode="numeric" placeholder="4500" value={v.monthlyRent} onChange={setNum("monthlyRent")} error={errors.monthlyRent} hint="Per slot, per month." disabled={saving} />
            <TextField label="Capacity" required inputMode="numeric" placeholder="20" value={v.capacity} onChange={setNum("capacity")} error={errors.capacity} hint="Total rooms or beds." disabled={saving} />
            <TextField label="Available slots" required inputMode="numeric" placeholder="6" value={v.availableSlots} onChange={setNum("availableSlots")} error={errors.availableSlots}
              hint={v.availableSlots === "0" ? "0 shows the listing as Full." : "0 to capacity."} disabled={saving} />
          </div>
        </Card>

        <Card title="Amenities" sub="Pick everything that applies.">
          <div className="grid grid-cols-3 gap-2.5 max-md:grid-cols-2 max-sm:grid-cols-1" role="group" aria-label="Amenities">
            {AMENITIES.map((a) => {
              const on = v.amenities.includes(a);
              return (
                <label key={a} className={`press flex cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-navy ${on ? "border-navy bg-haze" : "border-line bg-white hover:border-sky"}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleAmenity(a)} disabled={saving} className="sr-only" />
                  <AmenityIcon name={a} className="text-navy" />
                  <span className="flex-1">{a}</span>
                  <span aria-hidden="true" className={`flex h-[18px] w-[18px] items-center justify-center rounded border ${on ? "border-navy bg-navy text-white" : "border-sky-300"}`}>
                    {on && <svg width="12" height="12" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7" /></svg>}
                  </span>
                </label>
              );
            })}
          </div>
        </Card>

        <Card title="House rules">
          <TextArea label="House rules" optional rows={4} maxLength={LIMITS.longText} value={v.houseRules} onChange={set("houseRules")} error={errors.houseRules} disabled={saving}
            placeholder="Curfew, visitors, cooking, quiet hours…" />
        </Card>

        <Card title="Photos" sub={canManagePhotos ? `JPEG, PNG or WebP, up to 5 MB each. ${photoCount} of 10 used.` : "Only the owner can add or remove photos."}>
          <div className="grid grid-cols-5 gap-3 max-md:grid-cols-3 max-sm:grid-cols-2">
            {existing.filter((p) => !removed.includes(p._id)).map((p) => (
              <Thumb key={p._id} src={p.url} onRemove={canManagePhotos ? () => setRemoved((r) => [...r, p._id]) : null} disabled={saving} />
            ))}
            {files.map((f, i) => (
              <Thumb key={f.url} src={f.url} isNew onRemove={() => { URL.revokeObjectURL(f.url); setFiles((x) => x.filter((_, j) => j !== i)); }} disabled={saving} />
            ))}
            {canManagePhotos && photoCount < LIMITS.photos && (
              <button type="button" onClick={() => fileInput.current?.click()} disabled={saving}
                className="press flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-sky-300 bg-page text-[13px] font-medium text-navy hover:border-navy hover:bg-haze">
                <PlusIcon /> Add photos
              </button>
            )}
            {!canManagePhotos && existing.length === 0 && (
              <div className="col-span-full flex items-center gap-2 text-sm text-steel"><ImageIcon /> No photos.</div>
            )}
          </div>
          <input ref={fileInput} type="file" accept={PHOTO_TYPES.join(",")} multiple className="hidden" onChange={(e) => addFiles(Array.from(e.target.files || []))} />
          {photoError && <FieldError>{photoError}</FieldError>}
        </Card>

        <div className="sticky bottom-0 z-10 -mx-6 flex items-center justify-between gap-3 border-t border-line bg-page/95 px-6 py-4 backdrop-blur max-sm:flex-col max-sm:items-stretch max-sm:gap-2">
          <span aria-live="polite" className="text-[13px] text-steel empty:hidden">{saving ? savingStep : dirty ? "Unsaved changes" : ""}</span>
          <div className="flex gap-2.5 max-sm:[&>*]:flex-1">
            <Button variant="ghost" size="lg" className="!h-[46px]" onClick={cancel} disabled={saving}>Cancel</Button>
            <Button type="submit" size="lg" className="!h-[46px]" loading={saving} disabled={edit && !dirty}>
              {saving ? "Saving…" : edit ? "Save changes" : "Create listing"}
            </Button>
          </div>
        </div>
      </form>
    </Page>
  );
}

function toComparable(v) {
  return { ...v, amenities: [...v.amenities].sort(), ...Object.fromEntries(NUM_KEYS.map((k) => [k, String(v[k])])) };
}

function Card({ title, sub, children }) {
  return (
    <section className="flex flex-col gap-5 rounded-[14px] border border-line bg-white p-6 max-sm:p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
        {sub && <p className="text-sm text-steel">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function Thumb({ src, onRemove, isNew, disabled }) {
  return (
    <div className="fade relative aspect-[4/3] overflow-hidden rounded-[10px] bg-haze">
      <img src={src} alt="" className="h-full w-full object-cover" />
      {isNew && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/75 px-2 py-0.5 text-[11px] font-medium text-white">New</span>}
      {onRemove && (
        <button type="button" onClick={onRemove} disabled={disabled} aria-label="Remove photo"
          className="press absolute top-1.5 right-1.5 flex h-7 w-7 max-sm:h-9 max-sm:w-9 items-center justify-center rounded-full bg-white/95 text-danger shadow hover:bg-white">
          <CloseIcon size={14} />
        </button>
      )}
    </div>
  );
}
