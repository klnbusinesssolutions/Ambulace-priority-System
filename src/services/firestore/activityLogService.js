import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp, where } from "./firestoreCollection.js";

const activityLogs = createCollectionService(COLLECTIONS.activityLogs);

export async function listenToActivityLogs(callback, onError) {
  return activityLogs.listen(callback, { constraints: [orderBy("createdAt", "desc")], onError });
}

export async function listenToActivityLogsByHospital(hospitalId, callback, onError) {
  return activityLogs.listen(callback, {
    constraints: [where("hospitalId", "==", hospitalId), orderBy("createdAt", "desc")],
    onError,
  });
}

export async function createActivityLog({ hospitalId, action, performedBy, targetId, details }) {
  try {
    return await activityLogs.add({
      hospitalId,
      action,
      performedBy,
      targetId,
      details,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Activity logging should never block the primary action it's recording.
    console.error("Failed to write activity log:", error);
    return null;
  }
}
