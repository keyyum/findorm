import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        {/* Pages get added here as each module is built:
            <Route path="/login" element={<Login />} />        FR-02
            <Route path="/listings" element={<Listings />} />  FR-07 to FR-09
            <Route path="/listings/:id" element={<Listing />} /> FR-10 */}
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
