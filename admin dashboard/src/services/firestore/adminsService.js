import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService } from "./firestoreCollection.js";

const admins = createCollectionService(COLLECTIONS.admins);

/** Admin doc id === Firebase Auth uid. */
export async function getAdminByUid(uid) {
  return admins.getById(uid);
}

export async function listenToAdmins(callback, options) {
  return admins.listen(callback, options);
}

export async function createAdmin(uid, data) {
  return admins.setById(uid, { uid, isActive: true, ...data });
}

export async function updateAdmin(uid, patch) {
  return admins.update(uid, patch);
}

export async function removeAdmin(uid) {
  return admins.remove(uid);
}
