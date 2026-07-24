import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { firestore } from "@/firebase/config";

// Mapped to this project's actual Firestore collection names.
// Left column = name used throughout the app code, right column = real collection in Firestore.
export const FIRESTORE_COLLECTIONS = {
  emergencies: "emergencies",
  trafficReports: "trafficReports", // not part of the real schema - police-only, safe to leave, stays empty
  // Police-only trip-milestone alerts (reached patient, patient onboard, near
  // hospital) - deliberately its own collection, separate from the admin
  // dashboard's "notifications" (driver/ambulance approval messages), which
  // aren't relevant to police and used to show up here by mistake.
  priorityAlerts: "police_alerts",
  activityFeed: "activity_logs",
  hospitals: "hospitals",
  // Police officers are a separate concept from the hospital/company `admins`
  // collection - their own Firebase Auth accounts, own Firestore collection.
  // "pending_police_officers" holds submitted Register-page requests before
  // an approver creates the real Auth account + police_officers doc (mirrors
  // the pending_drivers -> drivers approval pattern in the admin dashboard).
  accessRequests: "pending_police_officers",
  users: "police_officers",
};

export const FIRESTORE_DOCS = {
  systemStatus: ["systemStatus", "current"],
  analytics: ["analytics", "summary"],
};

export function toIsoTimestamp(value) {
  if (!value) return value;
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function normalizeFirestoreValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeFirestoreValue);
  }

  if (value && typeof value === "object") {
    if (typeof value.toDate === "function") {
      return value.toDate().toISOString();
    }

    return Object.entries(value).reduce((normalized, [key, nestedValue]) => {
      normalized[key] = normalizeFirestoreValue(nestedValue);
      return normalized;
    }, {});
  }

  return value;
}

// Adapts a raw `activity_logs` doc (hospitalId, action, performedBy, targetId,
// details, createdAt) into the field names ActivityRow expects (type, title,
// detail, timestamp, hospital, tripId). Note: this collection is shared with
// the admin dashboard, which also logs approval/rejection/onboarding actions
// on drivers, ambulances, and police officers (e.g. "driver_approved",
// "police_officer_rejected"). The police dashboard only cares about trip
// milestones, which tripAlertWatcher.js always writes with a "trip_" prefix
// (e.g. "trip_reached_patient") - use isTripActivity() below to filter those
// admin-approval entries out before showing the feed.
function titleCaseFromAction(action) {
  if (!action) return "Activity";
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// True only for trip-milestone activity (written by tripAlertWatcher.js),
// false for admin approval/rejection/onboarding entries in the same collection.
export function isTripActivity(raw) {
  const action = raw?.type ?? raw?.action ?? "";
  return action.startsWith("trip_");
}

export function normalizeActivityRecord(raw) {
  return {
    ...raw,
    type: raw.type ?? raw.action,
    title: raw.title ?? titleCaseFromAction(raw.action),
    detail: raw.detail ?? raw.details,
    timestamp: raw.timestamp ?? raw.createdAt,
    hospital: raw.hospital ?? raw.hospitalId,
    tripId: raw.tripId ?? raw.targetId,
  };
}

export function mapSnapshotDoc(snapshotDoc) {
  return {
    id: snapshotDoc.id,
    ...normalizeFirestoreValue(snapshotDoc.data()),
  };
}

// Your `emergencies` docs store location as a string like "23.0225° N, 72.5714° E"
// instead of a { lat, lng } object. This turns that string into coordinates the map/UI can use.
export function parseCoordinateString(value) {
  if (!value) return null;
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return raw;

  const match = raw.match(/([\d.]+)\s*°?\s*([NS]).*?([\d.]+)\s*°?\s*([EW])/i);
  if (!match) return null;

  const [, latValue, latDir, lngValue, lngDir] = match;
  const lat = parseFloat(latValue) * (latDir.toUpperCase() === "S" ? -1 : 1);
  const lng = parseFloat(lngValue) * (lngDir.toUpperCase() === "W" ? -1 : 1);
  return { lat, lng };
}

// Adapts a raw `emergencies` doc (your existing field names: driverId, hospitalId,
// incidentType, patientStatus, priority, startTime, location) into the field names
// the rest of the dashboard UI expects (type, severity, destinationHospital, coordinates, lastUpdated...).
const SEVERITY_LABELS = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

export function normalizeEmergencyRecord(raw) {
  const coordinates = raw.coordinates ?? parseCoordinateString(raw.location);
  const rawSeverity = raw.severity ?? raw.priority;
  const severity = SEVERITY_LABELS[String(rawSeverity ?? "").toLowerCase()] ?? rawSeverity;

  return {
    ...raw,
    type: raw.type ?? raw.incidentType,
    severity,
    // Shows the hospital ID until a `hospitals` collection exists to resolve it to a name.
    destinationHospital: raw.destinationHospital ?? raw.hospitalId,
    ambulanceNumber: raw.ambulanceNumber ?? raw.driverId,
    coordinates,
    pickup: raw.pickup ?? coordinates,
    lastUpdated: raw.lastUpdated ?? raw.startTime,
    startedAt: raw.startedAt ?? raw.startTime,
  };
}

// Adapts a raw `notifications` doc (title, message, createdAt, hospitalId, type)
// into the field names AlertCard/Alerts expect (description, timestamp, category, severity).
export function normalizeAlertRecord(raw) {
  return {
    ...raw,
    description: raw.description ?? raw.message,
    timestamp: raw.timestamp ?? raw.createdAt,
    category: raw.category ?? raw.type,
    severity: raw.severity ?? "Medium",
  };
}

export function subscribeToCollection(collectionName, { orderField, direction = "desc" } = {}, onUpdate, onError) {
  if (!firestore) {
    return () => {};
  }

  const collectionRef = collection(firestore, collectionName);
  const collectionQuery = orderField ? query(collectionRef, orderBy(orderField, direction)) : collectionRef;

  return onSnapshot(
    collectionQuery,
    (snapshot) => onUpdate(snapshot.docs.map(mapSnapshotDoc)),
    onError,
  );
}

export function subscribeToDocument(pathSegments, onUpdate, onError) {
  if (!firestore) {
    return () => {};
  }

  return onSnapshot(
    doc(firestore, ...pathSegments),
    (snapshot) => {
      if (!snapshot.exists()) return;
      onUpdate({ id: snapshot.id, ...normalizeFirestoreValue(snapshot.data()) });
    },
    onError,
  );
}

export function withUpdatedAt(updates) {
  if (!firestore) return updates;
  return {
    ...updates,
    updatedAt: serverTimestamp(),
  };
}

export async function updateAlertReadState(id, read) {
  if (!firestore) return;
  await updateDoc(doc(firestore, FIRESTORE_COLLECTIONS.priorityAlerts, id), withUpdatedAt({ read }));
}

export async function markAllAlertsReadRemote(alerts) {
  if (!firestore) return;

  const batch = writeBatch(firestore);
  alerts
    .filter((alert) => !alert.read)
    .forEach((alert) => {
      batch.update(doc(firestore, FIRESTORE_COLLECTIONS.priorityAlerts, alert.id), withUpdatedAt({ read: true }));
    });

  await batch.commit();
}

export async function deleteAlertRemote(id) {
  if (!firestore) return;
  await deleteDoc(doc(firestore, FIRESTORE_COLLECTIONS.priorityAlerts, id));
}

export async function findUserByBadgeId(badgeId) {
  if (!firestore) return null;

  const userQuery = query(collection(firestore, FIRESTORE_COLLECTIONS.users), where("badgeId", "==", badgeId), limit(1));
  const snapshot = await getDocs(userQuery);
  const firstUser = snapshot.docs[0];

  return firstUser ? mapSnapshotDoc(firstUser) : null;
}

// Loads the officer's own police_officers/{uid} doc - this is where
// `station` ({name, lat, lng}) and `serviceRadiusKm` live, set manually by
// whoever onboards the officer (see admin dashboard's Pending Police Officers
// page). Returns null if the doc doesn't exist yet (e.g. onboarding hasn't
// added those fields) - callers should treat that as "no area restriction".
export async function getPoliceOfficerProfile(uid) {
  if (!firestore || !uid) return null;

  const snapshot = await getDoc(doc(firestore, FIRESTORE_COLLECTIONS.users, uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

