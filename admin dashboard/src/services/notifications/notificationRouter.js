import { getNotificationConfig, NOTIFICATION_CATEGORIES } from "./notificationConfig.js";

/**
 * Validates the target document state in OpsContext and resolves the exact destination action.
 * Prevents dangling target IDs from ever entering an infinite loading state.
 */
export function resolveNotificationDestination(notification, opsData = {}) {
  if (!notification) {
    return { action: "NAVIGATE", route: "/admin/notifications" };
  }

  const {
    pendingDrivers = [],
    pendingAmbulances = [],
    pendingPoliceOfficers = [],
    hospitals = [],
    drivers = [],
    ambulances = [],
    emergencies = [],
  } = opsData;

  const config = getNotificationConfig(notification.type);
  const targetId = notification.targetId;

  // 1. If notification is Category A (Action Required) and has a drawer target
  if (config.category === NOTIFICATION_CATEGORIES.actionRequired && targetId) {
    let pendingItem = null;
    let approvedItem = null;

    if (config.entityType === "driver") {
      pendingItem = pendingDrivers.find((d) => d.id === targetId);
      approvedItem = drivers.find((d) => d.id === targetId);
    } else if (config.entityType === "ambulance") {
      pendingItem = pendingAmbulances.find((a) => a.id === targetId);
      approvedItem = ambulances.find((a) => a.id === targetId);
    } else if (config.entityType === "police") {
      pendingItem = pendingPoliceOfficers.find((p) => p.id === targetId);
    } else if (config.entityType === "hospital") {
      pendingItem = hospitals.find((h) => (h.id === targetId || h.hospitalId === targetId) && (h.status === "pending" || h.isPending));
      approvedItem = hospitals.find((h) => (h.id === targetId || h.hospitalId === targetId) && h.status === "active");
    } else if (config.entityType === "emergency") {
      pendingItem = emergencies.find((e) => e.id === targetId);
    }

    // A. Pending request STILL EXISTS and is action-required -> Open Drawer
    if (pendingItem) {
      return {
        action: "OPEN_DRAWER",
        drawerType: config.drawerType,
        payload: {
          type: config.drawerType,
          item: pendingItem,
          targetId: pendingItem.id || targetId,
          isRequest: true,
        },
      };
    }

    // B. Target document was ALREADY APPROVED -> Redirect to live approved entity page
    if (approvedItem) {
      let route = config.targetRoute;
      if (config.entityType === "driver") route = `/admin/drivers?highlight=${targetId}`;
      else if (config.entityType === "ambulance") route = `/admin/ambulances?highlight=${targetId}`;
      else if (config.entityType === "hospital") route = `/admin/hospitals?highlight=${targetId}`;

      return {
        action: "NAVIGATE_WITH_NOTICE",
        route,
        notice: `Request (${targetId}) has already been approved. Opening driver/entity profile.`,
      };
    }

    // C. Target document was ALREADY PROCESSED / DELETED -> Show Notice & Navigate to entity page
    return {
      action: "PROCESSED_NOTICE",
      route: config.targetRoute,
      notice: "This request has already been processed or resolved.",
    };
  }

  // 2. Category B (Activity Log) or non-drawer notifications -> Direct Route Navigation
  const targetRoute = config.targetRoute || "/admin/notifications";
  const highlightedRoute = targetId ? `${targetRoute}?highlight=${targetId}` : targetRoute;

  return {
    action: "NAVIGATE",
    route: highlightedRoute,
  };
}
