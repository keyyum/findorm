import { AlertCircleIcon, CheckCircleIcon, InfoIcon } from "./Icons";

const STYLES = {
  success: { accent: "#7fd1b2", Icon: CheckCircleIcon, role: "status" },
  error: { accent: "#f19a92", Icon: AlertCircleIcon, role: "alert" },
  info: { accent: "#a8c2dc", Icon: InfoIcon, role: "status" },
};

export default function Toast({ kind = "success", message, leaving = false }) {
  const { accent, Icon, role } = STYLES[kind] || STYLES.success;
  return (
    <div
      role={role}
      data-leaving={leaving}
      className="toast pointer-events-auto flex h-12 max-w-[min(480px,calc(100vw-2rem))] items-center gap-2.5 rounded-xl bg-ink pr-[18px] pl-3.5 text-sm font-medium text-mist shadow-[0_12px_32px_rgba(5,10,24,0.28)]"
    >
      <span aria-hidden="true" className="h-6 w-1 shrink-0 rounded-full" style={{ background: accent }} />
      <Icon size={20} style={{ color: accent }} />
      <span className="truncate">{message}</span>
    </div>
  );
}
