import { useMemo, useState } from "react";
import { Circle, GoogleMap, InfoWindow, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api";
import { Ambulance, MapPin, Satellite } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_LOADER_ID } from "@/services/googleMapsConfig";
import { usePoliceStore } from "@/store/policeStore";
import { formatRelativeTime } from "@/utils/format";

const STATIONARY_SPEED_THRESHOLD = 8;
const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 }; // Pune, used only when no station/emergencies to center on

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

export function MapContainer({ emergencies, hospitals, trafficReports = [] }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const selectedEmergencyId = usePoliceStore((state) => state.selectedEmergencyId);
  const selectEmergency = usePoliceStore((state) => state.selectEmergency);
  const cityWide = usePoliceStore((state) => state.cityWide);
  const toggleCityWide = usePoliceStore((state) => state.toggleCityWide);
  const station = usePoliceStore((state) => state.currentOperator?.station);
  const serviceRadiusKm = usePoliceStore((state) => state.currentOperator?.serviceRadiusKm ?? 10);

  const activeEmergency = emergencies.find((emergency) => emergency.id === selectedEmergencyId) ?? emergencies[0];
  const [satelliteView, setSatelliteView] = useState(false);
  const [infoWindowId, setInfoWindowId] = useState(null);

  const emergencyPoints = useMemo(
    () => emergencies.map((emergency) => emergency.coordinates).filter(Boolean),
    [emergencies],
  );

  const center = station?.lat && station?.lng ? station : averageCoordinates(emergencyPoints) ?? DEFAULT_CENTER;
  const zoom = !cityWide && station ? 13 : 12;

  const isStationary =
    typeof activeEmergency?.speed === "number" && activeEmergency.speed < STATIONARY_SPEED_THRESHOLD;

  if (loadError) {
    return (
      <section className="flex min-h-[520px] items-center justify-center rounded-lg border bg-slate-50 text-sm text-slate-500">
        Google Maps failed to load. Check that VITE_GOOGLE_MAPS_API_KEY is set and the Maps JavaScript API is enabled
        for that key.
      </section>
    );
  }

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <section className="flex min-h-[520px] items-center justify-center rounded-lg border bg-slate-50 p-6 text-center text-sm text-slate-500">
        Add VITE_GOOGLE_MAPS_API_KEY to .env.local and restart the dev server to enable the live map.
      </section>
    );
  }

  if (!isLoaded) {
    return (
      <section className="flex min-h-[520px] items-center justify-center rounded-lg border bg-slate-50 text-sm text-slate-500">
        Loading map...
      </section>
    );
  }

  return (
    <section className="relative min-h-[520px] overflow-hidden rounded-lg border shadow-map">
      <GoogleMap
        mapContainerClassName="h-full w-full min-h-[520px]"
        center={center}
        zoom={zoom}
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

        {emergencies.map(
          (emergency) =>
            emergency.route?.length > 1 && (
              <Polyline
                key={`${emergency.id}-route`}
                path={emergency.route}
                options={{
                  strokeColor: emergency.id === activeEmergency?.id ? "#175cd3" : "#94a3b8",
                  strokeOpacity: emergency.id === activeEmergency?.id ? 0.95 : 0.5,
                  strokeWeight: emergency.id === activeEmergency?.id ? 4 : 2,
                }}
              />
            ),
        )}

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
              onClick={() => {
                selectEmergency(emergency.id);
                setInfoWindowId(emergency.id);
              }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: emergency.id === activeEmergency?.id ? 10 : 8,
                fillColor: severityColor(emergency.severity),
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
              }}
            >
              {infoWindowId === emergency.id && (
                <InfoWindow onCloseClick={() => setInfoWindowId(null)}>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-950">{emergency.id}</p>
                    <p className="text-slate-500">
                      ETA {emergency.eta} · {emergency.status}
                    </p>
                  </div>
                </InfoWindow>
              )}
            </Marker>
          ))}

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
        <Badge variant="success">Live map</Badge>
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
