import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";

import { firestore } from "@/firebase/config";
import { FIRESTORE_COLLECTIONS, mapSnapshotDoc, withUpdatedAt } from "@/services/firebaseDataService";

export function subscribeToTrafficReports(onUpdate, onError) {
  if (!firestore) {
    return () => {};
  }

  const trafficQuery = query(collection(firestore, FIRESTORE_COLLECTIONS.trafficReports), orderBy("createdAt", "desc"));

  return onSnapshot(
    trafficQuery,
    (snapshot) => onUpdate(snapshot.docs.map(mapSnapshotDoc)),
    onError,
  );
}

export async function createTrafficReport(report) {
  if (!firestore) return null;
  const ref = await addDoc(collection(firestore, FIRESTORE_COLLECTIONS.trafficReports), withUpdatedAt(report));
  return ref.id;
}

export async function updateTrafficReport(id, updates) {
  if (!firestore) return;
  await updateDoc(doc(firestore, FIRESTORE_COLLECTIONS.trafficReports, id), withUpdatedAt(updates));
}

export async function deleteTrafficReport(id) {
  if (!firestore) return;
  await deleteDoc(doc(firestore, FIRESTORE_COLLECTIONS.trafficReports, id));
}
