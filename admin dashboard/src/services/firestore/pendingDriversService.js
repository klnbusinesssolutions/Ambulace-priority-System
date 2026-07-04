import { COLLECTIONS, VERIFICATION_STATUS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp, where } from "./firestoreCollection.js";
import { createActivityLog } from "./activityLogService.js";
import { createNotification } from "./notificationsService.js";
import { getCurrentAdmin } from "../auth/adminAuthService.js";

const pendingDrivers = createCollectionService(COLLECTIONS.pendingDrivers);

export async function listenToPendingDrivers(callback, onError) {
  return pendingDrivers.listen(callback, { constraints: [orderBy("submittedAt", "desc")], onError });
}

export async function listenToPendingDriversByHospital(hospitalId, callback, onError) {
  return pendingDrivers.listen(callback, {
    constraints: [where("hospitalId", "==", hospitalId), orderBy("submittedAt", "desc")],
    onError,
  });
}

/**
 * Per the schema, `pending_drivers` is the single record for a driver
 * verification request — approving/rejecting updates `status` on the same
 * doc rather than moving it to another collection. The live `drivers`
 * collection is written by the Android driver app once the driver signs in
 * with an approved account, not by this dashboard.
 */
export async function approvePendingDriver(pendingDriver) {
  const admin = await getCurrentAdmin();
  await pendingDrivers.update(pendingDriver.id, {
    status: VERIFICATION_STATUS.approved,
    rejectionReason: null,
    adminReviewMessage: "",
    approvedAt: serverTimestamp(),
  });

  await createNotification({
    hospitalId: pendingDriver.hospitalId,
    type: "driver_approved",
    title: "Driver Approved",
    message: `Driver ${pendingDriver.fullName || pendingDriver.driverName} has been approved`,
  });

  await createActivityLog({
    hospitalId: pendingDriver.hospitalId,
    action: "driver_approved",
    performedBy: admin?.uid || "unknown",
    targetId: pendingDriver.id,
    details: `Driver ${pendingDriver.fullName || pendingDriver.driverName} approved`,
  });
}

export async function rejectPendingDriver(pendingDriver, rejectionReason = "") {
  const admin = await getCurrentAdmin();
  await pendingDrivers.update(pendingDriver.id, {
    status: VERIFICATION_STATUS.rejected,
    rejectionReason,
  });

  await createNotification({
    hospitalId: pendingDriver.hospitalId,
    type: "driver_rejected",
    title: "Driver Rejected",
    message: `Driver ${pendingDriver.fullName || pendingDriver.driverName} was rejected`,
  });

  await createActivityLog({
    hospitalId: pendingDriver.hospitalId,
    action: "driver_rejected",
    performedBy: admin?.uid || "unknown",
    targetId: pendingDriver.id,
    details: `Driver ${pendingDriver.fullName || pendingDriver.driverName} rejected: ${rejectionReason || "no reason given"}`,
  });
}

export async function requestPendingDriverResubmission(pendingDriver, rejectionReason = "") {
  const admin = await getCurrentAdmin();
  await pendingDrivers.update(pendingDriver.id, {
    status: VERIFICATION_STATUS.resubmissionRequired,
    rejectionReason,
    resubmittedAt: null,
  });

  await createNotification({
    hospitalId: pendingDriver.hospitalId,
    type: "resubmission_required",
    title: "Driver Resubmission Requested",
    message: `Resubmission requested for driver ${pendingDriver.fullName || pendingDriver.driverName}`,
  });

  await createActivityLog({
    hospitalId: pendingDriver.hospitalId,
    action: "driver_resubmission_requested",
    performedBy: admin?.uid || "unknown",
    targetId: pendingDriver.id,
    details: `Resubmission requested for driver ${pendingDriver.fullName || pendingDriver.driverName}: ${rejectionReason || "no reason given"}`,
  });
}

export async function removePendingDriver(id) {
  return pendingDrivers.remove(id);
}
