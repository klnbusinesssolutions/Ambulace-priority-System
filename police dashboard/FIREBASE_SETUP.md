# Firebase Setup

This dashboard uses the shared Firebase project already backing the Hospital Dashboard, Admin Dashboard, and Driver App. It does not create any collections of its own — see `src/services/firebaseDataService.js` (`FIRESTORE_COLLECTIONS`) for the canonical mapping from internal names to real Firestore collections.

## 1. Add Environment Values

Copy `.env.example` to `.env.local` and paste your Firebase web app config:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Restart the Vite dev server after changing env values. If any value is missing, `isFirebaseConfigured` (`src/firebase/config.js`) is `false`: the UI shows empty/disconnected states and all Firebase reads/writes/auth calls are skipped instead of throwing.

## 2. Firebase Console Prerequisites

This dashboard talks to the **same** Firebase project as the rest of the platform — do not create a second project or duplicate collections.

1. Authentication > Sign-in method > Email/Password must be enabled (already true if the Hospital/Admin dashboards work).
2. Firestore must already contain the collections listed below, owned by the existing backend.
3. Deploy `hospital-dashboard/firestore.rules` (the shared rules file) — it already contains the `isApprovedPolice()` grants this dashboard depends on for `police_officers`, `drivers`, `ambulances`, `live_locations`, `activity_logs`, `analytics`, `systemStatus`, `police_alerts`, and `trafficReports`.

## 3. Officer Onboarding (no manual Firestore edits)

Officers are never created by hand in Firestore. The flow is:

1. Officer submits `Register.jsx` → writes one doc to `pending_police_officers/{requestId}` (status `"pending"`) and creates their Firebase Auth account (`authService.requestPoliceAccess`). They are signed out immediately after.
2. An admin reviews the request in the Admin Dashboard's **Pending Police Officers** screen and approves/rejects it.
3. On approval, the admin flow creates `police_officers/{uid}` with `status: "approved"`, `isActive: true`, plus `badgeId`, `department`, `station`, `serviceRadiusKm`.
4. Only then can the officer log in — `ProtectedRoute` + `policeStore.hydrateOperatorStation` re-check `police_officers/{uid}` on every session and force-logout anyone who isn't `approved` + `isActive`.

Badge-ID login works by querying `police_officers` for a matching `badgeId` **before** authentication (`firebaseDataService.findUserByBadgeId`), which is why `police_officers` allows unauthenticated `read` in the rules — no passwords are ever stored there, only profile fields.

## 4. Firestore Collections This Dashboard Reads/Writes

| Internal name (`FIRESTORE_COLLECTIONS`) | Real collection      | Access               |
| ---------------------------------------- | --------------------- | --------------------- |
| `users`                                  | `police_officers`     | read (badge lookup + own profile) |
| `accessRequests`                         | `pending_police_officers` | create only (Register) |
| `emergencies`                            | `emergencies`         | read                   |
| `hospitals`                              | `hospitals`            | read                   |
| `priorityAlerts`                         | `police_alerts`       | read, update (`read`/`updatedAt` only), delete |
| `activityFeed`                           | `activity_logs`        | read (filtered to `trip_*`), create (`trip_*` only) |
| `trafficReports`                         | `trafficReports`       | full CRUD              |
| `drivers`                                 | `drivers`               | read (driver name/phone/vehicle number, joined onto emergencies) |
| `liveLocations`                           | `live_locations`        | read (live GPS pings, joined onto emergencies by driverId/tripId) |

`src/services/emergencyEnrichment.js` joins `emergencies` with `drivers`, `live_locations`, and `hospitals` client-side (there's no backend endpoint that pre-joins these) so every card/table/drawer/map in this dashboard shows patient name/phone, driver name/phone, the resolved hospital name, and the ambulance's actual live GPS position instead of its static pickup-time location. If your `live_locations` docs use field names other than the ones `normalizeLiveLocationRecord` already checks (`location`/`coordinates`/`lat`+`lng`/`latitude`+`longitude`, keyed by driverId or by a `driverId`/`tripId`/`emergencyId` field), add them there.

Realtime documents:

```text
systemStatus/current   (heartbeat + active emergency count — populated by the shared backend, not this dashboard)
analytics/summary
```

## 5. Required Sort Fields

These are the fields the ordered `onSnapshot` queries in `firebaseDataService.js` / `realtimeEmergencyService.js` actually order on — mismatching these will make Firestore silently return zero results or prompt for a composite index:

```text
emergencies      -> startTime      (desc)
trafficReports   -> createdAt      (desc)
police_alerts    -> createdAt      (desc)
activity_logs    -> createdAt      (desc)
hospitals        -> name           (asc)
analytics        -> createdAt      (desc)
```

If Firestore prompts for a composite index the first time a query runs, open the generated console link and create it.

## 6. Emergency Document Shape (as actually stored)

```json
{
  "hospitalId": "HSP01",
  "driverId": "driver_abc123",
  "incidentType": "Cardiac",
  "priority": "critical",
  "location": "23.0225° N, 72.5714° E",
  "startTime": "2026-07-21T08:20:00.000Z"
}
```

`firebaseDataService.normalizeEmergencyRecord` adapts these real field names (`incidentType`, `priority`, `location` as a coordinate string, `hospitalId`, `driverId`, `startTime`) into the shape the UI components expect (`type`, `severity`, `coordinates`, `destinationHospital`, `ambulanceNumber`, `lastUpdated`, `startedAt`). Add new fields to the raw doc freely — the normalizer only fills in gaps, it never drops existing fields (`...raw` is spread first).

## 7. Trip-Status → Police Alert Mapping

The driver app writes `tripStatus` onto `drivers/{driverId}` (not onto the emergency doc). `src/services/tripAlertWatcher.js` watches the whole `drivers` collection client-side and, the first time it sees one of these transitions for a driver tied to an active emergency, writes one `police_alerts` doc and one `activity_logs` doc (prefixed `trip_`):

```text
reached_patient   -> "Ambulance reached patient"          (Medium)
patient_onboard   -> "Patient onboard - en route to hospital" (Medium)
near_hospital      -> "Ambulance approaching hospital"      (High)
```

## 8. Workflow Mapping

- Driver app updates `drivers/{driverId}.tripStatus` and `emergencies/{tripId}`.
- This dashboard's `tripAlertWatcher` turns those transitions into `police_alerts` + `trip_*` activity log entries.
- Police dashboard reads live ambulance location (`live_locations`), route/ETA (derived from `emergencies`), and manages `trafficReports` for traffic clearance.
- `systemStatus/current` and `analytics/summary` are populated by the shared backend/admin tooling, not written by this dashboard.
