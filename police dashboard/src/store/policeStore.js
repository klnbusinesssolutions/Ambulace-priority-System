import { create } from "zustand";

import { isFirebaseConfigured } from "@/firebase/config";
import {
  loginWithFirebase,
  logoutFromFirebase,
  requestPoliceAccess,
  sendPolicePasswordReset,
  subscribeToAuth,
} from "@/services/authService";
import {
  deleteAlertRemote,
  FIRESTORE_COLLECTIONS,
  FIRESTORE_DOCS,
  getPoliceOfficerProfile,
  markAllAlertsReadRemote,
  normalizeActivityRecord,
  isTripActivity,
  normalizeAlertRecord,
  subscribeToCollection,
  subscribeToDocument,
  updateAlertReadState,
} from "@/services/firebaseDataService";
import { emptyAnalytics, emptySystemStatus } from "@/services/policeConstants";
import { subscribeToEmergencies } from "@/services/realtimeEmergencyService";
import { startTripAlertWatcher } from "@/services/tripAlertWatcher";
import {
  createTrafficReport,
  deleteTrafficReport,
  subscribeToTrafficReports,
  updateTrafficReport,
} from "@/services/trafficService";

const emptyEmergencyFilters = {
  severity: "All",
  hospital: "All",
  status: "All",
  area: "All",
  driverName: "All",
};

function toOperator(user) {
  if (!user) return null;

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split("@")[0] || "Police Operator",
    role: user.role || "police",
    badgeId: null,
    department: null,
    station: null,
    serviceRadiusKm: null,
  };
}

// The Auth user object has no badge/station/approval info - that lives on
// the police_officers/{uid} Firestore doc. The officer sets their own
// passcode at registration (Register.jsx), but the doc starts out with
// status: "pending" / isActive: false until an admin approves the request
// (admin dashboard > Verification > Pending Police Officers). This fetches
// it once after login and merges it into currentOperator, and reports
// whether the account is actually approved yet.
async function hydrateOperatorStation(set, get, uid) {
  const profile = await getPoliceOfficerProfile(uid).catch((error) => {
    console.error("Failed to load officer profile:", error);
    return null;
  });

  if (get().currentOperator?.uid !== uid) return { approved: false, profile: null }; // logged out/changed before this resolved

  const approved = Boolean(profile) && profile.status === "approved" && profile.isActive !== false;

  set((state) => ({
    currentOperator: state.currentOperator
      ? {
          ...state.currentOperator,
          badgeId: profile?.badgeId ?? null,
          department: profile?.department ?? null,
          station: profile?.station ?? null,
          serviceRadiusKm: profile?.serviceRadiusKm ?? null,
          approvalStatus: profile?.status ?? "pending",
        }
      : state.currentOperator,
    accessApproved: approved,
  }));

  return { approved, profile };
}

function setFirestoreConnection(set, value) {
  set((state) => ({
    systemStatus: {
      ...state.systemStatus,
      firestoreConnection: value,
      lastHeartbeat: new Date().toISOString(),
    },
    liveDataConnected: value === "Connected",
  }));
}

function createLiveDataErrorHandler(set) {
  return (error) => {
    console.error("Firebase realtime subscription failed:", error);
    setFirestoreConnection(set, "Disconnected");
  };
}

export const usePoliceStore = create((set, get) => ({
  emergencies: [],
  hospitals: [],
  priorityAlerts: [],
  activityFeed: [],
  systemStatus: {
    ...emptySystemStatus,
    firestoreConnection: isFirebaseConfigured ? "Connecting" : "Firebase config missing",
  },
  trafficReports: [],
  analytics: emptyAnalytics,
  selectedEmergencyId: null,
  drawerOpen: false,
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  searchQuery: "",
  isAuthenticated: false,
  authReady: !isFirebaseConfigured,
  authError: null,
  currentOperator: null,
  // Set once hydrateOperatorStation resolves the police_officers/{uid} doc.
  // null = not checked yet, true = approved, false = pending/rejected/missing.
  accessApproved: null,
  liveDataConnected: false,
  _authUnsubscribe: null,
  _unsubscribers: [],

  emergencyFilters: emptyEmergencyFilters,
  sortKey: "lastUpdated",
  sortDir: "desc",
  page: 1,
  pageSize: 5,

  alertFilters: { category: "All", severity: "All" },
  alertSearchQuery: "",

  // When false (default), emergencies/hospitals are scoped to the signed-in
  // officer's station + serviceRadiusKm. Toggle to see the whole city.
  cityWide: false,
  toggleCityWide: () => set((state) => ({ cityWide: !state.cityWide })),

  initializeAuth: () => {
    if (get()._authUnsubscribe) return get()._authUnsubscribe;

    const unsubscribe = subscribeToAuth(
      (user) => {
        set({
          authReady: true,
          isAuthenticated: Boolean(user),
          currentOperator: toOperator(user),
          accessApproved: user ? null : false,
          authError: null,
        });

        if (user) {
          hydrateOperatorStation(set, get, user.uid).then(({ approved }) => {
            if (!approved && get().currentOperator?.uid === user.uid) {
              // Registered but not yet approved (or rejected) - don't leave
              // them signed into a dashboard they can't use.
              logoutFromFirebase();
              set({
                isAuthenticated: false,
                currentOperator: null,
                accessApproved: false,
                authError: "Your registration is still awaiting admin approval.",
              });
            }
          });
        }
      },
      (error) => {
        console.error("Firebase auth listener failed:", error);
        set({ authReady: true, isAuthenticated: false, currentOperator: null, authError: error.message });
      },
    );

    set({ _authUnsubscribe: unsubscribe });
    return unsubscribe;
  },

  login: async (identifier, password) => {
    set({ authError: null });

    try {
      const user = await loginWithFirebase(identifier, password);
      set({
        isAuthenticated: true,
        authReady: true,
        currentOperator: toOperator(user),
        accessApproved: null,
      });

      const { approved, profile } = await hydrateOperatorStation(set, get, user.uid);

      if (!approved) {
        await logoutFromFirebase();
        const message =
          profile?.status === "rejected"
            ? "Your registration request was rejected. Contact your department admin."
            : "Your registration is still awaiting admin approval.";
        set({ isAuthenticated: false, currentOperator: null, accessApproved: false, authError: message });
        throw new Error(message);
      }

      return user;
    } catch (error) {
      set({ authError: error.message, isAuthenticated: false });
      throw error;
    }
  },

  logout: async () => {
    await logoutFromFirebase();
    get()._unsubscribers.forEach((unsubscribe) => unsubscribe());
    set({
      isAuthenticated: false,
      currentOperator: null,
      liveDataConnected: false,
      _unsubscribers: [],
    });
  },

  requestAccess: async (formData) => requestPoliceAccess(formData),
  resetPasscode: async (identifier) => sendPolicePasswordReset(identifier),

  selectEmergency: (id) => set({ selectedEmergencyId: id, drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setEmergencyFilter: (key, value) =>
    set((state) => ({ emergencyFilters: { ...state.emergencyFilters, [key]: value }, page: 1 })),
  resetEmergencyFilters: () => set({ emergencyFilters: emptyEmergencyFilters, page: 1 }),
  setSort: (key) =>
    set((state) => ({
      sortKey: key,
      sortDir: state.sortKey === key && state.sortDir === "asc" ? "desc" : "asc",
    })),
  setPage: (page) => set({ page }),

  setAlertFilter: (key, value) => set((state) => ({ alertFilters: { ...state.alertFilters, [key]: value } })),
  setAlertSearchQuery: (alertSearchQuery) => set({ alertSearchQuery }),

  markAlertRead: async (id) => {
    set((state) => ({
      priorityAlerts: state.priorityAlerts.map((alert) => (alert.id === id ? { ...alert, read: true } : alert)),
    }));
    await updateAlertReadState(id, true);
  },

  markAllAlertsRead: async () => {
    const alerts = get().priorityAlerts;
    set((state) => ({ priorityAlerts: state.priorityAlerts.map((alert) => ({ ...alert, read: true })) }));
    await markAllAlertsReadRemote(alerts);
  },

  deleteAlert: async (id) => {
    set((state) => ({ priorityAlerts: state.priorityAlerts.filter((alert) => alert.id !== id) }));
    await deleteAlertRemote(id);
  },

  getSelectedEmergency: () => {
    const { emergencies: emergencyList, selectedEmergencyId } = get();
    return emergencyList.find((emergency) => emergency.id === selectedEmergencyId) ?? emergencyList[0];
  },

  subscribeToLiveData: () => {
    get()._unsubscribers.forEach((unsubscribe) => unsubscribe());

    if (!isFirebaseConfigured) {
      setFirestoreConnection(set, "Firebase config missing");
      return () => {};
    }

    const handleError = createLiveDataErrorHandler(set);
    const handleConnected = () => setFirestoreConnection(set, "Connected");

    const unsubEmergencies = subscribeToEmergencies(
      (liveEmergencies) => {
        set((state) => ({
          emergencies: liveEmergencies,
          selectedEmergencyId:
            liveEmergencies.some((emergency) => emergency.id === state.selectedEmergencyId)
              ? state.selectedEmergencyId
              : liveEmergencies[0]?.id ?? null,
        }));
        handleConnected();
      },
      handleError,
    );

    const unsubTraffic = subscribeToTrafficReports(
      (liveReports) => {
        set({ trafficReports: liveReports });
        handleConnected();
      },
      handleError,
    );

    const unsubAlerts = subscribeToCollection(
      FIRESTORE_COLLECTIONS.priorityAlerts,
      { orderField: "createdAt", direction: "desc" },
      (liveAlerts) => {
        set({ priorityAlerts: liveAlerts.map(normalizeAlertRecord) });
        handleConnected();
      },
      handleError,
    );

    const unsubActivity = subscribeToCollection(
      FIRESTORE_COLLECTIONS.activityFeed,
      // Your "activity_logs" docs use "createdAt", not "timestamp".
      { orderField: "createdAt", direction: "desc" },
      (liveActivity) => {
        set({ activityFeed: liveActivity.filter(isTripActivity).map(normalizeActivityRecord) });
        handleConnected();
      },
      handleError,
    );

    const unsubHospitals = subscribeToCollection(
      FIRESTORE_COLLECTIONS.hospitals,
      { orderField: "name", direction: "asc" },
      (liveHospitals) => {
        set({ hospitals: liveHospitals });
        handleConnected();
      },
      handleError,
    );

    const unsubSystemStatus = subscribeToDocument(
      FIRESTORE_DOCS.systemStatus,
      (liveSystemStatus) => {
        set((state) => ({
          systemStatus: {
            ...state.systemStatus,
            ...liveSystemStatus,
            firestoreConnection: "Connected",
            lastHeartbeat: liveSystemStatus.lastHeartbeat ?? new Date().toISOString(),
          },
          liveDataConnected: true,
        }));
      },
      handleError,
    );

    const unsubAnalytics = subscribeToDocument(
      FIRESTORE_DOCS.analytics,
      (liveAnalytics) => {
        set({ analytics: { ...emptyAnalytics, ...liveAnalytics } });
        handleConnected();
      },
      handleError,
    );

    const unsubTripAlerts = startTripAlertWatcher(() => get().emergencies);

    const unsubscribers = [
      unsubEmergencies,
      unsubTraffic,
      unsubAlerts,
      unsubActivity,
      unsubHospitals,
      unsubSystemStatus,
      unsubAnalytics,
      unsubTripAlerts,
    ];

    set({ _unsubscribers: unsubscribers });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      set({ _unsubscribers: [] });
    };
  },

  addTrafficIncident: async (incident) => {
    const record = {
      ...incident,
      createdAt: new Date().toISOString(),
      status: "Active",
      affectedTrips: incident.affectedTrips ?? [],
    };
    const remoteId = await createTrafficReport(record);
    if (!remoteId) throw new Error("Firebase is not configured. Traffic incidents must be saved to Firestore.");
  },

  updateTrafficIncidentStatus: async (id, status) => {
    await updateTrafficReport(id, { status });
    set((state) => ({
      trafficReports: state.trafficReports.map((report) => (report.id === id ? { ...report, status } : report)),
    }));
  },

  removeTrafficIncident: async (id) => {
    await deleteTrafficReport(id);
    set((state) => ({ trafficReports: state.trafficReports.filter((report) => report.id !== id) }));
  },

  getKpis: () => {
    const state = get();
    const activeEmergencies = state.emergencies.length;
    const ambulancesEnRoute = state.emergencies.filter((e) => e.status === "En route").length;

    const etaValues = state.emergencies
      .map((e) => parseInt(e.eta, 10))
      .filter((value) => !Number.isNaN(value));
    const averageEta = etaValues.length
      ? Math.round(etaValues.reduce((sum, value) => sum + value, 0) / etaValues.length)
      : 0;

    const trafficAlerts = state.trafficReports.filter((report) => report.status !== "Resolved").length;
    const fiveMinAlerts = state.emergencies.filter((e) => parseInt(e.eta, 10) <= 5).length;

    return {
      activeEmergencies,
      ambulancesEnRoute,
      averageEta,
      trafficAlerts,
      fiveMinAlerts,
      completedTripsToday: state.analytics.completedTripsToday ?? state.analytics.tripsToday ?? 0,
    };
  },
}));
