import { collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

import { firestore } from "@/firebase/config";
import { FIRESTORE_COLLECTIONS } from "@/services/firebaseDataService";

// The driver app (AmbulanceDriverApp/App.tsx) writes `tripStatus` onto the
// driver's own doc in `drivers/{driverId}` - not onto the emergency doc -
// as the driver taps through: Going to Patient -> Reached Patient ->
// Patient Onboard -> Near Hospital -> Trip Completed.
// This maps each of those into the alert police actually care about.
const TRIP_ALERT_RULES = {
  reached_patient: {
    title: "Ambulance reached patient",
    category: "Ambulance Stopped",
    severity: "Medium",
  },
  patient_onboard: {
    title: "Patient onboard - en route to hospital",
    category: "Trip Completed",
    severity: "Medium",
  },
  // The driver app's "Near Hospital" step is the existing stand-in for an
  // ETA-based alert - the driver taps this manually rather than the app
  // computing minutes-to-arrival automatically (no live ETA is currently
  // written to Firestore by the driver app - see note in chat).
  near_hospital: {
    title: "Ambulance approaching hospital - ETA under 5 mins",
    category: "ETA Below 5 Minutes",
    severity: "High",
  },
  trip_completed: {
    title: "Ambulance reached hospital - trip completed",
    category: "Trip Completed",
    severity: "Low",
  },
};

function isTripActive(emergency) {
  const status = String(emergency?.status ?? "").toLowerCase();
  return status !== "completed" && status !== "trip_completed" && status !== "cancelled";
}

/**
 * Starts watching `drivers` for tripStatus transitions on drivers currently
 * tied to an active emergency, and writes a police_alerts doc (+ activity log
 * entry) the first time each transition happens. Call the returned function
 * to stop watching.
 */
export function startTripAlertWatcher(getActiveEmergencies) {
  if (!firestore) return () => {};

  const lastSeenStatus = new Map(); // driverId -> tripStatus, to skip redundant snapshot events

  const unsubscribe = onSnapshot(collection(firestore, "drivers"), async (snapshot) => {
    const activeEmergencies = getActiveEmergencies().filter(isTripActive);
    if (activeEmergencies.length === 0) return;

    for (const change of snapshot.docChanges()) {
      if (change.type === "removed") continue;

      const driverId = change.doc.id;
      const tripStatus = change.doc.data().tripStatus;
      const rule = TRIP_ALERT_RULES[tripStatus];
      if (!rule || lastSeenStatus.get(driverId) === tripStatus) continue;
      lastSeenStatus.set(driverId, tripStatus);

      const emergency = activeEmergencies.find((item) => item.driverId === driverId || item.ambulanceNumber === driverId);
      if (!emergency) continue;

      const alertId = `${emergency.id}_${tripStatus}`;
      const alertRef = doc(firestore, FIRESTORE_COLLECTIONS.priorityAlerts, alertId);

      // Only create it once - never overwrite (so marking it read/deleting it later sticks).
      const existing = await getDoc(alertRef);
      if (existing.exists()) continue;

      await setDoc(alertRef, {
        title: rule.title,
        description: `${emergency.driverName ?? "Driver"} - ${rule.title.toLowerCase()} (trip ${emergency.id}).`,
        category: rule.category,
        severity: rule.severity,
        tripId: emergency.id,
        driverId,
        hospitalId: emergency.destinationHospital ?? null,
        read: false,
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(collection(firestore, FIRESTORE_COLLECTIONS.activityFeed)), {
        hospitalId: emergency.destinationHospital ?? null,
        action: `trip_${tripStatus}`,
        performedBy: driverId,
        targetId: emergency.id,
        details: rule.title,
        createdAt: serverTimestamp(),
      });
    }
  });

  return unsubscribe;
}
