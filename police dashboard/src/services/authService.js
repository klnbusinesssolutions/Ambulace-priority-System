import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { auth, firestore } from "@/firebase/config";
import { FIRESTORE_COLLECTIONS, findUserByBadgeId } from "@/services/firebaseDataService";

function isEmail(identifier) {
  return identifier.includes("@");
}

async function resolveLoginEmail(identifier) {
  const trimmedIdentifier = identifier.trim();
  if (isEmail(trimmedIdentifier)) return trimmedIdentifier;

  const user = await findUserByBadgeId(trimmedIdentifier);
  return user?.email ?? trimmedIdentifier;
}

export function subscribeToAuth(onUpdate, onError) {
  if (!auth) {
    onUpdate(null);
    return () => {};
  }

  return onAuthStateChanged(auth, onUpdate, onError);
}

export async function loginWithFirebase(identifier, password) {
  if (!auth) {
    throw new Error("Firebase Auth is not configured. Add your VITE_FIREBASE_* values and restart the app.");
  }

  const email = await resolveLoginEmail(identifier);
  const credentials = await signInWithEmailAndPassword(auth, email, password);
  return credentials.user;
}

export async function logoutFromFirebase() {
  if (!auth) return;
  await signOut(auth);
}

// The officer sets their own passcode right here at registration. We create
// the real Firebase Auth account immediately (so the badge ID / email +
// password they chose will work later), but we do NOT create a
// `police_officers/{uid}` profile yet - the request only goes into
// `pending_police_officers`, the admin dashboard's review queue. The
// `police_officers/{uid}` doc is only created once an admin approves the
// request (see admin dashboard's policeOfficersService.approvePendingPoliceOfficer).
// Until then, police_officers/{uid} simply doesn't exist, so
// hydrateOperatorStation/ProtectedRoute treat the account as not-yet-approved.
export async function requestPoliceAccess({ password, ...formData }) {
  if (!auth || !firestore) {
    throw new Error("Firebase is not configured. Add your VITE_FIREBASE_* values and restart the app.");
  }

  if (!password || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const credentials = await createUserWithEmailAndPassword(auth, formData.email, password);
  const uid = credentials.user.uid;

  try {
    const officerProfile = {
      uid,
      email: formData.email,
      badgeId: formData.badgeId,
      name: formData.name,
      displayName: formData.name,
      department: formData.department,
      station: formData.station ?? null,
      serviceRadiusKm: formData.serviceRadiusKm ?? 10,
      role: "police",
      status: "pending",
      isActive: false,
      requiresPasswordChange: false,
      requestedAt: serverTimestamp(),
    };

    // Only the review queue gets written at registration time.
    await addDoc(collection(firestore, FIRESTORE_COLLECTIONS.accessRequests), officerProfile);
  } finally {
    // Don't leave them signed in to a not-yet-approved account - send them
    // back to /login where they'll see the "pending approval" state.
    await signOut(auth);
  }

  return uid;
}

export async function sendPolicePasswordReset(identifier) {
  if (!auth) {
    throw new Error("Firebase Auth is not configured. Add your VITE_FIREBASE_* values and restart the app.");
  }

  const email = isEmail(identifier) ? identifier : (await findUserByBadgeId(identifier))?.email;
  if (!email) return;

  await sendPasswordResetEmail(auth, email);
}
