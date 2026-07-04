import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService, where } from "./firestoreCollection.js";

const drivers = createCollectionService(COLLECTIONS.drivers);

/**
 * NOTE ON FIELD NAMES: the `drivers` collection in the schema doc uses
 * literal, spaced field names ("Hospital Name", "Name", "Email ID",
 * "Phone Number", "Role", "Gender", "City", "State", "Availability",
 * "Documents") instead of the camelCase used everywhere else in the
 * schema. We read/write the literal keys here (via bracket access) to stay
 * schema-accurate, and normalize to camelCase only for display in the UI.
 * Flagging this because it's inconsistent with the rest of the schema —
 * worth confirming with whoever owns the Android app before this ships.
 */
export function normalizeDriver(raw) {
  if (!raw) return raw;
  return {
    id: raw.id,
    hospitalId: raw.hospitalId,
    hospitalName: raw["Hospital Name"],
    name: raw["Name"],
    email: raw["Email ID"],
    phone: raw["Phone Number"],
    role: raw["Role"],
    gender: raw["Gender"],
    city: raw["City"],
    state: raw["State"],
    availability: raw["Availability"],
    documents: raw["Documents"],
    location: raw.location,
    tripStatus: raw.tripStatus,
    tripCompletedAt: raw.tripCompletedAt,
    tripStatusUpdatedAt: raw.tripStatusUpdatedAt,
    updatedAt: raw.updatedAt,
    _raw: raw,
  };
}

export async function listenToDrivers(callback, onError) {
  return drivers.listen(
    (rows) => callback(rows.map(normalizeDriver)),
    { onError },
  );
}

export async function listenToDriversByHospital(hospitalId, callback, onError) {
  return drivers.listen(
    (rows) => callback(rows.map(normalizeDriver)),
    { constraints: [where("hospitalId", "==", hospitalId)], onError },
  );
}

export async function updateDriverAvailability(driverId, availability) {
  return drivers.update(driverId, { Availability: availability });
}

export async function removeDriver(driverId) {
  return drivers.remove(driverId);
}
