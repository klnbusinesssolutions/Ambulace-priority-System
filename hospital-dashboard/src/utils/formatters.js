export function formatDuration(minutes) {
  return `${minutes} min`;
}

// Turns a raw Firestore doc id into a friendly, stable "EMG001" style code.
// `index` should be the emergency's position when sorted oldest -> newest,
// so ids stay stable as new emergencies come in (they just get higher numbers).
export function formatEmergencyDisplayId(index) {
  if (index === undefined || index === null || index < 0) return 'EMG---';
  return `EMG${String(index + 1).padStart(3, '0')}`;
}

// Given the emergency's ambulanceId (a Firestore doc id) and the hospital's
// ambulances list, resolve the human-friendly number plate to show
// instead of the raw id. Falls back to registrationNumber, then raw id.
export function resolveAmbulanceLabel(ambulanceId, ambulances = []) {
  if (!ambulanceId) return '—';
  const match = ambulances.find((item) => item.id === ambulanceId);
  return match?.numberPlate || match?.registrationNumber || ambulanceId;
}