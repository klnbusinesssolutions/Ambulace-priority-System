// Client-side preference storage for the Settings page. None of these values live in
// Firestore (they're per-browser UI/notification preferences, not operational data), so -
// same pattern as `readNotificationIds`/`notificationsClearedAt` in policeStore.js - they're
// persisted to localStorage. Other parts of the app (notify.js, MapContainer.jsx) read these
// same keys so a change here has a real, immediate effect instead of just being stored.

const NOTIFICATION_PREFS_KEY = "policeDashboard.notificationPreferences";
const MAP_PREFS_KEY = "policeDashboard.mapPreferences";
const DASHBOARD_PREFS_KEY = "policeDashboard.dashboardPreferences";

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  emergencyAlerts: true,
  etaAlerts: true,
  tripCompletion: true,
  sound: true,
  desktop: false,
};

export const DEFAULT_MAP_PREFERENCES = {
  defaultMapType: "roadmap", // "roadmap" | "satellite"
  autoCenterOnActiveEmergency: true,
  trafficLayer: false,
};

export const DEFAULT_DASHBOARD_PREFERENCES = {
  landingPage: "/dashboard",
  autoRefreshSeconds: 15,
  theme: "light", // "light" | "dark"
};

function loadJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can fail (private browsing, quota) - never let it break the UI.
  }
}

export function loadNotificationPreferences() {
  return loadJson(NOTIFICATION_PREFS_KEY, DEFAULT_NOTIFICATION_PREFERENCES);
}
export function saveNotificationPreferences(prefs) {
  saveJson(NOTIFICATION_PREFS_KEY, prefs);
}

export function loadMapPreferences() {
  return loadJson(MAP_PREFS_KEY, DEFAULT_MAP_PREFERENCES);
}
export function saveMapPreferences(prefs) {
  saveJson(MAP_PREFS_KEY, prefs);
}

export function loadDashboardPreferences() {
  return loadJson(DASHBOARD_PREFS_KEY, DEFAULT_DASHBOARD_PREFERENCES);
}
export function saveDashboardPreferences(prefs) {
  saveJson(DASHBOARD_PREFS_KEY, prefs);
}

// Applies the persisted theme choice to the document root so the "dark" Tailwind variant
// (tailwind.config.js has darkMode: ["class"]) is active immediately - including on initial
// page load, not just after visiting Settings. Call once at app startup and again whenever
// the preference changes.
export function applyThemePreference(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}
