# Firebase Setup

This dashboard now uses Firebase-only runtime data. If Firebase env values are missing, the UI will show empty states and Firebase write/auth actions will fail with a setup message.

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

Restart the Vite dev server after changing env values.

## 2. Firebase Console Changes

Create or select your Firebase project, then do this in the console:

1. Add a Web App under Project settings, then copy its config into `.env.local`.
2. Enable Authentication > Sign-in method > Email/Password.
3. Create Firestore Database in production or test mode.
4. Create the Firestore collections and docs listed below.
5. Add police operator users in Authentication.
6. Add matching profile docs in `users/{uid}` for badge-ID login and role checks.

## 3. Auth User Profile

For every police operator created in Firebase Auth, create:

```text
users/{uid}
```

Recommended fields:

```json
{
  "email": "operator@example.com",
  "badgeId": "DL-POL-1024",
  "displayName": "Operator Name",
  "role": "police"
}
```

The register page writes approval requests to:

```text
accessRequests/{requestId}
```

## 4. Firestore Paths

Realtime collections:

```text
emergencies
trafficReports
priorityAlerts
activityFeed
hospitals
```

Realtime documents:

```text
systemStatus/current
analytics/summary
```

## 5. Required Sort Fields

These fields are used by realtime ordered queries:

```text
emergencies.lastUpdated
trafficReports.createdAt
priorityAlerts.timestamp
activityFeed.timestamp
hospitals.name
```

If Firestore prompts for an index, click the generated Firebase console link and create it.

## 6. Emergency Document Shape

```json
{
  "type": "Cardiac",
  "driverName": "Operator Driver",
  "driverPhone": "+91 90000 00000",
  "ambulanceNumber": "DL-01-EM-0001",
  "speed": 42,
  "heading": 58,
  "distanceRemaining": 2.4,
  "currentRoad": "ITO Crossing, Ring Road",
  "area": "Central Delhi",
  "timelineStage": "En route to hospital",
  "severity": "Critical",
  "eta": "07 min",
  "destinationHospital": "Central Hospital",
  "status": "En route",
  "lastUpdated": "2026-07-21T08:30:00.000Z",
  "coordinates": { "lat": 28.6215, "lng": 77.2124 },
  "pickup": { "lat": 28.6183, "lng": 77.2032 },
  "destination": { "lat": 28.6268, "lng": 77.2197 },
  "route": [
    { "lat": 28.6183, "lng": 77.2032 },
    { "lat": 28.6215, "lng": 77.2124 },
    { "lat": 28.6268, "lng": 77.2197 }
  ],
  "routeNotes": "Police assistance requested.",
  "startedAt": "2026-07-21T08:20:00.000Z"
}
```

Firestore `Timestamp` values are supported for date fields; the dashboard normalizes them automatically.

## 7. System Documents

`systemStatus/current`:

```json
{
  "gpsSync": "Synced",
  "firestoreConnection": "Connected",
  "activeAmbulances": 18,
  "onlineUnits": 24,
  "serviceHealth": "Operational",
  "lastHeartbeat": "2026-07-21T08:30:00.000Z"
}
```

`analytics/summary`:

```json
{
  "tripsToday": 31,
  "completedTripsToday": 27,
  "averageEta": 12,
  "averageResponseTime": 6.4,
  "completionRate": 96,
  "tripsThisWeek": [{ "day": "Mon", "trips": 24 }],
  "priorityDistribution": [{ "label": "Critical", "value": 8 }],
  "tripsPerHospital": [{ "label": "Central Hospital", "value": 12 }],
  "peakEmergencyHours": [{ "hour": "8-10", "trips": 9 }]
}
```

## 8. Workflow Mapping

- Driver app updates `emergencies/{tripId}` with GPS, ETA, and status.
- Hospital dashboard reads the same emergency trip and receives `priorityAlerts`.
- Police dashboard reads live ambulance location, route, ETA, and `trafficReports`.
- Police dashboard can create/update/delete `trafficReports` for traffic clearance.
- Analytics/admin flows can update `analytics/summary` and `systemStatus/current`.
