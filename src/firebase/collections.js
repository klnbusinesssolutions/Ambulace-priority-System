// Collection names, doc-id conventions, and enum values as defined in the
// project's Firestore schema (fire_base_schema.docx). Keep this file in sync
// with that document — every service in src/services/firestore reads from it.

export const COLLECTIONS = {
  admins: "admins", // doc id = {uid}
  hospitals: "hospitals", // doc id = {hospitalId}
  drivers: "drivers", // doc id = auto, written by the Android driver app
  pendingDrivers: "pending_drivers", // doc id = auto, written by the hospital dashboard
  pendingAmbulances: "pending_ambulances", // doc id = auto, written by the hospital dashboard
  ambulances: "ambulances",
  emergencies: "emergencies", // doc id = "EMG001" style or auto
  liveLocations: "live_locations", // doc id = {ambulanceId}
  notifications: "notifications", // doc id = auto
  activityLogs: "activity_logs", // doc id = auto
  analytics: "analytics", // doc id = auto
  rejectedRequests: "rejected_requests",
  // Police officers get their own Firebase Auth accounts, separate from
  // hospital/company `admins`. "pending_police_officers" holds Register-page
  // submissions from the police dashboard; approving one is manual (create the
  // Auth user in the Firebase Console, then this page writes the profile doc).
  pendingPoliceOfficers: "pending_police_officers",
  policeOfficers: "police_officers",
};

export const ADMIN_ROLES = {
  hospitalAdmin: "hospital_admin",
  superAdmin: "super_admin",
};

// This dashboard is the company-owned super admin console — only accounts
// with this role in `admins` are allowed to sign in here.
export const REQUIRED_ADMIN_ROLE = ADMIN_ROLES.superAdmin;

export const VERIFICATION_STATUS = {
  pending: "pending",
  approved: "approved",
  rejected: "rejected",
  resubmissionRequired: "resubmission_required",
};

export const VERIFICATION_STATUS_LABELS = {
  [VERIFICATION_STATUS.pending]: "Pending",
  [VERIFICATION_STATUS.approved]: "Approved",
  [VERIFICATION_STATUS.rejected]: "Rejected",
  [VERIFICATION_STATUS.resubmissionRequired]: "Resubmission Required",
};

export const DRIVER_AVAILABILITY = {
  available: "available",
  onTrip: "on_trip",
  offline: "offline",
};

export const TRIP_STATUS = {
  idle: "idle",
  onTrip: "on_trip",
  completed: "completed",
};

export const AMBULANCE_VEHICLE_TYPES = ["ICU", "Basic", "Cardiac", "Ventilator"];
export const AMBULANCE_CAPACITIES = ["12 Seater", "17 Seater"];

export const EMERGENCY_STATUS = {
  active: "active",
  dispatched: "dispatched",
  arrived: "arrived",
  completed: "completed",
  resolved: "resolved",
};

export const EMERGENCY_PRIORITY = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
};

export const NOTIFICATION_TYPES = {
  driverApproved: "driver_approved",
  driverRejected: "driver_rejected",
  ambulanceApproved: "ambulance_approved",
  ambulanceRejected: "ambulance_rejected",
  resubmissionRequired: "resubmission_required",
};

export const NOTIFICATION_LABELS = {
  [NOTIFICATION_TYPES.driverApproved]: "Driver Approved",
  [NOTIFICATION_TYPES.driverRejected]: "Driver Rejected",
  [NOTIFICATION_TYPES.ambulanceApproved]: "Ambulance Approved",
  [NOTIFICATION_TYPES.ambulanceRejected]: "Ambulance Rejected",
  [NOTIFICATION_TYPES.resubmissionRequired]: "Resubmission Required",
};
