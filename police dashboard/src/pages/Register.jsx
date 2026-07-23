import { useEffect, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { ArrowLeft, LocateFixed, ShieldCheck, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_LOADER_ID } from "@/services/googleMapsConfig";
import { findNearbyPoliceStations } from "@/services/placesService";
import { usePoliceStore } from "@/store/policeStore";
import { cn } from "@/utils/cn";

const DEFAULT_SERVICE_RADIUS_KM = 10;

export function Register() {
  const navigate = useNavigate();
  const requestAccess = usePoliceStore((state) => state.requestAccess);
  const [isLoading, setIsLoading] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    badgeId: "",
    email: "",
    department: "",
  });

  const { isLoaded: mapsLoaded, loadError: mapsLoadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Requests location once the page loads, so we can look up nearby stations.
  // idle | requesting | captured | denied | unsupported
  const [locationStatus, setLocationStatus] = useState("idle");
  const [coordinates, setCoordinates] = useState(null);

  // idle | loading | loaded | error
  const [stationsStatus, setStationsStatus] = useState("idle");
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);

  function captureLocation() {
    if (!("geolocation" in navigator)) {
      setLocationStatus("unsupported");
      return;
    }

    setLocationStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("captured");
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  useEffect(() => {
    captureLocation();
  }, []);

  // Once we have both the officer's live location and the Places library
  // loaded, look up nearby police stations sorted by real distance.
  useEffect(() => {
    if (!coordinates || !mapsLoaded) return;

    let cancelled = false;
    setStationsStatus("loading");
    setSelectedStation(null);

    findNearbyPoliceStations(coordinates)
      .then((results) => {
        if (cancelled) return;
        setStations(results);
        setStationsStatus("loaded");
      })
      .catch(() => {
        if (cancelled) return;
        setStationsStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [coordinates, mapsLoaded]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStation) {
      setFormError("Please select your nearest police station.");
      return;
    }

    setIsLoading(true);
    setFormMessage("");
    setFormError("");

    try {
      await requestAccess({
        ...formData,
        station: {
          name: selectedStation.name,
          address: selectedStation.address,
          placeId: selectedStation.placeId,
          lat: selectedStation.lat,
          lng: selectedStation.lng,
        },
        serviceRadiusKm: DEFAULT_SERVICE_RADIUS_KM,
      });
      setFormMessage("System access request submitted. Waiting for admin approval.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setFormError(error.message || "Unable to submit access request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute left-0 top-0 h-full w-full overflow-hidden">
        <div className="absolute -left-[10%] -top-[20%] h-[50%] w-[50%] rounded-full bg-emerald-100/50 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[10%] h-[40%] w-[30%] rounded-full bg-blue-100/40 blur-[100px]" />
      </div>

      <div className="relative z-10 my-8 w-full max-w-md px-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="p-8">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
                <UserPlus className="h-8 w-8" />
              </div>
            </div>

            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">Request Access</h1>
              <p className="mt-2 text-sm text-slate-500">
                Submit your details for Police Command verification.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                placeholder="Full Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-12 border-slate-200 bg-slate-50 focus-visible:ring-emerald-500"
              />
              <Input
                type="text"
                placeholder="Badge ID"
                required
                value={formData.badgeId}
                onChange={(e) => setFormData({ ...formData, badgeId: e.target.value })}
                className="h-12 border-slate-200 bg-slate-50 focus-visible:ring-emerald-500"
              />
              <Input
                type="email"
                placeholder="Official Email Address"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="h-12 border-slate-200 bg-slate-50 focus-visible:ring-emerald-500"
              />
              <Input
                type="text"
                placeholder="Department / Unit"
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="h-12 border-slate-200 bg-slate-50 focus-visible:ring-emerald-500"
              />
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                {locationStatus === "requesting" && (
                  <p className="text-slate-500">Requesting your location - allow the browser permission prompt...</p>
                )}
                {locationStatus === "captured" && (
                  <p className="flex items-center gap-1.5 text-emerald-700">
                    <LocateFixed className="h-3.5 w-3.5" /> Location captured.
                  </p>
                )}
                {locationStatus === "denied" && (
                  <div className="flex items-center justify-between gap-2 text-amber-700">
                    <span>Location permission denied - we need this to find your nearest station.</span>
                    <Button type="button" variant="secondary" size="sm" onClick={captureLocation}>
                      Retry
                    </Button>
                  </div>
                )}
                {locationStatus === "unsupported" && (
                  <p className="text-amber-700">Your browser doesn't support location capture.</p>
                )}
              </div>

              {mapsLoadError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  Google Maps failed to load. Check VITE_GOOGLE_MAPS_API_KEY in .env.local.
                </div>
              )}

              {locationStatus === "captured" && !mapsLoadError && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">Select your nearest police station</p>

                  {stationsStatus === "loading" && (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      Looking up nearby stations...
                    </p>
                  )}

                  {stationsStatus === "error" && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      Couldn't load nearby stations. Check the Places API is enabled on your key.
                    </p>
                  )}

                  {stationsStatus === "loaded" && stations.length === 0 && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      No police stations found nearby. Try again once you're closer to your station.
                    </p>
                  )}

                  {stationsStatus === "loaded" && stations.length > 0 && (
                    <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                      {stations.map((station) => {
                        const isSelected = selectedStation?.placeId === station.placeId;
                        return (
                          <button
                            key={station.placeId}
                            type="button"
                            onClick={() => setSelectedStation(station)}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                              isSelected
                                ? "border-emerald-500 bg-emerald-50"
                                : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50",
                            )}
                          >
                            <span className="flex items-center gap-2 truncate">
                              {isSelected && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                              <span className="truncate">
                                <span className="font-medium text-slate-950">{station.name}</span>
                                {station.address && (
                                  <span className="ml-1 text-slate-500">· {station.address}</span>
                                )}
                              </span>
                            </span>
                            <span className="shrink-0 font-medium text-slate-500">
                              {station.distanceKm.toFixed(1)} km
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-2 h-12 w-full rounded-xl bg-emerald-600 text-lg font-medium text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg"
              >
                {isLoading ? "Submitting..." : "Submit Request"}
              </Button>
            </form>

            {formMessage && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {formMessage}
              </div>
            )}

            {formError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" /> Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
