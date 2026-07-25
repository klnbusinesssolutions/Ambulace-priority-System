import { validateHospitalPassword } from "./passwordValidation.js";

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PHONE_REGEX = /^\d{10}$/;

export function validateHospitalEmail(email) {
  if (!email || typeof email !== "string" || !email.trim()) {
    return "Please enter a valid email address.";
  }
  if (!EMAIL_REGEX.test(email.trim())) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function validateHospitalPhone(phone) {
  if (!phone || typeof phone !== "string") {
    return "Phone number must contain exactly 10 digits.";
  }
  const trimmed = phone.trim();
  if (!PHONE_REGEX.test(trimmed)) {
    return "Phone number must contain exactly 10 digits.";
  }
  return null;
}

export function validateHospitalForm(data, isEdit = false) {
  const errors = {};

  if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
    errors.name = "Hospital name is required.";
  }

  const emailErr = validateHospitalEmail(data.email);
  if (emailErr) {
    errors.email = emailErr;
  }

  const phoneErr = validateHospitalPhone(data.phone);
  if (phoneErr) {
    errors.phone = phoneErr;
  }

  if (!isEdit) {
    const passErr = validateHospitalPassword(data.password);
    if (passErr) {
      errors.password = passErr;
    }
  }

  return errors;
}
