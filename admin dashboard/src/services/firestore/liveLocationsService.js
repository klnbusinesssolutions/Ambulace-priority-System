import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService, where } from "./firestoreCollection.js";

const liveLocations = createCollectionService(COLLECTIONS.liveLocations);

/** Doc id === ambulanceId. Written by the driver's Android app. */
export async function listenToLiveLocations(callback, onError) {
  return liveLocations.listen(callback, { onError });
}

export async function listenToLiveLocationsByHospital(hospitalId, callback, onError) {
  return liveLocations.listen(callback, {
    constraints: [where("hospitalId", "==", hospitalId)],
    onError,
  });
}

export async function getLiveLocation(ambulanceId) {
  return liveLocations.getById(ambulanceId);
}
