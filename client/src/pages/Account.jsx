import { useState } from "react";
import api, { errorMessage, fieldErrors } from "../lib/api";
import { EMAIL_RE, LIMITS, PHONE_RE } from "../lib/constants";
import { cap, fullName, initials, monthYear } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Page } from "../components/Layout";
import { LockIcon, LogoutIcon } from "../components/Icons";
import { Alert, Button, PageTitle, PasswordField, TextField } from "../components/ui";

const ROLE_STYLE = { seeker: "bg-haze text-navy", owner: "bg-mist text-navy-900", admin: "bg-ink text-mist" };
const FIELDS = ["firstName", "lastName", "email", "phone"];

function validateProfile(p) {
  const e = {};
  const f = p.firstName.trim(), l = p.lastName.trim(), em = p.email.trim(), ph = p.phone.trim();
  if (!f) e.firstName = "Enter your first name."; else if (f.length > LIMITS.name[1]) e.firstName = "Use 50 characters or fewer.";
  if (!l) e.lastName = "Enter your last name."; else if (l.length > LIMITS.name[1]) e.lastName = "Use 50 characters or fewer.";
  if (!em) e.email = "Enter your email."; else if (!EMAIL_RE.test(em)) e.email = "Enter a valid email address.";
  if (ph && !PHONE_RE.test(ph)) e.phone = "Use the format 09XXXXXXXXX (11 digits).";
  return e;
}

/** FR-03 · View and update account. Two forms that save separately. */
export default function Account() {
  const { user, logout } = useAuth();
  return (
    <Page width={1200}>
      <PageTitle title="Account settings" sub="Manage your profile and password. Each section saves on its own." />
      <div className="mt-7 flex items-start gap-6 max-lg:flex-col max-lg:items-stretch">
        <ProfileCard key={user._id} />
        <PasswordCard />
      </div>
      <div className="mt-6 flex items-center justify-between gap-4 rounded-[14px] border border-line bg-white px-6 py-5 max-sm:flex-col max-sm:items-start">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-semibold">Log out</span>
          <span className="text-sm text-steel">End your session on this device. You can also log out from the menu under your name.</span>
        </div>
        <Button variant="dangerGhost" onClick={logout}>
          <LogoutIcon size={18} /> Log out
        </Button>
      </div>
      <span className="sr-only">{fullName(user)}</span>
    </Page>
  );
}

function ProfileCard() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const orig = { firstName: user.firstName || "", lastName: user.lastName || "", email: user.email || "", phone: user.phone || "" };
  const [p, setP] = useState(orig);
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState("");
  const [busy, setBusy] = useState(false);

  const changed = {};
  for (const k of FIELDS) if (p[k].trim() !== orig[k]) changed[k] = p[k].trim();
  const dirty = Object.keys(changed).length > 0;

  const set = (k) => (e) => {
    setP((x) => ({ ...x, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (!dirty || busy) return;
    const errs = validateProfile(p);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setAlert("");
    try {
      // Only the changed fields, never role (FR-03).
      const { data } = await api.patch("/users/me", changed);
      setUser(data);
      setP({ firstName: data.firstName || "", lastName: data.lastName || "", email: data.email || "", phone: data.phone || "" });
      toast.success("Profile updated");
    } catch (err) {
      if (err.response?.status === 409) setErrors({ email: "Email already in use" });
      else {
        setErrors(fieldErrors(err));
        setAlert(errorMessage(err, "Couldn’t save your changes."));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby="profile-h" aria-busy={busy} className="flex w-[720px] shrink-0 flex-col rounded-[14px] max-lg:w-full border border-line bg-white">
      <div className="flex items-center gap-4 border-b border-haze p-6">
        <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-navy text-[22px] font-semibold text-white">{initials(user)}</span>
        <div className="flex flex-col gap-2">
          <span className="text-xl font-semibold tracking-tight">{fullName(user)}</span>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-steel">
            <span title="Your role can’t be changed" className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_STYLE[user.role]}`}>
              <LockIcon size={12} /> {cap(user.role)}
            </span>
            <span aria-hidden="true">·</span>
            <span>Member since {monthYear(user.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-1">
          <h2 id="profile-h" className="text-[17px] font-semibold tracking-tight">Profile</h2>
          <p className="text-sm text-steel">Your name and contact details. Your role can’t be changed.</p>
        </div>
        {alert && <Alert title={alert} />}
        <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
          <TextField label="First name" autoComplete="given-name" maxLength={50} value={p.firstName} onChange={set("firstName")} error={errors.firstName} disabled={busy} />
          <TextField label="Last name" autoComplete="family-name" maxLength={50} value={p.lastName} onChange={set("lastName")} error={errors.lastName} disabled={busy} />
          <TextField className="sm:col-span-2" label="Email" type="email" autoComplete="email" value={p.email} onChange={set("email")} error={errors.email} disabled={busy} />
          <TextField className="sm:col-span-2" label="Phone" optional type="tel" inputMode="numeric" autoComplete="tel" maxLength={11} placeholder="09171234567"
            value={p.phone} onChange={set("phone")} error={errors.phone} hint="11 digits, starting with 09." disabled={busy} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-haze px-6 py-4">
        <span aria-live="polite" className="text-[13px] text-steel">{dirty ? "Unsaved changes" : ""}</span>
        <div className="flex items-center gap-2.5">
          {dirty && <Button variant="ghost" onClick={() => { setP(orig); setErrors({}); setAlert(""); }} disabled={busy}>Discard</Button>}
          <Button type="submit" disabled={!dirty} loading={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        </div>
      </div>
    </form>
  );
}

function PasswordCard() {
  const toast = useToast();
  const empty = { currentPassword: "", newPassword: "", confirm: "" };
  const [w, setW] = useState(empty);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const set = (k) => (e) => {
    setW((x) => ({ ...x, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const filled = w.currentPassword && w.newPassword && w.confirm;

  async function onSubmit(e) {
    e.preventDefault();
    if (!filled || busy) return;
    const errs = {};
    const [min, max] = LIMITS.password;
    if (w.newPassword.length < min || w.newPassword.length > max) errs.newPassword = "Use 8 to 72 characters.";
    if (w.confirm !== w.newPassword) errs.confirm = "Passwords don’t match.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      // 401 here means "wrong current password", not "session ended".
      await api.patch("/users/me/password", { currentPassword: w.currentPassword, newPassword: w.newPassword }, { skipAuthRedirect: true });
      setW(empty);
      setFormKey((k) => k + 1); // also resets the show/hide toggles
      toast.success("Password changed");
    } catch (err) {
      if (err.response?.status === 401) setErrors({ currentPassword: "Current password is incorrect" });
      else {
        const fe = fieldErrors(err);
        setErrors(Object.keys(fe).length ? fe : { newPassword: errorMessage(err, "Couldn’t change your password.") });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form key={formKey} noValidate onSubmit={onSubmit} aria-labelledby="pw-h" aria-busy={busy} className="flex min-w-0 flex-1 flex-col rounded-[14px] max-lg:flex-none border border-line bg-white">
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-1">
          <h2 id="pw-h" className="text-[17px] font-semibold tracking-tight">Change password</h2>
          <p className="text-sm text-steel">You’ll stay logged in on this device.</p>
        </div>
        <PasswordField label="Current password" autoComplete="current-password" maxLength={72} value={w.currentPassword} onChange={set("currentPassword")} error={errors.currentPassword} disabled={busy} />
        <PasswordField label="New password" autoComplete="new-password" maxLength={72} value={w.newPassword} onChange={set("newPassword")} error={errors.newPassword} hint="8 to 72 characters." disabled={busy} />
        <PasswordField label="Confirm new password" autoComplete="new-password" maxLength={72} value={w.confirm} onChange={set("confirm")} error={errors.confirm} disabled={busy} />
      </div>
      <div className="mt-auto flex justify-end border-t border-haze px-6 py-4">
        <Button type="submit" disabled={!filled} loading={busy}>{busy ? "Changing…" : "Change password"}</Button>
      </div>
    </form>
  );
}
