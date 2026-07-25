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
 * doc carries that account's `uid`. No `police_officers/{uid}` profile
 * exists yet at this point (registration only writes the pending review
 * request), so approving CREATES that profile here - from the fields the
 * officer submitted, plus any station/radius corrections the admin made -
 * with status "approved" / isActive true, then cleans up the pending
 * request. No Cloud Function, no generated temp password, no credential
 * hand-off required - the officer logs in with the badge ID/email +
 * password they already chose.
 */
export async function approvePendingPoliceOfficer(request, overrides = {}) {
  const admin = await getCurrentAdmin();

  if (!request.uid) {
    throw new Error("This request has no linked account (uid) - it may predate the new registration flow.");
  }

  const station = overrides.station ?? request.station ?? null;
  const serviceRadiusKm = overrides.serviceRadiusKm ?? request.serviceRadiusKm ?? 10;

  await policeOfficers.setById(
    request.uid,
    {
      uid: request.uid,
      email: request.email,
      badgeId: request.badgeId,
      name: request.name,
      displayName: request.name,
      department: request.department,
      role: "police",
      status: VERIFICATION_STATUS.approved,
      isActive: true,
      station,
      serviceRadiusKm,
      approvedAt: serverTimestamp(),
    },
    { merge: true },
  );

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

  // The Auth account already exists (created at registration), but there's
  // no police_officers/{uid} doc yet - registration only ever wrote the
  // pending request. Create a minimal rejected profile so a login attempt
  // resolves to the "request was rejected" message instead of the generic
  // "still awaiting approval" one. We can't delete someone else's Auth
  // account from client-side code (needs the Admin SDK), so the account
  // itself lingers, but with no approved profile it can never reach the
  // dashboard.
  if (request.uid) {
    await policeOfficers.setById(
      request.uid,
      {
        uid: request.uid,
        email: request.email,
        badgeId: request.badgeId,
        name: request.name,
        displayName: request.name,
        department: request.department,
        role: "police",
        status: VERIFICATION_STATUS.rejected,
        isActive: false,
        rejectionReason,
        rejectedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

export async function removePendingPoliceOfficer(id) {
  return pendingPoliceOfficers.remove(id);
}

export async function removePoliceOfficer(uid) {
  return policeOfficers.remove(uid);
}
