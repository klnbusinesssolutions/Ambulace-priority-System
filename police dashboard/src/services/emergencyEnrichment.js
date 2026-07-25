import { parseCoordinateString } from "@/services/firebaseDataService";

// Ties together four collections that each only have half the picture:
//   emergencies    -> driverId, hospitalId, incident/patient details, static pickup location
//   drivers        -> driver name/phone + the ambulance's registration number
//   live_locations -> the ambulance's actual live GPS ping (schema isn't formally
//                     documented anywhere in this codebase, so this reads defensively
//                     across the field-name variants a driver app is likely to use)
//   hospitals      -> resolves hospitalId to a real hospital name + coordinates
//
// Everything downstream (cards, table, drawer, map) reads the single merged
// `emergencies` array in the store - this is the one place that does the joining.

function pickFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

export function normalizeDriverRecord(raw) {
  return {
    ...raw,
    name: pickFirst(raw.name, raw.driverName, raw.fullName),
    phone: pickFirst(raw.phone, raw.phoneNumber, raw.contactNumber, raw.mobile),
    vehicleNumber: pickFirst(raw.vehicleNumber, raw.ambulanceNumber, raw.registrationNumber, raw.regNumber),
  };
}

// live_locations docs might be keyed by driverId or by the trip/emergency id, and might
// store coordinates under lat/lng, latitude/longitude, or a "23.02° N, 72.57° E" string -
// same variance normalizeEmergencyRecord already has to handle for `emergencies.location`.
export function normalizeLiveLocationRecord(raw, docId) {
  const coordinates = parseCoordinateString(raw.location) ?? parseCoordinateString(raw.coordinates) ?? parseCoordinateString(raw);

  return {
    id: docId,
    driverId: raw.driverId ?? docId,
    tripId: raw.tripId ?? raw.emergencyId,
    coordinates,
    speed: raw.speed ?? raw.speedKmh,
    heading: raw.heading ?? raw.bearing,
    updatedAt: raw.updatedAt ?? raw.timestamp ?? raw.lastUpdated,
  };
}

function findLiveLocation(emergency, liveLocationsByDriverId, liveLocationsByTripId) {
  return (
    liveLocationsByDriverId.get(emergency.driverId) ??
    liveLocationsByTripId.get(emergency.id) ??
    liveLocationsByTripId.get(emergency.tripId)
  );
}

/**
 * Joins the raw (already-`normalizeEmergencyRecord`-passed) emergency list with
 * drivers / live GPS pings / hospitals. Safe to call with empty arrays before the
 * other collections have loaded yet - falls back to whatever normalizeEmergencyRecord
 * already produced.
 */
export function enrichEmergencies(emergencies, { drivers = [], liveLocations = [], hospitals = [] } = {}) {
  const driversById = new Map(drivers.map((driver) => [driver.id, driver]));
  const hospitalsById = new Map(hospitals.map((hospital) => [hospital.id, hospital]));
  const liveLocationsByDriverId = new Map(liveLocations.filter((l) => l.driverId).map((l) => [l.driverId, l]));
  const liveLocationsByTripId = new Map(liveLocations.filter((l) => l.tripId).map((l) => [l.tripId, l]));

  return emergencies.map((emergency) => {
    const driver = driversById.get(emergency.driverId);
    const hospital = hospitalsById.get(emergency.hospitalId);
    const liveLocation = findLiveLocation(emergency, liveLocationsByDriverId, liveLocationsByTripId);
    const liveCoordinates = liveLocation?.coordinates ?? null;

    return {
      ...emergency,
      driverName: pickFirst(emergency.driverName, driver?.name),
      driverPhone: pickFirst(emergency.driverPhone, driver?.phone),
      ambulanceNumber: pickFirst(emergency.ambulanceNumber, driver?.vehicleNumber, emergency.driverId),
      patientName: pickFirst(emergency.patientName, emergency.patient?.name),
      patientPhone: pickFirst(emergency.patientPhone, emergency.patient?.phone, emergency.patient?.contactNumber),
      destinationHospital: pickFirst(hospital?.name, emergency.destinationHospital),
      destinationHospitalCoordinates:
        hospital?.lat && hospital?.lng ? { lat: hospital.lat, lng: hospital.lng } : null,
      // Live GPS wins over the static pickup-time coordinates the moment it's available;
      // pickup stays anchored to where the patient actually is either way.
      coordinates: liveCoordinates ?? emergency.coordinates,
      pickup: emergency.pickup ?? emergency.coordinates,
      speed: pickFirst(emergency.speed, liveLocation?.speed),
      heading: pickFirst(emergency.heading, liveLocation?.heading),
      lastUpdated: pickFirst(liveLocation?.updatedAt, emergency.lastUpdated),
      hasLiveGps: Boolean(liveCoordinates),
    };
  });
}
