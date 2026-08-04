import { COLLECTIONS } from "../../firebase/collections.js";
import {
  createCollectionService,
  where,
  serverTimestamp,
} from "./firestoreCollection.js";
const drivers = createCollectionService(COLLECTIONS.drivers);

/**
 * Normalizes raw Firestore driver document fields into standard camelCase schema
 * supporting both spaced keys ("Name", "Hospital Name", etc.) and standard camelCase.
 */
export function normalizeDriver(raw) {
  if (!raw) return raw;

  const location =
    raw.location ||
    raw.coordinates ||
    raw.lastLocation ||
    raw.position ||
    (raw.latitude && raw.longitude ? { latitude: Number(raw.latitude), longitude: Number(raw.longitude) } : null);

  const latitude = Number(raw.latitude || raw.lat || location?.latitude || location?.lat || location?.y);
  const longitude = Number(raw.longitude || raw.lng || location?.longitude || location?.lng || location?.x);

  return {
    id: raw.id,
    hospitalId: raw.hospitalId || raw.hospital_id || raw["Hospital ID"],
    hospitalName: raw["Hospital Name"] || raw.hospitalName || raw.hospital_name || "Hospital Network",
    name: raw["Name"] || raw.name || raw.fullName || raw.driverName || "Driver",
    email: raw["Email ID"] || raw.email || raw.emailId || "",
    phone: raw["Phone Number"] || raw.phone || raw.phoneNumber || "",
    role: raw["Role"] || raw.role || "Driver",
    gender: raw["Gender"] || raw.gender || "",
    city: raw["City"] || raw.city || "",
    state: raw["State"] || raw.state || "",
    availability: raw["Availability"] || raw.availability || "available",
    documents: raw["Documents"] || raw.documents || {},
    location,
    latitude: !isNaN(latitude) ? latitude : undefined,
    longitude: !isNaN(longitude) ? longitude : undefined,
    tripStatus: raw.tripStatus || raw.trip_status || "idle",
    tripCompletedAt: raw.tripCompletedAt || null,
    tripStatusUpdatedAt: raw.tripStatusUpdatedAt || null,
    updatedAt: raw.updatedAt || null,
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
  return drivers.update(driverId, { Availability: availability, availability });
}

export async function removeDriver(driverId) {
  return drivers.remove(driverId);
}

export async function createDriver(driver) {
  return drivers.setById(driver.id, {
    hospitalId: driver.hospitalId,

    "Hospital Name": driver.hospitalName || "",
    "Name": driver.fullName || driver.driverName || "",
    "Email ID": driver.email || "",
    "Phone Number": driver.phone || "",
    "Role": "Driver",
    "Gender": driver.gender || "",
    "City": driver.city || "",
    "State": driver.state || "",
    "Availability": "available",
    "Documents": driver.documents || {},

    aadhaarNumber: driver.aadhaarNumber || "",
    licenseNumber: driver.licenseNumber || "",
    licenseExpiry: driver.licenseExpiry || "",
    emergencyContact: driver.emergencyContact || "",

    location: null,
    tripStatus: "idle",

    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
