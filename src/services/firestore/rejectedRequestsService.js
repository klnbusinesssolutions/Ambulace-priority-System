import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService } from "./firestoreCollection.js";

const rejectedRequests = createCollectionService(COLLECTIONS.rejectedRequests);

export async function createRejectedRequest(request) {
  return rejectedRequests.setById(request.id, request);
}

export async function listenToRejectedRequests(callback, onError) {
  return rejectedRequests.listen(callback, { onError });
}

export async function removeRejectedRequest(id) {
  return rejectedRequests.remove(id);
}