const STYLES = {
  Pending: "bg-warning-bg text-warning",
  Accepted: "bg-success-bg text-success",
  Rejected: "bg-[#eceff3] text-[#5b6b7f]",
};
const DOTS = { Pending: "#c28a12", Accepted: "#1f9d74", Rejected: "#8a97a8" };

/** Reservation status: Pending, Accepted, or Rejected (FR-15). */
export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full py-[3px] pr-2.5 pl-2 text-xs font-semibold ${STYLES[status] || STYLES.Rejected}`}>
      <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full" style={{ background: DOTS[status] || DOTS.Rejected }} />
      {status}
    </span>
  );
}
