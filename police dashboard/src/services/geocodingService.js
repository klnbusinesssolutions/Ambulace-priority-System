// Resolves a real lat/lng from a hospital's `address` text field via the Google
// Geocoding API. Some hospital docs in Firestore carry stale/placeholder lat/lng
// (e.g. seed data pointing at a generic city-center point), so `address` is treated
// as the source of truth for where a hospital actually is - `lat`/`lng` on the doc
// are only used as a last-resort fallback if geocoding fails or hasn't loaded yet.

let sharedGeocoder = null;
function getGeocoder() {
  if (sharedGeocoder) return sharedGeocoder;
  if (!window.google?.maps) throw new Error("Google Maps JS API is not loaded yet.");
  sharedGeocoder = new window.google.maps.Geocoder();
  return sharedGeocoder;
}

// address -> Promise<{lat,lng}|null>, so repeated hospitals sharing an address (or
// re-renders) don't re-request the same geocode over and over during a session.
const geocodeCache = new Map();

export function geocodeAddress(address) {
  if (!address) return Promise.resolve(null);
  if (geocodeCache.has(address)) return geocodeCache.get(address);

  const promise = new Promise((resolve) => {
    let geocoder;
    try {
      geocoder = getGeocoder();
    } catch {
      // Google Maps script (loaded by the map component) may not be ready yet -
      // don't cache this as a permanent failure, just resolve null for now.
      geocodeCache.delete(address);
      resolve(null);
      return;
    }

    geocoder.geocode({ address }, (results, status) => {
      if (status !== "OK" || !results?.[0]) {
        geocodeCache.delete(address);
        resolve(null);
        return;
      }
      const location = results[0].geometry.location;
      resolve({ lat: location.lat(), lng: location.lng() });
    });
  });

  geocodeCache.set(address, promise);
  return promise;
}
