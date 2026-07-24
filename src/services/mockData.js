// Demo-mode fallback data. Field names mirror the live Firestore schema
// exactly (fire_base_schema.docx) so the UI behaves identically whether it's
// reading this or real Firestore documents. Only used when
// VITE_FIREBASE_* env vars aren't configured (see firebase/client.js).

export const demoHospitals = [
  { id: "HSP01", hospitalId: "HSP01", name: "Bharati Hospital", address: "Pune, Maharashtra", phone: "9702408100", email: "hospital@gmail.com", city: "Pune", state: "Maharashtra", isActive: true, createdAt: "2026-01-10T09:00:00+05:30" },
  { id: "HSP02", hospitalId: "HSP02", name: "Apollo Metro Care", address: "Bengaluru, Karnataka", phone: "9845012345", email: "apollo@gmail.com", city: "Bengaluru", state: "Karnataka", isActive: true, createdAt: "2026-01-12T09:00:00+05:30" },
  { id: "HSP03", hospitalId: "HSP03", name: "Central City Children", address: "Toronto, Ontario", phone: "4165550198", email: "cchildren@gmail.com", city: "Toronto", state: "Ontario", isActive: false, createdAt: "2026-02-02T09:00:00+05:30" },
];

export const demoPendingPoliceOfficers = [
  {
    id: "PPOL-201",
    requestType: "police_officer",
    status: "pending",
    badgeId: "P-8842",
    name: "Inspector Vikram Singh",
    email: "vikram.singh@police.gov.in",
    phone: "9820011223",
    department: "Traffic & Emergency Control",
    station: { name: "Shivajinagar Police Station", lat: 18.5314, lng: 73.8446 },
    serviceRadiusKm: 10,
    requestedAt: "2026-07-03T08:30:00+05:30",
  },
  {
    id: "PPOL-202",
    requestType: "police_officer",
    status: "pending",
    badgeId: "P-7719",
    name: "Officer Ananya Roy",
    email: "ananya.roy@police.gov.in",
    phone: "9831122334",
    department: "Highway Patrol & Response",
    station: { name: "Koramangala Station", lat: 12.9352, lng: 77.6245 },
    serviceRadiusKm: 8,
    requestedAt: "2026-07-02T15:45:00+05:30",
  },
  {
    id: "PPOL-203",
    requestType: "police_officer",
    status: "rejected",
    badgeId: "P-5501",
    name: "Sub-Inspector Rajesh Kumar",
    email: "rajesh.k@police.gov.in",
    phone: "9819988776",
    department: "City Safety",
    station: { name: "Central Station", lat: 18.5204, lng: 73.8567 },
    serviceRadiusKm: 5,
    rejectionReason: "Invalid badge documentation uploaded.",
    requestedAt: "2026-06-28T10:00:00+05:30",
    updatedAt: "2026-06-29T09:30:00+05:30",
  },
];

export const demoPendingDrivers = [
  {
    id: "PDRV-1042", hospitalId: "HSP01", requestType: "driver", status: "pending",
    fullName: "Prasoon Ranjan", driverName: "Prasoon Ranjan", email: "driver@gmail.com", phone: "9702408100",
    aadhaarNumber: "789654123", licenseNumber: "MH01AB1234", licenseExpiry: "2026-05-30",
    emergencyContact: "9702408100", streetAddress: "Haria Park", city: "Pune", state: "Maharashtra", pincode: "411001",
    availability: "available",
    documents: {
      aadhaar: { downloadUrl: "", path: "", contentType: "application/pdf", name: "aadhaar.pdf", size: 204800 },
      drivingLicence: { downloadUrl: "", path: "", contentType: "application/pdf", name: "licence.pdf", size: 184320 },
    },
    rejectionReason: null, adminReviewMessage: "", submittedBy: "hospital_admin_demo",
    submittedAt: "2026-06-26T04:35:00+05:30", updatedAt: "2026-06-26T04:35:00+05:30",
    approvedAt: null, resubmittedAt: null,
  },
  {
    id: "PDRV-1188", hospitalId: "HSP02", requestType: "driver", status: "resubmission_required",
    fullName: "Maya Ortiz", driverName: "Maya Ortiz", email: "maya.ortiz@example.com", phone: "9845012399",
    aadhaarNumber: "N/A", licenseNumber: "KA03-2021-7788123", licenseExpiry: "2027-01-15",
    emergencyContact: "9845012399", streetAddress: "MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001",
    availability: "offline",
    documents: {
      aadhaar: { downloadUrl: "", path: "", contentType: "application/pdf", name: "identity.pdf", size: 122880 },
      drivingLicence: { downloadUrl: "", path: "", contentType: "application/pdf", name: "licence.pdf", size: 143360 },
    },
    rejectionReason: "Licence scan is blurry, please resubmit.", adminReviewMessage: "", submittedBy: "hospital_admin_demo",
    submittedAt: "2026-06-25T18:10:00+05:30", updatedAt: "2026-06-27T10:00:00+05:30",
    approvedAt: null, resubmittedAt: null,
  },
];

// Shape matches driversService.normalizeDriver() output, since live data
// passes through that normalizer before reaching the UI.
export const demoDrivers = [
  {
    id: "DRV001", hospitalId: "HSP01", hospitalName: "Bharati Hospital", name: "Rahul Sharma",
    email: "rahul.sharma@example.com", phone: "9876541042", role: "Driver", gender: "Male",
    city: "Pune", state: "Maharashtra", availability: "available", documents: "Verified",
    location: { latitude: 18.45792, longitude: 73.8480317, accuracy: 5, source: "android_foreground_service", updatedAt: "2026-07-03T08:40:00+05:30" },
    tripStatus: "idle", tripCompletedAt: null, tripStatusUpdatedAt: "2026-07-03T08:40:00+05:30",
  },
  {
    id: "DRV002", hospitalId: "HSP02", hospitalName: "Apollo Metro Care", name: "Maya Ortiz",
    email: "maya.ortiz@example.com", phone: "9845012399", role: "Driver", gender: "Female",
    city: "Bengaluru", state: "Karnataka", availability: "on_trip", documents: "Verified",
    location: { latitude: 12.9716, longitude: 77.5946, accuracy: 6, source: "android_foreground_service", updatedAt: "2026-07-03T08:41:30+05:30" },
    tripStatus: "on_trip", tripCompletedAt: null, tripStatusUpdatedAt: "2026-07-03T08:41:30+05:30",
  },
];

export const demoPendingAmbulances = [
  {
    id: "PAMB-01", hospitalId: "HSP01", requestType: "ambulance", status: "approved",
    numberPlate: "MH01AB1234", manufacturer: "Force", model: "Traveller", registrationNumber: "MH01AB1234",
    vehicleType: "ICU", capacity: "12 Seater", medicalCapabilities: ["Oxygen Support", "Ventilator"],
    assignedDrivers: ["DRV001"], activeDriverId: "DRV001", availability: "available",
    documents: {
      rcBook: { downloadUrl: "", path: "", contentType: "application/pdf", name: "rc.pdf", size: 102400 },
      insurance: { downloadUrl: "", path: "", contentType: "application/pdf", name: "insurance.pdf", size: 102400 },
      puc: { downloadUrl: "", path: "", contentType: "application/pdf", name: "puc.pdf", size: 51200 },
      vehiclePhoto: { downloadUrl: "", path: "", contentType: "image/jpeg", name: "vehicle.jpg", size: 204800 },
    },
    rejectionReason: null, adminReviewMessage: "", submittedBy: "hospital_admin_demo",
    submittedAt: "2026-06-20T09:00:00+05:30", updatedAt: "2026-06-21T09:00:00+05:30", approvedAt: "2026-06-21T09:00:00+05:30",
  },
  {
    id: "PAMB-02", hospitalId: "HSP02", requestType: "ambulance", status: "pending",
    numberPlate: "KA03CD5678", manufacturer: "Tata", model: "Winger", registrationNumber: "KA03CD5678",
    vehicleType: "Cardiac", capacity: "17 Seater", medicalCapabilities: ["Defibrillator", "Cardiac Monitor"],
    assignedDrivers: [], activeDriverId: null, availability: "offline",
    documents: {
      rcBook: { downloadUrl: "", path: "", contentType: "application/pdf", name: "rc.pdf", size: 102400 },
      insurance: { downloadUrl: "", path: "", contentType: "application/pdf", name: "insurance.pdf", size: 102400 },
      puc: { downloadUrl: "", path: "", contentType: "application/pdf", name: "puc.pdf", size: 51200 },
      vehiclePhoto: { downloadUrl: "", path: "", contentType: "image/jpeg", name: "vehicle.jpg", size: 204800 },
    },
    rejectionReason: null, adminReviewMessage: "", submittedBy: "hospital_admin_demo",
    submittedAt: "2026-06-29T09:00:00+05:30", updatedAt: "2026-06-29T09:00:00+05:30", approvedAt: null,
  },
];

export const demoEmergencies = [
  {
    id: "EMG001", hospitalId: "HSP01", ambulanceId: "AMB001", driverId: "DRV001", driverName: "Rahul Sharma",
    patientName: "Travis Head", incidentType: "Cardiac Arrest", status: "dispatched", priority: "critical", eta: "8 mins",
    location: { latitude: 18.5204, longitude: 73.8567 }, startTime: "2026-07-03T08:20:00+05:30", completedAt: null,
  },
  {
    id: "EMG002", hospitalId: "HSP02", ambulanceId: "AMB002", driverId: "DRV002", driverName: "Maya Ortiz",
    patientName: "Steve Smith", incidentType: "Road Accident", status: "arrived", priority: "high", eta: "0 mins",
    location: { latitude: 12.9716, longitude: 77.5946 }, startTime: "2026-07-03T07:50:00+05:30", completedAt: null,
  },
];

export const demoLiveLocations = [
  { id: "AMB001", ambulanceId: "AMB001", driverUid: "DRV001", hospitalId: "HSP01", lat: 18.5204, lng: 73.8567, speed: 45, heading: 120, updatedAt: "2026-07-03T08:41:00+05:30" },
  { id: "AMB002", ambulanceId: "AMB002", driverUid: "DRV002", hospitalId: "HSP02", lat: 12.9716, lng: 77.5946, speed: 52, heading: 90, updatedAt: "2026-07-03T08:41:30+05:30" },
  { id: "AMB003", ambulanceId: "AMB003", driverUid: "DRV001", hospitalId: "HSP01", lat: 18.4579, lng: 73.8480, speed: 0, heading: 0, updatedAt: "2026-07-03T08:45:00+05:30" },
];

export const demoNotifications = [
  { id: "NTF001", hospitalId: "HSP01", type: "driver_approved", title: "Driver Approved", message: "Your driver has been approved", read: false, createdAt: "2026-07-03T07:00:00+05:30" },
  { id: "NTF002", hospitalId: "HSP02", type: "ambulance_rejected", title: "Ambulance Rejected", message: "Ambulance KA03CD5678 documents need review", read: true, createdAt: "2026-07-02T18:00:00+05:30" },
];

export const demoActivityLogs = [
  { id: "LOG001", hospitalId: "HSP01", action: "driver_approved", performedBy: "demo-admin", targetId: "PDRV-0900", details: "Driver Rahul Sharma approved", createdAt: "2026-07-03T07:00:00+05:30" },
  { id: "LOG002", hospitalId: "HSP02", action: "ambulance_rejected", performedBy: "demo-admin", targetId: "PAMB-02", details: "Ambulance KA03CD5678 rejected: insurance expired", createdAt: "2026-07-02T18:00:00+05:30" },
];

export const demoAnalytics = [
  { id: "AN001", hospitalId: "HSP01", hospitalName: "Bharati Hospital", emergencyId: "EMG001", driverId: "DRV001", driverName: "Rahul Sharma", ambulanceId: "AMB001", responseTime: 8, totalDuration: 45, priority: "critical", incidentType: "Cardiac Arrest", createdAt: "2026-07-03T09:00:00+05:30" },
  { id: "AN002", hospitalId: "HSP02", hospitalName: "Apollo Metro Care", emergencyId: "EMG002", driverId: "DRV002", driverName: "Maya Ortiz", ambulanceId: "AMB002", responseTime: 12, totalDuration: 38, priority: "high", incidentType: "Road Accident", createdAt: "2026-07-02T14:30:00+05:30" },
  { id: "AN003", hospitalId: "HSP01", hospitalName: "Bharati Hospital", emergencyId: "EMG003", driverId: "DRV001", driverName: "Rahul Sharma", ambulanceId: "AMB001", responseTime: 6, totalDuration: 28, priority: "medium", incidentType: "Stroke", createdAt: "2026-07-01T11:20:00+05:30" },
  { id: "AN004", hospitalId: "HSP03", hospitalName: "Central City Children", emergencyId: "EMG004", driverId: "DRV002", driverName: "Maya Ortiz", ambulanceId: "AMB002", responseTime: 15, totalDuration: 52, priority: "critical", incidentType: "Respiratory Distress", createdAt: "2026-06-30T16:15:00+05:30" },
  { id: "AN005", hospitalId: "HSP02", hospitalName: "Apollo Metro Care", emergencyId: "EMG005", driverId: "DRV001", driverName: "Rahul Sharma", ambulanceId: "AMB001", responseTime: 9, totalDuration: 35, priority: "low", incidentType: "Minor Injury", createdAt: "2026-06-29T10:45:00+05:30" },
  { id: "AN006", hospitalId: "HSP01", hospitalName: "Bharati Hospital", emergencyId: "EMG006", driverId: "DRV001", driverName: "Rahul Sharma", ambulanceId: "AMB001", responseTime: 7, totalDuration: 40, priority: "critical", incidentType: "Trauma", createdAt: "2026-06-28T08:15:00+05:30" },
];

export const systemPanels = [
  { label: "Firestore", status: "Online", metric: "Demo mode", helper: "Connect VITE_FIREBASE_* env vars for live data" },
  { label: "Notifications", status: "Online", metric: `${demoNotifications.length} recent`, helper: "notifications collection" },
  { label: "Live Tracking", status: "Online", metric: `${demoLiveLocations.length} ambulances`, helper: "live_locations collection" },
  { label: "Analytics Pipeline", status: "Online", metric: `${demoAnalytics.length} records`, helper: "analytics collection" },
];

export const verificationTrend = [
  { day: "Mon", approvals: 4, rejections: 1 },
  { day: "Tue", approvals: 6, rejections: 0 },
  { day: "Wed", approvals: 3, rejections: 2 },
  { day: "Thu", approvals: 7, rejections: 1 },
  { day: "Fri", approvals: 5, rejections: 1 },
  { day: "Sat", approvals: 2, rejections: 0 },
  { day: "Sun", approvals: 1, rejections: 0 },
];
