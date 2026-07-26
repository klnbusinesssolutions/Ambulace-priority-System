import { distanceKm } from "@/utils/geo";

// The requirement is "every police station within 5 km, large and small" -
// no artificial cap on how many come back, so results are never sliced down
// to a fixed count here. `radius` below is Google's search bias, not a hard
// cutoff (see the distanceKm filter in finalize()), so it's set to exactly
// the 5 km we actually want, and the real cutoff is enforced ourselves.
const SEARCH_RADIUS_METERS = 5000;
const SEARCH_RADIUS_KM = SEARCH_RADIUS_METERS / 1000;

// Google's Places API won't honor pagination.nextPage() immediately after a
// search - the next_page_token needs a moment to become valid server-side.
// Calling it too soon reliably returns INVALID_REQUEST, which used to mean
// we silently only ever saw the first ~20 results (Google returns up to 20
// per page, 60 total across 3 pages) and dropped every smaller/less
// prominent station past that.
const NEXT_PAGE_DELAY_MS = 2000;

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

function normalizeStation(place, coordinates) {
  if (!place.geometry?.location) return null;
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
}

/**
 * Finds every police station within 5 km of the given coordinate - police
 * chowkis and outposts included, not just large/prominent stations, since
 * Google's "police" place type covers all of them. Follows Places API
 * pagination (nextPage) so results aren't capped at Google's ~20-per-page
 * default; a dense area can easily have more than that within 5 km.
 * Returns [{ placeId, name, address, lat, lng, distanceKm }] sorted nearest-first.
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

    const collected = [];
    const seenPlaceIds = new Set();
    let settled = false;

    function finalize() {
      return collected
        // nearbySearch's `radius` is a soft bias, not a hard boundary -
        // Google can occasionally return a result just outside it, so the
        // real 5 km cutoff is enforced here using actual computed distance.
        .filter((station) => station.distanceKm <= SEARCH_RADIUS_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    function settleWith(stations) {
      if (settled) return;
      settled = true;
      resolve(stations);
    }

    function handlePage(results, status, pagination) {
      const { PlacesServiceStatus } = window.google.maps.places;

      if (status === PlacesServiceStatus.ZERO_RESULTS) {
        settleWith(finalize());
        return;
      }

      if (status !== PlacesServiceStatus.OK || !results) {
        // A later page failing shouldn't discard stations we already found -
        // only reject outright if we have nothing at all yet.
        if (collected.length > 0) {
          settleWith(finalize());
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
        return;
      }

      results.forEach((place) => {
        if (seenPlaceIds.has(place.place_id)) return;
        const station = normalizeStation(place, coordinates);
        if (!station) return;
        seenPlaceIds.add(place.place_id);
        collected.push(station);
      });

      if (pagination?.hasNextPage) {
        setTimeout(() => {
          if (!settled) pagination.nextPage();
        }, NEXT_PAGE_DELAY_MS);
      } else {
        settleWith(finalize());
      }
    }

    service.nearbySearch(
      {
        location: coordinates,
        radius: SEARCH_RADIUS_METERS,
        type: "police",
      },
      handlePage,
    );
  });
}
