import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp } from "./firestoreCollection.js";

const hospitals = createCollectionService(COLLECTIONS.hospitals);

export async function listenToHospitals(callback, onError) {
  return hospitals.listen(callback, { constraints: [orderBy("name", "asc")], onError });
}

export async function getHospital(hospitalId) {
  return hospitals.getById(hospitalId);
}

/** Hospitals are keyed by hospitalId (e.g. "HSP01"), not an auto id. */
export async function createHospital(hospitalId, data) {
  return hospitals.setById(hospitalId, {
    hospitalId,
    isActive: true,
    createdAt: serverTimestamp(),
    ...data,
  });
}

export async function updateHospital(hospitalId, patch) {
  return hospitals.update(hospitalId, patch);
}

export async function removeHospital(hospitalId) {
  return hospitals.remove(hospitalId);
}
