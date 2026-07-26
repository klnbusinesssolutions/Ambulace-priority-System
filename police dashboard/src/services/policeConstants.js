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

// Granular lifecycle stages police care about. Every active (non-terminal)
// emergency classifies into exactly one of these - drives the Active
// Emergencies count, the Ambulances En Route count, and stage badges.
export const EMERGENCY_STAGE_LABELS = {
  pending_assignment: "Pending Assignment",
  ambulance_assigned: "Ambulance Assigned",
  en_route_to_patient: "Driver En Route to Patient",
  driver_arrived: "Driver Arrived",
  patient_on_board: "Patient On Board",
  en_route_to_hospital: "En Route to Hospital",
  hospital_arrival: "Hospital Arrival",
};

const ACTIVE_STAGE_KEYS = new Set(Object.keys(EMERGENCY_STAGE_LABELS));

// A trip is terminal (no longer "live") once it reaches one of these states.
const TERMINAL_EMERGENCY_STATUSES = new Set(["completed", "resolved", "rejected", "cancelled", "closed"]);

// Driver app writes tripStatus onto drivers/{driverId} as: going_to_patient ->
// reached_patient -> patient_onboard -> near_hospital -> trip_completed (see
// tripAlertWatcher.js / emergencyEnrichment.js). Maps each onto the granular
// stage police should see.
const TRIP_STATUS_TO_STAGE = {
  going_to_patient: "en_route_to_patient",
  reached_patient: "driver_arrived",
  patient_onboard: "en_route_to_hospital",
  near_hospital: "hospital_arrival",
  trip_completed: "hospital_arrival",
};

// Classifies an enriched emergency (status from the emergencies doc, tripStatus
// joined on from the assigned driver's doc - see emergencyEnrichment.js) into
// one lifecycle stage key, or a terminal status string once no longer active.
export function getEmergencyStage(emergency) {
  const rawStatus = String(emergency?.status ?? "").toLowerCase();
  if (rawStatus === "completed" || rawStatus === "resolved") return "completed";
  if (TERMINAL_EMERGENCY_STATUSES.has(rawStatus)) return rawStatus;

  const tripStatus = emergency?.tripStatus;
  if (tripStatus && TRIP_STATUS_TO_STAGE[tripStatus]) return TRIP_STATUS_TO_STAGE[tripStatus];

  if (emergency?.driverId || emergency?.ambulanceId) return "ambulance_assigned";
  return "pending_assignment";
}

export function getEmergencyStageLabel(emergency) {
  return EMERGENCY_STAGE_LABELS[getEmergencyStage(emergency)] ?? emergency?.status ?? "Unknown";
}

export function isLiveEmergency(emergency) {
  return ACTIVE_STAGE_KEYS.has(getEmergencyStage(emergency));
}

// "Ambulance actually rolling" - assigned and past the pending-assignment
// stage. Used for the "Ambulances En Route" KPI.
export function isAmbulanceEnRoute(emergency) {
  const stage = getEmergencyStage(emergency);
  return ACTIVE_STAGE_KEYS.has(stage) && stage !== "pending_assignment";
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
