import { NOTIFICATION_TYPES } from "../../firebase/collections.js";

/**
 * Category A: Action Required (Actionable requests needing admin decision)
 * Category B: Activity Log (Historical audit trails and non-actionable events)
 */
export const NOTIFICATION_CATEGORIES = {
  actionRequired: "ACTION_REQUIRED",
  activityLog: "ACTIVITY_LOG",
};

export const NOTIFICATION_CONFIGS = {
  // Category A: Action Required
  [NOTIFICATION_TYPES.newDriverRequest]: {
    category: NOTIFICATION_CATEGORIES.actionRequired,
    entityType: "driver",
    targetCollection: "pending_drivers",
    targetRoute: "/admin/verification/pending-drivers",
    drawerType: "driver",
    priority: "high",
    color: "amber",
    title: "🔔 New Driver Registration Request",
  },
  [NOTIFICATION_TYPES.newAmbulanceRequest]: {
    category: NOTIFICATION_CATEGORIES.actionRequired,
    entityType: "ambulance",
    targetCollection: "pending_ambulances",
    targetRoute: "/admin/verification/pending-ambulances",
    drawerType: "ambulance",
    priority: "high",
    color: "amber",
    title: "🔔 New Ambulance Registration Request",
  },
  [NOTIFICATION_TYPES.newPoliceRequest]: {
    category: NOTIFICATION_CATEGORIES.actionRequired,
    entityType: "police",
    targetCollection: "pending_police_officers",
    targetRoute: "/admin/verification/pending-police-officers",
    drawerType: "police",
    priority: "high",
    color: "amber",
    title: "🔔 New Police Officer Registration Request",
  },
  [NOTIFICATION_TYPES.newHospitalRequest]: {
    category: NOTIFICATION_CATEGORIES.actionRequired,
    entityType: "hospital",
    targetCollection: "hospitals",
    targetRoute: "/admin/hospitals",
    drawerType: "hospital",
    priority: "high",
    color: "blue",
    title: "🔔 New Hospital Registration Request",
  },
  [NOTIFICATION_TYPES.resubmissionRequired]: {
    category: NOTIFICATION_CATEGORIES.actionRequired,
    entityType: "driver",
    targetCollection: "pending_drivers",
    targetRoute: "/admin/verification/pending-drivers",
    drawerType: "driver",
    priority: "medium",
    color: "amber",
    title: "Resubmission Requested",
  },
  critical_emergency: {
    category: NOTIFICATION_CATEGORIES.actionRequired,
    entityType: "emergency",
    targetCollection: "emergencies",
    targetRoute: "/admin/emergencies",
    drawerType: "emergency",
    priority: "critical",
    color: "red",
    title: "🚨 Critical Emergency Alert",
  },
  system_alert: {
    category: NOTIFICATION_CATEGORIES.actionRequired,
    entityType: "system",
    targetCollection: "system",
    targetRoute: "/admin/settings",
    drawerType: null,
    priority: "high",
    color: "red",
    title: "⚠️ System Security Alert",
  },

  // Category B: Activity Log / Historical Audit Events (Resolved Actions)
  [NOTIFICATION_TYPES.driverApproved]: {
    category: NOTIFICATION_CATEGORIES.activityLog,
    entityType: "driver",
    targetCollection: "drivers",
    targetRoute: "/admin/drivers",
    drawerType: null,
    priority: "low",
    color: "emerald",
    title: "Driver Approved",
  },
  [NOTIFICATION_TYPES.driverRejected]: {
    category: NOTIFICATION_CATEGORIES.activityLog,
    entityType: "driver",
    targetCollection: "rejected_requests",
    targetRoute: "/admin/verification/pending-drivers",
    drawerType: null,
    priority: "low",
    color: "red",
    title: "Driver Rejected",
  },
  [NOTIFICATION_TYPES.ambulanceApproved]: {
    category: NOTIFICATION_CATEGORIES.activityLog,
    entityType: "ambulance",
    targetCollection: "ambulances",
    targetRoute: "/admin/ambulances",
    drawerType: null,
    priority: "low",
    color: "emerald",
    title: "Ambulance Approved",
  },
  [NOTIFICATION_TYPES.ambulanceRejected]: {
    category: NOTIFICATION_CATEGORIES.activityLog,
    entityType: "ambulance",
    targetCollection: "rejected_requests",
    targetRoute: "/admin/verification/pending-ambulances",
    drawerType: null,
    priority: "low",
    color: "red",
    title: "Ambulance Rejected",
  },
  police_approved: {
    category: NOTIFICATION_CATEGORIES.activityLog,
    entityType: "police",
    targetCollection: "police_officers",
    targetRoute: "/admin/verification/pending-police-officers",
    drawerType: null,
    priority: "low",
    color: "emerald",
    title: "Police Officer Approved",
  },
  police_rejected: {
    category: NOTIFICATION_CATEGORIES.activityLog,
    entityType: "police",
    targetCollection: "rejected_requests",
    targetRoute: "/admin/verification/pending-police-officers",
    drawerType: null,
    priority: "low",
    color: "red",
    title: "Police Officer Rejected",
  },
  hospital_approved: {
    category: NOTIFICATION_CATEGORIES.activityLog,
    entityType: "hospital",
    targetCollection: "hospitals",
    targetRoute: "/admin/hospitals",
    drawerType: null,
    priority: "low",
    color: "emerald",
    title: "Hospital Verified",
  },
  admin_login: {
    category: NOTIFICATION_CATEGORIES.activityLog,
    entityType: "audit",
    targetCollection: "login_history",
    targetRoute: "/admin/settings",
    drawerType: null,
    priority: "low",
    color: "blue",
    title: "Admin Login Success",
  },
  export_completed: {
    category: NOTIFICATION_CATEGORIES.activityLog,
    entityType: "audit",
    targetCollection: "analytics",
    targetRoute: "/admin/analytics",
    drawerType: null,
    priority: "low",
    color: "purple",
    title: "Analytics Export Completed",
  },
};

export function getNotificationConfig(type) {
  return (
    NOTIFICATION_CONFIGS[type] || {
      category: NOTIFICATION_CATEGORIES.activityLog,
      entityType: "system",
      targetCollection: "notifications",
      targetRoute: "/admin/notifications",
      drawerType: null,
      priority: "low",
      color: "slate",
      title: "Notification",
    }
  );
}

/**
 * Strict Predicate: Is this notification an Action Required open task?
 * An item is Action Required ONLY IF:
 * 1. Config category is ACTION_REQUIRED (new_driver_request, new_ambulance_request, etc.)
 * 2. status !== "resolved" AND resolved !== true
 * 3. If targetId is provided and activePendingTargetIds is passed, targetId MUST exist in activePendingTargetIds!
 */
export function isActionRequiredNotification(notification, activePendingTargetIds = null) {
  if (!notification) return false;
  const config = getNotificationConfig(notification.type);

  // 1. Approved/rejected/completed notification types are NEVER Action Required!
  if (config.category !== NOTIFICATION_CATEGORIES.actionRequired) {
    return false;
  }

  // 2. Explicitly resolved tasks are NEVER Action Required!
  if (notification.resolved === true || notification.status === "resolved") {
    return false;
  }

  // 3. If targetId exists and pending set is provided, target MUST be pending!
  if (activePendingTargetIds && notification.targetId) {
    if (!activePendingTargetIds.has(notification.targetId)) {
      return false;
    }
  }

  return true;
}

/**
 * Strict Predicate: Is this notification a Recently Resolved item?
 */
export function isResolvedNotification(notification, activePendingTargetIds = null) {
  return !isActionRequiredNotification(notification, activePendingTargetIds);
}
