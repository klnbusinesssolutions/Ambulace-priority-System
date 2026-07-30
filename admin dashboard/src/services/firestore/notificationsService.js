import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService, orderBy, serverTimestamp, where, hasFirebaseConfig } from "./firestoreCollection.js";

const notifications = createCollectionService(COLLECTIONS.notifications);

export async function listenToNotifications(callback, onError) {
  return notifications.listen(callback, { constraints: [orderBy("createdAt", "desc")], onError });
}

export async function listenToNotificationsByHospital(hospitalId, callback, onError) {
  return notifications.listen(callback, {
    constraints: [where("hospitalId", "==", hospitalId), orderBy("createdAt", "desc")],
    onError,
  });
}

/**
 * Enterprise Task Upsert: Guarantees 1 Notification Task per targetId.
 * Creates new active task or updates existing task state.
 */
export async function upsertNotification({
  targetId,
  entityType = "system",
  type,
  title,
  message,
  hospitalId = "",
  status = "active",
  actionState = "pending",
}) {
  if (!hasFirebaseConfig()) {
    const payload = {
      id: `notif-${targetId || Date.now()}`,
      targetId: targetId || null,
      entityType,
      type,
      title,
      message,
      hospitalId,
      status,
      actionState,
      read: false,
      resolved: status === "resolved",
      createdAt: new Date().toISOString(),
      resolvedAt: status === "resolved" ? new Date().toISOString() : null,
    };
    return payload;
  }

  try {
    let existingDoc = null;
    if (targetId) {
      const docs = await notifications.getAll([where("targetId", "==", targetId)]);
      if (docs.length > 0) {
        existingDoc = docs[0];
      }
    }

    const now = serverTimestamp();

    if (existingDoc) {
      // Transition state of existing task notification instead of creating a duplicate!
      const updatePayload = {
        title: title || existingDoc.title,
        message: message || existingDoc.message,
        type: type || existingDoc.type,
        entityType: entityType || existingDoc.entityType || "system",
        status,
        actionState,
        resolved: status === "resolved",
        updatedAt: now,
      };

      if (status === "resolved") {
        updatePayload.resolvedAt = now;
        updatePayload.read = true;
      }

      await notifications.update(existingDoc.id, updatePayload);
      return { id: existingDoc.id, ...existingDoc, ...updatePayload };
    }

    // Create new task notification
    const payload = {
      targetId: targetId || null,
      entityType,
      type,
      title,
      message,
      hospitalId,
      status,
      actionState,
      read: false,
      resolved: status === "resolved",
      createdAt: now,
      resolvedAt: status === "resolved" ? now : null,
      updatedAt: now,
    };

    const docId = await notifications.add(payload);
    return { id: docId, ...payload };
  } catch (err) {
    console.error("upsertNotification error:", err);
    return null;
  }
}

/**
 * Transitions a notification task upon approval, rejection, or resubmission.
 * Moves task from Action Required (status: 'active') -> Recently Resolved (status: 'resolved').
 */
export async function transitionNotificationTask(targetId, updates = {}) {
  if (!targetId) return;

  const {
    status = "resolved",
    actionState = "approved",
    type,
    title,
    message,
  } = updates;

  if (hasFirebaseConfig()) {
    try {
      const existing = await notifications.getAll([where("targetId", "==", targetId)]);
      const now = serverTimestamp();

      if (existing.length === 0 && (title || message)) {
        // Create pre-resolved notification if target was approved before notification existed
        await upsertNotification({
          targetId,
          type: type || "activity_log",
          title,
          message,
          status,
          actionState,
        });
        return;
      }

      for (const notif of existing) {
        const updatePayload = {
          status,
          resolved: status === "resolved",
          actionState,
          type: type || notif.type,
          title: title || (status === "resolved" ? `✓ ${notif.title?.replace("🔔 ", "")}` : notif.title),
          message: message || notif.message,
          read: true,
          updatedAt: now,
        };

        if (status === "resolved") {
          updatePayload.resolvedAt = now;
        }

        await notifications.update(notif.id, updatePayload);
      }
    } catch (err) {
      console.error("Failed to transition notification task for targetId:", targetId, err);
    }
  }
}

/**
 * Scans Firestore active notifications and automatically resolves any stale notifications
 * whose target entity is no longer pending.
 */
export async function syncAndCleanupStaleNotifications(activePendingTargetIds = new Set()) {
  if (!hasFirebaseConfig()) return;

  try {
    const activeNotifs = await notifications.getAll([where("resolved", "==", false)]);
    const now = serverTimestamp();

    for (const notif of activeNotifs) {
      if (notif.targetId && !activePendingTargetIds.has(notif.targetId)) {
        console.info(`[NotificationSync] Auto-resolving stale notification task: ${notif.id} (targetId: ${notif.targetId})`);
        await notifications.update(notif.id, {
          status: "resolved",
          resolved: true,
          actionState: "auto_resolved",
          read: true,
          resolvedAt: now,
          updatedAt: now,
        });
      }
    }
  } catch (err) {
    console.error("Error running syncAndCleanupStaleNotifications:", err);
  }
}

// Backward compatibility wrappers
export async function createNotification(payload) {
  return upsertNotification(payload);
}

export async function markNotificationRead(id) {
  return notifications.update(id, { read: true });
}

export async function resolveNotificationByTargetId(targetId, updates = {}) {
  return transitionNotificationTask(targetId, { status: "resolved", ...updates });
}
