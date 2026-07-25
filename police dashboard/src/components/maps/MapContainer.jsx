import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, DirectionsRenderer, GoogleMap, InfoWindow, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { Ambulance, Clock, Gauge, Hospital, MapPin, RefreshCw, Satellite, Signpost } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/police/StatusBadge";
import { useEmergencyDisplayIds } from "@/hooks/useEmergencyDisplayIds";
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_LOADER_ID } from "@/services/googleMapsConfig";
import { usePoliceStore } from "@/store/policeStore";
import { formatRelativeTime } from "@/utils/format";

const STATIONARY_SPEED_THRESHOLD = 8;
const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 }; // Pune, used only when no station/emergencies to center on
const AUTO_REFRESH_MS = 15000; // Firestore already pushes position updates instantly; this just
// periodically re-fits the viewport so every active unit stays visible and gives a visible
// "still live" heartbeat, independent of how often the underlying data actually changes.

const SEVERITY_COLORS = {
  Critical: "#dc2626",
  High: "#ea580c",
  Medium: "#2563eb",
  Low: "#64748b",
};

function severityColor(severity) {
  return SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.Medium;
}

function averageCoordinates(points) {
  if (!points.length) return null;
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

function roundCoord(point) {
  if (!point) return null;
  // ~11m precision - enough to notice real movement without re-requesting Directions
  // on every tiny GPS jitter between pings.
  return { lat: Math.round(point.lat * 10000) / 10000, lng: Math.round(point.lng * 10000) / 10000 };
}

function sameCoord(a, b) {
  if (!a || !b) return a === b;
  return Math.abs(a.lat - b.lat) < 0.0005 && Math.abs(a.lng - b.lng) < 0.0005;
}

// Builds a small ambulance pictogram (colored badge + white glyph) used as the marker icon
// for every active unit on the map. Encoded as an inline SVG data URI so it can be styled
// per-severity and resized on selection without shipping any external image assets.
function buildAmbulanceIcon(color, selected) {
  const size = selected ? 44 : 34;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="21" fill="${color}" stroke="#ffffff" stroke-width="3" />
      <g transform="translate(9,15)">
        <rect x="0" y="5" width="21" height="10" rx="2" fill="#ffffff" />
        <rect x="21" y="8" width="8" height="7" rx="1.5" fill="#ffffff" />
        <rect x="7.5" y="7.5" width="6" height="6" fill="${color}" />
        <rect x="9.5" y="6" width="2" height="9" fill="${color}" />
        <rect x="6" y="10.5" width="9" height="2" fill="${color}" />
        <circle cx="6" cy="16" r="2.6" fill="#0f172a" />
        <circle cx="22" cy="16" r="2.6" fill="#0f172a" />
      </g>
    </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size / 2),
  };
}

// Requests an actual road route (ambulance's live location -> patient pickup -> assigned
// hospital) per emergency via the Directions API, independently for every emergency so
// multiple simultaneous trips each get their own route. Skips re-requesting a route whose
// origin/pickup/destination haven't meaningfully changed since the last successful request.
// Once the driver has tapped past "Reached Patient" (patient_onboard, near_hospital,
// trip_completed - see tripAlertWatcher.js / DetailsDrawer.jsx's TRIP_STATUS_STAGE),
// the patient is already in the ambulance, so the route should go straight from the
// ambulance's live position to the hospital instead of detouring back through pickup.
const PATIENT_ALREADY_ONBOARD_STATUSES = new Set(["patient_onboard", "near_hospital", "trip_completed"]);

function useAmbulanceRoutes(emergencies, isLoaded) {
  const [routesById, setRoutesById] = useState({});
  const requestedRef = useRef(new Map()); // emergency id -> fingerprint of the last successful request

  useEffect(() => {
    if (!isLoaded || !window.google?.maps) return;
    const directionsService = new window.google.maps.DirectionsService();

    emergencies.forEach((emergency) => {
      const origin = roundCoord(emergency.coordinates);
      const destination = roundCoord(emergency.destinationHospitalCoordinates);
      if (!origin || !destination) return;

      const patientOnboard = PATIENT_ALREADY_ONBOARD_STATUSES.has(emergency.tripStatus);
      const pickup = patientOnboard ? null : roundCoord(emergency.pickup);
      const includePickup = pickup && !sameCoord(pickup, origin) && !sameCoord(pickup, destination);
      const waypoints = includePickup ? [{ location: pickup, stopover: true }] : [];

      const fingerprint = JSON.stringify({ origin, destination, pickup: includePickup ? pickup : null });
      if (requestedRef.current.get(emergency.id) === fingerprint) return;

      directionsService.route(
        {
          origin,
          destination,
          waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK" && result) {
            requestedRef.current.set(emergency.id, fingerprint);
            setRoutesById((prev) => ({ ...prev, [emergency.id]: result }));
          }
        },
      );
    });

    // Drop cached routes for emergencies that are no longer active.
    const activeIds = new Set(emergencies.map((emergency) => emergency.id));
    setRoutesById((prev) => {
      const next = Object.fromEntries(Object.entries(prev).filter(([id]) => activeIds.has(id)));
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [emergencies, isLoaded]);

  return routesById;
}

export function MapContainer({ emergencies, hospitals, trafficReports = [] }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const selectedEmergencyId = usePoliceStore((state) => state.selectedEmergencyId);
  const selectEmergency = usePoliceStore((state) => state.selectEmergency);
  const focusEmergency = usePoliceStore((state) => state.focusEmergency);
  const drawerOpen = usePoliceStore((state) => state.drawerOpen);
  const cityWide = usePoliceStore((state) => state.cityWide);
  const toggleCityWide = usePoliceStore((state) => state.toggleCityWide);
  const station = usePoliceStore((state) => state.currentOperator?.station);
  const serviceRadiusKm = usePoliceStore((state) => state.currentOperator?.serviceRadiusKm ?? 10);
  const displayIds = useEmergencyDisplayIds();

  const regeocodeHospitals = usePoliceStore((state) => state.regeocodeHospitals);

  useEffect(() => {
    if (isLoaded) regeocodeHospitals();
  }, [isLoaded, regeocodeHospitals]);

  const activeEmergency = emergencies.find((emergency) => emergency.id === selectedEmergencyId) ?? emergencies[0];
  const [satelliteView, setSatelliteView] = useState(false);
  const [infoWindowId, setInfoWindowId] = useState(null);
  const popupEmergency = emergencies.find((emergency) => emergency.id === infoWindowId);

  const routesById = useAmbulanceRoutes(emergencies, isLoaded);

  const mapRef = useRef(null);
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);
  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const [lastSyncedAt, setLastSyncedAt] = useState(() => Date.now());
  const [secondsSinceSync, setSecondsSinceSync] = useState(0);

  const emergencyPoints = useMemo(
    () => emergencies.map((emergency) => emergency.coordinates).filter(Boolean),
    [emergencies],
  );
  const hospitalPoints = useMemo(
    () => hospitals.filter((hospital) => hospital.lat && hospital.lng).map((h) => ({ lat: h.lat, lng: h.lng })),
    [hospitals],
  );

  const center = station?.lat && station?.lng ? station : averageCoordinates(emergencyPoints) ?? DEFAULT_CENTER;
  const zoom = !cityWide && station ? 13 : 12;

  const isStationary =
    typeof activeEmergency?.speed === "number" && activeEmergency.speed < STATIONARY_SPEED_THRESHOLD;

  // Every AUTO_REFRESH_MS, nudge the viewport to make sure every active unit and every
  // hospital is still in frame (positions themselves already stream in live via Firestore)
  // and stamp a fresh sync time for the "Live · updated Ns ago" indicator below.
  useEffect(() => {
    const refresh = () => {
      const map = mapRef.current;
      const points = [...emergencyPoints, ...hospitalPoints];

      if (map && points.length > 1 && window.google?.maps) {
        const bounds = new window.google.maps.LatLngBounds();
        points.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds, 80);
      }

      setLastSyncedAt(Date.now());
    };

    const interval = setInterval(refresh, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [emergencyPoints, hospitalPoints]);

  useEffect(() => {
    const tick = setInterval(() => setSecondsSinceSync(Math.floor((Date.now() - lastSyncedAt) / 1000)), 1000);
    return () => clearInterval(tick);
  }, [lastSyncedAt]);

  // Selecting an emergency from a list/card/table (which opens the drawer) also zooms the
  // map to that ambulance, highlights its route (via the strokeColor check below), and pops
  // its live details card - satisfies "clicking an emergency should zoom + highlight + show
  // details" without also yanking the camera every time someone merely clicks a map marker.
  useEffect(() => {
    if (!drawerOpen || !selectedEmergencyId) return;
    const target = emergencies.find((emergency) => emergency.id === selectedEmergencyId);
    const map = mapRef.current;
    if (map && target?.coordinates) {
      map.panTo(target.coordinates);
      map.setZoom(15);
      setInfoWindowId(target.id);
    }
  }, [drawerOpen, selectedEmergencyId, emergencies]);

  if (loadError) {
    return (
      <section className="flex aspect-[16/7] min-h-[360px] items-center justify-center rounded-lg border bg-slate-50 text-sm text-slate-500">
        Google Maps failed to load. Check that VITE_GOOGLE_MAPS_API_KEY is set and the Maps JavaScript API is enabled
        for that key.
      </section>
    );
  }

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <section className="flex aspect-[16/7] min-h-[360px] items-center justify-center rounded-lg border bg-slate-50 p-6 text-center text-sm text-slate-500">
        Add VITE_GOOGLE_MAPS_API_KEY to .env.local and restart the dev server to enable the live map.
      </section>
    );
  }

  if (!isLoaded) {
    return (
      <section className="flex aspect-[16/7] min-h-[360px] items-center justify-center rounded-lg border bg-slate-50 text-sm text-slate-500">
        Loading map...
      </section>
    );
  }

  return (
    <section className="relative aspect-[16/7] min-h-[360px] w-full overflow-hidden rounded-lg border shadow-map">
      <GoogleMap
        mapContainerClassName="h-full w-full"
        center={center}
        zoom={zoom}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        mapTypeId={satelliteView ? "satellite" : "roadmap"}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {!cityWide && station?.lat && station?.lng && (
          <Circle
            center={station}
            radius={serviceRadiusKm * 1000}
            options={{
              strokeColor: "#175cd3",
              strokeOpacity: 0.5,
              strokeWeight: 1,
              fillColor: "#175cd3",
              fillOpacity: 0.06,
            }}
          />
        )}

        {station?.lat && station?.lng && (
          <Marker
            position={station}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#0f172a",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            }}
            title={`${station.name} (your station)`}
          />
        )}

        {emergencies.map((emergency) => {
          const isActive = emergency.id === activeEmergency?.id;
          const routeColor = isActive ? "#175cd3" : "#94a3b8";
          const route = routesById[emergency.id];

          if (route) {
            return (
              <DirectionsRenderer
                key={`${emergency.id}-route`}
                directions={route}
                options={{
                  suppressMarkers: true,
                  preserveViewport: true,
                  polylineOptions: {
                    strokeColor: routeColor,
                    strokeOpacity: isActive ? 0.95 : 0.5,
                    strokeWeight: isActive ? 5 : 3,
                    zIndex: isActive ? 500 : 1,
                  },
                }}
              />
            );
          }

          // Route not back from the Directions API yet (or it failed) - show a straight
          // line so the ambulance's intended path is never blank while that resolves.
          const patientOnboard = PATIENT_ALREADY_ONBOARD_STATUSES.has(emergency.tripStatus);
          const fallbackPath = [
            emergency.coordinates,
            patientOnboard ? null : emergency.pickup,
            emergency.destinationHospitalCoordinates,
          ].filter(Boolean);
          return fallbackPath.length > 1 ? (
            <Polyline
              key={`${emergency.id}-route-fallback`}
              path={fallbackPath}
              options={{
                strokeColor: routeColor,
                strokeOpacity: isActive ? 0.7 : 0.35,
                strokeWeight: isActive ? 3 : 2,
                icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 2 }, offset: "0", repeat: "12px" }],
              }}
            />
          ) : null;
        })}

        {hospitals
          .filter((hospital) => hospital.lat && hospital.lng)
          .map((hospital) => (
            <Marker
              key={hospital.id}
              position={{ lat: hospital.lat, lng: hospital.lng }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#059669",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
              }}
              title={hospital.name}
            />
          ))}

        {emergencies
          .filter((emergency) => emergency.coordinates)
          .map((emergency) => (
            <Marker
              key={emergency.id}
              position={emergency.coordinates}
              zIndex={emergency.id === infoWindowId ? 999 : emergency.id === activeEmergency?.id ? 500 : 1}
              onClick={() => {
                focusEmergency(emergency.id);
                setInfoWindowId(emergency.id);
              }}
              icon={buildAmbulanceIcon(severityColor(emergency.severity), emergency.id === infoWindowId)}
              title={`${displayIds.get(emergency.id) ?? emergency.id} · ${emergency.ambulanceNumber ?? ""}`}
            />
          ))}

        {popupEmergency?.coordinates && (
          <InfoWindow
            position={popupEmergency.coordinates}
            onCloseClick={() => setInfoWindowId(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -20), disableAutoPan: false }}
          >
            <div className="w-64 max-w-[80vw] p-0.5 font-sans">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {displayIds.get(popupEmergency.id) ?? popupEmergency.id}
                  </p>
                  <p className="text-xs text-slate-500">
                    {popupEmergency.patientName ?? "Patient"} · {popupEmergency.type ?? "Ambulance"} emergency
                  </p>
                </div>
                <StatusBadge value={popupEmergency.severity} />
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Ambulance className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{popupEmergency.ambulanceNumber ?? "--"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">ETA {popupEmergency.eta ?? "--"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Gauge className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{popupEmergency.speed ?? "--"} km/h</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Signpost className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{popupEmergency.distanceRemaining ?? "--"} km left</span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5 text-slate-600">
                  <Hospital className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{popupEmergency.destinationHospital ?? "Unassigned"}</span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">
                    {popupEmergency.status ?? "Status pending"} · {formatRelativeTime(popupEmergency.lastUpdated)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="mt-3 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90"
                onClick={() => selectEmergency(popupEmergency.id)}
              >
                View full details
              </button>
            </div>
          </InfoWindow>
        )}

        {trafficReports
          .map((report) => {
            const source = emergencies.find((emergency) => report.affectedTrips?.includes(emergency.id));
            return source?.coordinates ? { report, position: source.coordinates } : null;
          })
          .filter(Boolean)
          .map(({ report, position }) => (
            <Marker
              key={report.id}
              position={position}
              icon={{
                path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                scale: 4,
                fillColor: "#d97706",
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 1,
              }}
              title={`${report.type} · ${report.road}`}
            />
          ))}
      </GoogleMap>

      <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
        <Badge variant="success">
          <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
          Live map
        </Badge>
        <Badge variant="neutral">
          <RefreshCw className="mr-1 inline h-3 w-3" />
          Synced {secondsSinceSync <= 1 ? "just now" : `${secondsSinceSync}s ago`}
        </Badge>
        <Badge variant="neutral">{emergencies.length} active routes</Badge>
        <Badge variant={cityWide ? "neutral" : "high"}>
          {cityWide ? "Entire city" : station?.name ? `${station.name} area` : "No station set"}
        </Badge>
        {trafficReports.length > 0 && (
          <Badge variant="high">
            {trafficReports.length} traffic incident{trafficReports.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="absolute right-4 top-4 z-10 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={toggleCityWide}>
          <MapPin className="h-4 w-4" />
          {cityWide ? "My area" : "Entire city"}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setSatelliteView((prev) => !prev)}>
          <Satellite className="h-4 w-4" />
          {satelliteView ? "Standard" : "Satellite"}
        </Button>
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-10 grid gap-2 rounded-lg border bg-white/95 p-3 shadow-panel sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <p className="text-xs text-slate-500">Active route</p>
          <p className="truncate text-sm font-semibold text-slate-950">
            {activeEmergency?.id} · {activeEmergency?.type}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Destination</p>
          <p className="truncate text-sm font-semibold text-slate-950">{activeEmergency?.destinationHospital}</p>
        </div>
        <div>
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <Ambulance className="h-3 w-3" /> Speed
          </p>
          <p className="truncate text-sm font-semibold text-slate-950">{activeEmergency?.speed ?? "--"} km/h</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Distance / Current road</p>
          <p className="truncate text-sm font-semibold text-slate-950">
            {activeEmergency?.distanceRemaining ?? "--"} km · {activeEmergency?.currentRoad ?? "Unknown"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Last updated</p>
          <p className="truncate text-sm font-semibold text-slate-950">
            {activeEmergency ? formatRelativeTime(activeEmergency.lastUpdated) : "--"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Status</p>
          {isStationary ? (
            <Badge variant="critical">Stationary warning</Badge>
          ) : (
            <Badge variant="success">Moving</Badge>
          )}
        </div>
      </div>
    </section>
  );
}
