import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp, where } from "./firestoreCollection.js";

const notifications = createCollectionService(COLLECTIONS.notifications);

export async function listenToNotifications(callback, onError) {
  return notifications.listen(callback, { constraints: [orderBy("createdAt", "desc")], onError });
}

export async function listenToNotificationsByHospital(hospitalId, callback, onError) {
  return notifications.listen(callback, {
    constraints: [where("hospitalId", "==", hospitalId), orderBy("createdAt", "desc")],
    onError,
  });
}

export async function createNotification({ hospitalId, type, title, message }) {
  return notifications.add({
    hospitalId,
    type,
    title,
    message,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function markNotificationRead(id) {
  return notifications.update(id, { read: true });
}
