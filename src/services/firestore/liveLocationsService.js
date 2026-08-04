import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService, where } from "./firestoreCollection.js";

const liveLocations = createCollectionService(COLLECTIONS.liveLocations);

function toValidNumber(val) {
  if (typeof val === "number" && !isNaN(val)) {
    return val;
  }
  if (typeof val === "string" && val.trim() !== "") {
    const num = Number(val);
    if (!isNaN(num)) return num;
  }
  return undefined;
}

export function normalizeLiveLocation(raw) {
  if (!raw) return raw;

  // Key normalization: ensure keys with trailing/leading whitespace from Firestore documents are trimmed
  const cleanRaw = {};
  for (const [key, val] of Object.entries(raw)) {
    cleanRaw[key.trim()] = val;
  }

  const extractCoordinateValue = (val1, val2, val3) => {
    for (const val of [val1, val2, val3]) {
      if (typeof val === "number" && !isNaN(val)) return val;
      if (typeof val === "string" && val.trim() !== "") {
        const num = Number(val);
        if (!isNaN(num)) return num;
      }
      if (typeof val === "function") {
        const num = Number(val());
        if (!isNaN(num)) return num;
      }
    }
    return undefined;
  };

  const getCoords = (obj) => {
    if (!obj) return { lat: undefined, lng: undefined };
    let lat = extractCoordinateValue(obj.lat, obj.latitude, obj._lat);
    let lng = extractCoordinateValue(obj.lng, obj.longitude, obj._long ?? obj._lng);
    if (lat !== undefined && lng !== undefined) return { lat, lng };

    const nested = obj.location || obj.coordinates || obj.geopoint || obj.position;
    if (nested) {
      lat = extractCoordinateValue(nested.lat, nested.latitude, nested._lat);
      lng = extractCoordinateValue(nested.lng, nested.longitude, nested._long ?? nested._lng);
      if (lat !== undefined && lng !== undefined) return { lat, lng };
    }
    return { lat: undefined, lng: undefined };
  };

  const { lat, lng } = getCoords(cleanRaw);

  return {
    ...cleanRaw,
    id: cleanRaw.id || raw.id,
    ambulanceId: cleanRaw.ambulanceId || cleanRaw.id || raw.id,
    lat,
    lng,
  };
}

/** Doc id === ambulanceId. Written by the driver's Android app. */
export async function listenToLiveLocations(callback, onError) {
  return liveLocations.listen(
    (rows) => callback(rows.map(normalizeLiveLocation)),
    { onError },
  );
}

export async function listenToLiveLocationsByHospital(hospitalId, callback, onError) {
  return liveLocations.listen(
    (rows) => callback(rows.map(normalizeLiveLocation)),
    {
      constraints: [where("hospitalId", "==", hospitalId)],
      onError,
    },
  );
}

export async function getLiveLocation(ambulanceId) {
  const docData = await liveLocations.getById(ambulanceId);
  return docData ? normalizeLiveLocation(docData) : null;
}

