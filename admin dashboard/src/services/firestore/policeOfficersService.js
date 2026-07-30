import { doc, getFirestore, writeBatch } from "firebase/firestore";
import { COLLECTIONS, VERIFICATION_STATUS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp } from "./firestoreCollection.js";
import { createActivityLog } from "./activityLogService.js";
import { transitionNotificationTask } from "./notificationsService.js";
import { getCurrentAdmin } from "../auth/adminAuthService.js";
import { getFirebaseApp, hasFirebaseConfig } from "../../firebase/client.js";
import { createRejectedRequest } from "./rejectedRequestsService.js";

const pendingPoliceOfficers = createCollectionService(COLLECTIONS.pendingPoliceOfficers);
const policeOfficers = createCollectionService(COLLECTIONS.policeOfficers);

export async function listenToPendingPoliceOfficers(callback, onError) {
  return pendingPoliceOfficers.listen(callback, { constraints: [orderBy("requestedAt", "desc")], onError });
}

export async function listenToPoliceOfficers(callback, onError) {
  return policeOfficers.listen(callback, { onError });
}

/**
 * Approving a police officer request:
 * - Preserves the officer's registration email and Firebase Auth UID.
 * - Keyed explicitly by officer UID in `police_officers/{officerUid}`.
 * - Sets status: "approved" and isActive: true so policeStore hydration succeeds.
 * - Deletes the pending request from `pending_police_officers`.
 * - Creates an activity log entry and triggers an approval notification.
 */
export async function approvePendingPoliceOfficer(request, overrides = {}) {
  const admin = await getCurrentAdmin();
  const officerUid = request.uid || request.id;

  const approvedData = {
    ...request,
    uid: officerUid,
    id: officerUid,
    station: overrides.station ?? request.station ?? null,
    serviceRadiusKm: overrides.serviceRadiusKm ?? request.serviceRadiusKm ?? 10,
    status: VERIFICATION_STATUS.approved,
    isActive: true,
    approvedAt: hasFirebaseConfig() ? serverTimestamp() : new Date().toISOString(),
    updatedAt: hasFirebaseConfig() ? serverTimestamp() : new Date().toISOString(),
  };

  if (hasFirebaseConfig()) {
    const app = await getFirebaseApp();
    const db = getFirestore(app);
    const batch = writeBatch(db);

    const pendingRef = doc(db, COLLECTIONS.pendingPoliceOfficers, request.id);
    const approvedRef = doc(db, COLLECTIONS.policeOfficers, officerUid);

    batch.set(approvedRef, approvedData);
    batch.delete(pendingRef);

    await batch.commit();
  }

  try {
    await transitionNotificationTask(request.id, {
      status: "resolved",
      actionState: "approved",
      type: "police_approved",
      title: "✓ Police Officer Approved",
      message: `Police Officer ${request.name || request.badgeId} has been approved`,
    });
  } catch (err) {
    console.error("Failed to update notification on police officer approval:", err);
  }

  await createActivityLog({
    hospitalId: null,
    action: "police_officer_approved",
    performedBy: admin?.uid || "unknown",
    targetId: officerUid,
    details: `Police officer ${request.name || request.badgeId} approved (badge ${request.badgeId})`,
  });

  return approvedData;
}

export async function rejectPendingPoliceOfficer(request, rejectionReason = "") {
  const admin = await getCurrentAdmin();

  await pendingPoliceOfficers.update(request.id, {
    status: VERIFICATION_STATUS.rejected,
    rejectionReason,
    updatedAt: serverTimestamp(),
  });

  await createRejectedRequest({
    ...request,
    requestType: "police_officer",
    status: VERIFICATION_STATUS.rejected,
    rejectionReason,
    rejectedAt: serverTimestamp(),
  });

  try {
    await transitionNotificationTask(request.id, {
      status: "resolved",
      actionState: "rejected",
      type: "police_rejected",
      title: "✕ Police Officer Rejected",
      message: `Police Officer ${request.name || request.badgeId} was rejected`,
    });
  } catch (err) {
    console.error("Failed to update notification on police officer rejection:", err);
  }

  await createActivityLog({
    hospitalId: null,
    action: "police_officer_rejected",
    performedBy: admin?.uid || "unknown",
    targetId: request.id,
    details: `Police officer request ${request.name || request.badgeId} rejected: ${
      rejectionReason || "no reason given"
    }`,
  });
}

export async function requestPoliceOfficerResubmission(request, reason = "") {
  const admin = await getCurrentAdmin();
  const timestamp = serverTimestamp();

  const resubmitData = {
    ...request,
    requestType: "police_officer",
    status: VERIFICATION_STATUS.resubmissionRequired,
    rejectionReason: reason || request.rejectionReason || "",
    resubmittedAt: null,
    updatedAt: hasFirebaseConfig() ? timestamp : new Date().toISOString(),
  };

  if (hasFirebaseConfig()) {
    const app = await getFirebaseApp();
    const db = getFirestore(app);
    const batch = writeBatch(db);

    const pendingRef = doc(db, COLLECTIONS.pendingPoliceOfficers, request.id);
    const rejectedRef = doc(db, COLLECTIONS.rejectedRequests, request.id);

    batch.set(pendingRef, resubmitData);
    batch.delete(rejectedRef);

    await batch.commit();

    try {
      await createActivityLog({
        hospitalId: null,
        action: "police_officer_resubmission_requested",
        performedBy: admin?.uid || "unknown",
        targetId: request.id,
        details: `Resubmission requested for police officer ${
          request.name || request.badgeId
        }: ${reason || request.rejectionReason || "documentation review required"}`,
      });
    } catch (err) {
      console.error("Failed to create activity log on police officer resubmission:", err);
    }
  }

  return resubmitData;
}

export async function removePendingPoliceOfficer(id) {
  return pendingPoliceOfficers.remove(id);
}

export async function removePoliceOfficer(uid) {
  return policeOfficers.remove(uid);
}
