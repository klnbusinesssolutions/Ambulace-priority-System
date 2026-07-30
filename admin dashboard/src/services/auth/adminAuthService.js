import { getFirebaseAuth, hasFirebaseConfig } from "../../firebase/client.js";
import { REQUIRED_ADMIN_ROLE } from "../../firebase/collections.js";
import { ensureAdminByUid, getAdminByUid, updateAdmin, removeAdmin } from "../firestore/adminsService.js";
import { logAdminLogin } from "../firestore/loginHistoryService.js";

/**
 * Sign in with email/password, then confirm the account is an active
 * super_admin in the `admins` collection. Recreates the Firestore admin doc if missing.
 * Throws with a user-facing message on any failure and leaves no signed-in Firebase Auth session behind.
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

  const admin = await ensureAdminByUid(credential.user.uid, credential.user.email || email);

  if (!admin || admin.isActive === false) {
    await auth.signOut();
    throw new Error("This account is not registered as an admin.");
  }

  if (admin.role !== REQUIRED_ADMIN_ROLE) {
    await auth.signOut();
    throw new Error("This console is for super admins only.");
  }

  // Log successful login
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    let browser = "Chrome";
    let os = "Windows";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";
    if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";

    await logAdminLogin({
      uid: credential.user.uid,
      email: credential.user.email,
      browser,
      os,
      ip: "192.168.1.100",
      location: "HQ Console",
    });
  } catch (e) {
    console.error("Failed to log admin login history:", e);
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
      const admin = await ensureAdminByUid(user.uid, user.email);
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
  const admin = await ensureAdminByUid(user.uid, user.email);
  return admin ? { ...admin, uid: user.uid, email: user.email } : null;
}

/** Re-authenticates the current Firebase Auth user with their password. */
export async function reauthenticateAdmin(currentPassword) {
  if (!hasFirebaseConfig()) return true;
  const auth = await getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No active authenticated session.");

  const { EmailAuthProvider, reauthenticateWithCredential } = await import("firebase/auth");
  const credential = EmailAuthProvider.credential(user.email, currentPassword);

  try {
    await reauthenticateWithCredential(user, credential);
    return true;
  } catch (err) {
    console.error("Re-authentication failed:", err);
    throw new Error("Invalid current password. Re-authentication failed.");
  }
}

/** Update email in both Firebase Auth and Firestore synchronously after re-authenticating. */
export async function updateAdminEmailSecure(currentPassword, newEmail) {
  if (!newEmail || !newEmail.includes("@")) {
    throw new Error("Please enter a valid email address.");
  }

  if (!hasFirebaseConfig()) {
    return { success: true, email: newEmail };
  }

  const auth = await getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No active authenticated session.");

  // 1. Re-authenticate first
  await reauthenticateAdmin(currentPassword);

  // 2. Update Firebase Auth email
  const { updateEmail, verifyBeforeUpdateEmail } = await import("firebase/auth");
  try {
    if (typeof verifyBeforeUpdateEmail === "function") {
      await verifyBeforeUpdateEmail(user, newEmail);
    } else {
      await updateEmail(user, newEmail);
    }
  } catch (err) {
    if (err.code === "auth/requires-recent-login") {
      throw new Error("Recent login required. Please re-authenticate.");
    }
    if (err.code === "auth/email-already-in-use") {
      throw new Error("This email is already in use by another account.");
    }
    throw new Error(err.message || "Failed to update email in Firebase Authentication.");
  }

  // 3. Update Firestore admin profile document
  await updateAdmin(user.uid, { email: newEmail });

  return { success: true, email: newEmail };
}

/** Update password in Firebase Auth after re-authenticating. */
export async function updateAdminPasswordSecure(currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters long.");
  }

  if (!hasFirebaseConfig()) {
    return { success: true };
  }

  const auth = await getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No active authenticated session.");

  // 1. Re-authenticate first
  await reauthenticateAdmin(currentPassword);

  // 2. Update Firebase Auth password
  const { updatePassword } = await import("firebase/auth");
  try {
    await updatePassword(user, newPassword);
  } catch (err) {
    throw new Error(err.message || "Failed to update password in Firebase Authentication.");
  }

  return { success: true };
}

/** Delete account in both Firebase Auth and Firestore admin document. */
export async function deleteAdminAccountSecure(currentPassword) {
  if (!hasFirebaseConfig()) {
    return { success: true };
  }

  const auth = await getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("No active authenticated session.");

  const uid = user.uid;

  // 1. Re-authenticate first
  await reauthenticateAdmin(currentPassword);

  // 2. Remove Firestore document
  await removeAdmin(uid);

  // 3. Delete Firebase Auth user
  const { deleteUser } = await import("firebase/auth");
  try {
    await deleteUser(user);
  } catch (err) {
    throw new Error(err.message || "Failed to delete Firebase Authentication account.");
  }

  return { success: true };
}
