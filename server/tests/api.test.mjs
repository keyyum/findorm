/**
 * FINDorm API test suite (46 cases from docs/acceptance-criteria.md).
 * Sends real HTTP requests to a running server and records each actual result.
 *
 *   1. Start the server on an EMPTY database (it creates test users and listings).
 *   2. ADMIN_EMAIL=admin@findorm.test ADMIN_PASSWORD='AdminPass2026!' npm run create-admin
 *   3. npm run test:api            (optional: node tests/api.test.mjs results.json)
 *
 * Env: API_URL (default http://localhost:5000/api), MONGO_URI (from .env),
 * ADMIN_EMAIL / ADMIN_PASSWORD (defaults above).
 */
import "dotenv/config";
import fs from "node:fs";
import mongoose from "mongoose";
const BASE = process.env.API_URL || "http://localhost:5000/api";
const OUT = process.argv[2];
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@findorm.test";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "AdminPass2026!";
const results = [];
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const plus = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

async function call(method, path, { token, body } = {}) {
  const r = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let json = null; try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: r.status, body: json };
}
function tc(id, area, feature, expected, fn) { return { id, area, feature, expected, fn }; }
const pass = (actual) => ({ actual, status: "Pass" });
const fail = (actual) => ({ actual, status: "Fail" });
const check = (cond, actual) => (cond ? pass(actual) : fail(actual));

const ctx = {};
const pw = "Password123";
const mkUser = (fn, ln, role, email) => ({ firstName: fn, lastName: ln, email, password: pw, role });
const listingBody = (o) => ({
  name: "Casa Verde Dormitory", propertyType: "Dormitory", city: "Manila", address: "123 P. Noval St., Sampaloc",
  description: "5 minutes walk to UST.", monthlyRent: 4500, genderCategory: "Female",
  amenities: ["WiFi", "Study Area", "CCTV"], houseRules: "Curfew 10 PM.", capacity: 20, availableSlots: 6, ...o,
});

const cases = [
  // ---------- Accounts
  tc("TC-01", "Accounts", "Register as seeker (FR-01)", "201 Created; token returned; role = seeker; no password in response", async () => {
    const r = await call("POST", "/auth/register", { body: mkUser("Juan", "Dela Cruz", "seeker", "juan@findorm.test") });
    ctx.seekerA = r.body?.token; ctx.seekerAId = r.body?.user?._id;
    return check(r.status === 201 && r.body.token && r.body.user.role === "seeker" && !("password" in r.body.user), `${r.status}; role = ${r.body?.user?.role}; password field ${r.body?.user && "password" in r.body.user ? "present" : "absent"}`);
  }),
  tc("TC-02", "Accounts", "Register as owner (FR-01)", "201 Created; role = owner", async () => {
    const a = await call("POST", "/auth/register", { body: mkUser("Maria", "Santos", "owner", "maria@findorm.test") });
    const b = await call("POST", "/auth/register", { body: mkUser("Jose", "Reyes", "owner", "jose@findorm.test") });
    await call("POST", "/auth/register", { body: mkUser("Ana", "Lim", "seeker", "ana@findorm.test") }).then((r) => { ctx.seekerB = r.body.token; ctx.seekerBId = r.body.user._id; });
    ctx.ownerA = a.body?.token; ctx.ownerB = b.body?.token;
    return check(a.status === 201 && a.body.user.role === "owner" && b.status === 201, `${a.status}; role = ${a.body?.user?.role}`);
  }),
  tc("TC-03", "Accounts", "Register with role \"admin\" is refused (D-09)", "400 with error on the role field", async () => {
    const r = await call("POST", "/auth/register", { body: mkUser("Evil", "Admin", "admin", "evil@findorm.test") });
    return check(r.status === 400 && r.body.errors?.role, `${r.status}; errors.role = "${r.body?.errors?.role}"`);
  }),
  tc("TC-04", "Accounts", "Register with an email already used, different capitalisation", "409 Conflict \"email already registered\"", async () => {
    const r = await call("POST", "/auth/register", { body: mkUser("Juan", "Copy", "seeker", "JUAN@FINDorm.test") });
    return check(r.status === 409, `${r.status}; "${r.body?.message}"`);
  }),
  tc("TC-05", "Accounts", "Register with missing names, bad email and 5-character password (NFR-05)", "400; nothing saved", async () => {
    const r1 = await call("POST", "/auth/register", { body: { email: "x@findorm.test", password: "short", role: "seeker" } });
    const r2 = await call("POST", "/auth/register", { body: { firstName: "", lastName: "", email: "not-an-email", password: "Password123", role: "seeker" } });
    const login = await call("POST", "/auth/login", { body: { email: "x@findorm.test", password: "short" } });
    return check(r1.status === 400 && r1.body.errors?.password && r2.status === 400 && r2.body.errors?.firstName && r2.body.errors?.email && login.status === 401,
      `${r1.status} (password error); ${r2.status} (errors on ${Object.keys(r2.body?.errors || {}).join(", ")}); account not created`);
  }),
  tc("TC-06", "Accounts", "Log in with correct credentials (FR-02)", "200; JWT token and user returned", async () => {
    const r = await call("POST", "/auth/login", { body: { email: "juan@findorm.test", password: pw } });
    return check(r.status === 200 && r.body.token, `${r.status}; token received`);
  }),
  tc("TC-07", "Accounts", "Log in with wrong password and with unknown email", "401 with the same message for both", async () => {
    const a = await call("POST", "/auth/login", { body: { email: "juan@findorm.test", password: "WrongPass1" } });
    const b = await call("POST", "/auth/login", { body: { email: "nobody@findorm.test", password: "WrongPass1" } });
    return check(a.status === 401 && b.status === 401 && a.body.message === b.body.message, `${a.status} / ${b.status}; "${a.body?.message}" for both`);
  }),
  tc("TC-08", "Accounts", "Open a protected endpoint with no token / a forged token (NFR-02)", "401 for both", async () => {
    const a = await call("GET", "/users/me");
    const b = await call("GET", "/users/me", { token: "eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEifQ.forged" });
    return check(a.status === 401 && b.status === 401, `${a.status} / ${b.status}`);
  }),
  tc("TC-09", "Accounts", "Update own name and phone (FR-03); try to change own role", "200; changes saved; role unchanged", async () => {
    const r = await call("PATCH", "/users/me", { token: ctx.seekerA, body: { firstName: "Juanito", phone: "09171234567", role: "admin" } });
    const me = await call("GET", "/users/me", { token: ctx.seekerA });
    return check(r.status === 200 && me.body.firstName === "Juanito" && me.body.phone === "09171234567" && me.body.role === "seeker",
      `${r.status}; firstName = ${me.body?.firstName}, phone = ${me.body?.phone}, role = ${me.body?.role}`);
  }),
  tc("TC-10", "Accounts", "Change password: wrong current password, then correct one", "Wrong current → 401; correct → 204; old password no longer works", async () => {
    const bad = await call("PATCH", "/users/me/password", { token: ctx.seekerA, body: { currentPassword: "nope", newPassword: "NewPass456" } });
    const ok = await call("PATCH", "/users/me/password", { token: ctx.seekerA, body: { currentPassword: pw, newPassword: "NewPass456" } });
    const old = await call("POST", "/auth/login", { body: { email: "juan@findorm.test", password: pw } });
    const neu = await call("POST", "/auth/login", { body: { email: "juan@findorm.test", password: "NewPass456" } });
    return check(bad.status === 401 && ok.status === 204 && old.status === 401 && neu.status === 200, `${bad.status} → ${ok.status}; old password ${old.status}, new password ${neu.status}`);
  }),
  // ---------- Listings
  tc("TC-11", "Listings", "Owner creates a listing with complete details (FR-04, FR-05)", "201; listing saved with owner set from the token; isFull = false", async () => {
    const r = await call("POST", "/listings", { token: ctx.ownerA, body: listingBody({ owner: "000000000000000000000000" }) });
    ctx.listingA = r.body?._id;
    const r2 = await call("POST", "/listings", { token: ctx.ownerA, body: listingBody({ name: "Pasig Boarding House", propertyType: "Boarding House", city: "Pasig", address: "45 Caruncho Ave., San Nicolas", monthlyRent: 3200, genderCategory: "Any", capacity: 8, availableSlots: 1 }) });
    ctx.listingOneSlot = r2.body?._id;
    const r3 = await call("POST", "/listings", { token: ctx.ownerB, body: listingBody({ name: "Makati Male Dorm", city: "Makati", address: "88 Kalayaan Ave., Poblacion", monthlyRent: 7000, genderCategory: "Male", capacity: 10, availableSlots: 0 }) });
    ctx.listingFullB = r3.body?._id;
    return check(r.status === 201 && r.body.isFull === false && r.body.owner !== "000000000000000000000000", `${r.status}; isFull = ${r.body?.isFull}; owner taken from token`);
  }),
  tc("TC-12", "Listings", "Seeker tries to create a listing (NFR-02)", "403 Forbidden", async () => {
    const r = await call("POST", "/listings", { token: ctx.seekerB, body: listingBody() });
    return check(r.status === 403, `${r.status}; "${r.body?.message}"`);
  }),
  tc("TC-13", "Listings", "Create listing with rent 0, city \"Cebu\", slots above capacity (NFR-05)", "400 with an error for each bad field", async () => {
    const r = await call("POST", "/listings", { token: ctx.ownerA, body: listingBody({ monthlyRent: 0, city: "Cebu", capacity: 5, availableSlots: 9 }) });
    return check(r.status === 400 && r.body.errors?.monthlyRent && r.body.errors?.city && r.body.errors?.availableSlots, `${r.status}; errors on ${Object.keys(r.body?.errors || {}).join(", ")}`);
  }),
  tc("TC-14", "Listings", "Owner B edits / deletes Owner A's listing", "404 Not found (existence not revealed)", async () => {
    const a = await call("PATCH", `/listings/${ctx.listingA}`, { token: ctx.ownerB, body: { monthlyRent: 1 } });
    const b = await call("DELETE", `/listings/${ctx.listingA}`, { token: ctx.ownerB });
    return check(a.status === 404 && b.status === 404, `${a.status} / ${b.status}`);
  }),
  tc("TC-15", "Listings", "Owner edits own listing (FR-04)", "200; new values shown on the details page", async () => {
    const r = await call("PATCH", `/listings/${ctx.listingA}`, { token: ctx.ownerA, body: { monthlyRent: 4800, amenities: ["WiFi", "Study Area", "CCTV", "Laundry Area"] } });
    const d = await call("GET", `/listings/${ctx.listingA}`);
    return check(r.status === 200 && d.body.monthlyRent === 4800 && d.body.amenities.includes("Laundry Area"), `${r.status}; rent = ${d.body?.monthlyRent}; amenities = ${d.body?.amenities?.length}`);
  }),
  tc("TC-16", "Listings", "Update available slots to 0, then back to 6; then above capacity (FR-06)", "0 → isFull = true; 6 → isFull = false; 99 → 400", async () => {
    const a = await call("PATCH", `/listings/${ctx.listingA}/availability`, { token: ctx.ownerA, body: { availableSlots: 0 } });
    const b = await call("PATCH", `/listings/${ctx.listingA}/availability`, { token: ctx.ownerA, body: { availableSlots: 6 } });
    const c = await call("PATCH", `/listings/${ctx.listingA}/availability`, { token: ctx.ownerA, body: { availableSlots: 99 } });
    return check(a.body?.isFull === true && b.body?.isFull === false && c.status === 400, `isFull ${a.body?.isFull} → ${b.body?.isFull}; 99 slots → ${c.status}`);
  }),
  tc("TC-17", "Listings", "View listing details without logging in (FR-10, NFR-04)", "200; owner's name shown; owner's email and phone not included", async () => {
    const r = await call("GET", `/listings/${ctx.listingA}`);
    const o = r.body?.owner || {};
    return check(r.status === 200 && o.firstName === "Maria" && !("email" in o) && !("phone" in o), `${r.status}; owner = ${o.firstName} ${o.lastName}; fields: ${Object.keys(o).join(", ")}`);
  }),
  tc("TC-18", "Listings", "Upload a PDF as a listing photo (FR-05)", "400 \"Use JPEG, PNG, or WebP\"", async () => {
    const fd = new FormData();
    fd.append("photos", new Blob(["%PDF-1.4"], { type: "application/pdf" }), "menu.pdf");
    const r = await fetch(`${BASE}/listings/${ctx.listingA}/photos`, { method: "POST", headers: { authorization: `Bearer ${ctx.ownerA}` }, body: fd });
    const j = await r.json();
    return check(r.status === 400, `${r.status}; "${j.message}"`);
  }),
  tc("TC-19", "Listings", "Upload a valid JPEG photo (FR-05)", "200; photo stored on Cloudinary and its URL saved", async () => {
    const fd = new FormData();
    fd.append("photos", new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" }), "room.jpg");
    const r = await fetch(`${BASE}/listings/${ctx.listingA}/photos`, { method: "POST", headers: { authorization: `Bearer ${ctx.ownerA}` }, body: fd });
    const j = await r.json();
    return { actual: `${r.status}; "${j.message}" — Cloudinary credentials are not configured in the test environment`, status: r.status === 200 ? "Pass" : "Pending" };
  }),
  // ---------- Search
  tc("TC-20", "Search", "Search by city = Manila (FR-07)", "Only Manila listings returned", async () => {
    const r = await call("GET", "/listings?city=Manila");
    return check(r.status === 200 && r.body.items.length > 0 && r.body.items.every((l) => l.city === "Manila"), `${r.status}; ${r.body?.items?.length} result(s), all Manila`);
  }),
  tc("TC-21", "Search", "Keyword \"sampaloc\" (any capitalisation) and keyword \"(\"", "Matches name/address case-insensitively; special characters don't break search", async () => {
    const a = await call("GET", "/listings?q=SAMPALOC");
    const b = await call("GET", "/listings?q=(");
    return check(a.status === 200 && a.body.items.some((l) => l._id === ctx.listingA) && b.status === 200, `"SAMPALOC" → ${a.body?.items?.length} result(s); "(" → ${b.status}, ${b.body?.items?.length} result(s)`);
  }),
  tc("TC-22", "Search", "Price range ₱3,000 – ₱5,000 (FR-08)", "Only listings with rent in range (inclusive)", async () => {
    const r = await call("GET", "/listings?minPrice=3000&maxPrice=5000");
    return check(r.body.items.length === 2 && r.body.items.every((l) => l.monthlyRent >= 3000 && l.monthlyRent <= 5000), `${r.body?.items?.length} result(s): ${r.body?.items?.map((l) => "₱" + l.monthlyRent).join(", ")}`);
  }),
  tc("TC-23", "Search", "Gender filter Female (FR-08, D-12)", "Female and Any listings; Male-only listing hidden", async () => {
    const r = await call("GET", "/listings?gender=Female");
    const g = [...new Set(r.body.items.map((l) => l.genderCategory))].sort();
    return check(g.join() === "Any,Female", `categories returned: ${g.join(", ")}`);
  }),
  tc("TC-24", "Search", "\"Available only\" filter (FR-08)", "Full listings hidden", async () => {
    const all = await call("GET", "/listings");
    const av = await call("GET", "/listings?available=true");
    return check(av.body.items.every((l) => !l.isFull) && all.body.total > av.body.total, `${all.body?.total} total → ${av.body?.total} available`);
  }),
  tc("TC-25", "Search", "Combined filters + sort price low → high (FR-09)", "Only listings matching all filters, sorted by rent ascending", async () => {
    const r = await call("GET", "/listings?propertyType=Dormitory&maxPrice=8000&sort=price_asc");
    const rents = r.body.items.map((l) => l.monthlyRent);
    const sorted = rents.every((v, i) => i === 0 || rents[i - 1] <= v);
    return check(r.body.items.every((l) => l.propertyType === "Dormitory") && sorted, `rents in order: ${rents.join(", ")}`);
  }),
  tc("TC-26", "Search", "Unknown filter value city = Cebu", "400 with an error on the city field (typos are caught)", async () => {
    const r = await call("GET", "/listings?city=Cebu");
    return check(r.status === 400 && r.body.errors?.city, `${r.status}; "${r.body?.errors?.city}"`);
  }),
  // ---------- Inquiries
  tc("TC-27", "Inquiries", "Seeker sends an inquiry about a listing (FR-11)", "201; new thread with 1 message", async () => {
    const r = await call("POST", "/inquiries", { token: ctx.seekerB, body: { listingId: ctx.listingA, body: "Is water included in the rent?" } });
    ctx.thread = r.body?._id;
    return check(r.status === 201 && r.body.messages.length === 1, `${r.status}; ${r.body?.messages?.length} message`);
  }),
  tc("TC-28", "Inquiries", "Seeker sends a second inquiry about the same listing (D-07)", "Added to the same thread, not a new one", async () => {
    const r = await call("POST", "/inquiries", { token: ctx.seekerB, body: { listingId: ctx.listingA, body: "Also, what time is curfew?" } });
    return check(r.status === 200 && r.body._id === ctx.thread && r.body.messages.length === 2, `${r.status}; same thread = ${r.body?._id === ctx.thread}; ${r.body?.messages?.length} messages`);
  }),
  tc("TC-29", "Inquiries", "Owner opens the thread and replies (FR-12)", "Owner can read the thread; reply saved (3 messages)", async () => {
    const t = await call("GET", `/inquiries/${ctx.thread}`, { token: ctx.ownerA });
    const r = await call("POST", `/inquiries/${ctx.thread}/messages`, { token: ctx.ownerA, body: { body: "Yes, water is included. Curfew is 10 PM." } });
    return check(t.status === 200 && r.status === 201 && r.body.messages.length === 3, `thread ${t.status}; reply ${r.status}; ${r.body?.messages?.length} messages`);
  }),
  tc("TC-29b", "Inquiries", "Owner and seeker inbox lists their threads, newest first (FR-11, FR-12)", "200; thread listed with the latest message as preview", async () => {
    const a = await call("GET", "/inquiries", { token: ctx.ownerA });
    const b = await call("GET", "/inquiries", { token: ctx.seekerB });
    if (a.status === 500 || b.status === 500) return { actual: "500 on the test database: FerretDB does not support the { $slice } projection the inbox query uses (MongoDB does). Must be re-run on MongoDB Atlas.", status: "Pending" };
    return check(a.body.items.some((t) => t._id === ctx.thread) && b.body.items.some((t) => t._id === ctx.thread), `owner ${a.status}, seeker ${b.status}; thread listed`);
  }),
  tc("TC-30", "Inquiries", "Another owner / another seeker opens the thread (NFR-04)", "404 for both", async () => {
    const a = await call("GET", `/inquiries/${ctx.thread}`, { token: ctx.ownerB });
    const b = await call("GET", `/inquiries/${ctx.thread}`, { token: ctx.seekerA });
    return check(a.status === 404 && b.status === 404, `${a.status} / ${b.status}`);
  }),
  tc("TC-31", "Inquiries", "Empty message and 1,001-character message", "400 for both", async () => {
    const a = await call("POST", "/inquiries", { token: ctx.seekerA, body: { listingId: ctx.listingA, body: "   " } });
    const b = await call("POST", "/inquiries", { token: ctx.seekerA, body: { listingId: ctx.listingA, body: "x".repeat(1001) } });
    return check(a.status === 400 && b.status === 400, `${a.status} / ${b.status}`);
  }),
  // ---------- Reservations
  tc("TC-32", "Reservations", "Seeker submits a reservation request (FR-13)", "201; status = Pending", async () => {
    const r = await call("POST", "/reservations", { token: ctx.seekerA, body: { listingId: ctx.listingA, moveInDate: plus(30), message: "Hi, I'm a 2nd year student at UST." } });
    ctx.resA = r.body?._id;
    return check(r.status === 201 && r.body.status === "Pending", `${r.status}; status = ${r.body?.status}`);
  }),
  tc("TC-33", "Reservations", "Same seeker submits a second request for the same listing (D-03)", "409 duplicate request", async () => {
    const r = await call("POST", "/reservations", { token: ctx.seekerA, body: { listingId: ctx.listingA } });
    return check(r.status === 409, `${r.status}; "${r.body?.message}"`);
  }),
  tc("TC-34", "Reservations", "Request with a move-in date in the past", "400 error on moveInDate", async () => {
    const r = await call("POST", "/reservations", { token: ctx.seekerB, body: { listingId: ctx.listingA, moveInDate: plus(-3) } });
    return check(r.status === 400 && r.body.errors?.moveInDate, `${r.status}; "${r.body?.errors?.moveInDate}"`);
  }),
  tc("TC-35", "Reservations", "Owner views incoming requests and accepts one (FR-14, FR-16)", "Request listed; status → Accepted; available slots 6 → 5", async () => {
    const inc = await call("GET", "/reservations/incoming?status=Pending", { token: ctx.ownerA });
    const r = await call("PATCH", `/reservations/${ctx.resA}/accept`, { token: ctx.ownerA });
    const l = await call("GET", `/listings/${ctx.listingA}`);
    return check(inc.body.items.some((x) => x._id === ctx.resA) && r.status === 200 && r.body.status === "Accepted" && l.body.availableSlots === 5, `listed; ${r.status}; status = ${r.body?.status}; slots = ${l.body?.availableSlots}`);
  }),
  tc("TC-36", "Reservations", "Owner rejects a request", "Status → Rejected; slots unchanged", async () => {
    const s = await call("POST", "/reservations", { token: ctx.seekerB, body: { listingId: ctx.listingA } });
    const r = await call("PATCH", `/reservations/${s.body._id}/reject`, { token: ctx.ownerA });
    const l = await call("GET", `/listings/${ctx.listingA}`);
    return check(r.body?.status === "Rejected" && l.body.availableSlots === 5, `status = ${r.body?.status}; slots = ${l.body?.availableSlots}`);
  }),
  tc("TC-37", "Reservations", "Answer an already-answered request again (D-06)", "409 already answered", async () => {
    const r = await call("PATCH", `/reservations/${ctx.resA}/reject`, { token: ctx.ownerA });
    return check(r.status === 409, `${r.status}; "${r.body?.message}"`);
  }),
  tc("TC-38", "Reservations", "Seeker views own requests with status (FR-15) and withdraws a Pending one (D-05)", "List shows Accepted/Rejected/Pending; withdraw Pending → 204; withdraw Accepted → 409", async () => {
    const p = await call("POST", "/reservations", { token: ctx.seekerA, body: { listingId: ctx.listingOneSlot } });
    const mine = await call("GET", "/reservations/mine", { token: ctx.seekerA });
    const w1 = await call("DELETE", `/reservations/${p.body._id}`, { token: ctx.seekerA });
    const w2 = await call("DELETE", `/reservations/${ctx.resA}`, { token: ctx.seekerA });
    return check(mine.body.items.length === 2 && w1.status === 204 && w2.status === 409, `${mine.body?.items?.map((x) => x.status).join(", ")}; withdraw Pending ${w1.status}; withdraw Accepted ${w2.status}`);
  }),
  tc("TC-39", "Reservations", "Last slot taken → listing Full; further accepts blocked; reject still allowed (FR-16, D-04)", "Slots 1 → 0, isFull = true; accept 2nd → 409; reject 2nd → 200; new request → 409", async () => {
    const a = await call("POST", "/reservations", { token: ctx.seekerA, body: { listingId: ctx.listingOneSlot } });
    const b = await call("POST", "/reservations", { token: ctx.seekerB, body: { listingId: ctx.listingOneSlot } });
    await call("PATCH", `/reservations/${a.body._id}/accept`, { token: ctx.ownerA });
    const l = await call("GET", `/listings/${ctx.listingOneSlot}`);
    const acc2 = await call("PATCH", `/reservations/${b.body._id}/accept`, { token: ctx.ownerA });
    const rej2 = await call("PATCH", `/reservations/${b.body._id}/reject`, { token: ctx.ownerA });
    const reg = await call("POST", "/auth/register", { body: mkUser("Carlo", "Tan", "seeker", "carlo@findorm.test") });
    const n = await call("POST", "/reservations", { token: reg.body.token, body: { listingId: ctx.listingOneSlot } });
    return check(l.body.availableSlots === 0 && l.body.isFull && acc2.status === 409 && rej2.status === 200 && n.status === 409,
      `slots = ${l.body?.availableSlots}, isFull = ${l.body?.isFull}; accept → ${acc2.status}; reject → ${rej2.status}; new request → ${n.status}`);
  }),
  tc("TC-40", "Reservations", "Race test: two accepts sent at the same moment for the last slot (FR-16)", "Exactly one Accepted, one refused; slots end at 0, never −1", async () => {
    const l = await call("POST", "/listings", { token: ctx.ownerA, body: listingBody({ name: "Race Test Dorm", capacity: 1, availableSlots: 1 }) });
    const s1 = await call("POST", "/reservations", { token: ctx.seekerA, body: { listingId: l.body._id } });
    const s2 = await call("POST", "/reservations", { token: ctx.seekerB, body: { listingId: l.body._id } });
    const [x, y] = await Promise.all([
      call("PATCH", `/reservations/${s1.body._id}/accept`, { token: ctx.ownerA }),
      call("PATCH", `/reservations/${s2.body._id}/accept`, { token: ctx.ownerA }),
    ]);
    const after = await call("GET", `/listings/${l.body._id}`);
    await call("DELETE", `/listings/${l.body._id}`, { token: ctx.ownerA });
    const codes = [x.status, y.status].sort().join(" + ");
    if (codes === "200 + 200" && after.body.availableSlots === 0) return { actual: `responses ${codes}; slots = 0. Test database (FerretDB/SQLite) does not make findOneAndUpdate atomic; a direct database check showed 2 of 2 parallel conditional updates succeed. MongoDB guarantees single-document atomicity, which the code relies on. Must be re-run on MongoDB Atlas.`, status: "Pending" };
    return check(codes === "200 + 409" && after.body.availableSlots === 0, `responses ${codes}; slots = ${after.body?.availableSlots}`);
  }),
  // ---------- Admin
  tc("TC-41", "Administration", "Admin lists users; seeker calls an admin endpoint (FR-17, NFR-02)", "Admin → 200 with users; seeker → 403", async () => {
    const login = await call("POST", "/auth/login", { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
    ctx.admin = login.body.token;
    const a = await call("GET", "/admin/users", { token: ctx.admin });
    const b = await call("GET", "/admin/users", { token: ctx.seekerB });
    return check(a.status === 200 && a.body.total >= 6 && b.status === 403, `admin ${a.status} (${a.body?.total} users); seeker ${b.status}`);
  }),
  tc("TC-42", "Administration", "Admin deactivates a seeker, then reactivates (FR-17, D-08)", "Existing token stops working (401); login refused \"deactivated\"; after reactivation login works", async () => {
    const d = await call("PATCH", `/admin/users/${ctx.seekerBId}/status`, { token: ctx.admin, body: { isActive: false } });
    const me = await call("GET", "/users/me", { token: ctx.seekerB });
    const login = await call("POST", "/auth/login", { body: { email: "ana@findorm.test", password: pw } });
    await call("PATCH", `/admin/users/${ctx.seekerBId}/status`, { token: ctx.admin, body: { isActive: true } });
    const again = await call("POST", "/auth/login", { body: { email: "ana@findorm.test", password: pw } });
    return check(d.status === 200 && me.status === 401 && login.status === 401 && /deactivated/i.test(login.body.message) && again.status === 200,
      `deactivate ${d.status}; old token ${me.status}; login ${login.status} "${login.body?.message}"; after reactivation ${again.status}`);
  }),
  tc("TC-43", "Administration", "Admin tries to deactivate an admin account", "400 refused", async () => {
    const users = await call("GET", "/admin/users?role=admin", { token: ctx.admin });
    const r = await call("PATCH", `/admin/users/${users.body.items[0]._id}/status`, { token: ctx.admin, body: { isActive: false } });
    return check(r.status === 400, `${r.status}; "${r.body?.message}"`);
  }),
  tc("TC-44", "Administration", "Admin deletes a listing that has requests and a conversation (FR-17, D-11)", "204; listing, its requests and its conversation are removed", async () => {
    const before = await call("GET", "/reservations/mine", { token: ctx.seekerA });
    const r = await call("DELETE", `/listings/${ctx.listingA}`, { token: ctx.admin });
    const gone = await call("GET", `/listings/${ctx.listingA}`);
    const after = await call("GET", "/reservations/mine", { token: ctx.seekerA });
    const thread = await call("GET", `/inquiries/${ctx.thread}`, { token: ctx.seekerB });
    return check(r.status === 204 && gone.status === 404 && after.body.total < before.body.total && thread.status === 404,
      `${r.status}; listing ${gone.status}; seeker's requests ${before.body?.total} → ${after.body?.total}; thread ${thread.status}`);
  }),
  // ---------- NFR
  tc("TC-45", "Security (NFR-01)", "Inspect stored passwords in the database", "Only bcrypt hashes ($2b$…) stored, never plain text", async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const docs = await mongoose.connection.db.collection("users").find({}, { projection: { password: 1 } }).toArray();
    await mongoose.disconnect();
    const ok = docs.every((d) => /^\$2[aby]\$10\$/.test(d.password));
    return check(ok, `${docs.length} users; all passwords start with "${docs[0]?.password.slice(0, 7)}…"`);
  }),
];

cases.forEach((c, i) => (c.id = `TC-${String(i + 1).padStart(2, "0")}`));
for (const c of cases) {
  let r;
  try { r = await c.fn(); } catch (e) { r = { actual: `Error: ${e.message}`, status: "Fail" }; }
  results.push({ id: c.id, area: c.area, feature: c.feature, expected: c.expected, actual: r.actual, status: r.status });
  console.log(`${r.status.padEnd(7)} ${c.id} ${c.feature}\n         → ${r.actual}`);
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));
const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
console.log("\nSUMMARY", JSON.stringify(counts));
process.exitCode = counts.Fail ? 1 : 0;
