import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { router } from "@/routes/router";
import { usePoliceStore } from "@/store/policeStore";
import { applyThemePreference, loadDashboardPreferences } from "@/utils/settingsPreferences";
import "@/index.css";

usePoliceStore.getState().initializeAuth();
applyThemePreference(loadDashboardPreferences().theme);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
