import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, where } from "./firestoreCollection.js";

const analytics = createCollectionService(COLLECTIONS.analytics);

/** Response-time / duration records, written by the backend once an emergency completes. */
export async function listenToAnalytics(callback, onError) {
  return analytics.listen(callback, { constraints: [orderBy("createdAt", "desc")], onError });
}

export async function listenToAnalyticsByHospital(hospitalId, callback, onError) {
  return analytics.listen(callback, {
    constraints: [where("hospitalId", "==", hospitalId), orderBy("createdAt", "desc")],
    onError,
  });
}
