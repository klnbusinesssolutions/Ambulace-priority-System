import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronDown, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { useOverlay } from "../../context/OverlayContext.jsx";
import { NOTIFICATION_TYPES, VERIFICATION_STATUS } from "../../firebase/collections.js";
import { formatDateTime } from "../../utils/formatters.js";
import Button from "../../components/ui/Button.jsx";
import GlobalSearch from "../search/GlobalSearch.jsx";
import { resolveNotificationDestination } from "../../services/notifications/notificationRouter.js";
import { getNotificationConfig, NOTIFICATION_CATEGORIES, isActionRequiredNotification, isResolvedNotification } from "../../services/notifications/notificationConfig.js";

function MobileMenuButton({ onClick }) {
  return (
    <Button variant="ghost" size="icon" className="md:hidden" onClick={onClick} aria-label="Open navigation menu">
      <Menu className="h-5 w-5" />
    </Button>
  );
}

function initialsOf(name = "") {
  return name
    .split(" ")
    .map((word) => word[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Topbar({ onMenuClick }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const {
    settings,
    notifications = [],
    notificationsActions,
    pendingDrivers = [],
    pendingAmbulances = [],
    pendingPoliceOfficers = [],
    hospitals = [],
    drivers = [],
    ambulances = [],
    emergencies = [],
  } = useOps();
  const { openOverlay, closeOverlay, closeAndOpenDrawer, closeAndNavigate, isOverlayOpen } = useOverlay();

  const notificationsOpen = isOverlayOpen("NOTIFICATIONS");

  const activePendingTargetIds = useMemo(() => {
    const ids = new Set();
    (pendingDrivers || []).forEach((d) => (d.status === "pending" || d.status === VERIFICATION_STATUS.pending) && ids.add(d.id));
    (pendingAmbulances || []).forEach((a) => (a.status === "pending" || a.status === VERIFICATION_STATUS.pending) && ids.add(a.id));
    (pendingPoliceOfficers || []).forEach((p) => (p.status === "pending" || p.status === VERIFICATION_STATUS.pending) && ids.add(p.id));
    (hospitals || []).forEach((h) => (h.status === "pending" || h.isPending) && ids.add(h.id || h.hospitalId));
    return ids;
  }, [pendingDrivers, pendingAmbulances, pendingPoliceOfficers, hospitals]);

  // Filter Action Required (open tasks only) for Topbar Popup Bell
  const actionRequiredNotifications = useMemo(() => {
    return notifications.filter((n) => isActionRequiredNotification(n, activePendingTargetIds));
  }, [notifications, activePendingTargetIds]);

  // Filter Recently Resolved notifications sorted by resolvedAt descending
  const recentActivityNotifications = useMemo(() => {
    return notifications
      .filter((n) => isResolvedNotification(n, activePendingTargetIds))
      .sort((a, b) => {
        const timeA = new Date(a.resolvedAt || a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.resolvedAt || b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
  }, [notifications, activePendingTargetIds]);

  const unreadCount = useMemo(() => actionRequiredNotifications.filter((item) => !item.read).length, [actionRequiredNotifications]);

  const handleNotificationClick = (notification) => {
    notificationsActions.markRead(notification.id);

    const destination = resolveNotificationDestination(notification, {
      pendingDrivers,
      pendingAmbulances,
      pendingPoliceOfficers,
      hospitals,
      drivers,
      ambulances,
      emergencies,
    });

    if (destination.action === "OPEN_DRAWER") {
      closeAndOpenDrawer(
        {
          ...destination.payload,
          onViewFullDetails: () => closeAndNavigate(navigate, destination.payload.item ? `${destination.payload.route || "/admin/verification/pending-drivers"}?highlight=${notification.targetId}` : "/admin/verification/pending-drivers", 150),
        },
        150
      );
    } else {
      closeAndNavigate(navigate, destination.route, 150);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-[#111827]/95 sm:px-6">
      <MobileMenuButton onClick={onMenuClick} />

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 md:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Systems operational
        </div>

        <div className="group relative">
          <Button
            variant="secondary"
            size="icon"
            aria-label="Notifications"
            className="relative"
            onClick={() => (notificationsOpen ? closeOverlay() : openOverlay("NOTIFICATIONS"))}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          {notificationsOpen && (
            <>
              <button
                type="button"
                aria-label="Close notifications"
                className="fixed inset-0 z-10 cursor-default"
                onClick={closeOverlay}
              />
              <div className="absolute right-0 top-11 z-20 w-80 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-2 py-1.5">
                  <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">Action Required</p>
                  <p className="text-xs text-slate-400">{actionRequiredNotifications.length} active</p>
                </div>

                <div className="max-h-96 space-y-3 overflow-y-auto pt-1">
                  {/* Section 1: Action Required */}
                  <div>
                    <div className="mb-1 flex items-center justify-between rounded bg-amber-50 dark:bg-amber-950/40 px-2 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
                      <span>Action Required</span>
                      <span className="rounded-full bg-amber-200 dark:bg-amber-800 px-1.5 py-0.2 text-[10px] font-bold">
                        {actionRequiredNotifications.length}
                      </span>
                    </div>
                    {actionRequiredNotifications.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-slate-400">All pending requests have been processed.</p>
                    ) : (
                      actionRequiredNotifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className={`block w-full rounded-md px-2 py-2 text-left text-sm transition hover:bg-amber-50/50 dark:hover:bg-amber-950/30 ${
                            notification.read ? "opacity-60" : ""
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />}
                            <span className="font-medium text-slate-950 dark:text-slate-100">{notification.title}</span>
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{notification.message}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-400">{formatDateTime(notification.createdAt)}</span>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Section 2: Recently Resolved / Alerts */}
                  {recentActivityNotifications.length > 0 && (
                    <div>
                      <div className="mb-1 flex items-center justify-between rounded bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>Recently Resolved</span>
                        <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 text-[10px] font-bold">
                          {recentActivityNotifications.length}
                        </span>
                      </div>
                      {recentActivityNotifications.slice(0, 5).map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className="block w-full rounded-md px-2 py-2 text-left text-sm transition opacity-60 hover:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <span className="font-medium text-slate-950 dark:text-slate-100">{notification.title}</span>
                          <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{notification.message}</span>
                          <span className="mt-0.5 block text-[11px] text-slate-400">{formatDateTime(notification.createdAt)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1 text-center">
                  <button
                    type="button"
                    onClick={() => closeAndNavigate(navigate, "/admin/notifications", 150)}
                    className="w-full rounded-md py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-800 transition"
                  >
                    View Notification Center & Logs →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="group relative">
          <Button variant="secondary" className="gap-3">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 dark:bg-emerald-600 text-xs text-white">{initialsOf(settings.adminName)}</span>
            <span className="hidden text-sm sm:inline">{settings.adminName}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </Button>
          <div className="invisible absolute right-0 top-11 w-56 rounded-lg border border-slate-200 bg-white p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100 dark:border-slate-800 dark:bg-slate-900">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-slate-950 dark:text-slate-100">{settings.adminName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{settings.role}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
