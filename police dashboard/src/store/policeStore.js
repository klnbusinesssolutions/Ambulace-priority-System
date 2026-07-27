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
  updatePoliceOfficerProfile,
  markAllAlertsReadRemote,
  normalizeActivityRecord,
  isTripActivity,
  normalizeAlertRecord,
  subscribeToCollection,
  subscribeToDocument,
  updateAlertReadState,
} from "@/services/firebaseDataService";
import {
  enrichEmergencies,
  normalizeAmbulanceRecord,
  normalizeDriverRecord,
  normalizeLiveLocationRecord,
} from "@/services/emergencyEnrichment";
import {
  emptyAnalytics,
  emptySystemStatus,
  filterByStationArea,
  isLiveEmergency,
  isAmbulanceEnRoute,
  getEmergencyStage,
} from "@/services/policeConstants";
import { subscribeToEmergencies } from "@/services/realtimeEmergencyService";
import { computeAnalytics } from "@/services/analyticsService";
import { startTripAlertWatcher } from "@/services/tripAlertWatcher";
import { geocodeAddress } from "@/services/geocodingService";
import { notifyNewEmergency, notifyTripAlert } from "@/services/notify";
import { buildEmergencyDisplayIds } from "@/utils/emergencyId";
import {
  createTrafficReport,
  deleteTrafficReport,
  subscribeToTrafficReports,
  updateTrafficReport,
} from "@/services/trafficService";

// Notifications panel read-state is per-operator, client-side UI state (see
// notes on `readNotificationIds`/`getNotifications` below) - it isn't its own
// Firestore collection, so it's persisted to localStorage instead. This is
// what makes "Mark all as read" stick: without it, a page refresh reset the
// in-memory Set and every past notification would look unread again.
const NOTIFICATIONS_CLEARED_AT_KEY = "policeDashboard.notificationsClearedAt";
const NOTIFICATIONS_READ_IDS_KEY = "policeDashboard.readNotificationIds";

function loadNotificationsClearedAt() {
  try {
    return localStorage.getItem(NOTIFICATIONS_CLEARED_AT_KEY) || null;
  } catch {
    return null;
  }
}

function loadReadNotificationIds() {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_READ_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistReadNotificationIds(ids) {
  try {
    localStorage.setItem(NOTIFICATIONS_READ_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Storage can fail (private browsing, quota) - never let it break the UI.
  }
}

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
    phone: null,
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
          phone: profile?.phone ?? state.currentOperator.phone ?? null,
          displayName: profile?.displayName ?? profile?.name ?? state.currentOperator.displayName,
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
  // Client-derived "ambulance hasn't moved in 5+ minutes" alerts (see
  // recomputeStationaryAlerts() below) - feeds the "5 Minute Alerts" KPI and
  // the Alerts panel's "Ambulance Not Moving" entries. Not persisted to
  // Firestore: it clears itself the moment the ambulance moves again.
  stationaryAlerts: [],
  // Local read-state for the Notifications panel (derived from activityFeed).
  // Not a separate Firestore collection - activity_logs is already the
  // durable history; this Set just tracks what this operator has seen.
  readNotificationIds: loadReadNotificationIds(),
  // Timestamp (ISO string) of the last "Mark all as read" click. Anything in
  // activityFeed at or before this moment is treated as cleared and dropped
  // from getNotifications()'s result entirely - a new trip event after this
  // point still shows up as unread normally.
  notificationsClearedAt: loadNotificationsClearedAt(),
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
  // True only for the duration of requestAccess() below. createUserWithEmailAndPassword
  // auto-signs-in the freshly registered (not-yet-approved) account, which fires the
  // onAuthStateChanged listener below. authService.requestPoliceAccess already owns
  // that session end-to-end (writes the pending request, then signs out in its own
  // `finally`) - if the listener also races in with hydrateOperatorStation + its own
  // logoutFromFirebase() call, two concurrent signOut() calls on the same in-flight
  // session can leave the register flow's promise chain hanging. This flag makes the
  // listener stand down while registration is in progress.
  _isRegistering: false,

  emergencyFilters: emptyEmergencyFilters,
  sortKey: "lastUpdated",
  sortDir: "desc",
  page: 1,
  pageSize: 5,

  alertFilters: { category: "All", severity: "All" },
  alertSearchQuery: "",

  // Central command center by default: monitors every hospital/ambulance/emergency
  // city-wide. Officers can still narrow to their own station's radius via this toggle.
  cityWide: true,
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

        if (user && !get()._isRegistering) {
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

  // Settings > Police Officer Profile "Save changes". Writes to the officer's own
  // police_officers/{uid} doc and merges the result straight into currentOperator so the
  // sidebar/topbar name updates immediately, without waiting on a Firestore round-trip.
  updateOperatorProfile: async ({ name, phone }) => {
    const uid = get().currentOperator?.uid;
    if (!uid) throw new Error("Not signed in.");

    await updatePoliceOfficerProfile(uid, { name, phone });
    set((state) => ({
      currentOperator: state.currentOperator
        ? { ...state.currentOperator, displayName: name ?? state.currentOperator.displayName, phone: phone ?? state.currentOperator.phone }
        : state.currentOperator,
    }));
  },

  requestAccess: async (formData) => {
    set({ _isRegistering: true });
    try {
      return await requestPoliceAccess(formData);
    } finally {
      set({ _isRegistering: false });
    }
  },
  resetPasscode: async (identifier) => sendPolicePasswordReset(identifier),

  selectEmergency: (id) => set({ selectedEmergencyId: id, drawerOpen: true }),
  focusEmergency: (id) => set({ selectedEmergencyId: id }),
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

    // Emergencies, drivers, live GPS pings, and hospitals each arrive from independent
    // Firestore listeners in whatever order they happen to resolve/update. Rather than
    // trying to enrich once inside a single handler, every handler below just updates its
    // own local snapshot and calls syncEmergencies(), which always re-joins from the
    // latest of all four and writes the single merged list the whole UI reads.
    let latestRawEmergencies = [];
    let latestDrivers = [];
    let latestLiveLocations = [];
    let latestAmbulances = [];
    let hasSeenInitialEmergencies = false;
    let knownEmergencyIds = new Set();

    // ambulanceId/driverId -> { lat, lng, since } for every ambulance on an
    // active trip. If its coordinates are still identical 5+ minutes after
    // `since`, it surfaces as a "5 Minute Alert" (possible breakdown/traffic
    // block) - see KPI card #4 / Alerts button "Ambulance Not Moving".
    const positionHistory = new Map();
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const COORD_EPSILON = 0.00005; // ~5m, to ignore GPS jitter while parked

    const recomputeStationaryAlerts = (mergedEmergencies) => {
      const now = Date.now();
      const seenKeys = new Set();
      const alerts = [];

      mergedEmergencies.filter(isLiveEmergency).forEach((emergency) => {
        if (!emergency.driverId && !emergency.ambulanceId) return;
        const key = emergency.ambulanceId ?? emergency.driverId;
        const coords = emergency.coordinates;
        seenKeys.add(key);

        if (!coords || typeof coords.lat !== "number" || typeof coords.lng !== "number") {
          positionHistory.delete(key);
          return;
        }

        const previous = positionHistory.get(key);
        const unchanged =
          previous &&
          Math.abs(previous.lat - coords.lat) < COORD_EPSILON &&
          Math.abs(previous.lng - coords.lng) < COORD_EPSILON;

        if (unchanged) {
          const stationaryMs = now - previous.since;
          if (stationaryMs >= FIVE_MINUTES_MS) {
            alerts.push({
              id: `stationary_${key}`,
              type: "Ambulance Not Moving",
              category: "Ambulance Stopped",
              severity: "High",
              ambulanceNumber: emergency.ambulanceNumber,
              driverName: emergency.driverName,
              tripId: emergency.id,
              minutesStationary: Math.floor(stationaryMs / 60000),
              read: false,
            });
          }
        } else {
          positionHistory.set(key, { lat: coords.lat, lng: coords.lng, since: now });
        }
      });

      // Drop tracking for ambulances no longer on an active trip.
      Array.from(positionHistory.keys())
        .filter((key) => !seenKeys.has(key))
        .forEach((key) => positionHistory.delete(key));

      set({ stationaryAlerts: alerts });
    };

    // gpsSync/activeAmbulances/onlineUnits/serviceHealth used to sit and wait on a
    // systemStatus/current doc that nothing in this project actually writes to, so
    // the System Status card stayed stuck on "Waiting" forever. Instead, derive all
    // of it straight from the collections we're already subscribed to - a driver
    // counts as "online" if they've sent a GPS ping recently, GPS sync is "Synced"
    // as soon as any live location has come in, etc.
    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes since last GPS ping

    const recomputeSystemStatus = () => {
      const now = Date.now();
      const recentFromCollection = latestLiveLocations.filter((loc) => {
        if (!loc.updatedAt) return false;
        const updatedMs = new Date(loc.updatedAt).getTime();
        return Number.isFinite(updatedMs) && now - updatedMs <= ONLINE_THRESHOLD_MS;
      });
      // The driver app writes GPS onto drivers/{id}.location, not into live_locations
      // (see emergencyEnrichment.js findLiveLocation) - count those pings too, or
      // gpsSync/onlineUnits will look empty even while drivers are actively on duty.
      const recentFromDrivers = latestDrivers.filter((d) => {
        const updatedAt = d.location?.updatedAt;
        if (!updatedAt) return false;
        const updatedMs = new Date(updatedAt).getTime();
        return Number.isFinite(updatedMs) && now - updatedMs <= ONLINE_THRESHOLD_MS;
      });
      const onlineDriverIds = new Set([
        ...recentFromCollection.map((loc) => loc.driverId).filter(Boolean),
        ...recentFromDrivers.map((d) => d.id),
      ]);
      const hasAnyGpsData = latestLiveLocations.length > 0 || latestDrivers.some((d) => d.location);

      set((state) => ({
        systemStatus: {
          ...state.systemStatus,
          gpsSync: hasAnyGpsData ? "Synced" : "Waiting",
          activeAmbulances: latestRawEmergencies.filter(isLiveEmergency).length,
          onlineUnits: onlineDriverIds.size,
          serviceHealth: state.liveDataConnected ? "Operational" : "Waiting",
        },
      }));
    };

    // Recomputes every Trip Analytics metric from whatever's currently in the store
    // (emergencies + activityFeed - both already live Firestore listeners), so the
    // analytics page always reflects real data with no separate doc to keep in sync.
    const recomputeAnalytics = () => {
      set({ analytics: computeAnalytics({ emergencies: get().emergencies, activityFeed: get().activityFeed }) });
    };

    const syncEmergencies = () => {
      const merged = enrichEmergencies(latestRawEmergencies, {
        drivers: latestDrivers,
        liveLocations: latestLiveLocations,
        hospitals: get().hospitals,
        ambulances: latestAmbulances,
      });
      recomputeSystemStatus();
      recomputeStationaryAlerts(merged);

      if (hasSeenInitialEmergencies) {
        const { currentOperator, cityWide } = get();
        const relevant = filterByStationArea(
          merged.filter(isLiveEmergency),
          { station: currentOperator?.station, radiusKm: currentOperator?.serviceRadiusKm, cityWide },
          (emergency) => emergency.coordinates,
        );
        const displayIds = buildEmergencyDisplayIds(merged);
        relevant
          .filter((emergency) => !knownEmergencyIds.has(emergency.id))
          .forEach((emergency) => notifyNewEmergency(emergency, displayIds.get(emergency.id)));
      }
      knownEmergencyIds = new Set(merged.map((emergency) => emergency.id));
      hasSeenInitialEmergencies = true;

      set((state) => ({
        emergencies: merged,
        selectedEmergencyId: merged.some((emergency) => emergency.id === state.selectedEmergencyId)
          ? state.selectedEmergencyId
          : merged[0]?.id ?? null,
      }));
      recomputeAnalytics();
    };

    const unsubEmergencies = subscribeToEmergencies(
      (liveEmergencies) => {
        latestRawEmergencies = liveEmergencies;
        syncEmergencies();
        handleConnected();
      },
      handleError,
    );

    const unsubDrivers = subscribeToCollection(
      FIRESTORE_COLLECTIONS.drivers,
      {},
      (liveDrivers) => {
        latestDrivers = liveDrivers.map(normalizeDriverRecord);
        syncEmergencies();
        handleConnected();
      },
      handleError,
    );

    const unsubLiveLocations = subscribeToCollection(
      FIRESTORE_COLLECTIONS.liveLocations,
      {},
      (liveLocationDocs) => {
        latestLiveLocations = liveLocationDocs.map((raw) => normalizeLiveLocationRecord(raw, raw.id));
        syncEmergencies();
        handleConnected();
      },
      handleError,
    );

    const unsubAmbulances = subscribeToCollection(
      FIRESTORE_COLLECTIONS.ambulances,
      {},
      (liveAmbulances) => {
        latestAmbulances = liveAmbulances.map(normalizeAmbulanceRecord);
        syncEmergencies();
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

    let hasSeenInitialAlerts = false;
    let knownAlertIds = new Set();

    const unsubAlerts = subscribeToCollection(
      FIRESTORE_COLLECTIONS.priorityAlerts,
      { orderField: "createdAt", direction: "desc" },
      (liveAlerts) => {
        const normalized = liveAlerts.map(normalizeAlertRecord);

        if (hasSeenInitialAlerts) {
          normalized
            .filter((alert) => !knownAlertIds.has(alert.id))
            .forEach((alert) => notifyTripAlert(alert));
        }
        knownAlertIds = new Set(normalized.map((alert) => alert.id));
        hasSeenInitialAlerts = true;

        set({ priorityAlerts: normalized });
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
        recomputeAnalytics();
        handleConnected();
      },
      handleError,
    );

    const geocodeHospitals = (hospitalsToResolve) => {
      hospitalsToResolve.forEach((hospital) => {
        if (!hospital.address) return;
        geocodeAddress(hospital.address).then((coordinates) => {
          if (!coordinates) return;
          set((state) => ({
            hospitals: state.hospitals.map((h) =>
              h.id === hospital.id ? { ...h, lat: coordinates.lat, lng: coordinates.lng } : h,
            ),
          }));
          syncEmergencies();
        });
      });
    };

    const unsubHospitals = subscribeToCollection(
      FIRESTORE_COLLECTIONS.hospitals,
      { orderField: "name", direction: "asc" },
      (liveHospitals) => {
        // Show hospitals immediately with whatever coordinates the doc already has
        // (if any), then resolve each one's real position from its `address` field
        // and patch it in as each geocode call resolves - address is the source of
        // truth for hospital location, not a possibly-stale lat/lng on the doc.
        set({ hospitals: liveHospitals });
        syncEmergencies();
        handleConnected();
        geocodeHospitals(liveHospitals);
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

    const unsubTripAlerts = startTripAlertWatcher(() => get().emergencies);

    const unsubscribers = [
      unsubEmergencies,
      unsubDrivers,
      unsubLiveLocations,
      unsubAmbulances,
      unsubTraffic,
      unsubAlerts,
      unsubActivity,
      unsubHospitals,
      unsubSystemStatus,
      unsubTripAlerts,
    ];

    set({ _unsubscribers: unsubscribers, _geocodeHospitals: geocodeHospitals });

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

  // Call once the Google Maps script is confirmed loaded (see MapContainer.jsx) to
  // retry geocoding any hospital whose `address` couldn't be resolved yet because
  // the script wasn't ready when the hospitals collection first loaded.
  regeocodeHospitals: () => {
    get()._geocodeHospitals?.(get().hospitals);
  },

  getKpis: () => {
    const state = get();
    const liveEmergencies = state.emergencies.filter(isLiveEmergency);
    const activeEmergencies = liveEmergencies.length;
    const ambulancesEnRoute = liveEmergencies.filter(isAmbulanceEnRoute).length;

    // Average ETA across live emergencies only - ignores completed/cancelled trips.
    const etaValues = liveEmergencies
      .map((e) => parseInt(e.eta, 10))
      .filter((value) => !Number.isNaN(value));
    const averageEta = etaValues.length
      ? Math.round(etaValues.reduce((sum, value) => sum + value, 0) / etaValues.length)
      : 0;

    const trafficAlerts = state.trafficReports.filter((report) => report.status !== "Resolved").length;

    // Trips completed *today* only - naturally rolls back to 0 at midnight
    // since it re-derives from each emergency's own lastUpdated timestamp
    // rather than a running counter.
    const today = new Date().toDateString();
    const completedTripsToday = state.emergencies.filter((emergency) => {
      if (getEmergencyStage(emergency) !== "completed") return false;
      const completedAt = emergency.lastUpdated ?? emergency.startedAt;
      if (!completedAt) return false;
      const completedDate = new Date(completedAt);
      return !Number.isNaN(completedDate.getTime()) && completedDate.toDateString() === today;
    }).length;

    return {
      activeEmergencies,
      ambulancesEnRoute,
      averageEta,
      trafficAlerts,
      fiveMinAlerts: state.stationaryAlerts.length,
      completedTripsToday,
    };
  },

  // Notifications panel: derives a unified, most-recent-first event timeline
  // from activityFeed (activity_logs) - which already has full trip-milestone
  // history (emergency created, assigned, en route, arrived, onboard, hospital
  // arrival, completed - see tripAlertWatcher.js and hospital app writers).
  getNotifications: () => {
    const state = get();
    const clearedAtMs = state.notificationsClearedAt ? new Date(state.notificationsClearedAt).getTime() : null;

    return [...state.activityFeed]
      .filter((item) => {
        if (!clearedAtMs) return true;
        const itemMs = new Date(item.timestamp ?? 0).getTime();
        // Anything that existed at/before the last "Mark all as read" click
        // stays cleared out of the panel. Only a genuinely new event -
        // timestamped after that click - reappears.
        return Number.isFinite(itemMs) && itemMs > clearedAtMs;
      })
      .map((item) => ({
        id: item.id,
        title: item.title,
        detail: item.detail,
        timestamp: item.timestamp,
        tripId: item.tripId,
        hospital: item.hospital,
        read: state.readNotificationIds.has(item.id),
      }))
      .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime());
  },

  markNotificationRead: (id) =>
    set((state) => {
      const ids = new Set(state.readNotificationIds).add(id);
      persistReadNotificationIds(ids);
      return { readNotificationIds: ids };
    }),

  markAllNotificationsRead: () => {
    const clearedAt = new Date().toISOString();
    try {
      localStorage.setItem(NOTIFICATIONS_CLEARED_AT_KEY, clearedAt);
    } catch {
      // Storage can fail (private browsing, quota) - the in-memory value below still works for this session.
    }
    set({ notificationsClearedAt: clearedAt });
  },
}));
