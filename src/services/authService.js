import {
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

export async function requestPoliceAccess(formData) {
  if (!firestore) {
    throw new Error("Firestore is not configured. Add your VITE_FIREBASE_* values and restart the app.");
  }

  const docRef = await addDoc(collection(firestore, FIRESTORE_COLLECTIONS.accessRequests), {
    ...formData,
    role: "police",
    status: "pending",
    requestedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function sendPolicePasswordReset(identifier) {
  if (!auth) {
    throw new Error("Firebase Auth is not configured. Add your VITE_FIREBASE_* values and restart the app.");
  }

  const email = isEmail(identifier) ? identifier : (await findUserByBadgeId(identifier))?.email;
  if (!email) return;

  await sendPasswordResetEmail(auth, email);
}
