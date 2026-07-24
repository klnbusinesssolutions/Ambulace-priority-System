// Shared across every useJsApiLoader call in the app. @react-google-maps/api
// keys its loaded script by `id`, and throws if the same id is ever requested
// with a different `libraries` array - so both MapContainer (live map) and
// Register (nearby station lookup) must import these same constants instead
// of declaring their own inline arrays.

export const GOOGLE_MAPS_LOADER_ID = "police-dashboard-google-maps";

// Module-level constant so the array reference never changes between renders
// (useJsApiLoader expects a stable reference for `libraries`).
export const GOOGLE_MAPS_LIBRARIES = ["places"];
