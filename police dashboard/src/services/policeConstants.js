import { isWithinRadius } from "@/utils/geo";

export const alertCategories = [
  "Emergency Started",
  "Traffic Congestion",
  "Ambulance Stopped",
  "Route Deviation",
  "ETA Below 5 Minutes",
  "Hospital Arrival",
  "Trip Completed",
];

// Lower number = shown first. Anything unrecognized sorts last, not first,
// so a bad/missing severity value never jumps the queue ahead of real Critical cases.
export const SEVERITY_ORDER = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function severityRank(severity) {
  const rank = SEVERITY_ORDER[String(severity ?? "").toLowerCase()];
  return rank ?? 99;
}

// Critical-first everywhere; ties broken by most-recently-updated first.
export function sortEmergenciesBySeverity(emergencies) {
  return [...emergencies].sort((a, b) => {
    const rankDiff = severityRank(a.severity) - severityRank(b.severity);
    if (rankDiff !== 0) return rankDiff;

    const aTime = new Date(a.lastUpdated ?? 0).getTime();
    const bTime = new Date(b.lastUpdated ?? 0).getTime();
    return bTime - aTime;
  });
}

export const emptySystemStatus = {
  gpsSync: "Waiting",
  firestoreConnection: "Connecting",
  activeAmbulances: 0,
  onlineUnits: 0,
  serviceHealth: "Waiting",
  lastHeartbeat: null,
};

export const emptyAnalytics = {
  tripsToday: 0,
  completedTripsToday: 0,
  averageEta: 0,
  averageResponseTime: 0,
  completionRate: 0,
  tripsThisWeek: [],
  priorityDistribution: [],
  tripsPerHospital: [],
  peakEmergencyHours: [],
};

export const DEFAULT_SERVICE_RADIUS_KM = 10;

// A trip is "live" until it reaches one of these terminal states. Used to
// keep the Active Emergencies queue and Live Tracking map limited to trips
// that are actually still in progress - completed/resolved/rejected/cancelled
// emergencies stay visible in the Activity Feed's full history, just not here.
const TERMINAL_EMERGENCY_STATUSES = new Set(["completed", "resolved", "rejected", "cancelled"]);

export function isLiveEmergency(emergency) {
  return !TERMINAL_EMERGENCY_STATUSES.has(String(emergency?.status ?? "").toLowerCase());
}

// Keeps an officer scoped to their own police station's patrol area by
// default; cityWide=true (the map/table toggle) bypasses this entirely.
export function filterByStationArea(items, { station, radiusKm, cityWide }, getCoordinates) {
  if (cityWide || !station?.lat || !station?.lng) return items;

  return items.filter((item) => {
    const point = getCoordinates(item);
    if (!point) return false;
    return isWithinRadius(point, station, radiusKm ?? DEFAULT_SERVICE_RADIUS_KM);
  });
}
