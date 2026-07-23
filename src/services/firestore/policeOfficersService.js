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
 * Manual approval flow: creating a new Firebase Auth account for someone else
 * cannot be done from this client-side dashboard (the Firebase client SDK only
 * manages the currently signed-in user). So the real steps are:
 *   1. Admin creates the officer's account in Firebase Console > Authentication.
 *   2. Admin pastes that account's UID in here, which writes the profile doc
 *      to `police_officers/{uid}` and removes the request from the pending queue.
 */
export async function onboardPoliceOfficer(request, uid) {
  const admin = await getCurrentAdmin();

  await policeOfficers.setById(uid, {
    email: request.email || "",
    badgeId: request.badgeId || "",
    displayName: request.name || "",
    department: request.department || "",
    // Captured from the officer's browser at registration time (Register page
    // geolocation prompt); admin can still hand-correct these in Firestore if
    // the officer wasn't actually at the station when they registered.
    station: request.station ?? null,
    serviceRadiusKm: request.serviceRadiusKm ?? 10,
    role: "police",
    isActive: true,
    onboardedAt: serverTimestamp(),
  });

  await createActivityLog({
    hospitalId: null,
    action: "police_officer_onboarded",
    performedBy: admin?.uid || "unknown",
    targetId: uid,
    details: `Police officer ${request.name || request.badgeId} onboarded (badge ${request.badgeId})`,
  });

  await pendingPoliceOfficers.remove(request.id);
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
}

export async function removePendingPoliceOfficer(id) {
  return pendingPoliceOfficers.remove(id);
}

export async function removePoliceOfficer(uid) {
  return policeOfficers.remove(uid);
}
