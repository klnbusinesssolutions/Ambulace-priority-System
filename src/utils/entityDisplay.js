/**
 * Entity Display Utilities
 * Centralized helpers to convert technical entities into clean, operator-facing operational identifiers.
 */

/**
 * Returns a human-readable display ID for an Emergency incident.
 * e.g., "EMG-2026-000123" or "EMG-9T8P1A"
 */
export function getEmergencyDisplayId(emergency) {
  if (!emergency) return "EMG-UNKNOWN";
  if (typeof emergency === "string") {
    const s = emergency.trim();
    if (s.startsWith("EMG-")) return s;
    const cleanSuffix = s.length > 6 ? s.slice(-6).toUpperCase() : s.toUpperCase();
    return `EMG-${cleanSuffix}`;
  }
  if (emergency.referenceId) return emergency.referenceId;
  if (emergency.emergencyCode) return emergency.emergencyCode;
  if (emergency.publicId) return emergency.publicId;

  const rawId = String(emergency.id || "000000");
  const cleanSuffix = rawId.length > 6 ? rawId.slice(-6).toUpperCase() : rawId.toUpperCase();
  return `EMG-${cleanSuffix}`;
}

/**
 * Returns a human-readable identifier for an Ambulance.
 * e.g., "MH12AC1000" or "AMB-001"
 */
export function getAmbulanceDisplayId(ambulance) {
  if (!ambulance) return "Unit Pending";
  if (typeof ambulance === "string") return ambulance;
  if (ambulance.numberPlate) return ambulance.numberPlate;
  if (ambulance.registrationNumber) return ambulance.registrationNumber;
  if (ambulance.ambulanceCode) return ambulance.ambulanceCode;
  if (ambulance.fleetCode) return ambulance.fleetCode;

  const rawId = String(ambulance.id || "");
  const cleanSuffix = rawId.length > 4 ? rawId.slice(-4).toUpperCase() : rawId.toUpperCase();
  return `AMB-${cleanSuffix}`;
}

/**
 * Returns a human-readable identifier for a Driver.
 * e.g., "Md Faiz (DRV-001)" or "Md Faiz"
 */
export function getDriverDisplayId(driver) {
  if (!driver) return "Driver Unassigned";
  if (typeof driver === "string") return driver;
  const name = driver.fullName || driver.name || driver.driverName || "Driver";
  if (driver.driverCode) return `${name} (${driver.driverCode})`;
  if (driver.employeeId) return `${name} (${driver.employeeId})`;
  return name;
}

/**
 * Returns a human-readable identifier for a Hospital.
 * e.g., "Bharati Hospital" or "City General Hospital"
 */
export function getHospitalDisplayId(hospital) {
  if (!hospital) return "Assigned Hospital";
  if (typeof hospital === "string") return hospital;
  if (hospital.name) return hospital.name;
  if (hospital.hospitalName) return hospital.hospitalName;
  if (hospital.hospitalCode) return hospital.hospitalCode;

  const rawId = String(hospital.id || hospital.hospitalId || "");
  const cleanSuffix = rawId.length > 4 ? rawId.slice(-4).toUpperCase() : rawId.toUpperCase();
  return `HSP-${cleanSuffix}`;
}

/**
 * Returns a human-readable identifier for a Police Officer.
 * e.g., "Ayush Pathak (Badge: PNE-1042)"
 */
export function getOfficerDisplayId(officer) {
  if (!officer) return "Police Escort";
  if (typeof officer === "string") return officer;
  const name = officer.name || officer.officerName || officer.fullName || "Officer";
  const badge = officer.badgeId || officer.badgeNumber;
  if (badge) return `${name} (Badge: ${badge})`;
  return name;
}

/**
 * Resolves an ambulance ID or object to a human-readable vehicle number plate.
 */
export function resolveAmbulancePlate(ambulanceIdOrObj, ambulances = []) {
  if (!ambulanceIdOrObj) return "Unit Pending";
  if (typeof ambulanceIdOrObj === "object") {
    return ambulanceIdOrObj.numberPlate || ambulanceIdOrObj.registrationNumber || getAmbulanceDisplayId(ambulanceIdOrObj);
  }
  const str = String(ambulanceIdOrObj).trim();
  // Check if already a number plate format (e.g. MH12AC1000 or AMB-001)
  if (/^[A-Z0-9\s-]{4,12}$/i.test(str) && !str.includes(" ") && str.length < 12 && !/^[a-z0-9]{20,}$/i.test(str)) {
    return str;
  }
  // Lookup in loaded ambulances
  const found = (ambulances || []).find((a) => a.id === str || a.ambulanceId === str || a.numberPlate === str);
  if (found) {
    return found.numberPlate || found.registrationNumber || getAmbulanceDisplayId(found);
  }
  return getAmbulanceDisplayId(str);
}

/**
 * Resolves a driver ID or object to a human-readable driver name.
 */
export function resolveDriverName(driverIdOrObj, drivers = []) {
  if (!driverIdOrObj) return "Driver Assigned";
  if (typeof driverIdOrObj === "object") {
    return driverIdOrObj.name || driverIdOrObj.fullName || driverIdOrObj.driverName || getDriverDisplayId(driverIdOrObj);
  }
  const str = String(driverIdOrObj).trim();
  if (str.length < 20 && !/^[a-z0-9]{20,}$/i.test(str)) {
    return str; // likely already a name
  }
  const found = (drivers || []).find((d) => d.id === str || d.uid === str || d.driverId === str);
  if (found) {
    return found.name || found.fullName || found.driverName || getDriverDisplayId(found);
  }
  return getDriverDisplayId(str);
}

/**
 * Resolves a hospital ID or object to a human-readable hospital name.
 */
export function resolveHospitalName(hospitalIdOrObj, hospitals = []) {
  if (!hospitalIdOrObj) return "Assigned Hospital";
  if (typeof hospitalIdOrObj === "object") {
    return hospitalIdOrObj.name || hospitalIdOrObj.hospitalName || getHospitalDisplayId(hospitalIdOrObj);
  }
  const str = String(hospitalIdOrObj).trim();
  if (str.length < 15 && !/^[a-z0-9]{15,}$/i.test(str)) {
    return str; // likely already a name or code
  }
  const found = (hospitals || []).find((h) => h.id === str || h.hospitalId === str || h.name === str);
  if (found) {
    return found.name || found.hospitalName || getHospitalDisplayId(found);
  }
  return getHospitalDisplayId(str);
}
