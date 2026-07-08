import { COLLECTIONS } from "../../firebase/collections.js";
import {
  createCollectionService,
  where,
  serverTimestamp,
} from "./firestoreCollection.js";

const ambulances = createCollectionService(COLLECTIONS.ambulances);

export async function createAmbulance(ambulance) {
  return ambulances.setById(ambulance.id, {
    hospitalId: ambulance.hospitalId,
    hospitalName: ambulance.hospitalName || "",

    registrationNumber: ambulance.registrationNumber || "",
    numberPlate: ambulance.numberPlate || "",
    vehicleType: ambulance.vehicleType || "",
    capacity: ambulance.capacity || "",
    availability: ambulance.availability || "available",

    assignedDrivers: ambulance.assignedDrivers || [],
    activeDriverId: ambulance.activeDriverId || null,

    documents: ambulance.documents || {},

    location: null,
    status: "approved",

    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listenToAmbulances(callback, onError) {
  return ambulances.listen(callback, { onError });
}

export async function listenToAmbulancesByHospital(
  hospitalId,
  callback,
  onError,
) {
  return ambulances.listen(callback, {
    constraints: [where("hospitalId", "==", hospitalId)],
    onError,
  });
}

export async function updateAmbulance(id, patch) {
  return ambulances.update(id, patch);
}

export async function removeAmbulance(id) {
  return ambulances.remove(id);
}