/**
 * Centralized Emergency Lifecycle & Status Management Utility
 * Establishes ONE canonical backend & UI lifecycle for emergency dispatches across AmbuGrid:
 * 
 * 1. reported (Reported)
 * 2. assigned (Assigned)
 * 3. en_route (En Route)
 * 4. arrived (Arrived)
 * 5. completed (Completed)
 */

export const CANONICAL_EMERGENCY_STATUS = {
  reported: "reported",
  assigned: "assigned",
  enRoute: "en_route",
  arrived: "arrived",
  completed: "completed",
};

export const EMERGENCY_STATUS_LABELS = {
  [CANONICAL_EMERGENCY_STATUS.reported]: "Reported",
  [CANONICAL_EMERGENCY_STATUS.assigned]: "Assigned",
  [CANONICAL_EMERGENCY_STATUS.enRoute]: "En Route",
  [CANONICAL_EMERGENCY_STATUS.arrived]: "Arrived",
  [CANONICAL_EMERGENCY_STATUS.completed]: "Completed",
};

export const EMERGENCY_TIMELINE_STAGES = [
  { key: CANONICAL_EMERGENCY_STATUS.reported, label: "Reported", step: 0 },
  { key: CANONICAL_EMERGENCY_STATUS.assigned, label: "Assigned", step: 1 },
  { key: CANONICAL_EMERGENCY_STATUS.enRoute, label: "En Route", step: 2 },
  { key: CANONICAL_EMERGENCY_STATUS.arrived, label: "Arrived", step: 3 },
  { key: CANONICAL_EMERGENCY_STATUS.completed, label: "Completed", step: 4 },
];

/**
 * Safely normalizes any raw or legacy Firestore status string to a canonical emergency status.
 */
export function normalizeEmergencyStatus(rawStatus) {
  if (!rawStatus) return CANONICAL_EMERGENCY_STATUS.reported;
  const s = String(rawStatus).trim().toLowerCase();

  if (s === "reported" || s === "active" || s === "new") {
    return CANONICAL_EMERGENCY_STATUS.reported;
  }
  if (s === "assigned" || s === "accepted") {
    return CANONICAL_EMERGENCY_STATUS.assigned;
  }
  if (s === "en_route" || s === "enroute" || s === "dispatched" || s === "in_progress") {
    return CANONICAL_EMERGENCY_STATUS.enRoute;
  }
  if (s === "arrived" || s === "on_scene" || s === "pickup") {
    return CANONICAL_EMERGENCY_STATUS.arrived;
  }
  if (s === "completed" || s === "resolved" || s === "closed") {
    return CANONICAL_EMERGENCY_STATUS.completed;
  }

  return CANONICAL_EMERGENCY_STATUS.reported;
}

/**
 * Returns true if the emergency is currently active/ongoing (not completed).
 */
export function isEmergencyActive(status) {
  const norm = normalizeEmergencyStatus(status);
  return norm !== CANONICAL_EMERGENCY_STATUS.completed;
}

/**
 * Returns true if the emergency has reached operational completion.
 */
export function isEmergencyCompleted(status) {
  const norm = normalizeEmergencyStatus(status);
  return norm === CANONICAL_EMERGENCY_STATUS.completed;
}

/**
 * Maps an emergency status to its timeline progress step index (0 to 4).
 * Step 4 means all 5 stages (Reported -> Assigned -> En Route -> Arrived -> Completed) are highlighted.
 */
export function getEmergencyTimelineStepIndex(status) {
  const norm = normalizeEmergencyStatus(status);
  switch (norm) {
    case CANONICAL_EMERGENCY_STATUS.reported:
      return 0;
    case CANONICAL_EMERGENCY_STATUS.assigned:
      return 1;
    case CANONICAL_EMERGENCY_STATUS.enRoute:
      return 2;
    case CANONICAL_EMERGENCY_STATUS.arrived:
      return 3;
    case CANONICAL_EMERGENCY_STATUS.completed:
      return 4;
    default:
      return 0;
  }
}
