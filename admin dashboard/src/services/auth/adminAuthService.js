import { getFirebaseAuth, hasFirebaseConfig } from "../../firebase/client.js";
import { REQUIRED_ADMIN_ROLE } from "../../firebase/collections.js";
import { getAdminByUid } from "../firestore/adminsService.js";

/**
 * Sign in with email/password, then confirm the account is an active
 * super_admin in the `admins` collection. Throws with a user-facing message
 * on any failure and leaves no signed-in Firebase Auth session behind.
 */
export async function signInAdmin(email, password) {
  const auth = await getFirebaseAuth();
  const { signInWithEmailAndPassword } = await import("firebase/auth");

  let credential;
  try {
    credential = await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw new Error("Incorrect email or password.");
  }

  const admin = await getAdminByUid(credential.user.uid);

  if (!admin || admin.isActive === false) {
    await auth.signOut();
    throw new Error("This account is not registered as an admin.");
  }

  if (admin.role !== REQUIRED_ADMIN_ROLE) {
    await auth.signOut();
    throw new Error("This console is for super admins only.");
  }

  return admin;
}

export async function signOutAdmin() {
  if (!hasFirebaseConfig()) return;
  const auth = await getFirebaseAuth();
  await auth.signOut();
}

/** Subscribe to Firebase Auth state, resolving to the admin profile (or null). */
export async function onAdminAuthChange(callback) {
  const auth = await getFirebaseAuth();
  const { onAuthStateChanged } = await import("firebase/auth");

  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null);
      return;
    }
    try {
      const admin = await getAdminByUid(user.uid);
      if (admin && admin.role === REQUIRED_ADMIN_ROLE && admin.isActive !== false) {
        callback({ ...admin, uid: user.uid, email: user.email });
      } else {
        callback(null);
      }
    } catch (error) {
      console.error("Failed to resolve admin profile:", error);
      callback(null);
    }
  });
}

/** One-shot lookup of the currently signed-in admin, used by write services for activity logs. */
export async function getCurrentAdmin() {
  if (!hasFirebaseConfig()) return null;
  const auth = await getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  const admin = await getAdminByUid(user.uid);
  return admin ? { ...admin, uid: user.uid, email: user.email } : null;
}
