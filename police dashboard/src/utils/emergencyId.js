// Firestore auto-generates a random alphanumeric doc ID for every emergency
// (see hospital-dashboard's emergencyService.createEmergency - it uses
// addDoc, not a custom "EMG001"-style ID). That's fine as a database key,
// but it's not something an officer wants to read off a table. This builds
// a stable, human-readable "EMG-0001" code per emergency instead, numbered
// by creation order (startTime ascending) across the FULL emergency history
// (not just the currently-filtered/live ones) so a given emergency always
// gets the same number no matter which page or filter you're looking at it
// from, and numbers never get reused or shuffled as new emergencies come in.
export function buildEmergencyDisplayIds(emergencies) {
  const chronological = [...emergencies].sort((a, b) => {
    const aTime = a.startTime ? new Date(a.startTime).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.startTime ? new Date(b.startTime).getTime() : Number.POSITIVE_INFINITY;
    if (aTime !== bTime) return aTime - bTime;
    // Stable tiebreaker for same-timestamp docs (or both missing startTime).
    return String(a.id).localeCompare(String(b.id));
  });

  const displayIds = new Map();
  chronological.forEach((emergency, index) => {
    displayIds.set(emergency.id, `EMG-${String(index + 1).padStart(4, "0")}`);
  });

  return displayIds;
}

export function getEmergencyDisplayId(emergency, displayIds) {
  if (!emergency) return "--";
  return displayIds?.get(emergency.id) ?? emergency.id;
}
