import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp } from "./firestoreCollection.js";
import { hasFirebaseConfig } from "../../firebase/client.js";
import { validateHospitalPassword } from "../../utils/passwordValidation.js";
import { validateHospitalEmail, validateHospitalPhone } from "../../utils/hospitalValidation.js";

const hospitals = createCollectionService(COLLECTIONS.hospitals);
const users = createCollectionService(COLLECTIONS.users);

export async function listenToHospitals(callback, onError) {
  return hospitals.listen(callback, { constraints: [orderBy("name", "asc")], onError });
}

export async function getHospital(hospitalId) {
  return hospitals.getById(hospitalId);
}

/**
 * Creates a Firebase Auth user for the hospital (using a secondary Auth instance
 * so the Super Admin is not signed out), then saves the hospital document
 * in Firestore with the generated `authUid` and corresponding `users` document.
 * If Firestore write fails, it rolls back by deleting the Auth user.
 */
export async function createHospital(hospitalId, data) {
  let authUid = data.authUid || "";
  let createdUser = null;

  const normalizedEmail = (data.email || "").trim().toLowerCase();

  const emailErr = validateHospitalEmail(normalizedEmail);
  if (emailErr) {
    throw new Error(emailErr);
  }

  const phoneErr = validateHospitalPhone(data.phone);
  if (phoneErr) {
    throw new Error(phoneErr);
  }

  // Validate password prior to attempting Firebase Auth user creation
  if (!authUid && data.password) {
    const passError = validateHospitalPassword(data.password);
    if (passError) {
      throw new Error(passError);
    }
  }

  if (!authUid && normalizedEmail && data.password && hasFirebaseConfig()) {
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
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, data.password);
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
  cleanData.email = normalizedEmail;

  const isActive = cleanData.isActive ?? true;
  const hospitalLocation = cleanData.location || cleanData.address || "";
  const hospitalName = cleanData.hospitalName || cleanData.name || "";

  const hospitalPayload = {
    hospitalId,
    authUid,
    role: "hospital_admin",
    hospitalName,
    name: cleanData.name || hospitalName,
    email: normalizedEmail,
    location: hospitalLocation,
    address: hospitalLocation,
    latitude: typeof cleanData.latitude === "number" ? cleanData.latitude : null,
    longitude: typeof cleanData.longitude === "number" ? cleanData.longitude : null,
    isActive,
    status: isActive ? "approved" : "inactive",
    createdAt: serverTimestamp(),
    ...cleanData,
  };

  const userPayload = {
    uid: authUid,
    email: normalizedEmail,
    role: "hospital_admin",
    hospitalId,
    hospitalName: cleanData.name || hospitalName,
    isActive,
    status: isActive ? "approved" : "inactive",
    createdAt: serverTimestamp(),
  };

  try {
    // Write user doc first so security rules can resolve user permissions immediately
    if (authUid && !authUid.startsWith("auth-hsp-")) {
      await users.setById(authUid, userPayload);
    }
    return await hospitals.setById(hospitalId, hospitalPayload);
  } catch (firestoreError) {
    if (createdUser) {
      try {
        const { deleteUser } = await import("firebase/auth");
        await deleteUser(createdUser);
      } catch (rollbackErr) {
        console.error("Failed to rollback Auth user creation:", rollbackErr);
      }
    }
    if (authUid && !authUid.startsWith("auth-hsp-")) {
      try {
        await users.remove(authUid);
      } catch (_) {}
    }
    throw new Error(`Failed to create hospital in Firestore. ${firestoreError.message || ""}`);
  }
}

export async function updateHospital(hospitalId, patch) {
  if (patch.email !== undefined) {
    const emailErr = validateHospitalEmail(patch.email);
    if (emailErr) throw new Error(emailErr);
  }
  if (patch.phone !== undefined) {
    const phoneErr = validateHospitalPhone(patch.phone);
    if (phoneErr) throw new Error(phoneErr);
  }

  const { password, ...cleanPatch } = patch;
  if (cleanPatch.location || cleanPatch.address) {
    const loc = cleanPatch.location || cleanPatch.address;
    cleanPatch.location = loc;
    cleanPatch.address = loc;
  }
  if (cleanPatch.name || cleanPatch.hospitalName) {
    const hName = cleanPatch.name || cleanPatch.hospitalName;
    cleanPatch.name = hName;
    cleanPatch.hospitalName = hName;
  }

  return hospitals.update(hospitalId, cleanPatch);
}

export async function removeHospital(hospitalId) {
  return hospitals.remove(hospitalId);
}
