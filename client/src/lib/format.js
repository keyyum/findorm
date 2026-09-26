const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const peso = (n) =>
  "₱" + Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 });

/** "Oct 2" for this year, "Oct 2, 2025" otherwise. */
export function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === new Date().getFullYear() ? base : `${base}, ${d.getFullYear()}`;
}

/** Date-only values (moveInDate) are stored at UTC midnight; read them in UTC. */
export function dateOnly(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function monthYear(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Just now", "5m ago", "2h ago", then "Oct 3". */
export function relativeTime(iso, now = Date.now()) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const mins = Math.floor((now - t) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return shortDate(iso);
}

export function timeOfDay(iso) {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

export function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return "Today";
  if (same(d, y)) return "Yesterday";
  return d.toLocaleDateString("en-PH", { weekday: "long", month: "short", day: "numeric" });
}

export const fullName = (u) => (u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "");
export const shortName = (u) => (u ? `${u.firstName ?? ""} ${u.lastName ? u.lastName[0] + "." : ""}`.trim() : "");
export const initials = (u) =>
  u ? `${(u.firstName || "")[0] || ""}${(u.lastName || "")[0] || ""}`.toUpperCase() : "";

export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;

export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : "");

/** Today's date as YYYY-MM-DD in local time, for <input type="date" min>. */
export function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
