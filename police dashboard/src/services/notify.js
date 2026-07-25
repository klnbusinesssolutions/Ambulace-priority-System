import { toast } from "sonner";

// Centralizes every real-time push notification the dashboard shows (new
// emergencies, driver trip-stage updates). Kept as a thin wrapper around
// sonner's imperative `toast()` API so it can be called from anywhere -
// including the zustand store, outside of any React component - as long as
// <Toaster /> is mounted once in the app (see PoliceLayout).

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

export function notifyNewEmergency(emergency, displayId) {
  const label = displayId ?? emergency.id;
  toast.error(`New emergency · ${label}`, {
    description: [emergency.type ?? "Ambulance", emergency.severity ?? "", emergency.currentRoad]
      .filter(Boolean)
      .join(" · "),
    duration: 8000,
  });
  playChime();
}

export function notifyTripAlert(alert) {
  const variant = alert.severity === "High" || alert.severity === "Critical" ? "warning" : "info";
  const toastFn = variant === "warning" ? toast.warning : toast.info;
  toastFn(alert.title ?? "Trip update", {
    description: alert.description,
    duration: 6000,
  });
  playChime();
}
