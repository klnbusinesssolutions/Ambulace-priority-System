import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp, where } from "./firestoreCollection.js";

const emergencies = createCollectionService(COLLECTIONS.emergencies);

export async function listenToEmergencies(callback, onError) {
  return emergencies.listen(callback, { constraints: [orderBy("startTime", "desc")], onError });
}

export async function listenToEmergenciesByHospital(hospitalId, callback, onError) {
  return emergencies.listen(callback, {
    constraints: [where("hospitalId", "==", hospitalId), orderBy("startTime", "desc")],
    onError,
  });
}

export async function updateEmergencyStatus(id, status) {
  const patch = { status };
  if (status === "completed" || status === "resolved") {
    patch.completedAt = serverTimestamp();
  }
  return emergencies.update(id, patch);
}
