import { arrayUnion, doc, getFirestore, updateDoc } from "firebase/firestore";
import { COLLECTIONS, VERIFICATION_STATUS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp, where } from "./firestoreCollection.js";
import { createActivityLog } from "./activityLogService.js";
import { createNotification } from "./notificationsService.js";
import { getCurrentAdmin } from "../auth/adminAuthService.js";
import { getFirebaseApp } from "../../firebase/client.js";
import { createAmbulance as createApprovedAmbulance } from "./ambulancesService.js";
import { createRejectedRequest } from "./rejectedRequestsService.js";

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

  // Create approved ambulance
  await createApprovedAmbulance({
    id: ambulance.id,
    hospitalId: ambulance.hospitalId,
    hospitalName: ambulance.hospitalName,

    registrationNumber: ambulance.registrationNumber,
    numberPlate: ambulance.numberPlate,
    vehicleType: ambulance.vehicleType,
    capacity: ambulance.capacity,
    availability: ambulance.availability,

    assignedDrivers: ambulance.assignedDrivers,
    activeDriverId: ambulance.activeDriverId,

    documents: ambulance.documents,
  });

  // Notification
  await createNotification({
    hospitalId: ambulance.hospitalId,
    type: "ambulance_approved",
    title: "Ambulance Approved",
    message: `Ambulance ${
      ambulance.numberPlate || ambulance.registrationNumber
    } has been approved`,
  });

  // Activity Log
  await createActivityLog({
    hospitalId: ambulance.hospitalId,
    action: "ambulance_approved",
    performedBy: admin?.uid || "unknown",
    targetId: ambulance.id,
    details: `Ambulance ${
      ambulance.numberPlate || ambulance.registrationNumber
    } approved`,
  });

  // Remove from pending collection
  await pendingAmbulances.remove(ambulance.id);
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
  await pendingAmbulances.update(ambulance.id, {
    status: VERIFICATION_STATUS.resubmissionRequired,
    rejectionReason,
  });

  await createNotification({
    hospitalId: ambulance.hospitalId,
    type: "resubmission_required",
    title: "Ambulance Resubmission Requested",
    message: `Resubmission requested for ambulance ${ambulance.numberPlate || ambulance.registrationNumber}`,
  });

  await createActivityLog({
    hospitalId: ambulance.hospitalId,
    action: "ambulance_resubmission_requested",
    performedBy: admin?.uid || "unknown",
    targetId: ambulance.id,
    details: `Resubmission requested for ambulance ${ambulance.numberPlate || ambulance.registrationNumber}: ${rejectionReason || "no reason given"}`,
  });
}

/** Admin-added ambulance records are created pre-approved. */
export async function createAmbulance(data) {
  return pendingAmbulances.add({
    status: VERIFICATION_STATUS.approved,
    requestType: "ambulance",
    assignedDrivers: [],
    activeDriverId: null,
    submittedAt: serverTimestamp(),
    approvedAt: serverTimestamp(),
    ...data,
  });
}

export async function updateAmbulance(id, patch) {
  return pendingAmbulances.update(id, patch);
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
