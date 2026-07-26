import { arrayUnion, doc, getFirestore, updateDoc, writeBatch } from "firebase/firestore";
import { COLLECTIONS, VERIFICATION_STATUS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp, where } from "./firestoreCollection.js";
import { createActivityLog } from "./activityLogService.js";
import { createNotification } from "./notificationsService.js";
import { getCurrentAdmin } from "../auth/adminAuthService.js";
import { getFirebaseApp, hasFirebaseConfig } from "../../firebase/client.js";
import { createAmbulance as createApprovedAmbulance } from "./ambulancesService.js";
import { createRejectedRequest } from "./rejectedRequestsService.js";
import { validateAmbulanceForm, formatMedicalCapabilities, validateRegistrationNumber } from "../../utils/ambulanceValidation.js";

const pendingAmbulances = createCollectionService(COLLECTIONS.pendingAmbulances);



/**
 * The schema only defines `pending_ambulances` — there is no separate
 * top-level "ambulances" collection. Approved fleet vehicles simply live
 * here with status: "approved". Filter by status for pending vs active
 * fleet views.
 */
export async function listenToPendingAmbulances(callback, onError) {
  return pendingAmbulances.listen(callback, { constraints: [orderBy("submittedAt", "desc")], onError });
}

export async function listenToAmbulancesByStatus(status, callback, onError) {
  return pendingAmbulances.listen(callback, {
    constraints: [where("status", "==", status)],
    onError,
  });
}

export async function listenToAllAmbulances(callback, onError) {
  return pendingAmbulances.listen(callback, { onError });
}

export async function approvePendingAmbulance(ambulance) {
  const admin = await getCurrentAdmin();
  const timestamp = serverTimestamp();

  const registrationNumber = (ambulance.registrationNumber || "").trim().toUpperCase();
  const medicalCapabilities = formatMedicalCapabilities(ambulance.medicalCapabilities);

  const approvedData = {
    ...ambulance,
    registrationNumber: registrationNumber || ambulance.registrationNumber || "N/A",
    numberPlate: ambulance.numberPlate || registrationNumber || "N/A",
    manufacturer: ambulance.manufacturer || "N/A",
    model: ambulance.model || "N/A",
    vehicleType: ambulance.vehicleType || "Basic",
    capacity: ambulance.capacity || "12 Seater",
    availability: ambulance.availability || "available",
    medicalCapabilities,
    hospitalId: ambulance.hospitalId || "",
    hospitalName: ambulance.hospitalName || "",
    assignedDrivers: ambulance.assignedDrivers || [],
    activeDriverId: ambulance.activeDriverId || null,
    documents: ambulance.documents || {},
    location: ambulance.location || null,
    status: VERIFICATION_STATUS.approved,
    approvedAt: hasFirebaseConfig() ? timestamp : new Date().toISOString(),
    updatedAt: hasFirebaseConfig() ? timestamp : new Date().toISOString(),
  };

  if (hasFirebaseConfig()) {
    const app = await getFirebaseApp();
    const db = getFirestore(app);
    const batch = writeBatch(db);

    const approvedRef = doc(db, COLLECTIONS.ambulances, ambulance.id);
    const pendingRef = doc(db, COLLECTIONS.pendingAmbulances, ambulance.id);

    batch.set(approvedRef, approvedData, { merge: true });
    batch.delete(pendingRef);

    await batch.commit();

    try {
      await createNotification({
        hospitalId: ambulance.hospitalId,
        type: "ambulance_approved",
        title: "Ambulance Approved",
        message: `Ambulance ${ambulance.numberPlate || ambulance.registrationNumber} has been approved`,
      });
    } catch (err) {
      console.error("Failed to create notification on ambulance approval:", err);
    }

    try {
      await createActivityLog({
        hospitalId: ambulance.hospitalId,
        action: "ambulance_approved",
        performedBy: admin?.uid || "unknown",
        targetId: ambulance.id,
        details: `Ambulance ${ambulance.numberPlate || ambulance.registrationNumber} approved`,
      });
    } catch (err) {
      console.error("Failed to create activity log on ambulance approval:", err);
    }
  }

  return approvedData;
}

export async function rejectPendingAmbulance(ambulance, rejectionReason = "") {
  const admin = await getCurrentAdmin();

  // Move to rejected_requests
  await createRejectedRequest({
    ...ambulance,
    requestType: "ambulance",
    status: VERIFICATION_STATUS.rejected,
    rejectionReason,
    rejectedAt: serverTimestamp(),
  });

  // Create notification
  await createNotification({
    hospitalId: ambulance.hospitalId,
    type: "ambulance_rejected",
    title: "Ambulance Rejected",
    message: `Ambulance ${
      ambulance.numberPlate || ambulance.registrationNumber
    } was rejected`,
  });

  // Create activity log
  await createActivityLog({
    hospitalId: ambulance.hospitalId,
    action: "ambulance_rejected",
    performedBy: admin?.uid || "unknown",
    targetId: ambulance.id,
    details: `Ambulance ${
      ambulance.numberPlate || ambulance.registrationNumber
    } rejected: ${rejectionReason || "no reason given"}`,
  });

  // Remove from pending collection
  await pendingAmbulances.remove(ambulance.id);
}
export async function requestAmbulanceResubmission(ambulance, rejectionReason = "") {
  const admin = await getCurrentAdmin();
  const timestamp = serverTimestamp();

  const resubmitData = {
    ...ambulance,
    requestType: "ambulance",
    status: VERIFICATION_STATUS.resubmissionRequired,
    rejectionReason: rejectionReason || ambulance.rejectionReason || "",
    resubmittedAt: null,
    updatedAt: hasFirebaseConfig() ? timestamp : new Date().toISOString(),
  };

  if (hasFirebaseConfig()) {
    const app = await getFirebaseApp();
    const db = getFirestore(app);
    const batch = writeBatch(db);

    const pendingRef = doc(db, COLLECTIONS.pendingAmbulances, ambulance.id);
    const rejectedRef = doc(db, COLLECTIONS.rejectedRequests, ambulance.id);

    batch.set(pendingRef, resubmitData);
    batch.delete(rejectedRef);

    await batch.commit();

    try {
      await createNotification({
        hospitalId: ambulance.hospitalId,
        type: "resubmission_required",
        title: "Ambulance Resubmission Requested",
        message: `Resubmission requested for ambulance ${ambulance.numberPlate || ambulance.registrationNumber}`,
      });
    } catch (err) {
      console.error("Failed to create notification on resubmission request:", err);
    }

    try {
      await createActivityLog({
        hospitalId: ambulance.hospitalId,
        action: "ambulance_resubmission_requested",
        performedBy: admin?.uid || "unknown",
        targetId: ambulance.id,
        details: `Resubmission requested for ambulance ${
          ambulance.numberPlate || ambulance.registrationNumber
        }: ${rejectionReason || ambulance.rejectionReason || "no reason given"}`,
      });
    } catch (err) {
      console.error("Failed to create activity log on resubmission request:", err);
    }
  }

  return resubmitData;
}


/** Admin-added ambulance records are created pre-approved. */
export async function createAmbulance(data) {
  const registrationNumber = (data.registrationNumber || "").trim().toUpperCase();
  const medicalCapabilities = formatMedicalCapabilities(data.medicalCapabilities);
  const payload = { ...data, registrationNumber, medicalCapabilities };

  const errors = validateAmbulanceForm(payload);
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]);
  }

  return pendingAmbulances.add({
    status: VERIFICATION_STATUS.approved,
    requestType: "ambulance",
    assignedDrivers: [],
    activeDriverId: null,
    submittedAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
    ...payload,
  });
}

export async function updateAmbulance(id, patch) {
  const updatedPatch = { ...patch };
  if (updatedPatch.registrationNumber) {
    updatedPatch.registrationNumber = updatedPatch.registrationNumber.trim().toUpperCase();
    const regErr = validateRegistrationNumber(updatedPatch.registrationNumber);
    if (regErr) throw new Error(regErr);
  }
  if (updatedPatch.medicalCapabilities) {
    updatedPatch.medicalCapabilities = formatMedicalCapabilities(updatedPatch.medicalCapabilities);
  }

  return pendingAmbulances.update(id, updatedPatch);
}

export async function removeAmbulance(id) {
  return pendingAmbulances.remove(id);
}


export async function assignDriverToAmbulance(ambulanceId, driverId) {
  const app = await getFirebaseApp();
  const db = getFirestore(app);
  await updateDoc(doc(db, COLLECTIONS.pendingAmbulances, ambulanceId), {
    activeDriverId: driverId,
    assignedDrivers: arrayUnion(driverId),
    updatedAt: serverTimestamp(),
  });
}
