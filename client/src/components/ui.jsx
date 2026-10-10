import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, EyeClosedIcon, EyeIcon, WarningIcon } from "./Icons";

/* ---------- Buttons ---------- */

const BTN = {
  primary: "bg-navy text-white hover:bg-navy-900 disabled:bg-line disabled:text-sky",
  ghost: "border border-sky-300 bg-white text-navy hover:bg-haze",
  danger: "bg-danger-strong text-white hover:bg-[#8f1c13]",
  dangerGhost: "border border-[#e4b3af] bg-white text-danger hover:bg-[#fbeceb]",
  successGhost: "border border-[#9fd6c2] bg-white text-success hover:bg-[#e3f5ee]",
  quiet: "text-navy hover:bg-haze",
};
const SIZE = { sm: "h-[34px] px-3 text-[13px] rounded-lg", md: "h-[42px] px-[18px] text-sm rounded-[10px]", lg: "h-12 px-6 text-[15px] rounded-xl" };

export function Button({ variant = "primary", size = "md", loading = false, className = "", children, disabled, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`press inline-flex items-center justify-center gap-2 font-medium disabled:cursor-not-allowed ${SIZE[size]} ${BTN[variant]} ${className}`}
      {...rest}
    >
      {loading && <Spinner light={variant === "primary" || variant === "danger"} />}
      {children}
    </button>
  );
}

export function Spinner({ light = false, size = 14 }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block animate-spin rounded-full border-2"
      style={{
        width: size,
        height: size,
        borderColor: light ? "rgba(255,255,255,.35)" : "#c9dcef",
        borderTopColor: light ? "#fff" : "#243a5a",
      }}
    />
  );
}

/* ---------- Form fields ---------- */

export function FieldError({ id, children }) {
  if (!children) return null;
  return (
    <span id={id} className="flex items-center gap-1 text-[13px] leading-snug text-danger">
      <WarningIcon size={14} />
      <span>{children}</span>
    </span>
  );
}

const inputCls = (bad) =>
  `h-[42px] w-full rounded-md border bg-white px-3 text-[15px] text-ink transition-colors placeholder:text-hint disabled:bg-page ${
    bad ? "border-danger" : "border-sky hover:border-navy"
  }`;

export function TextField({ label, error, hint, optional, required, className = "", inputClassName = "", id: idProp, ...rest }) {
  const auto = useId();
  const id = idProp || auto;
  const msg = `${id}-msg`;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm leading-tight font-medium">
          {label}
          {required && <span className="text-danger"> *</span>}
          {optional && <span className="font-normal text-steel"> (optional)</span>}
        </label>
      )}
      <input id={id} aria-invalid={!!error} aria-describedby={error || hint ? msg : undefined} className={`${inputCls(error)} ${inputClassName}`} {...rest} />
      {error ? <FieldError id={msg}>{error}</FieldError> : hint ? <span id={msg} className="text-[13px] text-steel">{hint}</span> : null}
    </div>
  );
}

export function PasswordField({ label, error, hint, id: idProp, className = "", ...rest }) {
  const auto = useId();
  const id = idProp || auto;
  const msg = `${id}-msg`;
  const [shown, setShown] = useState(false);
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm leading-tight font-medium">{label}</label>
      <div className="relative">
        <input id={id} type={shown ? "text" : "password"} aria-invalid={!!error} aria-describedby={error || hint ? msg : undefined} className={`${inputCls(error)} pr-12`} {...rest} />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={`${shown ? "Hide" : "Show"} ${String(label).toLowerCase()}`}
          aria-pressed={shown}
          className="press absolute top-[3px] right-[3px] flex h-9 w-9 items-center justify-center rounded-md text-steel hover:bg-haze hover:text-ink"
        >
          {shown ? <EyeClosedIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>
      {error ? <FieldError id={msg}>{error}</FieldError> : hint ? <span id={msg} className="text-[13px] text-steel">{hint}</span> : null}
    </div>
  );
}

export function SelectField({ label, error, options, required, className = "", selectClassName = "", id: idProp, placeholder, ...rest }) {
  const auto = useId();
  const id = idProp || auto;
  const msg = `${id}-msg`;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm leading-tight font-medium">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      <div className="relative">
        <select id={id} aria-invalid={!!error} aria-describedby={error ? msg : undefined} className={`${inputCls(error)} appearance-none pr-9 ${selectClassName}`} {...rest}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => {
            const v = typeof o === "string" ? o : o.value;
            const l = typeof o === "string" ? o : o.label;
            return <option key={v} value={v}>{l}</option>;
          })}
        </select>
        <ChevronDownIcon size={16} className="pointer-events-none absolute top-[13px] right-3 text-steel" />
      </div>
      <FieldError id={msg}>{error}</FieldError>
    </div>
  );
}

export function TextArea({ label, error, hint, optional, maxLength, value = "", className = "", id: idProp, rows = 4, ...rest }) {
  const auto = useId();
  const id = idProp || auto;
  const msg = `${id}-msg`;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm leading-tight font-medium">
          {label}
          {optional && <span className="font-normal text-steel"> (optional)</span>}
        </label>
        {maxLength && (
          <span className={`text-xs tabular-nums ${value.length > maxLength ? "text-danger" : "text-steel"}`}>
            {value.length} / {maxLength}
          </span>
        )}
      </div>
      <textarea
        id={id}
        rows={rows}
        value={value}
        aria-invalid={!!error}
        aria-describedby={error || hint ? msg : undefined}
        className={`w-full resize-y rounded-md border bg-white px-3 py-2.5 text-[15px] leading-relaxed text-ink transition-colors placeholder:text-hint ${error ? "border-danger" : "border-sky hover:border-navy"}`}
        {...rest}
      />
      {error ? <FieldError id={msg}>{error}</FieldError> : hint ? <span id={msg} className="text-[13px] text-steel">{hint}</span> : null}
    </div>
  );
}

/* ---------- Feedback ---------- */

export function Alert({ tone = "danger", title, children, icon: Icon = WarningIcon }) {
  const tones = {
    danger: "bg-danger-bg border-danger text-danger",
    warning: "bg-warning-bg border-warning text-warning",
    info: "bg-haze border-sky text-navy",
    success: "bg-success-bg border-success text-success",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`rise flex gap-3 rounded-[10px] border px-4 py-3.5 ${tones[tone]}`}>
      <Icon size={20} className="mt-px" />
      <div className="flex flex-col gap-0.5">
        {title && <span className="text-[15px] leading-snug font-semibold">{title}</span>}
        {children && <span className="text-sm leading-normal text-navy">{children}</span>}
      </div>
    </div>
  );
}

export function Skel({ className = "", style }) {
  return <span aria-hidden="true" className={`skel block rounded-md ${className}`} style={style} />;
}

export function EmptyState({ icon: Icon, title, children, action, dashed = true }) {
  return (
    <div
      role="status"
      className={`fade flex flex-col items-center justify-center gap-3.5 rounded-[14px] bg-white px-10 py-16 text-center max-sm:px-5 max-sm:py-12 ${dashed ? "border border-dashed border-sky-300" : "border border-line"}`}
    >
      {Icon && (
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-haze text-navy">
          <Icon size={30} />
        </span>
      )}
      <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
      {children && <p className="max-w-[460px] text-[15px] leading-relaxed text-steel">{children}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

export function PageTitle({ title, sub, children }) {
  return (
    <div className="flex items-end justify-between gap-4 max-sm:flex-col max-sm:items-start">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.02em] max-sm:text-[26px]">{title}</h1>
        {sub && <p className="text-[15px] text-steel">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}

/* ---------- Motion ---------- */

/**
 * Staggers the first batch of rows a page shows. Later batches (a filter, a tab,
 * a refresh) get no entrance, because those happen many times per visit.
 * Usage: const stagger = useStagger(state.status); <li {...stagger(i, "flex ...")} />
 */
export function useStagger(status, enabled = true) {
  const seenReady = useRef(false);
  const firstBatch = useRef(true);
  if (status === "ready") seenReady.current = true;
  else if (seenReady.current) firstBatch.current = false;
  const on = enabled && firstBatch.current;
  return (i, className = "") => (on ? { className: `rise ${className}`, style: { "--i": Math.min(i, 8) } } : { className });
}

/* ---------- Pagination ---------- */

export function Pagination({ page, totalPages, onChange, total, limit }) {
  if (!totalPages || totalPages <= 1) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  // Compact page list: 1 … p-1 p p+1 … last
  const nums = [];
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - page) <= 1) nums.push(n);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  const base = "press flex h-[34px] min-w-[34px] items-center justify-center rounded-lg border px-2 text-[13px] font-semibold";
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[13px] text-steel tabular-nums">Showing {from}–{to} of {total}</span>
      <nav aria-label="Pagination" className="flex items-center gap-1.5">
        <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className={`${base} border-[#c9dcef] bg-white text-navy hover:border-navy disabled:opacity-40 disabled:hover:border-[#c9dcef]`}>
          <ChevronLeftIcon size={16} />
        </button>
        {nums.map((n, i) =>
          n === "…" ? (
            <span key={`e${i}`} className="px-1 text-steel">…</span>
          ) : (
            <button
              key={n}
              type="button"
              aria-current={n === page ? "page" : undefined}
              onClick={() => onChange(n)}
              className={`${base} ${n === page ? "border-navy bg-navy text-white" : "border-[#c9dcef] bg-white text-navy hover:border-navy"}`}
            >
              {n}
            </button>
          )
        )}
        <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className={`${base} border-[#c9dcef] bg-white text-navy hover:border-navy disabled:opacity-40 disabled:hover:border-[#c9dcef]`}>
          <ChevronRightIcon size={16} />
        </button>
      </nav>
    </div>
  );
}

/* ---------- Modal ---------- */

/** True while `open`, and for `ms` afterwards so an exit transition can finish. */
export function usePresence(open, ms) {
  const [lingering, setLingering] = useState(false);
  useEffect(() => {
    if (open) {
      setLingering(true);
      return;
    }
    const t = setTimeout(() => setLingering(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return open || lingering;
}

/**
 * Confirmation dialog. Esc and the backdrop cancel (unless busy). Focus moves
 * to the dialog on open and back to the trigger on close.
 */
export function ConfirmDialog(props) {
  const { open, busy, onConfirm, onCancel } = props;
  // Callers clear their state on close, so render the closing dialog from the last open props.
  const shown = useRef(props);
  if (open) shown.current = props;
  const { title, children, icon: Icon, tone = "danger", confirmLabel, busyLabel } = shown.current;
  const present = usePresence(open, 150); // matches the .dialog exit in index.css
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    ref.current?.querySelector("[data-autofocus]")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll("button:not(:disabled)");
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!present) return null;
  const toneCls = { danger: "bg-danger-bg text-danger", success: "bg-success-bg text-success", info: "bg-haze text-navy" }[tone];
  const btnVariant = tone === "danger" ? "danger" : "primary";
  return (
    <div className={`fixed inset-0 z-40 flex items-center justify-center p-4 ${open ? "" : "pointer-events-none"}`}>
      <div aria-hidden="true" data-open={open} className="dialog-backdrop absolute inset-0 bg-[rgba(5,10,24,0.55)]" onClick={() => !busy && onCancel()} />
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-body" data-open={open} inert={!open} className="dialog relative flex w-full max-w-[500px] flex-col gap-5 rounded-2xl bg-white p-7 shadow-[0_32px_64px_-20px_rgba(5,10,24,0.45)]">
        {Icon && (
          <span className={`flex h-12 w-12 items-center justify-center rounded-full ${toneCls}`}>
            <Icon size={24} />
          </span>
        )}
        <div className="flex flex-col gap-2">
          <h2 id="dlg-title" className="text-xl leading-snug font-semibold tracking-tight">{title}</h2>
          <div id="dlg-body" className="text-[15px] leading-relaxed text-navy">{children}</div>
        </div>
        <div className="flex justify-end gap-2.5">
          <Button variant="ghost" size="lg" className="!h-11 !px-[18px]" onClick={onCancel} disabled={busy} data-autofocus>
            Cancel
          </Button>
          <Button
            variant={btnVariant}
            size="lg"
            className={`!h-11 !px-5 ${tone === "success" ? "!bg-success hover:!bg-[#115040]" : ""}`}
            onClick={onConfirm}
            loading={busy}
          >
            {busy ? busyLabel || confirmLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Badges ---------- */

export function FullBadge({ className = "" }) {
  return <span className={`inline-flex items-center rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-semibold text-warning ${className}`}>Full</span>;
}

export function Avatar({ text, size = 36, dark = false, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${dark ? "bg-navy text-white" : "bg-haze text-navy"} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {text}
    </span>
  );
}
