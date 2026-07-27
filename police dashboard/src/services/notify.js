import { toast } from "sonner";

import { loadNotificationPreferences } from "@/utils/settingsPreferences";

// Centralizes every real-time push notification the dashboard shows (new
// emergencies, driver trip-stage updates). Kept as a thin wrapper around
// sonner's imperative `toast()` API so it can be called from anywhere -
// including the zustand store, outside of any React component - as long as
// <Toaster /> is mounted once in the app (see PoliceLayout).
//
// Every call reads live from localStorage (via loadNotificationPreferences) rather than
// caching preferences in module state, so a change made on the Settings page takes effect
// on the very next notification without requiring a reload.

function playChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.4);
    oscillator.onended = () => ctx.close();
  } catch {
    // Audio isn't critical - never let it break a notification.
  }
}

function showDesktopNotification(title, body) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (window.Notification.permission !== "granted") return;
  try {
    new window.Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    // Desktop notifications are a nice-to-have - never let it break the in-app toast.
  }
}

export function notifyNewEmergency(emergency, displayId) {
  const prefs = loadNotificationPreferences();
  if (!prefs.emergencyAlerts) return;

  const label = displayId ?? emergency.id;
  const description = [emergency.type ?? "Ambulance", emergency.severity ?? "", emergency.currentRoad]
    .filter(Boolean)
    .join(" · ");

  toast.error(`New emergency · ${label}`, {
    // Stable id keyed to the emergency itself - if this ever gets triggered
    // more than once for the same event (e.g. a snapshot re-firing, or a
    // stray second listener), sonner replaces the existing toast instead of
    // stacking a duplicate one. This is the single source of truth for
    // "one notification per event", independent of whatever upstream code
    // calls this function.
    id: `emergency-${emergency.id}`,
    description,
    duration: 8000,
  });
  if (prefs.sound) playChime();
  if (prefs.desktop) showDesktopNotification(`New emergency · ${label}`, description);
}

// tripStatus values that represent an ETA-relevant milestone vs. a completed trip - see
// tripAlertWatcher.js's TRIP_ALERT_RULES for where these categories come from.
const ETA_ALERT_CATEGORIES = new Set(["Ambulance Stopped", "ETA Below 5 Minutes"]);

export function notifyTripAlert(alert) {
  const prefs = loadNotificationPreferences();
  const isCompletion = alert.category === "Trip Completed";
  const isEta = ETA_ALERT_CATEGORIES.has(alert.category);
  if (isCompletion && !prefs.tripCompletion) return;
  if (isEta && !prefs.etaAlerts) return;
  if (!isCompletion && !isEta && !prefs.emergencyAlerts) return;

  const variant = alert.severity === "High" || alert.severity === "Critical" ? "warning" : "info";
  const toastFn = variant === "warning" ? toast.warning : toast.info;
  toastFn(alert.title ?? "Trip update", {
    // Same dedup strategy as notifyNewEmergency - keyed to the alert's own id.
    id: `trip-alert-${alert.id}`,
    description: alert.description,
    duration: 6000,
  });
  if (prefs.sound) playChime();
  if (prefs.desktop) showDesktopNotification(alert.title ?? "Trip update", alert.description ?? "");
}
