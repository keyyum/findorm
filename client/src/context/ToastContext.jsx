import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Toast from "../components/Toast";

const ToastContext = createContext(null);

/** One shared toast for every "Saved" / "Deleted" message. Auto-hides after 3s. */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();

  const show = useCallback((kind, message) => {
    clearTimeout(timer.current);
    setToast({ kind, message, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const api = useMemo(
    () => ({
      success: (m) => show("success", m),
      error: (m) => show("error", m),
      info: (m) => show("info", m),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-8 bottom-8 z-50">
        {toast && <Toast key={toast.id} kind={toast.kind} message={toast.message} />}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
