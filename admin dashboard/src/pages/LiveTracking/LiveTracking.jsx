import { useCallback, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Ambulance,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Radar,
  RefreshCcw,
  Search,
  User,
} from "lucide-react";
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from "@react-google-maps/api";

import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Input from "../../components/ui/Input.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime } from "../../utils/formatters.js";
import Button from "../../components/ui/Button.jsx";

import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES } from "../../services/googleMapsConfig.js";

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "560px",
  borderRadius: "0.75rem",
};

const DEFAULT_CENTER = {
  lat: 18.5204,
  lng: 73.8567,
};

function isValidCoordinate(lat, lng) {
  return typeof lat === "number" && !isNaN(lat) && typeof lng === "number" && !isNaN(lng);
}

function formatCoordinates(lat, lng) {
  if (isValidCoordinate(lat, lng)) {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
  return "Location unavailable";
}

function extractCoordinateValue(val1, val2, val3) {
  for (const val of [val1, val2, val3]) {
    if (typeof val === "number" && !isNaN(val)) return val;
    if (typeof val === "string" && val.trim() !== "") {
      const num = Number(val);
      if (!isNaN(num)) return num;
    }
    if (typeof val === "function") {
      const num = Number(val());
      if (!isNaN(num)) return num;
    }
  }
  return undefined;
}

function extractCoordinates(obj) {
  if (!obj) return null;

  let lat = extractCoordinateValue(obj.lat, obj.latitude, obj._lat);
  let lng = extractCoordinateValue(obj.lng, obj.longitude, obj._long ?? obj._lng);

  if (lat !== undefined && lng !== undefined) return { lat, lng };

  const nested = obj.location || obj.coordinates || obj.position || obj.geopoint || obj.lastLocation;
  if (nested) {
    lat = extractCoordinateValue(nested.lat, nested.latitude, nested._lat);
    lng = extractCoordinateValue(nested.lng, nested.longitude, nested._long ?? nested._lng);
    if (lat !== undefined && lng !== undefined) return { lat, lng };
  }

  return null;
}

export default function LiveTracking() {
  const { liveLocations = [], ambulances = [], drivers = [], emergencies = [], hospitals = [] } = useOps();
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [zoomLevel, setZoomLevel] = useState(12);
  const mapRef = useRef(null);

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Combine both liveLocations AND drivers collections into a unified list of trackable vehicles
  const enrichedLocations = useMemo(() => {
    const map = new Map();

    // 1. Process all drivers from `drivers` collection who have GPS coordinates
    (drivers || []).forEach((driver) => {
      const coords = extractCoordinates(driver);
      if (!coords || !isValidCoordinate(coords.lat, coords.lng)) return;

      const ambulance = (ambulances || []).find(
        (unit) =>
          unit.id === driver.ambulanceId ||
          unit.numberPlate === driver.ambulanceId ||
          unit.activeDriverId === driver.id ||
          unit.assignedDrivers?.includes(driver.id),
      );

      const emergency = (emergencies || []).find(
        (item) =>
          (item.driverId === driver.id || item.driverName === driver.name || (ambulance && item.ambulanceId === ambulance.id)) &&
          !["completed", "resolved"].includes(item.status),
      );

      const hospital = (hospitals || []).find(
        (h) =>
          h.hospitalId === (driver.hospitalId || ambulance?.hospitalId) ||
          h.id === (driver.hospitalId || ambulance?.hospitalId) ||
          h.name === (driver.hospitalName || ambulance?.hospitalName),
      );

      const driverId = driver.id || driver.driverId || driver.name;
      map.set(driverId, {
        id: driverId,
        driverUid: driver.id,
        ambulanceId: ambulance?.id || driver.ambulanceId || `AMB-${driver.name?.slice(0, 3)?.toUpperCase()}`,
        lat: coords.lat,
        lng: coords.lng,
        address: driver.address || driver.location?.address || driver.city || "Active Position",
        updatedAt: driver.updatedAt || driver.tripStatusUpdatedAt || driver.location?.updatedAt || new Date().toISOString(),
        ambulance,
        driver,
        emergency,
        hospital,
        hospitalName: hospital?.name || driver.hospitalName || ambulance?.hospitalName || "Hospital Network",
        driverName: driver.name || driver.fullName || "Driver",
        numberPlate: ambulance?.numberPlate || driver.ambulanceId || `AMB-${driver.name?.split(" ")[0]?.toUpperCase() || "UNIT"}`,
        vehicleType: ambulance?.vehicleType || "Advanced Life Support",
        source: "driver",
      });
    });

    // 2. Process all liveLocations from `liveLocations` collection (supplementing or updating)
    (liveLocations || []).forEach((location) => {
      const coords = extractCoordinates(location);
      if (!coords || !isValidCoordinate(coords.lat, coords.lng)) return;

      const ambulance = (ambulances || []).find(
        (unit) =>
          unit.id === location.ambulanceId ||
          unit.id === location.id ||
          unit.numberPlate === location.ambulanceId,
      );

      const driver = (drivers || []).find(
        (item) =>
          item.id === (location.driverUid || location.driverId || ambulance?.activeDriverId) ||
          item.name === location.driverName,
      );

      const emergency = (emergencies || []).find(
        (item) =>
          (item.ambulanceId === (ambulance?.id || location.ambulanceId) ||
            item.driverId === (driver?.id || location.driverUid)) &&
          !["completed", "resolved"].includes(item.status),
      );

      const hospital = (hospitals || []).find(
        (h) =>
          h.hospitalId === (location.hospitalId || ambulance?.hospitalId || driver?.hospitalId) ||
          h.id === (location.hospitalId || ambulance?.hospitalId || driver?.hospitalId),
      );

      const key = driver?.id || location.id || location.ambulanceId;
      map.set(key, {
        ...location,
        id: key,
        lat: coords.lat,
        lng: coords.lng,
        address: location.address || location.location?.address || driver?.address || emergency?.address || "Active GPS Stream",
        updatedAt: location.updatedAt || location.timestamp || new Date().toISOString(),
        ambulance,
        driver,
        emergency,
        hospital,
        hospitalName: hospital?.name || location.hospitalId || ambulance?.hospitalId || driver?.hospitalName || "Hospital Network",
        driverName: driver?.name || location.driverName || "Driver Assigned",
        numberPlate: ambulance?.numberPlate || location.ambulanceId || location.id,
        vehicleType: ambulance?.vehicleType || "Basic Life Support",
        source: "live_location",
      });
    });

    return Array.from(map.values());
  }, [liveLocations, drivers, ambulances, emergencies, hospitals]);

  // Filter locations by search term
  const filteredLocations = useMemo(() => {
    if (!searchTerm.trim()) return enrichedLocations;
    const term = searchTerm.toLowerCase();
    return enrichedLocations.filter(
      (item) =>
        item.numberPlate.toLowerCase().includes(term) ||
        item.driverName.toLowerCase().includes(term) ||
        item.hospitalName.toLowerCase().includes(term) ||
        (item.emergency && item.emergency.incidentType?.toLowerCase().includes(term)),
    );
  }, [enrichedLocations, searchTerm]);

  // Selected item object
  const selectedItem = useMemo(() => {
    return enrichedLocations.find((item) => item.id === selectedLocationId) || null;
  }, [enrichedLocations, selectedLocationId]);

  // On Google Map Load
  const handleMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      if (enrichedLocations.length > 0 && window.google?.maps?.LatLngBounds) {
        const bounds = new window.google.maps.LatLngBounds();
        let validPoints = 0;
        enrichedLocations.forEach((item) => {
          if (isValidCoordinate(item.lat, item.lng)) {
            bounds.extend({ lat: Number(item.lat), lng: Number(item.lng) });
            validPoints++;
          }
        });
        if (validPoints > 0) {
          map.fitBounds(bounds);
        }
      }
    },
    [enrichedLocations],
  );

  // Center map on specific location
  const handleFocusAmbulance = (item) => {
    setSelectedLocationId(item.id);
    if (isValidCoordinate(item.lat, item.lng)) {
      const pos = { lat: Number(item.lat), lng: Number(item.lng) };
      setMapCenter(pos);
      setZoomLevel(15);
      if (mapRef.current) {
        mapRef.current.panTo(pos);
      }
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Live Tracking & GPS Fleet"
        description="Realtime ambulance positions, active emergency dispatches, and driver GPS coordinates."
        actions={
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Radar className="h-3.5 w-3.5 animate-pulse text-emerald-600 dark:text-emerald-400" />
            {enrichedLocations.length} active vehicle{enrichedLocations.length === 1 ? "" : "s"} reporting
          </div>
        }
      />

      {/* Missing Google Maps API key warning alert */}
      {!googleMapsApiKey && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40 p-4 text-sm text-amber-900 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950 dark:text-amber-100">Google Maps API Key Missing</p>
            <p className="text-amber-800 dark:text-amber-300">
              Please add <code className="rounded bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 font-mono text-xs font-semibold">VITE_GOOGLE_MAPS_API_KEY=your_api_key</code> to your <code className="rounded bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 font-mono text-xs">.env</code> or <code className="rounded bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 font-mono text-xs">.env.local</code> file to render the interactive Google Map tiles.
            </p>
          </div>
        </div>
      )}

      {enrichedLocations.length === 0 ? (
        <EmptyState
          title="No live ambulance locations reporting"
          description="Once drivers start their shifts on the Android Driver App, active locations will update here automatically."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
          {/* Map View Container */}
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>GPS Interactive Map</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live positions updated via Firestore realtime listeners.</p>
              </div>
              {selectedItem && (
                <button
                  onClick={() => setSelectedLocationId(null)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline"
                >
                  Clear Selection
                </button>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-3">
              {!googleMapsApiKey || loadError ? (
                /* Fallback View when API Key is missing or map fails to load */
                <div className="flex h-[520px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-6 text-center">
                  <MapPin className="h-10 w-10 text-slate-400" />
                  <h3 className="mt-3 text-base font-bold text-slate-800 dark:text-slate-200">
                    Google Maps Tile View Disabled
                  </h3>
                  <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
                    Set <code className="font-semibold text-slate-700 dark:text-slate-300">VITE_GOOGLE_MAPS_API_KEY</code> in <code className="font-semibold text-slate-700 dark:text-slate-300">.env</code> to load full interactive Google Maps map tiles.
                  </p>
                  {/* Visual list fallback preview */}
                  <div className="mt-6 w-full max-w-lg space-y-2 text-left">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Live Reporting Ambulances ({enrichedLocations.length})
                    </p>
                    {enrichedLocations.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedLocationId(item.id)}
                        className={`cursor-pointer flex items-center justify-between rounded-lg border p-3 text-xs transition ${selectedLocationId === item.id
                          ? "border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/40"
                          : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                          }`}
                      >
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{item.numberPlate}</p>
                          <p className="text-slate-500 dark:text-slate-400">{item.driverName} · {item.hospitalName}</p>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className={`font-mono ${isValidCoordinate(item.lat, item.lng) ? "text-slate-600 dark:text-slate-300" : "text-amber-600 font-medium flex items-center gap-1"}`}>
                            {!isValidCoordinate(item.lat, item.lng) && <AlertTriangle className="h-3 w-3" />}
                            {formatCoordinates(item.lat, item.lng)}
                          </span>
                          {item.address && (
                            <span className="text-slate-400 mt-0.5 truncate max-w-[140px]" title={item.address}>{item.address}</span>
                          )}
                          {item.emergency && (
                            <p className="font-bold text-red-600 dark:text-red-400 mt-0.5">{item.emergency.priority?.toUpperCase()} incident</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !isLoaded ? (
                /* Loading State */
                <div className="flex h-[520px] items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" /> Loading Google Maps...
                  </div>
                </div>
              ) : (
                /* Live Google Map View */
                <GoogleMap
                  mapContainerStyle={MAP_CONTAINER_STYLE}
                  center={mapCenter}
                  zoom={zoomLevel}
                  onLoad={handleMapLoad}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: true,
                    fullscreenControl: true,
                  }}
                >
                  {filteredLocations.map((item) =>
                    isValidCoordinate(item.lat, item.lng) ? (
                      <MarkerF
                        key={item.id}
                        position={{ lat: Number(item.lat), lng: Number(item.lng) }}
                        onClick={() => setSelectedLocationId(item.id)}
                        title={`${item.numberPlate} (${item.driverName})`}
                      />
                    ) : null,
                  )}

                  {/* Info Window on Selected Marker */}
                  {selectedItem && isValidCoordinate(selectedItem.lat, selectedItem.lng) && (
                    <InfoWindowF
                      position={{ lat: Number(selectedItem.lat), lng: Number(selectedItem.lng) }}
                      onCloseClick={() => setSelectedLocationId(null)}
                    >
                      <div className="p-2 min-w-[220px] text-slate-900 space-y-2">
                        <div className="flex items-center justify-between border-b pb-1">
                          <span className="font-bold text-sm">{selectedItem.numberPlate}</span>
                          <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-medium">
                            {selectedItem.vehicleType}
                          </span>
                        </div>
                        <div className="text-xs space-y-1 text-slate-600">
                          <p><strong className="text-slate-800">Driver:</strong> {selectedItem.driverName}</p>
                          <p><strong className="text-slate-800">Hospital:</strong> {selectedItem.hospitalName}</p>
                          {selectedItem.address && (
                            <p><strong className="text-slate-800">Location:</strong> {selectedItem.address}</p>
                          )}
                          {selectedItem.emergency ? (
                            <div className="mt-1 rounded bg-red-50 p-1.5 text-red-800 border border-red-200">
                              <p className="font-semibold flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                {selectedItem.emergency.priority?.toUpperCase()} Incident
                              </p>
                              <p>{selectedItem.emergency.incidentType} ({selectedItem.emergency.patientName || "Patient"})</p>
                              <p className="text-[11px] text-red-600">ETA: {selectedItem.emergency.eta || "En Route"}</p>
                            </div>
                          ) : (
                            <p className="text-emerald-700 font-semibold">Available / On Standby</p>
                          )}
                          <p className="text-[10px] text-slate-400 pt-1">Updated {formatDateTime(selectedItem.updatedAt)}</p>
                        </div>
                      </div>
                    </InfoWindowF>
                  )}
                </GoogleMap>
              )}
            </CardContent>
          </Card>

          {/* Sidebar Vehicle & Incident List */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search ambulance plate, driver, or hospital..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredLocations.map((item) => {
                const isSelected = selectedLocationId === item.id;
                return (
                  <Card
                    key={item.id}
                    className={`transition-all border-l-4 ${item.emergency
                      ? "border-l-red-500"
                      : "border-l-emerald-500"
                      } ${isSelected ? "ring-2 ring-blue-500 bg-blue-50/20 dark:bg-blue-950/20" : ""}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-base">{item.numberPlate}</span>
                            <StatusBadge status={item.emergency ? "Critical" : "Available"} />
                          </div>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-medium text-slate-800 dark:text-slate-200">{item.driverName}</span>
                            {item.driver?.phone && <span className="text-slate-400">({item.driver.phone})</span>}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleFocusAmbulance(item)}
                          className="shrink-0 text-xs gap-1"
                        >
                          <Navigation className="h-3.5 w-3.5 text-blue-600" />
                          Focus
                        </Button>
                      </div>

                      {/* Hospital & Emergency Context */}
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-900/60 p-2.5 text-xs space-y-1 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Hospital:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{item.hospitalName}</span>
                        </div>
                        {item.emergency && (
                          <>
                            <div className="flex justify-between text-red-600 dark:text-red-400 font-semibold">
                              <span>Incident:</span>
                              <span>{item.emergency.incidentType || "Emergency Response"}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                              <span>Patient:</span>
                              <span>{item.emergency.patientName || "N/A"}</span>
                            </div>
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                              <span>ETA:</span>
                              <span className="font-bold text-slate-900 dark:text-slate-100">{item.emergency.eta || "En Route"}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex flex-col text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className={isValidCoordinate(item.lat, item.lng) ? "font-mono" : "text-amber-600 font-medium flex items-center gap-1"}>
                            {!isValidCoordinate(item.lat, item.lng) && <AlertTriangle className="h-3 w-3" />}
                            {formatCoordinates(item.lat, item.lng)} · {formatDateTime(item.updatedAt)}
                          </span>
                          {isValidCoordinate(item.lat, item.lng) && (
                            <a
                              href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 font-medium"
                            >
                              Maps <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        {item.address && (
                          <span className="text-slate-500 dark:text-slate-400 leading-tight">
                            {item.address}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredLocations.length === 0 && (
                <EmptyState title="No matching ambulances found" description="Try broadening your search term." />
              )}
            </div>
          </div>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <RefreshCcw className="h-3 w-3 text-emerald-500" />
        Live tracking feeds listen directly to Firestore <code className="font-mono text-slate-300">drivers</code> and <code className="font-mono text-slate-300">live_locations</code> updates in realtime.
      </p>
    </div>
  );
}
