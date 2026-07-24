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
import { listenToAnalytics } from "../services/firestore/analyticsService.js";
import {
  listenToPendingPoliceOfficers,
  approvePendingPoliceOfficer,
  rejectPendingPoliceOfficer,
  listenToPoliceTempCredential,
} from "../services/firestore/policeOfficersService.js";
import {
  demoHospitals,
  demoDrivers,
  demoPendingDrivers,
  demoPendingAmbulances,
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
  const [pendingDrivers] = useLiveCollection(listenToPendingDrivers, demoPendingDrivers);
  const [drivers] = useLiveCollection(listenToDrivers, demoDrivers);
  const [pendingAmbulances] = useLiveCollection(listenToPendingAmbulances, demoPendingAmbulances);
  const [ambulances] = useLiveCollection(
  listenToAmbulances,
  []
);
  const [emergencies] = useLiveCollection(listenToEmergencies, demoEmergencies);
  const [liveLocations] = useLiveCollection(listenToLiveLocations, demoLiveLocations);
  const [notifications, setNotifications] = useLiveCollection(listenToNotifications, demoNotifications);
  const [activityLogs] = useLiveCollection(listenToActivityLogs, demoActivityLogs);
  const [analytics] = useLiveCollection(listenToAnalytics, demoAnalytics);
  const [pendingPoliceOfficers] = useLiveCollection(listenToPendingPoliceOfficers, []);

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
    reject: (driver, reason) => rejectPendingDriver(driver, reason),
    requestResubmission: (driver, reason) => requestPendingDriverResubmission(driver, reason),
  };

  const pendingAmbulancesActions = {
    add: (record) => createAmbulance(record),
    update: (id, patch) => updateAmbulance(id, patch),
    remove: (id) => removeAmbulance(id),
    approve: (ambulance) => approvePendingAmbulance(ambulance),
    reject: (ambulance, reason) => rejectPendingAmbulance(ambulance, reason),
    requestResubmission: (ambulance, reason) => requestAmbulanceResubmission(ambulance, reason),
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
    reject: (request, reason) => rejectPendingPoliceOfficer(request, reason),
    watchCredentials: (requestId, callback, onError) =>
      listenToPoliceTempCredential(requestId, callback, onError),
  };

  
  const value = useMemo(() => {
    const pendingDriverRequests = pendingDrivers.filter((driver) => driver.status === VERIFICATION_STATUS.pending).length;
    const pendingAmbulanceRequests = pendingAmbulances.filter((unit) => unit.status === VERIFICATION_STATUS.pending).length;
    const rejectedRequests =
      pendingDrivers.filter((driver) => driver.status === VERIFICATION_STATUS.rejected).length +
      pendingAmbulances.filter((unit) => unit.status === VERIFICATION_STATUS.rejected).length;
    const resubmissionRequests =
      pendingDrivers.filter((driver) => driver.status === VERIFICATION_STATUS.resubmissionRequired).length +
      pendingAmbulances.filter((unit) => unit.status === VERIFICATION_STATUS.resubmissionRequired).length;
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
      verificationTrend,
      systemPanels,
      hospitals,
      pendingDrivers,
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hospitals, pendingDrivers, drivers, pendingAmbulances, ambulances, emergencies, liveLocations, activityLogs, notifications, analytics, pendingPoliceOfficers, settings]);

  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>;
}

export function useOps() {
  const context = useContext(OpsContext);
  if (!context) throw new Error("useOps must be used inside OpsProvider");
  return context;
}
