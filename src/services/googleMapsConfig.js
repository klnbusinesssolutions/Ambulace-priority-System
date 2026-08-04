// Shared across every useJsApiLoader call in the app. @react-google-maps/api
// keys its loaded script by `id`, and throws if the same id is ever requested
// with a different `libraries` array - so LiveTracking, HospitalForm, and
// other components must import these same constants.

export const GOOGLE_MAPS_LOADER_ID = "admin-dashboard-google-maps";

// Module-level constant so the array reference never changes between renders
export const GOOGLE_MAPS_LIBRARIES = ["places"];
