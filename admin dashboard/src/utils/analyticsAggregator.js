import { VERIFICATION_STATUS } from "../firebase/collections.js";

/**
 * Safely parse any timestamp format (Firestore Timestamp, ISO string, JS Date, Unix ms/sec).
 */
export function safeParseDate(ts) {
  if (!ts) return null;
  try {
    if (typeof ts?.toDate === "function") {
      const d = ts.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof ts === "object" && typeof ts.seconds === "number") {
      const d = new Date(ts.seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    if (ts instanceof Date) {
      return isNaN(ts.getTime()) ? null : ts;
    }
    if (typeof ts === "string" || typeof ts === "number") {
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d;
    }
  } catch (e) {
    console.error("Failed to parse date timestamp:", ts, e);
  }
  return null;
}

/**
 * Format a Date object into a readable short day/date label (e.g., "Mon 28", "Jul 30").
 */
export function formatDateLabel(date, groupBy = "day") {
  if (!date) return "";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (groupBy === "month") {
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  // Default day grouping
  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  return `${dayName} ${dayNum}`;
}

/**
 * Aggregate all verification requests into Approval vs Rejection vs Pending vs Resubmission totals.
 * Deduplicates by unique ID across all collections.
 */
export function calculateApprovalBreakdown({
  hospitals = [],
  drivers = [],
  pendingDrivers = [],
  ambulances = [],
  pendingAmbulances = [],
  pendingPoliceOfficers = [],
  rejectedRequestsCollection = [],
}) {
  const countedIds = new Set();
  let approvedCount = 0;
  let rejectedCount = 0;
  let pendingCount = 0;
  let resubmissionCount = 0;

  // 1. Approved Drivers
  (drivers || []).forEach((d) => {
    const id = d.id || d.driverId;
    if (id && !countedIds.has(id)) {
      countedIds.add(id);
      approvedCount++;
    }
  });

  // 2. Approved Ambulances
  (ambulances || []).forEach((a) => {
    const id = a.id || a.ambulanceId;
    if (id && !countedIds.has(id)) {
      countedIds.add(id);
      approvedCount++;
    }
  });

  // 3. Approved Hospitals
  (hospitals || []).forEach((h) => {
    const id = h.id || h.hospitalId;
    if (id && !countedIds.has(id)) {
      if (h.isActive || h.status === VERIFICATION_STATUS.approved || h.status === "active") {
        countedIds.add(id);
        approvedCount++;
      } else if (h.status === VERIFICATION_STATUS.pending || h.isPending) {
        countedIds.add(id);
        pendingCount++;
      } else if (h.status === VERIFICATION_STATUS.rejected) {
        countedIds.add(id);
        rejectedCount++;
      } else if (h.status === VERIFICATION_STATUS.resubmissionRequired) {
        countedIds.add(id);
        resubmissionCount++;
      }
    }
  });

  // 4. Pending Drivers
  (pendingDrivers || []).forEach((d) => {
    const id = d.id;
    if (id && !countedIds.has(id)) {
      countedIds.add(id);
      const st = (d.status || "").toLowerCase();
      if (st === VERIFICATION_STATUS.approved || st === "approved") approvedCount++;
      else if (st === VERIFICATION_STATUS.rejected || st === "rejected") rejectedCount++;
      else if (st === VERIFICATION_STATUS.resubmissionRequired || st === "resubmission_required") resubmissionCount++;
      else pendingCount++;
    }
  });

  // 5. Pending Ambulances
  (pendingAmbulances || []).forEach((a) => {
    const id = a.id;
    if (id && !countedIds.has(id)) {
      countedIds.add(id);
      const st = (a.status || "").toLowerCase();
      if (st === VERIFICATION_STATUS.approved || st === "approved") approvedCount++;
      else if (st === VERIFICATION_STATUS.rejected || st === "rejected") rejectedCount++;
      else if (st === VERIFICATION_STATUS.resubmissionRequired || st === "resubmission_required") resubmissionCount++;
      else pendingCount++;
    }
  });

  // 6. Pending Police Officers
  (pendingPoliceOfficers || []).forEach((p) => {
    const id = p.id;
    if (id && !countedIds.has(id)) {
      countedIds.add(id);
      const st = (p.status || "").toLowerCase();
      if (st === VERIFICATION_STATUS.approved || st === "approved") approvedCount++;
      else if (st === VERIFICATION_STATUS.rejected || st === "rejected") rejectedCount++;
      else if (st === VERIFICATION_STATUS.resubmissionRequired || st === "resubmission_required") resubmissionCount++;
      else pendingCount++;
    }
  });

  // 7. Explicit Rejected Requests Collection
  (rejectedRequestsCollection || []).forEach((r) => {
    const id = r.id || r.targetId;
    if (id && !countedIds.has(id)) {
      countedIds.add(id);
      rejectedCount++;
    }
  });

  const total = approvedCount + rejectedCount + pendingCount + resubmissionCount;

  return [
    { name: "Approved", value: approvedCount, percentage: total ? Math.round((approvedCount / total) * 100) : 0 },
    { name: "Rejected", value: rejectedCount, percentage: total ? Math.round((rejectedCount / total) * 100) : 0 },
    { name: "Pending", value: pendingCount, percentage: total ? Math.round((pendingCount / total) * 100) : 0 },
    { name: "Resubmission", value: resubmissionCount, percentage: total ? Math.round((resubmissionCount / total) * 100) : 0 },
  ];
}

/**
 * Calculate dynamic Verification Trends over the past 7 days (or custom window).
 * Groups approvals, rejections, pending, and resubmissions by actual date.
 */
export function calculateVerificationTrend({
  hospitals = [],
  drivers = [],
  pendingDrivers = [],
  ambulances = [],
  pendingAmbulances = [],
  pendingPoliceOfficers = [],
  rejectedRequestsCollection = [],
  daysCount = 7,
}) {
  const daysMap = new Map();
  const now = new Date();

  // Initialize past `daysCount` days in chronological order
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayLabel = formatDateLabel(d);
    daysMap.set(dateKey, {
      dateKey,
      day: dayLabel,
      approvals: 0,
      rejections: 0,
      resubmissions: 0,
      pending: 0,
    });
  }

  const processItem = (item, defaultStatus) => {
    const ts =
      item.approvedAt ||
      item.rejectedAt ||
      item.updatedAt ||
      item.submittedAt ||
      item.createdAt ||
      item.requestedAt ||
      item.timestamp;
    const parsedDate = safeParseDate(ts);
    if (!parsedDate) return;

    const dateKey = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;

    const bucket = daysMap.get(dateKey);
    if (!bucket) return; // Outside our timeframe

    const status = (item.status || defaultStatus || "").toLowerCase();

    if (status === VERIFICATION_STATUS.approved || status === "approved" || status === "active" || item.isActive) {
      bucket.approvals += 1;
    } else if (status === VERIFICATION_STATUS.rejected || status === "rejected") {
      bucket.rejections += 1;
    } else if (status === VERIFICATION_STATUS.resubmissionRequired || status === "resubmission_required") {
      bucket.resubmissions += 1;
    } else if (status === VERIFICATION_STATUS.pending || status === "pending" || item.isPending) {
      bucket.pending += 1;
    }
  };

  (drivers || []).forEach((item) => processItem(item, "approved"));
  (ambulances || []).forEach((item) => processItem(item, "approved"));
  (hospitals || []).forEach((item) => processItem(item, item.isActive ? "approved" : "pending"));
  (pendingDrivers || []).forEach((item) => processItem(item, "pending"));
  (pendingAmbulances || []).forEach((item) => processItem(item, "pending"));
  (pendingPoliceOfficers || []).forEach((item) => processItem(item, "pending"));
  (rejectedRequestsCollection || []).forEach((item) => processItem(item, "rejected"));

  return Array.from(daysMap.values());
}

/**
 * Calculate KPI summary statistics directly from Firestore collections.
 */
export function calculateKPIStats({
  hospitals = [],
  drivers = [],
  pendingDrivers = [],
  ambulances = [],
  pendingAmbulances = [],
  pendingPoliceOfficers = [],
  rejectedRequestsCollection = [],
  emergencies = [],
}) {
  const pendingDriverRequests = (pendingDrivers || []).filter(
    (d) => d.status === VERIFICATION_STATUS.pending || d.status === "pending"
  ).length;

  const pendingAmbulanceRequests = (pendingAmbulances || []).filter(
    (a) => a.status === VERIFICATION_STATUS.pending || a.status === "pending"
  ).length;

  const pendingPoliceRequests = (pendingPoliceOfficers || []).filter(
    (p) => p.status === VERIFICATION_STATUS.pending || p.status === "pending"
  ).length;

  const allRejectedIds = new Set([
    ...(rejectedRequestsCollection || []).map((r) => r.id || r.targetId).filter(Boolean),
    ...(pendingDrivers || []).filter((d) => d.status === VERIFICATION_STATUS.rejected || d.status === "rejected").map((d) => d.id),
    ...(pendingAmbulances || []).filter((a) => a.status === VERIFICATION_STATUS.rejected || a.status === "rejected").map((a) => a.id),
    ...(pendingPoliceOfficers || []).filter((p) => p.status === VERIFICATION_STATUS.rejected || p.status === "rejected").map((p) => p.id),
    ...(hospitals || []).filter((h) => h.status === VERIFICATION_STATUS.rejected || h.status === "rejected").map((h) => h.id || h.hospitalId),
  ]);

  const resubmissionRequests =
    (pendingDrivers || []).filter((d) => d.status === VERIFICATION_STATUS.resubmissionRequired || d.status === "resubmission_required").length +
    (pendingAmbulances || []).filter((a) => a.status === VERIFICATION_STATUS.resubmissionRequired || a.status === "resubmission_required").length +
    (pendingPoliceOfficers || []).filter((p) => p.status === VERIFICATION_STATUS.resubmissionRequired || p.status === "resubmission_required").length;

  const activeEmergencies = (emergencies || []).filter((e) =>
    ["active", "dispatched", "arrived", "in_progress"].includes(e.status)
  );

  const activeHospitalsCount = (hospitals || []).filter((h) => h.isActive !== false && h.status !== "pending").length;
  const activeAmbulancesCount = (ambulances || []).filter((a) => a.availability !== "offline" && a.isActive !== false).length;

  return {
    pendingDriverRequests,
    pendingAmbulanceRequests,
    pendingPoliceRequests,
    rejectedRequests: allRejectedIds.size,
    resubmissionRequests,
    operationalDriversCount: (drivers || []).length,
    activeAmbulancesCount,
    activeHospitalsCount,
    activeEmergenciesCount: activeEmergencies.length,
  };
}

function resolveLifecycleMetrics(item) {
  const dispatchDate = safeParseDate(item.dispatchTime || item.startTime || item.createdAt || item.timestamp);
  const arrivedDate = safeParseDate(item.arrivedTime || item.pickupTime || item.arrivedAt);
  const completedDate = safeParseDate(item.completedTime || item.resolvedAt || item.completedAt);
  const startDate = safeParseDate(item.startTime || item.createdAt || item.timestamp);

  // Response Time Resolution
  let responseMins = null;
  if (dispatchDate && arrivedDate) {
    if (arrivedDate >= dispatchDate) {
      responseMins = Math.max(0, Math.round((arrivedDate - dispatchDate) / 60000));
    } else {
      // Impossible ordering (arrived before dispatch) -> flag invalid (null)
      responseMins = null;
    }
  } else if (
    item.responseTime !== undefined &&
    item.responseTime !== null &&
    item.responseTime !== "" &&
    !isNaN(Number(item.responseTime))
  ) {
    const val = Number(item.responseTime);
    if (val >= 0) responseMins = val;
  }

  // Total Duration Resolution
  let durationMins = null;
  if (startDate && completedDate) {
    if (completedDate >= startDate) {
      durationMins = Math.max(0, Math.round((completedDate - startDate) / 60000));
    } else {
      // Impossible ordering (completed before start) -> flag invalid (null)
      durationMins = null;
    }
  } else if (
    (item.totalDuration !== undefined && item.totalDuration !== null && item.totalDuration !== "" && !isNaN(Number(item.totalDuration))) ||
    (item.duration !== undefined && item.duration !== null && item.duration !== "" && !isNaN(Number(item.duration)))
  ) {
    const val = Number(item.totalDuration || item.duration);
    if (val >= 0) durationMins = val;
  }

  return { responseMins, durationMins };
}

/**
 * Aggregates Emergency & Analytics metrics strictly from Firestore data (NO FAKE / RANDOM DATA).
 */
export function calculateEmergencyAnalyticsData(analyticsList = [], emergenciesList = [], hospitalsList = []) {
  const hospitalNameMap = new Map();

  (hospitalsList || []).forEach((h) => {
    const id = h.hospitalId || h.id;
    if (id) hospitalNameMap.set(id, h.name || h.hospitalName || id);
  });

  const emergencyMap = new Map();

  // 1. Process explicit analytics records
  (analyticsList || []).forEach((item, idx) => {
    const key = item.emergencyId || item.id || `ANALYSIS-${idx + 1}`;
    const hospName = item.hospitalName || hospitalNameMap.get(item.hospitalId) || item.hospitalId || "N/A";

    const { responseMins, durationMins } = resolveLifecycleMetrics(item);

    emergencyMap.set(key, {
      id: item.id || `AN-${key}`,
      emergencyId: key,
      hospitalId: item.hospitalId || "N/A",
      hospitalName: hospName,
      driverId: item.driverId || "N/A",
      driverName: item.driverName || "Assigned Driver",
      ambulanceId: item.ambulanceId || "N/A",
      responseTime: responseMins,
      totalDuration: durationMins,
      priority: (item.priority || "medium").toLowerCase(),
      incidentType: item.incidentType || "Emergency Response",
      createdAt: item.createdAt || item.timestamp || new Date().toISOString(),
    });
  });

  // 2. Process emergencies collection and merge/deduplicate
  (emergenciesList || []).forEach((e, idx) => {
    const key = e.id || `EMG-${idx + 1}`;
    const hospName = e.hospitalName || hospitalNameMap.get(e.hospitalId) || e.hospitalId || "N/A";

    const { responseMins, durationMins } = resolveLifecycleMetrics(e);

    if (emergencyMap.has(key)) {
      const existing = emergencyMap.get(key);
      emergencyMap.set(key, {
        ...existing,
        responseTime: existing.responseTime !== null ? existing.responseTime : responseMins,
        totalDuration: existing.totalDuration !== null ? existing.totalDuration : durationMins,
        hospitalName: existing.hospitalName !== "N/A" ? existing.hospitalName : hospName,
      });
    } else {
      emergencyMap.set(key, {
        id: `AN-EMG-${key}`,
        emergencyId: key,
        hospitalId: e.hospitalId || "N/A",
        hospitalName: hospName,
        driverId: e.driverId || "N/A",
        driverName: e.driverName || "Assigned Driver",
        ambulanceId: e.ambulanceId || "N/A",
        responseTime: responseMins,
        totalDuration: durationMins,
        priority: (e.priority || "medium").toLowerCase(),
        incidentType: e.incidentType || "Emergency Response",
        createdAt: e.startTime || e.createdAt || new Date().toISOString(),
      });
    }
  });

  return Array.from(emergencyMap.values());
}
