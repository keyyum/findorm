import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { errorMessage } from "../lib/api";
import { LIMITS } from "../lib/constants";
import { dayLabel, fullName, timeOfDay } from "../lib/format";
import { useAuth } from "../context/AuthContext";
import MessageBubble from "../components/MessageBubble";
import { ChatIcon, ChevronLeftIcon, RefreshIcon, SendIcon, WarningIcon } from "../components/Icons";
import { Button, EmptyState, Skel, Spinner } from "../components/ui";
import { Page } from "../components/Layout";
import { senderId } from "./Inbox";

/** FR-12 · One conversation. Not real-time: Refresh or reopen for new messages (D-07). */
export default function Thread() {
  const { id } = useParams();
  const { user } = useAuth();
  const [state, setState] = useState({ status: "loading", thread: null, error: "" });
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [sentId, setSentId] = useState(null);
  const scrollRef = useRef(null);
  const taRef = useRef(null);

  const load = useCallback((isRefresh) => {
    let off = false;
    if (isRefresh) setRefreshing(true);
    else setState({ status: "loading", thread: null, error: "" });
    api
      .get(`/inquiries/${id}`)
      .then(({ data }) => !off && setState({ status: "ready", thread: data, error: "" }))
      .catch((err) => {
        if (off) return;
        if ([404, 400, 403].includes(err.response?.status)) setState({ status: "notfound" });
        else if (!isRefresh) setState({ status: "error", error: errorMessage(err) });
      })
      .finally(() => !off && setRefreshing(false));
    return () => { off = true; };
  }, [id]);
  useEffect(() => load(false), [load]);

  const count = state.thread?.messages?.length || 0;
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, state.status]);

  // Autogrow up to 6 lines.
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 6 * 24 + 20) + "px";
  }, [body]);

  const trimmed = body.trim();
  const tooLong = body.length > LIMITS.messageBody;
  const canSend = !!trimmed && !tooLong && !sending;

  async function send(e) {
    e?.preventDefault();
    if (!canSend) return;
    setSending(true);
    setSendError("");
    try {
      const { data } = await api.post(`/inquiries/${id}/messages`, { body: trimmed });
      setState((s) => ({ ...s, thread: data }));
      setSentId(data.messages?.[data.messages.length - 1]?._id ?? null);
      setBody("");
    } catch (err) {
      if (err.response?.status === 404) setState({ status: "notfound" });
      else setSendError("Couldn’t send. Try again.");
    } finally {
      setSending(false);
      taRef.current?.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  if (state.status === "notfound")
    return (
      <Page width={880}>
        <EmptyState icon={ChatIcon} title="Conversation not found"
          action={<Link to="/inquiries" className="press inline-flex h-12 items-center rounded-xl bg-navy px-6 text-[15px] font-medium text-white hover:bg-navy-900">Back to inquiries</Link>}>
          This conversation doesn’t exist or you don’t have access to it.
        </EmptyState>
      </Page>
    );
  if (state.status === "error")
    return (
      <Page width={880}>
        <EmptyState icon={WarningIcon} title="Couldn’t load this conversation" action={<Button variant="ghost" onClick={() => load(false)}>Try again</Button>}>{state.error}</EmptyState>
      </Page>
    );

  const t = state.thread;
  const isSeeker = t && senderId(t.seeker) === user._id;
  const other = t ? (isSeeker ? t.owner : t.seeker) : null;
  const nameOf = (sid) => (t && sid === senderId(t.seeker) ? fullName(t.seeker) : fullName(t?.owner));

  return (
    <div className="flex h-[calc(100dvh-72px)] min-h-[560px] flex-col">
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[928px] items-center justify-between gap-4 px-6 py-4 max-sm:px-4 max-sm:py-3">
          <div className="flex min-w-0 flex-col gap-1">
            <Link to="/inquiries" className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-navy hover:underline">
              <ChevronLeftIcon size={14} /> Back to inquiries
            </Link>
            {t ? (
              <>
                <Link to={`/listings/${t.listing?._id}`} className="truncate text-xl font-semibold tracking-tight hover:underline">{t.listing?.name}</Link>
                <span className="text-sm text-steel">Conversation with {fullName(other)}</span>
              </>
            ) : (
              <><Skel className="mt-1 h-6 w-64" /><Skel className="h-4 w-44" /></>
            )}
          </div>
          <Button variant="ghost" onClick={() => load(true)} disabled={!t || refreshing}>
            {refreshing ? <Spinner /> : <RefreshIcon size={16} />} Refresh
          </Button>
        </div>
      </div>

      <div ref={scrollRef} id="thread-scroll" className="flex-1 overflow-y-auto" aria-live="polite">
        <div className="mx-auto flex max-w-[928px] flex-col gap-3 px-6 py-6 max-sm:px-4 max-sm:py-4">
          {!t ? (
            <div aria-busy="true" className="flex flex-col gap-4">
              <Skel className="h-14 w-80 max-w-full !rounded-2xl" /><Skel className="ml-auto h-14 w-72 !rounded-2xl" /><Skel className="h-20 w-96 max-w-full !rounded-2xl" />
            </div>
          ) : (
            t.messages.map((m, i) => {
              const sid = senderId(m.sender);
              const prev = t.messages[i - 1];
              const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
              const firstOfRun = newDay || senderId(prev.sender) !== sid;
              return (
                <div key={m._id || i} className="fade flex flex-col gap-3">
                  {newDay && (
                    <div className="my-2 flex items-center gap-3 text-xs font-medium text-steel">
                      <span className="h-px flex-1 bg-line" />{dayLabel(m.createdAt)}<span className="h-px flex-1 bg-line" />
                    </div>
                  )}
                  <MessageBubble fresh={!!m._id && m._id === sentId} isMine={sid === user._id} body={m.body} time={timeOfDay(m.createdAt)} senderName={nameOf(sid)} showName={firstOfRun} />
                </div>
              );
            })
          )}
        </div>
      </div>

      <form onSubmit={send} className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-[928px] flex-col gap-2 px-6 py-4 max-sm:px-4 max-sm:py-3">
          {sendError && (
            <p role="alert" className="flex items-center gap-1.5 text-[13px] text-danger"><WarningIcon size={14} /> {sendError}</p>
          )}
          <div className="flex items-end gap-3">
            <label htmlFor="reply" className="sr-only">Reply</label>
            <textarea
              id="reply"
              ref={taRef}
              rows={1}
              value={body}
              onChange={(e) => { setBody(e.target.value); setSendError(""); }}
              onKeyDown={onKeyDown}
              disabled={!t}
              placeholder="Write a reply…"
              aria-describedby="reply-count"
              className={`max-h-[164px] min-h-[46px] flex-1 resize-none rounded-xl border bg-white px-4 py-2.5 text-[15px] leading-6 text-ink placeholder:text-[#7f9cbc] ${tooLong ? "border-danger" : "border-sky hover:border-navy"}`}
            />
            <Button type="submit" size="lg" className="!h-[46px]" disabled={!canSend} loading={sending}>
              {!sending && <SendIcon size={18} />} {sending ? "Sending" : "Send"}
            </Button>
          </div>
          <div className="flex justify-between text-xs text-steel max-sm:justify-end">
            <span className="max-sm:hidden">Enter to send · Shift+Enter for a new line</span>
            <span id="reply-count" className={`tabular-nums ${tooLong ? "font-medium text-danger" : ""}`}>{body.length} / {LIMITS.messageBody}</span>
          </div>
        </div>
      </form>
    </div>
  );
}
