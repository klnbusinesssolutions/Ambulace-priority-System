import { FIRESTORE_COLLECTIONS, normalizeEmergencyRecord, subscribeToCollection } from "@/services/firebaseDataService";
import { sortEmergenciesBySeverity } from "@/services/policeConstants";

export function subscribeToEmergencies(onUpdate, onError) {
  return subscribeToCollection(
    FIRESTORE_COLLECTIONS.emergencies,
    // Your docs use "startTime", not "lastUpdated" - ordering on a missing field
    // would make Firestore silently exclude every doc from the results.
    { orderField: "startTime", direction: "desc" },
    (docs) => onUpdate(sortEmergenciesBySeverity(docs.map(normalizeEmergencyRecord))),
    onError,
  );
}
