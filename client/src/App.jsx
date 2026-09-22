import { useEffect, useState } from "react";
import api from "./lib/api";

/**
 * Placeholder landing page. It exists to prove the front end builds and can
 * reach the API — replace it with the real home page (FR-07 to FR-09).
 */
export default function App() {
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
    api
      .get("/health")
      .then(() => setApiStatus("connected"))
      .catch(() => setApiStatus("unreachable"));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-bold text-slate-900">FINDorm</h1>
        <p className="mt-2 text-slate-600">
          Dormitory and boarding house listings for Metro Manila.
        </p>

        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">API status</p>
          <p className="mt-1 font-medium text-slate-900">
            {apiStatus === "checking" && "Checking…"}
            {apiStatus === "connected" && "Connected to the back end."}
            {apiStatus === "unreachable" &&
              "Cannot reach the back end. Is the server running on port 5000?"}
          </p>
        </div>

        <p className="mt-8 text-sm text-slate-500">
          This is scaffolding. Features are tracked as issues, one per
          functional requirement.
        </p>
      </div>
    </main>
  );
}
