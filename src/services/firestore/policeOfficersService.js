import { COLLECTIONS, VERIFICATION_STATUS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp } from "./firestoreCollection.js";
import { createActivityLog } from "./activityLogService.js";
import { createRejectedRequest } from "./rejectedRequestsService.js";
import { getCurrentAdmin } from "../auth/adminAuthService.js";

const pendingPoliceOfficers = createCollectionService(COLLECTIONS.pendingPoliceOfficers);
const policeOfficers = createCollectionService(COLLECTIONS.policeOfficers);
const policeTempCredentials = createCollectionService(COLLECTIONS.policeTempCredentials);

export async function listenToPendingPoliceOfficers(callback, onError) {
  return pendingPoliceOfficers.listen(callback, { constraints: [orderBy("requestedAt", "desc")], onError });
}

export async function listenToPoliceOfficers(callback, onError) {
  return policeOfficers.listen(callback, { onError });
}

/**
 * Approving a request doesn't create the Firebase Auth account directly —
 * the client SDK can only manage the currently signed-in user, not create
 * accounts for other people. Instead this flips the pending doc's `status`
 * to "approved" (with any station/radius corrections the admin made), and
 * the `createPoliceOfficerCredentialsOnApproval` Cloud Function picks up
 * that change: it creates the Auth account, writes the `police_officers/{uid}`
 * profile, and drops a temp password into `police_temp_credentials/{requestId}`
 * for the admin to relay to the officer. Mirrors the driver approval flow.
 */
export async function approvePendingPoliceOfficer(request, overrides = {}) {
  const admin = await getCurrentAdmin();

  await pendingPoliceOfficers.update(request.id, {
    status: VERIFICATION_STATUS.approved,
    station: overrides.station ?? request.station ?? null,
    serviceRadiusKm: overrides.serviceRadiusKm ?? request.serviceRadiusKm ?? 10,
    approvedAt: serverTimestamp(),
  });

  const tempPassword = `PolicePass#${Math.floor(1000 + Math.random() * 9000)}`;
  const credentialData = {
    requestId: request.id,
    badgeId: request.badgeId || "P-OFFICER",
    email: request.email || `${request.badgeId}@police.gov.in`,
    name: request.name || "Police Officer",
    tempPassword,
    createdAt: new Date().toISOString(),
  };

  try {
    await policeTempCredentials.setById(request.id, credentialData);
  } catch (e) {
    console.warn("Could not persist policeTempCredentials doc directly:", e);
  }

  await createActivityLog({
    hospitalId: null,
    action: "police_officer_approved",
    performedBy: admin?.uid || "unknown",
    targetId: request.id,
    details: `Police officer ${request.name || request.badgeId} approved (badge ${request.badgeId}) - credentials created`,
  });

  return credentialData;
}

/** Watches `police_temp_credentials/{requestId}` for the Cloud Function's output. */
export async function listenToPoliceTempCredential(requestId, callback, onError) {
  return policeTempCredentials.listenById(requestId, callback, onError);
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

  await pendingPoliceOfficers.update(request.id, {
    status: VERIFICATION_STATUS.resubmissionRequired,
    rejectionReason: reason,
    updatedAt: serverTimestamp(),
  });

  await createActivityLog({
    hospitalId: null,
    action: "police_officer_resubmission_requested",
    performedBy: admin?.uid || "unknown",
    targetId: request.id,
    details: `Resubmission requested for police officer ${request.name || request.badgeId}: ${reason || "documentation review required"}`,
  });
}

export async function removePendingPoliceOfficer(id) {
  return pendingPoliceOfficers.remove(id);
}

export async function removePoliceOfficer(uid) {
  return policeOfficers.remove(uid);
}
