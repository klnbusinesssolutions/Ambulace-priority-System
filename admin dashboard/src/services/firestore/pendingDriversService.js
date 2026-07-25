import { doc, getFirestore, writeBatch } from "firebase/firestore";
import { COLLECTIONS, VERIFICATION_STATUS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp, where, hasFirebaseConfig } from "./firestoreCollection.js";
import { getFirebaseApp } from "../../firebase/client.js";
import { createNotification } from "./notificationsService.js";
import { getCurrentAdmin } from "../auth/adminAuthService.js";
import { createActivityLog } from "./activityLogService.js";
import { createDriver } from "./driversService.js";
import { createRejectedRequest } from "./rejectedRequestsService.js";

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

export async function approvePendingDriver(pendingDriver) {
  const admin = await getCurrentAdmin();

  // Create driver in live drivers collection
  await createDriver({
    id: pendingDriver.id,
    hospitalId: pendingDriver.hospitalId,
    hospitalName: pendingDriver.hospitalName,
    fullName: pendingDriver.fullName,
    driverName: pendingDriver.driverName,
    email: pendingDriver.email,
    phone: pendingDriver.phone,
    gender: pendingDriver.gender,
    city: pendingDriver.city,
    state: pendingDriver.state,
    documents: pendingDriver.documents,
    aadhaarNumber: pendingDriver.aadhaarNumber,
    licenseNumber: pendingDriver.licenseNumber,
    licenseExpiry: pendingDriver.licenseExpiry,
    emergencyContact: pendingDriver.emergencyContact,
  });

  // Create notification
  await createNotification({
    hospitalId: pendingDriver.hospitalId,
    type: "driver_approved",
    title: "Driver Approved",
    message: `Driver ${pendingDriver.fullName || pendingDriver.driverName} has been approved`,
  });

  // Create activity log
  await createActivityLog({
    hospitalId: pendingDriver.hospitalId,
    action: "driver_approved",
    performedBy: admin?.uid || "unknown",
    targetId: pendingDriver.id,
    details: `Driver ${pendingDriver.fullName || pendingDriver.driverName} approved`,
  });

  // Remove from pending collection
  await pendingDrivers.remove(pendingDriver.id);
}

export async function rejectPendingDriver(pendingDriver, rejectionReason = "") {
  const admin = await getCurrentAdmin();
  const timestamp = serverTimestamp();

  const rejectedData = {
    ...pendingDriver,
    requestType: pendingDriver.requestType || "driver",
    status: VERIFICATION_STATUS.rejected,
    rejectionReason: rejectionReason || pendingDriver.rejectionReason || "",
    rejectedAt: pendingDriver.rejectedAt || (hasFirebaseConfig() ? timestamp : new Date().toISOString()),
    updatedAt: hasFirebaseConfig() ? timestamp : new Date().toISOString(),
  };

  if (hasFirebaseConfig()) {
    const app = await getFirebaseApp();
    const db = getFirestore(app);
    const batch = writeBatch(db);

    const rejectedRef = doc(db, COLLECTIONS.rejectedRequests, pendingDriver.id);
    const pendingRef = doc(db, COLLECTIONS.pendingDrivers, pendingDriver.id);

    batch.set(rejectedRef, rejectedData);
    batch.delete(pendingRef);

    // Atomically write to rejected_requests and delete from pending_drivers.
    // If set fails, delete is NOT performed.
    await batch.commit();

    try {
      await createNotification({
        hospitalId: pendingDriver.hospitalId,
        type: "driver_rejected",
        title: "Driver Rejected",
        message: `Driver ${pendingDriver.fullName || pendingDriver.driverName} was rejected`,
      });
    } catch (err) {
      console.error("Failed to create notification on driver rejection:", err);
    }

    try {
      await createActivityLog({
        hospitalId: pendingDriver.hospitalId,
        action: "driver_rejected",
        performedBy: admin?.uid || "unknown",
        targetId: pendingDriver.id,
        details: `Driver ${pendingDriver.fullName || pendingDriver.driverName} rejected: ${
          rejectionReason || pendingDriver.rejectionReason || "no reason given"
        }`,
      });
    } catch (err) {
      console.error("Failed to create activity log on driver rejection:", err);
    }
  }

  return rejectedData;
}

export async function requestPendingDriverResubmission(pendingDriver, rejectionReason = "") {
  const admin = await getCurrentAdmin();
  const timestamp = serverTimestamp();

  const resubmitData = {
    ...pendingDriver,
    status: VERIFICATION_STATUS.resubmissionRequired,
    rejectionReason: rejectionReason || pendingDriver.rejectionReason || "",
    resubmittedAt: null,
    updatedAt: hasFirebaseConfig() ? timestamp : new Date().toISOString(),
  };

  if (hasFirebaseConfig()) {
    const app = await getFirebaseApp();
    const db = getFirestore(app);
    const batch = writeBatch(db);

    const pendingRef = doc(db, COLLECTIONS.pendingDrivers, pendingDriver.id);
    const rejectedRef = doc(db, COLLECTIONS.rejectedRequests, pendingDriver.id);

    batch.set(pendingRef, resubmitData);
    batch.delete(rejectedRef);

    await batch.commit();

    try {
      await createNotification({
        hospitalId: pendingDriver.hospitalId,
        type: "resubmission_required",
        title: "Driver Resubmission Requested",
        message: `Resubmission requested for driver ${pendingDriver.fullName || pendingDriver.driverName}`,
      });
    } catch (err) {
      console.error("Failed to create notification on resubmission request:", err);
    }

    try {
      await createActivityLog({
        hospitalId: pendingDriver.hospitalId,
        action: "driver_resubmission_requested",
        performedBy: admin?.uid || "unknown",
        targetId: pendingDriver.id,
        details: `Resubmission requested for driver ${pendingDriver.fullName || pendingDriver.driverName}: ${
          rejectionReason || "no reason given"
        }`,
      });
    } catch (err) {
      console.error("Failed to create activity log on resubmission request:", err);
    }
  }

  return resubmitData;
}

export async function removePendingDriver(id) {
  return pendingDrivers.remove(id);
}



