/** One chat message. Mine: right, navy. Theirs: left, gray, name above (FR-12). */
export default function MessageBubble({ isMine, body, time, senderName, showName, fresh = false }) {
  return (
    <div className={`flex flex-col gap-1 ${isMine ? "items-end" : "items-start"} ${fresh ? "msg-in" : ""}`}>
      {!isMine && showName && <span className="px-1 text-xs font-semibold text-steel">{senderName}</span>}
      <div
        className={`max-w-[min(520px,85%)] px-4 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-wrap ${
          isMine ? "rounded-[16px_16px_4px_16px] bg-navy text-white" : "rounded-[16px_16px_16px_4px] bg-[#eef2f6] text-ink"
        }`}
      >
        {body}
      </div>
      <span className="px-1 text-[11px] text-steel tabular-nums">{time}</span>
    </div>
  );
}
