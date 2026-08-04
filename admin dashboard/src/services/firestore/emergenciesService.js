import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp, where } from "./firestoreCollection.js";
import { normalizeEmergencyStatus, CANONICAL_EMERGENCY_STATUS } from "../../utils/emergencyLifecycle.js";
import { createActivityLog } from "./activityLogService.js";
import { getCurrentAdmin } from "../auth/adminAuthService.js";
import { updateDriverAvailability } from "./driversService.js";
import { updateAmbulance } from "./pendingAmbulancesService.js";

const emergencies = createCollectionService(COLLECTIONS.emergencies);

export async function listenToEmergencies(callback, onError) {
  return emergencies.listen(callback, { constraints: [orderBy("startTime", "desc")], onError });
}

export async function listenToEmergenciesByHospital(hospitalId, callback, onError) {
  return emergencies.listen(callback, {
    constraints: [where("hospitalId", "==", hospitalId), orderBy("startTime", "desc")],
    onError,
  });
}

export async function updateEmergencyStatus(id, rawStatus, emergencyRecord = null) {
  const normStatus = normalizeEmergencyStatus(rawStatus);
  const patch = { status: normStatus, updatedAt: serverTimestamp() };

  if (normStatus === CANONICAL_EMERGENCY_STATUS.enRoute && !emergencyRecord?.dispatchTime) {
    patch.dispatchTime = serverTimestamp();
  }
  if (normStatus === CANONICAL_EMERGENCY_STATUS.arrived && !emergencyRecord?.arrivedTime) {
    patch.arrivedTime = serverTimestamp();
  }
  if (normStatus === CANONICAL_EMERGENCY_STATUS.completed) {
    patch.completedAt = serverTimestamp();
    patch.completedTime = serverTimestamp();
    patch.caseStatus = "resolved";

    // Release driver and ambulance if references exist
    if (emergencyRecord?.driverId) {
      try {
        await updateDriverAvailability(emergencyRecord.driverId, "available");
      } catch (err) {
        console.error("Failed to release driver on emergency completion:", err);
      }
    }
    if (emergencyRecord?.ambulanceId) {
      try {
        await updateAmbulance(emergencyRecord.ambulanceId, { availability: "available" });
      } catch (err) {
        console.error("Failed to release ambulance on emergency completion:", err);
      }
    }
  }

  return emergencies.update(id, patch);
}

/**
 * Administrative override executed strictly by Super Admins.
 */
export async function overrideEmergencyStatus(id, newRawStatus, reason = "", oldStatus = "unknown", emergencyRecord = null) {
  const admin = await getCurrentAdmin();
  const normStatus = normalizeEmergencyStatus(newRawStatus);

  await updateEmergencyStatus(id, normStatus, emergencyRecord);

  await createActivityLog({
    hospitalId: emergencyRecord?.hospitalId || null,
    action: "emergency_status_overridden",
    performedBy: admin?.uid || "super_admin",
    targetId: id,
    details: `Super Admin overridden status from '${oldStatus}' to '${normStatus}'. Reason: ${reason || "Administrative correction"}`,
  });
}
