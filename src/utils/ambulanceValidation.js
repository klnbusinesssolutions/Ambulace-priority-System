export const INDIAN_REGISTRATION_REGEX = /^[A-Z]{2}[- ]?[0-9]{1,2}[- ]?[A-Z]{1,3}[- ]?[0-9]{4}$/i;

export function validateRegistrationNumber(regNum) {
  if (!regNum || typeof regNum !== "string" || !regNum.trim()) {
    return "Registration number is required.";
  }
  const formatted = regNum.trim().toUpperCase();
  if (!INDIAN_REGISTRATION_REGEX.test(formatted)) {
    return "Please enter a valid Indian registration number (e.g. MH01AB1234).";
  }
  return null;
}

export function formatMedicalCapabilities(capabilities) {
  if (!capabilities) return [];
  if (Array.isArray(capabilities)) {
    return capabilities.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof capabilities === "string") {
    return capabilities.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export function validateAmbulanceForm(data) {
  const errors = {};

  if (!data.numberPlate || typeof data.numberPlate !== "string" || !data.numberPlate.trim()) {
    errors.numberPlate = "Number plate is required.";
  }

  const regErr = validateRegistrationNumber(data.registrationNumber);
  if (regErr) {
    errors.registrationNumber = regErr;
  }

  if (!data.manufacturer || typeof data.manufacturer !== "string" || !data.manufacturer.trim()) {
    errors.manufacturer = "Manufacturer is required.";
  }

  if (!data.model || typeof data.model !== "string" || !data.model.trim()) {
    errors.model = "Model is required.";
  }

  if (!data.vehicleType || typeof data.vehicleType !== "string" || !data.vehicleType.trim()) {
    errors.vehicleType = "Vehicle type is required.";
  }

  if (!data.capacity || typeof data.capacity !== "string" || !data.capacity.trim()) {
    errors.capacity = "Capacity is required.";
  }

  if (!data.hospitalId || typeof data.hospitalId !== "string" || !data.hospitalId.trim()) {
    errors.hospitalId = "Please select a hospital.";
  }

  if (!data.availability || typeof data.availability !== "string" || !data.availability.trim()) {
    errors.availability = "Availability is required.";
  }

  return errors;
}
