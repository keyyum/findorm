import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../../lib/api";
import { cap, fullName, initials, shortDate } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { BanIcon, CheckCircleIcon, LockIcon, SearchIcon, WarningIcon } from "../../components/Icons";
import { Avatar, Button, ConfirmDialog, EmptyState, PageTitle, Pagination, SelectField, Skel } from "../../components/ui";

const LIMIT = 12;

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** FR-17 · Manage users: filter, deactivate, reactivate (D-08). No delete. */
export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const role = params.get("role") || "";
  const isActive = params.get("isActive") || "";
  const page = Math.max(1, +params.get("page") || 1);
  const [qDraft, setQDraft] = useState(params.get("q") || "");
  const q = useDebounced(qDraft.trim(), 300);

  const [state, setState] = useState({ status: "loading", data: null, error: "" });
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const setParam = useCallback((patch) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k);
      if (!("page" in patch)) next.delete("page");
      return next;
    }, { replace: true });
  }, [setParams]);

  useEffect(() => {
    if ((params.get("q") || "") !== q) setParam({ q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const load = useCallback(() => {
    let off = false;
    setState((s) => ({ ...s, status: "loading" }));
    const query = { page, limit: LIMIT };
    if (role) query.role = role;
    if (isActive) query.isActive = isActive;
    if (params.get("q")) query.q = params.get("q");
    api
      .get("/admin/users", { params: query })
      .then(({ data }) => !off && setState({ status: "ready", data, error: "" }))
      .catch((err) => !off && setState({ status: "error", data: null, error: errorMessage(err) }));
    return () => { off = true; };
  }, [page, role, isActive, params]);
  useEffect(load, [load]);

  async function changeStatus() {
    const { u, to } = confirm;
    setBusy(true);
    try {
      const { data } = await api.patch(`/admin/users/${u._id}/status`, { isActive: to });
      setState((s) => ({ ...s, data: { ...s.data, items: s.data.items.map((x) => (x._id === u._id ? { ...x, ...data } : x)) } }));
      toast.success(`${fullName(u)} ${to ? "reactivated" : "deactivated"}`);
    } catch (err) {
      toast.error(err.response?.status === 400 ? "Admin accounts can’t be deactivated." : errorMessage(err));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const hasFilters = !!(qDraft || role || isActive);
  const clear = () => { setQDraft(""); setParams({}, { replace: true }); };
  const items = state.data?.items || [];
  const th = "h-11 px-4 text-left text-xs font-semibold text-steel border-b border-line";
  const td = "px-4 border-b border-haze";

  return (
    <div>
      <PageTitle title="Users" sub={state.data ? `${state.data.total} ${state.data.total === 1 ? "user" : "users"}${hasFilters ? " match" : ""}` : " "} />

      <div role="search" aria-label="Filter users" className="mt-6 flex items-end gap-3">
        <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-steel">
          Search
          <span className="relative">
            <SearchIcon size={18} className="absolute top-[11px] left-3" />
            <input type="search" value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder="Search name or email" maxLength={100}
              className="h-10 w-full rounded-md border border-sky bg-white pr-3 pl-10 text-sm text-ink placeholder:text-[#7f9cbc] hover:border-navy" />
          </span>
        </label>
        <SelectField label="Role" className="w-[170px] [&_label]:text-xs [&_label]:text-steel" selectClassName="!h-10 !text-sm" value={role} onChange={(e) => setParam({ role: e.target.value })}
          placeholder="All roles" options={[{ value: "seeker", label: "Seeker" }, { value: "owner", label: "Owner" }, { value: "admin", label: "Admin" }]} />
        <SelectField label="Status" className="w-[170px] [&_label]:text-xs [&_label]:text-steel" selectClassName="!h-10 !text-sm" value={isActive} onChange={(e) => setParam({ isActive: e.target.value })}
          placeholder="All statuses" options={[{ value: "true", label: "Active" }, { value: "false", label: "Deactivated" }]} />
        {hasFilters && <Button variant="ghost" className="!h-10" onClick={clear}>Clear filters</Button>}
      </div>

      <div className="mt-5 overflow-hidden rounded-[14px] border border-line bg-white">
        {state.status === "error" ? (
          <div className="p-6"><EmptyState icon={WarningIcon} title="Couldn’t load users" dashed={false} action={<Button variant="ghost" onClick={load}>Try again</Button>}>{state.error}</EmptyState></div>
        ) : state.status === "ready" && items.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={SearchIcon} title="No users match these filters" dashed={false} action={hasFilters && <Button variant="ghost" onClick={clear}>Clear filters</Button>}>
              Try a different name or email, or clear the filters.
            </EmptyState>
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup><col /><col className="w-[27%]" /><col className="w-[124px]" /><col className="w-[80px]" /><col className="w-[124px]" /><col className="w-[84px]" /><col className="w-[136px]" /></colgroup>
            <thead className="bg-page">
              <tr>
                <th scope="col" className={`${th} pl-5`}>Name</th><th scope="col" className={th}>Email</th><th scope="col" className={th}>Phone</th>
                <th scope="col" className={th}>Role</th><th scope="col" className={th}>Status</th><th scope="col" className={th}>Joined</th>
                <th scope="col" className={`${th} pr-5 text-right`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {state.status === "loading"
                ? Array.from({ length: 8 }, (_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }, (_, j) => <td key={j} className={`${td} h-[60px]`}><Skel className="h-3.5 w-3/4" /></td>)}</tr>
                  ))
                : items.map((u) => {
                    const admin = u.role === "admin";
                    const dim = u.isActive ? "" : "opacity-55";
                    return (
                      <tr key={u._id} className="hover:bg-[#f9fbfe]">
                        <td className={`${td} h-[60px] pl-5 ${dim}`}>
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Avatar text={initials(u)} size={32} dark={admin} />
                            <span className="truncate font-semibold">{fullName(u)}</span>
                            {u._id === me._id && <span className="shrink-0 rounded-full bg-haze px-1.5 text-[11px] font-semibold text-navy">You</span>}
                          </div>
                        </td>
                        <td className={`${td} truncate text-navy ${dim}`} title={u.email}>{u.email}</td>
                        <td className={`${td} text-navy tabular-nums ${dim}`}>{u.phone || "—"}</td>
                        <td className={`${td} text-navy ${dim}`}>{cap(u.role)}</td>
                        <td className={td}>
                          <span className={`inline-flex items-center gap-1.5 rounded-full py-[3px] pr-2.5 pl-2 text-xs font-semibold ${u.isActive ? "bg-success-bg text-success" : "bg-[#eceff3] text-[#5b6b7f]"}`}>
                            <span aria-hidden="true" className={`h-[7px] w-[7px] rounded-full ${u.isActive ? "bg-[#1f9d74]" : "bg-[#8a97a8]"}`} />
                            {u.isActive ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className={`${td} text-steel tabular-nums ${dim}`}>{shortDate(u.createdAt)}</td>
                        <td className={`${td} pr-5 text-right`}>
                          {admin ? (
                            <span title="Admin accounts can’t be deactivated" aria-label="Admin accounts can’t be deactivated" tabIndex={0} className="inline-flex h-[34px] w-[34px] cursor-help items-center justify-center rounded-lg text-[#7f9cbc]">
                              <LockIcon size={18} />
                            </span>
                          ) : u.isActive ? (
                            <Button variant="dangerGhost" size="sm" onClick={() => setConfirm({ u, to: false })}>Deactivate</Button>
                          ) : (
                            <Button variant="successGhost" size="sm" onClick={() => setConfirm({ u, to: true })}>Reactivate</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        )}
        {state.status === "ready" && items.length > 0 && (
          <div className="border-t border-haze px-5 py-3.5">
            <Pagination page={state.data.page} totalPages={state.data.totalPages} total={state.data.total} limit={state.data.limit} onChange={(p) => setParam({ page: String(p) })} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        tone={confirm?.to ? "success" : "danger"}
        icon={confirm?.to ? CheckCircleIcon : BanIcon}
        title={`${confirm?.to ? "Reactivate" : "Deactivate"} ${fullName(confirm?.u)}?`}
        confirmLabel={confirm?.to ? "Reactivate" : "Deactivate"}
        busyLabel={confirm?.to ? "Reactivating…" : "Deactivating…"}
        busy={busy}
        onConfirm={changeStatus}
        onCancel={() => setConfirm(null)}
      >
        {confirm?.to
          ? "They’ll be able to log in again."
          : "They’ll be logged out and won’t be able to log in. Their listings, requests and messages are kept."}
      </ConfirmDialog>
    </div>
  );
}
