import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { hasFirebaseConfig } from "../firebase/client.js";
import { VERIFICATION_STATUS } from "../firebase/collections.js";
import { useAuth } from "./AuthContext.jsx";

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
import { listenToEmergencies, updateEmergencyStatus } from "../services/firestore/emergenciesService.js";
import { listenToLiveLocations } from "../services/firestore/liveLocationsService.js";
import { listenToNotifications, markNotificationRead } from "../services/firestore/notificationsService.js";
import { listenToActivityLogs } from "../services/firestore/activityLogService.js";
import { listenToAnalytics, createAnalyticsRecord, removeAnalyticsRecord } from "../services/firestore/analyticsService.js";
import {
  listenToPendingPoliceOfficers,
  approvePendingPoliceOfficer,
  rejectPendingPoliceOfficer,
  requestPoliceOfficerResubmission,
  listenToPoliceTempCredential,
} from "../services/firestore/policeOfficersService.js";
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

  const [settings, setSettings] = useState({
    adminName: admin?.displayName || "Super Admin",
    email: admin?.email || "admin@ambugrid.com",
    role: "Super Admin",
    notifications: true,
    criticalOnly: false,
    timezone: "Asia/Calcutta",
    dispatchMode: "Balanced",
  });



  const hospitalsActions = {
    add: (record) => createHospital(record.hospitalId, record),
    update: (id, patch) => updateHospital(id, patch),
    remove: (id) => removeHospital(id),
  };

  const driversActions = {
    updateAvailability: (id, availability) => updateDriverAvailability(id, availability),
    remove: (id) => removeDriver(id),
  };

  const pendingDriversActions = {
    approve: (driver) => approvePendingDriver(driver),
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
    updateStatus: (id, status) => updateEmergencyStatus(id, status),
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
    approve: (request, overrides) => approvePendingPoliceOfficer(request, overrides),
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
    watchCredentials: (requestId, callback, onError) =>
      listenToPoliceTempCredential(requestId, callback, onError),
  };


  const analyticsActions = {
    add: (record) => createAnalyticsRecord(record),
    remove: (id) => removeAnalyticsRecord(id),
  };

  const value = useMemo(() => {
    const pendingDriverRequests = pendingDrivers.filter((driver) => driver.status === VERIFICATION_STATUS.pending).length;
    const pendingAmbulanceRequests = pendingAmbulances.filter((unit) => unit.status === VERIFICATION_STATUS.pending).length;

    const allRejectedIds = new Set([
      ...(rejectedRequestsCollection || []).map((item) => item.id),
      ...pendingDrivers.filter((driver) => driver.status === VERIFICATION_STATUS.rejected).map((d) => d.id),
      ...pendingAmbulances.filter((unit) => unit.status === VERIFICATION_STATUS.rejected).map((u) => u.id),
      ...pendingPoliceOfficers.filter((officer) => officer.status === VERIFICATION_STATUS.rejected).map((o) => o.id),
    ]);
    const rejectedRequests = allRejectedIds.size;

    const resubmissionRequests =
      pendingDrivers.filter((driver) => driver.status === VERIFICATION_STATUS.resubmissionRequired).length +
      pendingAmbulances.filter((unit) => unit.status === VERIFICATION_STATUS.resubmissionRequired).length +
      pendingPoliceOfficers.filter((officer) => officer.status === VERIFICATION_STATUS.resubmissionRequired).length;
    const activeEmergencies = emergencies.filter((item) => !["completed", "resolved"].includes(item.status));
    const pendingPoliceRequests = pendingPoliceOfficers.filter(
  (officer) => officer.status === VERIFICATION_STATUS.pending
).length;
    return {
      overviewStats: [
        {
          label: "Pending Driver Requests",
          value: String(pendingDriverRequests),
          detail: "pending_drivers · status: pending",
          trend: pendingDriverRequests ? "needs action" : "clear",
          tone: pendingDriverRequests ? "warning" : "success",
        },
        {
          label: "Pending Ambulance Requests",
          value: String(pendingAmbulanceRequests),
          detail: "pending_ambulances · status: pending",
          trend: pendingAmbulanceRequests ? "needs action" : "clear",
          tone: pendingAmbulanceRequests ? "warning" : "success",
        },
        {
          label: "Operational Drivers",
          value: String(drivers.length),
          detail: "drivers collection (Android app)",
          trend: "login enabled",
          tone: "success",
        },
        {
  label: "Pending Police Officers",
  value: String(pendingPoliceRequests),
  detail: "pending_police_officers · status: pending",
  trend: pendingPoliceRequests ? "needs action" : "clear",
  tone: pendingPoliceRequests ? "warning" : "success",
},
        {
          label: "Rejected Requests",
          value: String(rejectedRequests),
          detail: "Editable by hospital admins",
          trend: resubmissionRequests ? `${resubmissionRequests} resubmissions` : "reviewed",
          tone: rejectedRequests ? "danger" : "success",
        },
      ],
      operationalStats: [
        {
          label: "Active Ambulances",
          value: String(ambulances.length),
          detail: "Verified fleet available",
          trend: "dispatch ready",
          tone: "success",
        },
        {
          label: "Active Hospitals",
          value: String(hospitals.filter((hospital) => hospital.isActive).length),
          detail: `${hospitals.length} hospitals connected`,
          trend: "network online",
          tone: "success",
        },
        {
          label: "Active Emergencies",
          value: String(activeEmergencies.length),
          detail: "Currently tracked incidents",
          trend: "live monitoring",
          tone: activeEmergencies.length ? "warning" : "success",
        },
      ],
      approvalBreakdown: [
        { name: "Approved", value: drivers.length + ambulances.length },
        { name: "Rejected", value: rejectedRequests },
        {
          name: "Pending",
          value:
            pendingDriverRequests +
            pendingAmbulanceRequests +
            pendingPoliceRequests,
        },
        { name: "Resubmission", value: resubmissionRequests },
      ],
      verificationTrend: (() => {
        const trendList = [
          { day: "Mon", approvals: 0, rejections: 0 },
          { day: "Tue", approvals: 0, rejections: 0 },
          { day: "Wed", approvals: 0, rejections: 0 },
          { day: "Thu", approvals: 0, rejections: 0 },
          { day: "Fri", approvals: 0, rejections: 0 },
          { day: "Sat", approvals: 0, rejections: 0 },
          { day: "Sun", approvals: 0, rejections: 0 },
        ];
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const allItems = [
          ...(rejectedRequestsCollection || []),
          ...(pendingDrivers || []),
          ...(pendingAmbulances || []),
          ...(pendingPoliceOfficers || []),
        ];
        allItems.forEach((req) => {
          const ts = req.approvedAt || req.rejectedAt || req.updatedAt || req.submittedAt || req.createdAt || req.requestedAt;
          if (!ts) return;
          const dt = typeof ts?.toDate === "function" ? ts.toDate() : ts instanceof Date ? ts : new Date(ts);
          if (isNaN(dt.getTime())) return;
          const dayName = days[dt.getDay()];
          const item = trendList.find((t) => t.day === dayName);
          if (item) {
            if (req.status === VERIFICATION_STATUS.approved) item.approvals += 1;
            else if (req.status === VERIFICATION_STATUS.rejected) item.rejections += 1;
          }
        });
        return trendList;
      })(),
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
      ambulances: ambulances,
      emergencies,
      activeEmergencies,
      liveLocations,
      activityLogs,
      notifications,
      analytics,
      pendingPoliceOfficers,
      settings,
      setSettings: (patch) => setSettings((current) => ({ ...current, ...patch })),
      hospitalsActions,
      driversActions,
      pendingDriversActions,
      pendingAmbulancesActions,
      emergenciesActions,
      notificationsActions,
      pendingPoliceOfficersActions,
      analyticsActions,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitals, pendingDrivers, rejectedRequestsCollection, drivers, pendingAmbulances, ambulances, emergencies, liveLocations, activityLogs, notifications, analytics, pendingPoliceOfficers, settings]);

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const context = useContext(OpsContext);
  if (!context) throw new Error("useOps must be used inside OpsProvider");
  return context;
}
