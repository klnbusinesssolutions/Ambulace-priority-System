import { getFirebaseAuth } from "../firebase/client.js";
import { ensureAdminByUid } from "../services/firestore/adminsService.js";

/**
 * Programmatically recovers/recreates the Firestore `admins/{uid}` document for
 * the currently signed-in Firebase Authentication user, or a specified UID & email.
 *
 * Requirements & Constraints:
 * - Uses the Auth UID as the Firestore document ID (admins/{uid}).
 * - Document structure created: { email, isActive: true, role: "super_admin" }
 * - Recreates ONLY if missing; never overwrites existing admin documents.
 * - Leaves all other collections untouched.
 */
export async function recoverCurrentAdminDoc() {
  const auth = await getFirebaseAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("No authenticated Firebase Auth user found. Please authenticate first.");
  }

  return ensureAdminByUid(currentUser.uid, currentUser.email);
}

export async function recoverAdminDocByUid(uid, email) {
  if (!uid) {
    throw new Error("UID is required to recover admin document.");
  }
  return ensureAdminByUid(uid, email);
}
