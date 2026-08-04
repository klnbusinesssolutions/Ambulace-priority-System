import { COLLECTIONS, REQUIRED_ADMIN_ROLE } from "../../firebase/collections.js";
import { createCollectionService } from "./firestoreCollection.js";

const admins = createCollectionService(COLLECTIONS.admins);

/** Admin doc id === Firebase Auth uid. */
export async function getAdminByUid(uid) {
  return admins.getById(uid);
}

/**
 * Ensures that an admin document exists for the given Firebase Auth uid.
 * Recreates the document ONLY if missing, preserving any existing data.
 */
export async function ensureAdminByUid(uid, email) {
  if (!uid) return null;
  let admin = await admins.getById(uid);
  if (!admin) {
    console.warn(`[AdminsService] Admin document for UID "${uid}" not found. Recreating...`);
    await admins.setById(uid, {
      email: email || "",
      isActive: true,
      role: REQUIRED_ADMIN_ROLE,
    });
    admin = await admins.getById(uid);
  }
  return admin;
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
