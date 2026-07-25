import { COLLECTIONS } from "../../firebase/collections.js";
import {
  createCollectionService,
  where,
  serverTimestamp,
} from "./firestoreCollection.js";
import { validateAmbulanceForm, formatMedicalCapabilities, validateRegistrationNumber } from "../../utils/ambulanceValidation.js";

const ambulances = createCollectionService(COLLECTIONS.ambulances);

export async function createAmbulance(ambulance) {
  const registrationNumber = (ambulance.registrationNumber || "").trim().toUpperCase();
  const medicalCapabilities = formatMedicalCapabilities(ambulance.medicalCapabilities);
  const payload = { ...ambulance, registrationNumber, medicalCapabilities };

  const errors = validateAmbulanceForm(payload);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }

  return ambulances.setById(ambulance.id, {
    hospitalId: payload.hospitalId,
    hospitalName: payload.hospitalName || "",

    registrationNumber: payload.registrationNumber,
    numberPlate: payload.numberPlate,
    manufacturer: payload.manufacturer || "",
    model: payload.model || "",
    vehicleType: payload.vehicleType,
    capacity: payload.capacity,
    availability: payload.availability || "available",
    medicalCapabilities: payload.medicalCapabilities,

    assignedDrivers: payload.assignedDrivers || [],
    activeDriverId: payload.activeDriverId || null,

    documents: payload.documents || {},

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
  const updatedPatch = { ...patch };
  if (updatedPatch.registrationNumber) {
    updatedPatch.registrationNumber = updatedPatch.registrationNumber.trim().toUpperCase();
    const regErr = validateRegistrationNumber(updatedPatch.registrationNumber);
    if (regErr) throw new Error(regErr);
  }
  if (updatedPatch.medicalCapabilities) {
    updatedPatch.medicalCapabilities = formatMedicalCapabilities(updatedPatch.medicalCapabilities);
  }

  return ambulances.update(id, updatedPatch);
}

export async function removeAmbulance(id) {
  return ambulances.remove(id);
}