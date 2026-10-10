import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { errorCode, errorMessage } from "../lib/api";
import { EMAIL_RE } from "../lib/constants";
import { BanIcon, InfoIcon } from "../components/Icons";
import { Alert, Button, PasswordField, TextField } from "../components/ui";
import AuthShell from "./AuthShell";

/** FR-02 · Log in. */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [alert, setAlert] = useState(params.get("reason") === "session" ? "session" : null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    const errs = {};
    const em = email.trim();
    if (!em) errs.email = "Enter your email.";
    else if (!EMAIL_RE.test(em)) errs.email = "Enter a valid email address.";
    if (!password) errs.password = "Enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setAlert(null);
    try {
      await login(em, password);
      const from = location.state?.from;
      navigate(from && from !== "/login" ? from : "/", { replace: true });
    } catch (err) {
      const code = errorCode(err);
      if (code === "ACCOUNT_DEACTIVATED") setAlert("deactivated");
      else if (code === "INVALID_CREDENTIALS" || err.response?.status === 401) setAlert("invalid");
      else setAlert({ message: errorMessage(err) }); // includes "too many attempts" (429)
      setPassword("");
      setBusy(false);
    }
  }

  return (
    <AuthShell heading="Pick up where you left off." sub="Your saved dorms, conversations with owners and listings are waiting.">
      <form noValidate onSubmit={onSubmit} aria-busy={busy} className="rise flex w-full max-w-[400px] flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em]">Log in</h1>
          <p className="text-[15px] text-navy">Welcome back to FINDorm.</p>
        </div>

        {alert === "session" && <Alert tone="info" icon={InfoIcon} title="Your session ended. Please log in again." />}
        {alert === "invalid" && <Alert title="Incorrect email or password.">Check both and try again.</Alert>}
        {alert === "deactivated" && (
          <Alert tone="warning" icon={BanIcon} title="This account has been deactivated.">
            You can’t log in while it’s deactivated. Contact the FINDorm team to have it restored.
          </Alert>
        )}
        {alert?.message && <Alert title={alert.message} />}

        <TextField label="Email" type="email" name="email" autoComplete="username" placeholder="you@example.com" value={email}
          onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: undefined })); }} error={errors.email} disabled={busy} />
        <PasswordField label="Password" name="password" autoComplete="current-password" value={password}
          onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: undefined })); }} error={errors.password} disabled={busy} />

        <div className="flex flex-col gap-4">
          <Button type="submit" size="lg" className="w-full !h-11 !text-[15px]" loading={busy}>
            {busy ? "Logging in…" : "Log in"}
          </Button>
          <p className="text-center text-sm text-navy">
            Don’t have an account?{" "}
            <Link to="/register" state={location.state} className="font-medium underline underline-offset-4">Sign up</Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
