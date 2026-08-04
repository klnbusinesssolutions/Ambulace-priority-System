import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { hasFirebaseConfig } from "../firebase/client.js";
import { VERIFICATION_STATUS, NOTIFICATION_TYPES } from "../firebase/collections.js";
import { useAuth } from "./AuthContext.jsx";
import { applyTheme, applyAnimations, applyCompactMode } from "../utils/theme.js";

import { listenToAmbulances } from "../services/firestore/ambulancesService.js";


import { listenToHospitals, createHospital, updateHospital, removeHospital } from "../services/firestore/hospitalsService.js";
import { listenToDrivers, updateDriverAvailability, removeDriver } from "../services/firestore/driversService.js";
import {
  listenToPendingDrivers,
  approvePendingDriver,
  rejectPendingDriver,
  requestPendingDriverResubmission,
} from "../services/firestore/pendingDriversService.js";
import { listenToRejectedRequests } from "../services/firestore/rejectedRequestsService.js";
import {
  listenToPendingAmbulances,
  approvePendingAmbulance,
  rejectPendingAmbulance,
  requestAmbulanceResubmission,
  createAmbulance,
  updateAmbulance,
  removeAmbulance,
  assignDriverToAmbulance,
} from "../services/firestore/pendingAmbulancesService.js";
import { listenToEmergencies, updateEmergencyStatus, overrideEmergencyStatus } from "../services/firestore/emergenciesService.js";
import { isEmergencyActive } from "../utils/emergencyLifecycle.js";
import { listenToLiveLocations } from "../services/firestore/liveLocationsService.js";
import { listenToNotifications, markNotificationRead, createNotification, syncAndCleanupStaleNotifications } from "../services/firestore/notificationsService.js";
import { listenToActivityLogs } from "../services/firestore/activityLogService.js";
import { listenToAnalytics, createAnalyticsRecord, removeAnalyticsRecord } from "../services/firestore/analyticsService.js";
import {
  listenToPendingPoliceOfficers,
  approvePendingPoliceOfficer,
  rejectPendingPoliceOfficer,
  requestPoliceOfficerResubmission,
} from "../services/firestore/policeOfficersService.js";
import {
  calculateApprovalBreakdown,
  calculateVerificationTrend,
  calculateKPIStats,
} from "../utils/analyticsAggregator.js";
import {
  demoHospitals,
  demoDrivers,
  demoPendingDrivers,
  demoRejectedRequests,
  demoPendingAmbulances,
  demoPendingPoliceOfficers,
  demoEmergencies,
  demoLiveLocations,
  demoNotifications,
  demoActivityLogs,
  demoAnalytics,
  systemPanels,
  verificationTrend,
} from "../services/mockData.js";

import { listenToLoginHistory } from "../services/firestore/loginHistoryService.js";
import { updateAdmin } from "../services/firestore/adminsService.js";

function getAdminStorageKey(admin) {
  return admin?.uid ? `ambugrid_settings_${admin.uid}` : "ambugrid_settings_default";
}

function getInitialSettings(admin) {
  const defaults = {
    adminName: admin?.displayName || "Super Admin",
    email: admin?.email || "admin@ambugrid.com",
    role: "Super Admin",
    theme: "System Default",
    enableAnimations: true,
    compactMode: false,
    notifications: true,
    criticalOnly: false,
    dispatchMode: "Balanced",
    timezone: "Asia/Calcutta",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12-hour",
    sessionTimeout: "30 Minutes",
  };

  try {
    const key = getAdminStorageKey(admin);
    const saved = localStorage.getItem(key) || localStorage.getItem("ambugrid_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      delete parsed.language; // Remove legacy language field if present
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.error("Failed to load settings from localStorage:", e);
  }
  return defaults;
}

const OpsContext = createContext(null);
const firebaseReady = hasFirebaseConfig();

/** Subscribe to a live Firestore service in production, or seed once from demo data. */
function useLiveCollection(listenFn, demoSeed) {
  const [items, setItems] = useState(firebaseReady ? [] : demoSeed);
  const [isLoading, setIsLoading] = useState(firebaseReady);

  useEffect(() => {
    if (!firebaseReady) return undefined;

    let unsubscribe;
    (async () => {
      unsubscribe = await listenFn(
        (rows) => {
          setItems(rows);
          setIsLoading(false);
        },
        (error) => {
          console.error(error);
          setIsLoading(false);
        },
      );
    })();

    return () => unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [items, setItems, isLoading];
}

export function OpsProvider({ children }) {
  const { admin } = useAuth();
  const [hospitals] = useLiveCollection(listenToHospitals, demoHospitals);
  const [pendingDrivers, setPendingDrivers] = useLiveCollection(listenToPendingDrivers, demoPendingDrivers);
  const [rejectedRequestsCollection, setRejectedRequestsCollection] = useLiveCollection(listenToRejectedRequests, demoRejectedRequests);
  const [drivers] = useLiveCollection(listenToDrivers, demoDrivers);
  const [pendingAmbulances, setPendingAmbulances] = useLiveCollection(listenToPendingAmbulances, demoPendingAmbulances);
  const [ambulances, setAmbulances] = useLiveCollection(listenToAmbulances, []);
  const [emergencies] = useLiveCollection(listenToEmergencies, demoEmergencies);
  const [liveLocations] = useLiveCollection(listenToLiveLocations, demoLiveLocations);
  const [notifications, setNotifications] = useLiveCollection(listenToNotifications, demoNotifications);
  const [activityLogs] = useLiveCollection(listenToActivityLogs, demoActivityLogs);
  const [analytics] = useLiveCollection(listenToAnalytics, demoAnalytics);
  const [pendingPoliceOfficers] = useLiveCollection(listenToPendingPoliceOfficers, demoPendingPoliceOfficers);
  const [loginHistory] = useLiveCollection(listenToLoginHistory, []);

  const [settings, setSettingsState] = useState(() => getInitialSettings(admin));

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    applyAnimations(settings.enableAnimations);
  }, [settings.enableAnimations]);

  useEffect(() => {
    applyCompactMode(settings.compactMode);
  }, [settings.compactMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (settings.theme === "System Default") {
        applyTheme("System Default");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings.theme]);

  useEffect(() => {
    if (!firebaseReady) return;
    const activePendingTargetIds = new Set([
      ...(pendingDrivers || []).map((d) => d.id),
      ...(pendingAmbulances || []).map((a) => a.id),
      ...(pendingPoliceOfficers || []).map((p) => p.id),
      ...(hospitals || []).filter((h) => h.status === "pending" || h.isPending).map((h) => h.id || h.hospitalId),
    ]);

    syncAndCleanupStaleNotifications(activePendingTargetIds);
  }, [pendingDrivers, pendingAmbulances, pendingPoliceOfficers, hospitals]);



  const hospitalsActions = {
    add: async (record) => {
      const created = await createHospital(record.hospitalId, record);
      if (!firebaseReady) {
        setHospitals((prev) => [
          { ...record, id: record.hospitalId, isActive: true, status: "approved", createdAt: new Date().toISOString() },
          ...prev,
        ]);
      }
      return created;
    },
    update: async (id, patch) => {
      await updateHospital(id, patch);
      if (!firebaseReady) {
        setHospitals((prev) => prev.map((h) => (h.hospitalId === id || h.id === id ? { ...h, ...patch } : h)));
      }
    },
    remove: async (id) => {
      await removeHospital(id);
      if (!firebaseReady) {
        setHospitals((prev) => prev.filter((h) => h.hospitalId !== id && h.id !== id));
      }
    },
  };

  const driversActions = {
    updateAvailability: (id, availability) => updateDriverAvailability(id, availability),
    remove: (id) => removeDriver(id),
  };

  const pendingDriversActions = {
    approve: async (driver) => {
      const approvedData = await approvePendingDriver(driver);
      if (!firebaseReady) {
        setPendingDrivers((prev) => prev.filter((d) => d.id !== driver.id));
        setDrivers((prev) => [
          ...prev.filter((d) => d.id !== driver.id),
          {
            id: driver.id,
            name: driver.fullName || driver.driverName || "Driver",
            email: driver.email || "",
            phone: driver.phone || "",
            hospitalId: driver.hospitalId || "",
            hospitalName: driver.hospitalName || "",
            licenseNumber: driver.licenseNumber || "",
            availability: "available",
            tripStatus: "standby",
            isActive: true,
            approvedAt: new Date().toISOString(),
          },
        ]);
      }
      return approvedData;
    },
    reject: async (driver, reason) => {
      const rejectedData = await rejectPendingDriver(driver, reason);
      if (!firebaseReady) {
        setPendingDrivers((prev) => prev.filter((d) => d.id !== driver.id));
        setRejectedRequestsCollection((prev) => [...prev.filter((r) => r.id !== driver.id), rejectedData]);
      }
    },
    requestResubmission: async (driver, reason) => {
      const resubmitData = await requestPendingDriverResubmission(driver, reason);
      if (!firebaseReady) {
        setRejectedRequestsCollection((prev) => prev.filter((r) => r.id !== driver.id));
        setPendingDrivers((prev) => [...prev.filter((d) => d.id !== driver.id), resubmitData]);
      }
    },
  };

  const pendingAmbulancesActions = {
    add: (record) => createAmbulance(record),
    update: (id, patch) => updateAmbulance(id, patch),
    remove: (id) => removeAmbulance(id),
    approve: async (ambulance) => {
      const approvedData = await approvePendingAmbulance(ambulance);
      if (!firebaseReady) {
        setPendingAmbulances((prev) => prev.filter((a) => a.id !== ambulance.id));
        setAmbulances((prev) => [...prev.filter((a) => a.id !== ambulance.id), approvedData]);
      }
      return approvedData;
    },
    reject: async (ambulance, reason) => {
      const rejectedData = await rejectPendingAmbulance(ambulance, reason);
      if (!firebaseReady) {
        setPendingAmbulances((prev) => prev.filter((a) => a.id !== ambulance.id));
        setRejectedRequestsCollection((prev) => [...prev.filter((r) => r.id !== ambulance.id), rejectedData]);
      }
      return rejectedData;
    },
    requestResubmission: async (ambulance, reason) => {
      const resubmitData = await requestAmbulanceResubmission(ambulance, reason);
      if (!firebaseReady) {
        setRejectedRequestsCollection((prev) => prev.filter((r) => r.id !== ambulance.id));
        setPendingAmbulances((prev) => [...prev.filter((a) => a.id !== ambulance.id), resubmitData]);
      }
      return resubmitData;
    },
    assignDriver: (ambulanceId, driverId) => assignDriverToAmbulance(ambulanceId, driverId),
  };

  const emergenciesActions = {
    updateStatus: async (id, status, record = null) => {
      await updateEmergencyStatus(id, status, record);
      if (!firebaseReady) {
        setEmergencies((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status, updatedAt: new Date().toISOString() } : e))
        );
      }
    },
    overrideStatus: async (id, newStatus, reason, oldStatus, record = null) => {
      await overrideEmergencyStatus(id, newStatus, reason, oldStatus, record);
      if (!firebaseReady) {
        setEmergencies((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status: newStatus, updatedAt: new Date().toISOString() } : e))
        );
      }
    },
  };

  const notificationsActions = {
    markRead: async (id) => {
      if (firebaseReady) {
        await markNotificationRead(id);
      } else {
        setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
      }
    },
  };

  const pendingPoliceOfficersActions = {
    approve: async (request, overrides) => {
      const approvedData = await approvePendingPoliceOfficer(request, overrides);
      if (!firebaseReady) {
        setPendingPoliceOfficers((prev) =>
          prev.map((p) => (p.id === request.id ? { ...p, status: VERIFICATION_STATUS.approved, approvedAt: new Date().toISOString() } : p))
        );
      }
      return approvedData;
    },
    reject: async (request, reason) => {
      const rejectedData = await rejectPendingPoliceOfficer(request, reason);
      if (!firebaseReady) {
        setPendingPoliceOfficers((prev) => prev.filter((p) => p.id !== request.id));
        setRejectedRequestsCollection((prev) => [...prev.filter((r) => r.id !== request.id), rejectedData]);
      }
      return rejectedData;
    },
    requestResubmission: async (request, reason) => {
      const resubmitData = await requestPoliceOfficerResubmission(request, reason);
      if (!firebaseReady) {
        setRejectedRequestsCollection((prev) => prev.filter((r) => r.id !== request.id));
        setPendingPoliceOfficers((prev) => [...prev.filter((p) => p.id !== request.id), resubmitData]);
      }
      return resubmitData;
    },
  };

  const analyticsActions = {
    add: (record) => createAnalyticsRecord(record),
    remove: (id) => removeAnalyticsRecord(id),
  };

  const value = useMemo(() => {
    const kpi = calculateKPIStats({
      hospitals,
      drivers,
      pendingDrivers,
      ambulances,
      pendingAmbulances,
      pendingPoliceOfficers,
      rejectedRequestsCollection,
      emergencies,
    });

    const breakdown = calculateApprovalBreakdown({
      hospitals,
      drivers,
      pendingDrivers,
      ambulances,
      pendingAmbulances,
      pendingPoliceOfficers,
      rejectedRequestsCollection,
    });

    const trend = calculateVerificationTrend({
      hospitals,
      drivers,
      pendingDrivers,
      ambulances,
      pendingAmbulances,
      pendingPoliceOfficers,
      rejectedRequestsCollection,
      daysCount: 7,
    });

    const activeEmergencies = (emergencies || []).filter((item) => isEmergencyActive(item.status));

    return {
      overviewStats: [
        {
          label: "Pending Driver Requests",
          value: String(kpi.pendingDriverRequests),
          detail: "pending_drivers · status: pending",
          trend: kpi.pendingDriverRequests ? "needs action" : "clear",
          tone: kpi.pendingDriverRequests ? "warning" : "success",
        },
        {
          label: "Pending Ambulance Requests",
          value: String(kpi.pendingAmbulanceRequests),
          detail: "pending_ambulances · status: pending",
          trend: kpi.pendingAmbulanceRequests ? "needs action" : "clear",
          tone: kpi.pendingAmbulanceRequests ? "warning" : "success",
        },
        {
          label: "Operational Drivers",
          value: String(kpi.operationalDriversCount),
          detail: "drivers collection (Android app)",
          trend: "login enabled",
          tone: "success",
        },
        {
          label: "Pending Police Officers",
          value: String(kpi.pendingPoliceRequests),
          detail: "pending_police_officers · status: pending",
          trend: kpi.pendingPoliceRequests ? "needs action" : "clear",
          tone: kpi.pendingPoliceRequests ? "warning" : "success",
        },
        {
          label: "Rejected Requests",
          value: String(kpi.rejectedRequests),
          detail: "Editable by hospital admins",
          trend: kpi.resubmissionRequests ? `${kpi.resubmissionRequests} resubmissions` : "reviewed",
          tone: kpi.rejectedRequests ? "danger" : "success",
        },
      ],
      operationalStats: [
        {
          label: "Active Ambulances",
          value: String(kpi.activeAmbulancesCount),
          detail: "Verified fleet available",
          trend: "dispatch ready",
          tone: "success",
        },
        {
          label: "Active Hospitals",
          value: String(kpi.activeHospitalsCount),
          detail: `${hospitals.length} hospitals connected`,
          trend: "network online",
          tone: "success",
        },
        {
          label: "Active Emergencies",
          value: String(kpi.activeEmergenciesCount),
          detail: "Currently tracked incidents",
          trend: "live monitoring",
          tone: kpi.activeEmergenciesCount ? "warning" : "success",
        },
      ],
      approvalBreakdown: breakdown,
      verificationTrend: trend,
      systemPanels: [
        {
          label: "Firestore Database",
          status: firebaseReady ? "Online" : "Demo mode",
          metric: `${hospitals.length + drivers.length + ambulances.length + emergencies.length} live docs`,
          helper: "Connected to live Firestore collections",
        },
        {
          label: "Notifications Feed",
          status: "Online",
          metric: `${notifications.length} recent`,
          helper: "notifications collection (realtime)",
        },
        {
          label: "Live Tracking",
          status: "Online",
          metric: `${liveLocations.length} ambulances`,
          helper: "live_locations collection (realtime)",
        },
        {
          label: "Analytics Pipeline",
          status: "Online",
          metric: `${analytics.length} records`,
          helper: "analytics collection (realtime)",
        },
      ],
      hospitals,
      pendingDrivers,
      rejectedRequests: rejectedRequestsCollection,
      drivers,
      pendingAmbulances,
      ambulances,
      emergencies,
      activeEmergencies,
      liveLocations,
      activityLogs,
      notifications,
      analytics,
      pendingPoliceOfficers,
      loginHistory,
      settings,
      setSettings: (patch) =>
        setSettingsState((current) => {
          const updated = typeof patch === "function" ? patch(current) : { ...current, ...patch };
          try {
            const key = getAdminStorageKey(admin);
            localStorage.setItem(key, JSON.stringify(updated));
            if (firebaseReady && admin?.uid) {
              updateAdmin(admin.uid, { settings: updated }).catch((err) =>
                console.error("Failed to sync settings to Firestore:", err)
              );
            }
          } catch (e) {
            console.error("Failed to write settings to localStorage:", e);
          }
          return updated;
        }),
      hospitalsActions,
      driversActions,
      pendingDriversActions,
      pendingAmbulancesActions,
      emergenciesActions,
      notificationsActions,
      pendingPoliceOfficersActions,
      analyticsActions,
    };
  }, [
    hospitals,
    pendingDrivers,
    rejectedRequestsCollection,
    drivers,
    pendingAmbulances,
    ambulances,
    emergencies,
    liveLocations,
    activityLogs,
    notifications,
    analytics,
    pendingPoliceOfficers,
    loginHistory,
    settings,
  ]);

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const context = useContext(OpsContext);
  if (!context) throw new Error("useOps must be used inside OpsProvider");
  return context;
}
