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

  let rawLat =
    raw.lat ??
    raw.latitude ??
    raw.location?.lat ??
    raw.location?.latitude ??
    (typeof raw.location?.latitude === "number" ? raw.location.latitude : undefined) ??
    (typeof raw.location?._lat === "number" ? raw.location._lat : undefined);

  let rawLng =
    raw.lng ??
    raw.longitude ??
    raw.location?.lng ??
    raw.location?.longitude ??
    (typeof raw.location?.longitude === "number" ? raw.location.longitude : undefined) ??
    (typeof raw.location?._long === "number" ? raw.location._long : undefined);

  const lat = toValidNumber(rawLat);
  const lng = toValidNumber(rawLng);

  return {
    ...raw,
    id: raw.id,
    ambulanceId: raw.ambulanceId || raw.id,
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

