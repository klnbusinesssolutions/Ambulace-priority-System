import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp } from "./firestoreCollection.js";
import { hasFirebaseConfig } from "../../firebase/client.js";
import { validateHospitalPassword } from "../../utils/passwordValidation.js";

const hospitals = createCollectionService(COLLECTIONS.hospitals);

export async function listenToHospitals(callback, onError) {
  return hospitals.listen(callback, { constraints: [orderBy("name", "asc")], onError });
}

export async function getHospital(hospitalId) {
  return hospitals.getById(hospitalId);
}

/**
 * Creates a Firebase Auth user for the hospital (using a secondary Auth instance
 * so the Super Admin is not signed out), then saves the hospital document
 * in Firestore with the generated `authUid`.
 * If Firestore write fails, it rolls back by deleting the Auth user.
 */
export async function createHospital(hospitalId, data) {
  let authUid = data.authUid || "";
  let createdUser = null;

  // Validate password prior to attempting Firebase Auth user creation
  if (!authUid && data.password) {
    const passError = validateHospitalPassword(data.password);
    if (passError) {
      throw new Error(passError);
    }
  }

  if (!authUid && data.email && data.password && hasFirebaseConfig()) {
    const { initializeApp, deleteApp } = await import("firebase/app");
    const { getAuth, createUserWithEmailAndPassword, signOut } = await import("firebase/auth");

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const secondaryAppName = `hospital-auth-${Date.now()}`;
    const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, data.email, data.password);
      authUid = userCredential.user.uid;
      createdUser = userCredential.user;
      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
    } catch (authError) {
      try {
        await deleteApp(secondaryApp);
      } catch (_) {}

      if (authError.code === "auth/email-already-in-use") {
        throw new Error("This email is already registered to another account.");
      } else if (authError.code === "auth/weak-password") {
        throw new Error("Password must be at least 8 characters long and contain uppercase, lowercase, and numeric characters.");
      } else if (authError.code === "auth/invalid-email") {
        throw new Error("Invalid email address format.");
      }
      throw authError;
    }
  } else if (!authUid) {
    authUid = `auth-${(hospitalId || "hsp").toLowerCase()}-${Date.now()}`;
  }

  // Guarantee that password is deleted from payload before writing to Firestore
  const cleanData = { ...data };
  delete cleanData.password;

  try {
    return await hospitals.setById(hospitalId, {
      hospitalId,
      authUid,
      isActive: cleanData.isActive ?? true,
      createdAt: serverTimestamp(),
      ...cleanData,
    });
  } catch (firestoreError) {
    if (createdUser) {
      try {
        const { deleteUser } = await import("firebase/auth");
        await deleteUser(createdUser);
      } catch (rollbackErr) {
        console.error("Failed to rollback Auth user creation:", rollbackErr);
      }
    }
    throw new Error(`Failed to create hospital in Firestore. ${firestoreError.message || ""}`);
  }
}

export async function updateHospital(hospitalId, patch) {
  const { password, ...cleanPatch } = patch;
  return hospitals.update(hospitalId, cleanPatch);
}

export async function removeHospital(hospitalId) {
  return hospitals.remove(hospitalId);
}
