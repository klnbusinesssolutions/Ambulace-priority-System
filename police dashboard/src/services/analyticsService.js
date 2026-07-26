import { getEmergencyStage, isLiveEmergency } from "@/services/policeConstants";

// Trips whose status makes them unfit for analytics entirely - a cancelled/rejected
// request never became a real trip, so it shouldn't count toward volume, completion
// rate, response time, or any of the distribution charts below.
const INVALID_STATUSES = new Set(["cancelled", "rejected"]);

function isValidForAnalytics(emergency) {
  const status = String(emergency?.status ?? "").toLowerCase();
  return !INVALID_STATUSES.has(status);
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Ambulance-priority-system severities (Critical/High/Medium/Low, or a raw
// red/yellow/green priority field) bucket into the three-tier triage colors
// police care about on this chart.
function priorityBucket(emergency) {
  const raw = String(emergency?.severity ?? emergency?.priority ?? "").toLowerCase();
  if (["red", "critical", "high"].includes(raw)) return "Red";
  if (["yellow", "medium"].includes(raw)) return "Yellow";
  if (["green", "low"].includes(raw)) return "Green";
  return null;
}

/**
 * Derives every Trip Analytics metric straight from the live collections already
 * streaming into the store (`emergencies` + `activityFeed`, both real-time Firestore
 * listeners - see policeStore.js `subscribeToLiveData`). No separate analytics doc,
 * no hardcoded values - every number here is recomputed whenever its inputs change.
 */
export function computeAnalytics({ emergencies = [], activityFeed = [] } = {}) {
  const validEmergencies = emergencies.filter(isValidForAnalytics);
  const now = new Date();

  // Earliest "arrived at patient" timestamp per trip, from the trip-milestone
  // activity log (tripAlertWatcher.js writes a "trip_reached_patient" entry the
  // moment the driver taps "Reached Patient").
  const reachedPatientAtByTripId = new Map();
  activityFeed.forEach((item) => {
    if (item.type !== "trip_reached_patient" || !item.tripId) return;
    const timestamp = toDate(item.timestamp);
    if (!timestamp) return;
    const existing = reachedPatientAtByTripId.get(item.tripId);
    if (!existing || timestamp < existing) reachedPatientAtByTripId.set(item.tripId, timestamp);
  });

  // ---- Trips Today: completed trips whose completion fell today ----
  const completedToday = validEmergencies.filter((emergency) => {
    if (getEmergencyStage(emergency) !== "completed") return false;
    const completedAt = toDate(emergency.lastUpdated ?? emergency.startedAt);
    return completedAt && isSameDay(completedAt, now);
  });
  const tripsToday = completedToday.length;

  // ---- Average ETA across every currently active emergency ----
  const etaValues = validEmergencies
    .filter(isLiveEmergency)
    .map((emergency) => parseInt(emergency.eta, 10))
    .filter((value) => !Number.isNaN(value));
  const averageEta = etaValues.length
    ? Math.round(etaValues.reduce((sum, value) => sum + value, 0) / etaValues.length)
    : 0;

  // ---- Average Response Time: emergency creation -> ambulance reaching the patient ----
  const responseTimesMinutes = [];
  validEmergencies.forEach((emergency) => {
    const createdAt = toDate(emergency.startedAt);
    const reachedAt = reachedPatientAtByTripId.get(emergency.id);
    if (!createdAt || !reachedAt) return;
    const diffMinutes = (reachedAt.getTime() - createdAt.getTime()) / 60000;
    if (diffMinutes >= 0) responseTimesMinutes.push(diffMinutes);
  });
  const averageResponseTime = responseTimesMinutes.length
    ? Math.round(responseTimesMinutes.reduce((sum, value) => sum + value, 0) / responseTimesMinutes.length)
    : 0;

  // ---- Completion Rate: completed / total created today ----
  const createdToday = validEmergencies.filter((emergency) => {
    const createdAt = toDate(emergency.startedAt);
    return createdAt && isSameDay(createdAt, now);
  });
  const completedCreatedToday = createdToday.filter(
    (emergency) => getEmergencyStage(emergency) === "completed",
  ).length;
  const completionRate = createdToday.length
    ? Math.round((completedCreatedToday / createdToday.length) * 100)
    : 0;

  // ---- Trips This Week: daily completed-trip counts for the last 7 days ----
  const dayBuckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (6 - index));
    return { date, day: WEEKDAY_LABELS[date.getDay()], trips: 0 };
  });
  validEmergencies
    .filter((emergency) => getEmergencyStage(emergency) === "completed")
    .forEach((emergency) => {
      const completedAt = toDate(emergency.lastUpdated ?? emergency.startedAt);
      if (!completedAt) return;
      const bucket = dayBuckets.find((entry) => isSameDay(entry.date, completedAt));
      if (bucket) bucket.trips += 1;
    });
  const tripsThisWeek = dayBuckets.map(({ day, trips }) => ({ day, trips }));

  // ---- Peak Emergency Hours: emergency creation counts by hour (0-23) ----
  const hourCounts = Array.from({ length: 24 }, () => 0);
  validEmergencies.forEach((emergency) => {
    const createdAt = toDate(emergency.startedAt);
    if (!createdAt) return;
    hourCounts[createdAt.getHours()] += 1;
  });
  const peakEmergencyHours = hourCounts.map((trips, hour) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    trips,
  }));

  // ---- Priority Distribution: Red / Yellow / Green counts ----
  const priorityCounts = { Red: 0, Yellow: 0, Green: 0 };
  validEmergencies.forEach((emergency) => {
    const bucket = priorityBucket(emergency);
    if (bucket) priorityCounts[bucket] += 1;
  });
  const priorityDistribution = Object.entries(priorityCounts).map(([label, value]) => ({ label, value }));

  // ---- Trips Per Hospital: completed trips grouped by destination hospital ----
  const hospitalCounts = new Map();
  validEmergencies
    .filter((emergency) => getEmergencyStage(emergency) === "completed" && emergency.destinationHospital)
    .forEach((emergency) => {
      const name = emergency.destinationHospital;
      hospitalCounts.set(name, (hospitalCounts.get(name) ?? 0) + 1);
    });
  const tripsPerHospital = Array.from(hospitalCounts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return {
    tripsToday,
    averageEta,
    averageResponseTime,
    completionRate,
    tripsThisWeek,
    peakEmergencyHours,
    priorityDistribution,
    tripsPerHospital,
  };
}
