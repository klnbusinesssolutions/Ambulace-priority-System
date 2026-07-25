// Central place for all form-field validation rules used across
// registration forms (driver, ambulance, etc.)

export const PATTERNS = {
  phone: /^[6-9]\d{9}$/, // 10 digit Indian mobile, starts 6-9
  aadhaar: /^\d{12}$/,
  license: /^[A-Za-z]{2}\d{2}\s?\d{4}\d{7}$|^[A-Za-z0-9]{10,16}$/, // flexible DL formats
  pincode: /^\d{6}$/,
  numberPlate: /^[A-Za-z]{2}\s?\d{1,2}\s?[A-Za-z]{0,2}\s?\d{3,4}$/, // e.g. GJ 15 AB 1234
  registrationNumber: /^[A-Za-z0-9\-\/]{6,20}$/,
};

export function validateField(field, value) {
  const trimmed = (value || '').toString().trim();

  switch (field) {
    case 'phone':
    case 'emergencyContact':
      if (!trimmed) return 'This field is required';
      if (!PATTERNS.phone.test(trimmed)) return 'Enter a valid 10-digit phone number';
      return '';

    case 'aadhaarNumber':
      if (!trimmed) return 'This field is required';
      if (!PATTERNS.aadhaar.test(trimmed.replace(/\s/g, ''))) return 'Aadhaar number must be exactly 12 digits';
      return '';

    case 'licenseNumber':
      if (!trimmed) return 'This field is required';
      if (trimmed.length < 8) return 'License number looks too short';
      if (!/^[A-Za-z0-9\-\s]{8,20}$/.test(trimmed)) return 'Enter a valid license number';
      return '';

    case 'licenseExpiry': {
      if (!trimmed) return 'This field is required';
      const expiry = new Date(trimmed);
      if (Number.isNaN(expiry.getTime())) return 'Enter a valid date';
      if (expiry < new Date()) return 'License has expired';
      return '';
    }

    case 'pincode':
      if (trimmed && !PATTERNS.pincode.test(trimmed)) return 'Pincode must be exactly 6 digits';
      return '';

    case 'email':
      if (!trimmed) return 'This field is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Enter a valid email address';
      return '';

    case 'numberPlate':
      if (!trimmed) return 'This field is required';
      if (!PATTERNS.numberPlate.test(trimmed)) return 'Enter a valid number plate (e.g. GJ 15 AB 1234)';
      return '';

    case 'registrationNumber':
      if (!trimmed) return 'This field is required';
      if (!PATTERNS.registrationNumber.test(trimmed)) return 'Enter a valid registration number';
      return '';

    case 'fullName':
      if (!trimmed) return 'This field is required';
      if (trimmed.length < 3) return 'Name must be at least 3 characters';
      return '';

    default:
      if (!trimmed) return 'This field is required';
      return '';
  }
}

// Runs validateField across an object of { field: value } and returns
// { field: errorMessage } only for fields that have errors.
export function validateForm(values, fields) {
  const errors = {};
  fields.forEach((field) => {
    const message = validateField(field, values[field]);
    if (message) errors[field] = message;
  });
  return errors;
}