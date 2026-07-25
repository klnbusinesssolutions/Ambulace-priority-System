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
    // The Android driver app's Driver type uses capitalized keys ('Name', 'Phone
    // Number') - see AmbulanceDriverApp/App.tsx. That's why phone was showing "--":
    // raw.phone/raw.phoneNumber never matched the real field name.
    name: pickFirst(raw.name, raw.driverName, raw.fullName, raw.Name),
    phone: pickFirst(raw.phone, raw.phoneNumber, raw.contactNumber, raw.mobile, raw.driverPhone, raw["Phone Number"]),
    vehicleNumber: pickFirst(raw.vehicleNumber, raw.ambulanceNumber, raw.registrationNumber, raw.regNumber),
    // The driver app writes its live GPS ping directly onto drivers/{driverId}.location
    // (lat/lng + updatedAt) - NOT into a separate live_locations/{ambulanceId} doc, even
    // though that's what the schema doc + rest of the dashboards assume. Keep this around
    // so emergencyEnrichment.js can fall back to it when live_locations has nothing.
    location: raw.location,
    // Written by the driver app as they tap through a trip: going_to_patient ->
    // reached_patient -> patient_onboard -> near_hospital -> trip_completed.
    // tripAlertWatcher.js already keys off this same field; the police Trip
    // Timeline (DetailsDrawer.jsx) reads it too so the timeline actually
    // advances with what the driver is doing instead of being stuck.
    tripStatus: raw.tripStatus,
  };
}

// `ambulances` docs (this project's real schema: numberPlate, model, capacity...),
// keyed by ambulanceId. Joined onto the matching emergency by emergency.ambulanceId.
export function normalizeAmbulanceRecord(raw) {
  return {
    ...raw,
    numberPlate: pickFirst(raw.numberPlate, raw.number, raw.plateNumber, raw.registrationNumber, raw.vehicleNumber),
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

function findLiveLocation(emergency, liveLocationsByDriverId, liveLocationsByTripId, driver) {
  // drivers/{driverId}.location is the authoritative live GPS source - it's the only
  // place the Android driver app actually writes GPS pings (see AmbulanceDriverApp/
  // App.tsx). live_locations is part of the documented schema but nothing writes to
  // it in practice, so check the driver doc first and only fall back to the
  // live_locations collection if a driver has no location field yet.
  if (driver?.location) {
    return normalizeLiveLocationRecord({ location: driver.location, driverId: driver.id }, driver.id);
  }

  return (
    liveLocationsByDriverId.get(emergency.driverId) ??
    liveLocationsByTripId.get(emergency.id) ??
    liveLocationsByTripId.get(emergency.tripId) ??
    null
  );
}

/**
 * Joins the raw (already-`normalizeEmergencyRecord`-passed) emergency list with
 * drivers / live GPS pings / hospitals. Safe to call with empty arrays before the
 * other collections have loaded yet - falls back to whatever normalizeEmergencyRecord
 * already produced.
 */
export function enrichEmergencies(emergencies, { drivers = [], liveLocations = [], hospitals = [], ambulances = [] } = {}) {
  const driversById = new Map(drivers.map((driver) => [driver.id, driver]));
  const ambulancesById = new Map(ambulances.map((ambulance) => [ambulance.id, ambulance]));
  const hospitalsById = new Map(hospitals.map((hospital) => [hospital.id, hospital]));
  const liveLocationsByDriverId = new Map(liveLocations.filter((l) => l.driverId).map((l) => [l.driverId, l]));
  const liveLocationsByTripId = new Map(liveLocations.filter((l) => l.tripId).map((l) => [l.tripId, l]));

  return emergencies.map((emergency) => {
    const driver = driversById.get(emergency.driverId);
    // The ambulance the emergency is assigned to - try emergency.ambulanceId first,
    // fall back to the driver's own ambulanceId if the driver doc links to one.
    const ambulance = ambulancesById.get(emergency.ambulanceId) ?? ambulancesById.get(driver?.ambulanceId);
    const hospital = hospitalsById.get(emergency.hospitalId);
    const liveLocation = findLiveLocation(emergency, liveLocationsByDriverId, liveLocationsByTripId, driver);
    const liveCoordinates = liveLocation?.coordinates ?? null;

    return {
      ...emergency,
      driverName: pickFirst(emergency.driverName, driver?.name),
      driverPhone: pickFirst(emergency.driverPhone, driver?.phone),
      // Real number plate from the ambulances collection wins; only fall back to a
      // driver-doc vehicle number or a raw id if no ambulances doc matched.
      ambulanceNumber: pickFirst(ambulance?.numberPlate, emergency.ambulanceNumber, driver?.vehicleNumber, emergency.driverId),
      // Driver's own trip-progress tap (see normalizeDriverRecord) - drives the Trip Timeline.
      tripStatus: driver?.tripStatus,
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
