import { COLLECTIONS, VERIFICATION_STATUS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp } from "./firestoreCollection.js";
import { createActivityLog } from "./activityLogService.js";
import { createRejectedRequest } from "./rejectedRequestsService.js";
import { getCurrentAdmin } from "../auth/adminAuthService.js";

const pendingPoliceOfficers = createCollectionService(COLLECTIONS.pendingPoliceOfficers);
const policeOfficers = createCollectionService(COLLECTIONS.policeOfficers);

export async function listenToPendingPoliceOfficers(callback, onError) {
  return pendingPoliceOfficers.listen(callback, { constraints: [orderBy("requestedAt", "desc")], onError });
}

export async function listenToPoliceOfficers(callback, onError) {
  return policeOfficers.listen(callback, { onError });
}

/**
 * The officer already created their own Firebase Auth account (and set
 * their own password) at registration time, in Register.jsx - the pending
 * doc carries that account's `uid`. So approving is just a direct Firestore
 * update: flip the `police_officers/{uid}` profile to status "approved" /
 * isActive true (with any station/radius corrections the admin made), then
 * clean up the pending request. No Cloud Function, no generated temp
 * password, no credential hand-off required - the officer logs in with the
 * badge ID/email + password they already chose.
 */
export async function approvePendingPoliceOfficer(request, overrides = {}) {
  const admin = await getCurrentAdmin();

  if (!request.uid) {
    throw new Error("This request has no linked account (uid) - it may predate the new registration flow.");
  }

  const station = overrides.station ?? request.station ?? null;
  const serviceRadiusKm = overrides.serviceRadiusKm ?? request.serviceRadiusKm ?? 10;

  await policeOfficers.update(request.uid, {
    status: VERIFICATION_STATUS.approved,
    isActive: true,
    station,
    serviceRadiusKm,
    approvedAt: serverTimestamp(),
  });

  await pendingPoliceOfficers.remove(request.id);

  await createActivityLog({
    hospitalId: null,
    action: "police_officer_approved",
    performedBy: admin?.uid || "unknown",
    targetId: request.uid,
    details: `Police officer ${request.name || request.badgeId} approved (badge ${request.badgeId}) - can now log in with their own password`,
  });
}

export async function rejectPendingPoliceOfficer(request, rejectionReason = "") {
  const admin = await getCurrentAdmin();

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

  await pendingPoliceOfficers.remove(request.id);

  // The Auth account already exists (created at registration) - mark the
  // profile rejected so login stays blocked. We can't delete someone else's
  // Auth account from client-side code (needs the Admin SDK), so the account
  // itself lingers, but with no approved profile it can never reach the
  // dashboard.
  if (request.uid) {
    await policeOfficers.update(request.uid, {
      status: VERIFICATION_STATUS.rejected,
      isActive: false,
      rejectionReason,
      rejectedAt: serverTimestamp(),
    });
  }
}

export async function removePendingPoliceOfficer(id) {
  return pendingPoliceOfficers.remove(id);
}

export async function removePoliceOfficer(uid) {
  return policeOfficers.remove(uid);
}
