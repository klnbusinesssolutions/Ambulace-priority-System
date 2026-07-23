import { distanceKm } from "@/utils/geo";

const SEARCH_RADIUS_METERS = 8000; // how far out we look for candidate stations
const MAX_RESULTS = 8;

let sharedPlacesService = null;

// PlacesService needs a google.maps.Map instance to attach to, even though we
// never actually show that map - it's just how the legacy Places library
// works. We create one hidden div once and reuse it for every search.
function getPlacesService() {
  if (sharedPlacesService) return sharedPlacesService;

  if (!window.google?.maps?.places) {
    throw new Error("Google Maps Places library is not loaded yet.");
  }

  const hiddenDiv = document.createElement("div");
  const dummyMap = new window.google.maps.Map(hiddenDiv, {
    center: { lat: 0, lng: 0 },
    zoom: 2,
  });

  sharedPlacesService = new window.google.maps.places.PlacesService(dummyMap);
  return sharedPlacesService;
}

/**
 * Finds nearby police stations around a given coordinate, sorted nearest-first.
 * Returns [{ placeId, name, address, lat, lng, distanceKm }]
 */
export function findNearbyPoliceStations(coordinates) {
  return new Promise((resolve, reject) => {
    let service;
    try {
      service = getPlacesService();
    } catch (error) {
      reject(error);
      return;
    }

    service.nearbySearch(
      {
        location: coordinates,
        radius: SEARCH_RADIUS_METERS,
        type: "police",
      },
      (results, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results) {
          if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
            return;
          }
          reject(new Error(`Places search failed: ${status}`));
          return;
        }

        const stations = results
          .filter((place) => place.geometry?.location)
          .map((place) => {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            return {
              placeId: place.place_id,
              name: place.name,
              address: place.vicinity ?? "",
              lat,
              lng,
              distanceKm: distanceKm(coordinates, { lat, lng }),
            };
          })
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .slice(0, MAX_RESULTS);

        resolve(stations);
      },
    );
  });
}
