import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorMessage, fieldErrors } from "../lib/api";
import { EMAIL_RE, LIMITS, PHONE_RE } from "../lib/constants";
import { HomeIcon, SearchIcon } from "../components/Icons";
import { Alert, Button, PasswordField, TextField } from "../components/ui";
import AuthShell from "./AuthShell";

const ROLE_OPTIONS = [
  { value: "seeker", title: "I’m looking for a place", sub: "Search, message owners and request slots.", Icon: SearchIcon },
  { value: "owner", title: "I own a dorm or boarding house", sub: "List your place and handle requests.", Icon: HomeIcon },
];

export function validateRegister(v) {
  const e = {};
  const [min, max] = LIMITS.name;
  const fn = v.firstName.trim(), ln = v.lastName.trim(), em = v.email.trim(), ph = v.phone.trim();
  if (!fn) e.firstName = "Enter your first name."; else if (fn.length > max || fn.length < min) e.firstName = "Use 50 characters or fewer.";
  if (!ln) e.lastName = "Enter your last name."; else if (ln.length > max) e.lastName = "Use 50 characters or fewer.";
  if (!em) e.email = "Enter your email."; else if (!EMAIL_RE.test(em)) e.email = "Enter a valid email address.";
  if (ph && !PHONE_RE.test(ph)) e.phone = "Use the format 09XXXXXXXXX (11 digits).";
  if (!v.password) e.password = "Create a password.";
  else if (v.password.length < LIMITS.password[0]) e.password = "Use at least 8 characters.";
  else if (v.password.length > LIMITS.password[1]) e.password = "Use 72 characters or fewer.";
  if (!v.role) e.role = "Choose how you’ll use FINDorm.";
  return e;
}

/** FR-01 · Register as seeker or owner. Admin is never offered (D-09). */
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [v, setV] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "", role: "" });
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    setV((x) => ({ ...x, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    const errs = validateRegister(v);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setAlert(null);
    const body = { firstName: v.firstName.trim(), lastName: v.lastName.trim(), email: v.email.trim(), password: v.password, role: v.role };
    if (v.phone.trim()) body.phone = v.phone.trim();
    try {
      const user = await register(body);
      const from = location.state?.from;
      navigate(from || (user.role === "owner" ? "/owner/listings" : "/"), { replace: true });
    } catch (err) {
      setBusy(false);
      if (err.response?.status === 409) {
        setErrors({ email: "An account with this email already exists." });
        setAlert({ title: "That email is already registered.", link: true });
      } else {
        setErrors(fieldErrors(err));
        setAlert({ title: errorMessage(err, "Please fix the highlighted fields.") });
      }
    }
  }

  return (
    <AuthShell heading="Find your next dorm in Metro Manila." sub="Browse rooms across all 17 cities, message owners and request a slot — all in one place.">
      <form noValidate onSubmit={onSubmit} aria-busy={busy} className="flex w-[480px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em]">Create your account</h1>
          <p className="text-[15px] text-navy">
            Already have one?{" "}
            <Link to="/login" state={location.state} className="font-medium underline underline-offset-4">Log in</Link>
          </p>
        </div>

        {alert && (
          <Alert title={alert.title}>
            {alert.link && (
              <>
                Try <Link to="/login" className="font-medium underline">logging in</Link> instead.
              </>
            )}
          </Alert>
        )}

        <fieldset className="flex flex-col gap-2.5" aria-describedby={errors.role ? "role-msg" : undefined}>
          <legend className="mb-2.5 text-sm font-medium">How will you use FINDorm?</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_OPTIONS.map(({ value, title, sub, Icon }) => {
              const on = v.role === value;
              return (
                <label
                  key={value}
                  className={`relative flex cursor-pointer flex-col gap-2 rounded-xl border p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-navy ${
                    on ? "border-navy bg-haze shadow-[inset_0_0_0_1px_#243a5a]" : errors.role ? "border-danger bg-white" : "border-line bg-white hover:border-sky"
                  }`}
                >
                  <input type="radio" name="role" value={value} checked={on} onChange={set("role")} disabled={busy} className="sr-only" />
                  <Icon size={22} className="text-navy" />
                  <span className="text-sm font-semibold">{title}</span>
                  <span className="text-[13px] leading-snug text-steel">{sub}</span>
                </label>
              );
            })}
          </div>
          {errors.role && <span id="role-msg" className="text-[13px] text-danger">{errors.role}</span>}
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <TextField label="First name" autoComplete="given-name" maxLength={50} value={v.firstName} onChange={set("firstName")} error={errors.firstName} disabled={busy} />
          <TextField label="Last name" autoComplete="family-name" maxLength={50} value={v.lastName} onChange={set("lastName")} error={errors.lastName} disabled={busy} />
        </div>
        <TextField label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={v.email} onChange={set("email")} error={errors.email} disabled={busy} />
        <TextField label="Phone" optional type="tel" inputMode="numeric" autoComplete="tel" placeholder="09171234567" maxLength={11} value={v.phone} onChange={set("phone")} error={errors.phone} hint="11 digits, starting with 09." disabled={busy} />
        <PasswordField label="Password" autoComplete="new-password" maxLength={72} value={v.password} onChange={set("password")} error={errors.password} hint="8 to 72 characters." disabled={busy} />

        <Button type="submit" size="lg" className="w-full !h-11 !text-[15px]" loading={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
