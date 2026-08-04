import { useState, useEffect, useRef, useCallback } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { MapPin, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { GOOGLE_MAPS_LOADER_ID, GOOGLE_MAPS_LIBRARIES } from "../../services/googleMapsConfig.js";

let sharedPlacesService = null;
let sharedAutocompleteService = null;
let sharedGeocoder = null;

function getServices() {
  if (!window.google?.maps?.places) {
    throw new Error("Google Maps Places library is not loaded.");
  }
  if (!sharedAutocompleteService) {
    sharedAutocompleteService = new window.google.maps.places.AutocompleteService();
  }
  if (!sharedPlacesService) {
    const hiddenDiv = document.createElement("div");
    const dummyMap = new window.google.maps.Map(hiddenDiv, {
      center: { lat: 0, lng: 0 },
      zoom: 2,
    });
    sharedPlacesService = new window.google.maps.places.PlacesService(dummyMap);
  }
  if (!sharedGeocoder) {
    sharedGeocoder = new window.google.maps.Geocoder();
  }
  return {
    autocompleteService: sharedAutocompleteService,
    placesService: sharedPlacesService,
    geocoder: sharedGeocoder,
  };
}

export default function HospitalLocationAutocomplete({
  value = "",
  latitude = null,
  longitude = null,
  onSelectLocation,
  onChangeInput,
  error,
}) {
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [inputValue, setInputValue] = useState(value || "");
  const [predictions, setPredictions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [apiErrorMsg, setApiErrorMsg] = useState("");

  const dropdownRef = useRef(null);

  // Sync prop value changes to input value
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(
    (query) => {
      if (!query || query.trim().length < 2 || !isLoaded) {
        setPredictions([]);
        setIsOpen(false);
        return;
      }

      try {
        const { autocompleteService } = getServices();
        setApiErrorMsg("");

        autocompleteService.getPlacePredictions(
          {
            input: query,
            types: ["establishment", "geocode"],
          },
          (results, status) => {
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              results &&
              results.length > 0
            ) {
              setPredictions(results);
              setIsOpen(true);
              setSelectedIndex(-1);
            } else if (
              status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS
            ) {
              setPredictions([]);
              setIsOpen(true);
              setSelectedIndex(-1);
            } else {
              setPredictions([]);
              setIsOpen(false);
              if (
                status !== window.google.maps.places.PlacesServiceStatus.INVALID_REQUEST
              ) {
                setApiErrorMsg(`Google Places status: ${status}`);
              }
            }
          }
        );
      } catch (err) {
        console.error("Autocomplete prediction error:", err);
        setApiErrorMsg(err.message || "Failed to fetch location suggestions.");
        setPredictions([]);
        setIsOpen(false);
      }
    },
    [isLoaded]
  );

  function handleInputChange(e) {
    const newVal = e.target.value;
    setInputValue(newVal);
    if (onChangeInput) {
      onChangeInput(newVal);
    }
    fetchPredictions(newVal);
  }

  const handleSelectPrediction = useCallback(
    (prediction) => {
      if (!prediction) return;
      setIsOpen(false);
      setFetchingDetails(true);
      setInputValue(prediction.description);
      setApiErrorMsg("");

      try {
        const { placesService } = getServices();

        placesService.getDetails(
          {
            placeId: prediction.place_id,
            fields: [
              "formatted_address",
              "geometry",
              "name",
              "address_components",
            ],
          },
          (place, status) => {
            setFetchingDetails(false);
            if (
              status === window.google.maps.places.PlacesServiceStatus.OK &&
              place?.geometry?.location
            ) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              const formattedAddress =
                place.formatted_address || prediction.description;

              // Extract City and State from address components if available
              let city = "";
              let state = "";
              if (place.address_components) {
                for (const comp of place.address_components) {
                  if (
                    comp.types.includes("locality") ||
                    comp.types.includes("administrative_area_level_2")
                  ) {
                    city = comp.long_name;
                  }
                  if (comp.types.includes("administrative_area_level_1")) {
                    state = comp.long_name;
                  }
                }
              }

              if (onSelectLocation) {
                onSelectLocation({
                  location: formattedAddress,
                  address: formattedAddress,
                  latitude: lat,
                  longitude: lng,
                  city,
                  state,
                  placeName: place.name || "",
                });
              }
            } else {
              setApiErrorMsg(`Failed to fetch location coordinates: ${status}`);
            }
          }
        );
      } catch (err) {
        setFetchingDetails(false);
        console.error("GetPlaceDetails error:", err);
        setApiErrorMsg("Error retrieving place coordinates.");
      }
    },
    [onSelectLocation]
  );

  function handleKeyDown(e) {
    if (!isOpen || predictions.length === 0) {
      if (e.key === "ArrowDown" && predictions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < predictions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : predictions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < predictions.length) {
        handleSelectPrediction(predictions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  const hasValidCoordinates =
    typeof latitude === "number" &&
    !isNaN(latitude) &&
    typeof longitude === "number" &&
    !isNaN(longitude);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-semibold text-slate-700 mb-1">
        Hospital Location (Google Places) *
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          {fetchingDetails ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          ) : (
            <MapPin className="h-4 w-4 text-slate-400" />
          )}
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) setIsOpen(true);
          }}
          placeholder="Start typing location (e.g. Pune Railway Station, Ruby Hall Clinic)"
          className={`w-full rounded-md border py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-200"
              : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
          }`}
          disabled={!isLoaded}
        />
        {hasValidCoordinates && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" title="Valid location & coordinates selected" />
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {loadError && (
        <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 inline" /> Google Maps API error. Verify VITE_GOOGLE_MAPS_API_KEY.
        </p>
      )}

      {apiErrorMsg && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 inline" /> {apiErrorMsg}
        </p>
      )}

      {/* Autocomplete Predictions Dropdown */}
      {isOpen && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 text-sm">
          {predictions.length > 0 ? (
            predictions.map((pred, index) => {
              const isSelected = index === selectedIndex;
              const mainText =
                pred.structured_formatting?.main_text || pred.description;
              const secondaryText =
                pred.structured_formatting?.secondary_text || "";

              return (
                <li
                  key={pred.place_id}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur before click registers
                    handleSelectPrediction(pred);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex cursor-pointer items-start gap-2.5 px-3 py-2 text-slate-800 transition-colors ${
                    isSelected ? "bg-blue-50 text-blue-900 font-medium" : "hover:bg-slate-50"
                  }`}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {mainText}
                    </p>
                    {secondaryText && (
                      <p className="text-[11px] text-slate-500 truncate">
                        {secondaryText}
                      </p>
                    )}
                  </div>
                </li>
              );
            })
          ) : (
            <li className="px-3 py-2 text-xs text-slate-500 text-center">
              No location suggestions found
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
