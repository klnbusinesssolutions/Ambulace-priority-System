import { useEffect, useState, useCallback, useMemo } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  DirectionsService,
  DirectionsRenderer,
  TrafficLayer,
  useJsApiLoader,
} from "@react-google-maps/api";
import { GOOGLE_MAPS_LIBRARIES } from '../lib/googleMapsLoader';

const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "400px",
  borderRadius: "12px",
};

const defaultCenter = { lat: 18.5204, lng: 73.8567 };

export default function LiveMap({
  driverLocations = [],
  emergencies = [],
  selectedEmergencyId = null,
  onRouteInfo,
  showTraffic = true,
}) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [map, setMap] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);
  const [directions, setDirections] = useState(null);
  const [directionsRequested, setDirectionsRequested] = useState(false);

  const onLoad = useCallback((mapInstance) => setMap(mapInstance), []);
  const onUnmount = useCallback(() => setMap(null), []);

  const isValidCoord = (lat, lng) =>
    typeof lat === "number" &&
    typeof lng === "number" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat !== 0 &&
    lng !== 0;

  const selectedEmergency = useMemo(
    () => emergencies.find((e) => e.id === selectedEmergencyId),
    [emergencies, selectedEmergencyId]
  );

const routePoints = useMemo(() => {
  if (!selectedEmergency) return null;
  const driverLoc = driverLocations.find(
    (d) => d.driverId === selectedEmergency.driverId
  );

  if (
    driverLoc?.tripStatus === 'trip_completed' ||
    selectedEmergency?.status === 'completed' ||
    selectedEmergency?.status === 'resolved'
  ) {
    return null;
  }

  const lat = selectedEmergency.location?.latitude;
  const lng = selectedEmergency.location?.longitude;
  if (!driverLoc || !isValidCoord(lat, lng) || !isValidCoord(driverLoc.lat, driverLoc.lng)) {
    return null;
  }
  return {
    origin: { lat: driverLoc.lat, lng: driverLoc.lng },
    destination: { lat, lng },
  };
}, [selectedEmergency, driverLocations]);

  useEffect(() => {
    if (!map || !window.google) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    if (routePoints) {
      bounds.extend(routePoints.origin);
      bounds.extend(routePoints.destination);
      hasPoints = true;
    } else {
      driverLocations.forEach((d) => {
        if (isValidCoord(d.lat, d.lng)) {
          bounds.extend({ lat: d.lat, lng: d.lng });
          hasPoints = true;
        }
      });

      emergencies.forEach((e) => {
        const lat = e.location?.latitude;
        const lng = e.location?.longitude;
        if (isValidCoord(lat, lng)) {
          bounds.extend({ lat, lng });
          hasPoints = true;
        }
      });
    }

    if (hasPoints) {
      map.fitBounds(bounds, 80);
      const maxZoom = routePoints ? 14 : 15;
      const listener = window.google.maps.event.addListenerOnce(
        map,
        "bounds_changed",
        () => {
          if (map.getZoom() > maxZoom) map.setZoom(maxZoom);
        }
      );
      return () => window.google.maps.event.removeListener(listener);
    }
  }, [map, driverLocations, emergencies, routePoints]);

  useEffect(() => {
    setDirections(null);
    setDirectionsRequested(false);
  }, [selectedEmergencyId]);

  const handleDirectionsCallback = useCallback(
    (result, status) => {
      setDirectionsRequested(true);
      if (status === "OK" && result) {
        setDirections(result);
        const leg = result.routes?.[0]?.legs?.[0];
        if (leg && onRouteInfo) {
          onRouteInfo({
            distanceText: leg.distance?.text,
            durationText: leg.duration_in_traffic?.text || leg.duration?.text,
            durationInTrafficText: leg.duration_in_traffic?.text,
          });
        }
      } else {
        setDirections(null);
        if (onRouteInfo) onRouteInfo(null);
      }
    },
    [onRouteInfo]
  );

  const activeDriverInfo = useMemo(() => {
    if (!activeMarker || !activeMarker.startsWith("driver-")) return null;
    const driverId = activeMarker.replace("driver-", "");
    return driverLocations.find((d) => d.driverId === driverId) || null;
  }, [activeMarker, driverLocations]);

  if (!isLoaded) return <div>Map load ho raha hai...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={12}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: "greedy",
      }}
    >
      {showTraffic && <TrafficLayer />}

     {driverLocations
  .filter((d) => isValidCoord(d.lat, d.lng))
  .map((driver) => {
    const onTrip = Boolean(driver.tripStatus) && driver.tripStatus !== 'trip_completed';

    const icon = onTrip
      ? {
          path: "M 0,-10 L 7,8 L 0,4 L -7,8 Z",
          fillColor: "#1890ff",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 1.5,
          scale: 1.6,
          rotation: driver.heading || 0,
          anchor: window.google ? new window.google.maps.Point(0, 0) : undefined,
        }
      : {
          url: "https://img.icons8.com/color/48/ambulance.png",
          scaledSize: window.google ? new window.google.maps.Size(36, 36) : undefined,
          anchor: window.google ? new window.google.maps.Point(18, 18) : undefined,
        };

    return (
      <Marker
        key={driver.driverId}
        position={{ lat: driver.lat, lng: driver.lng }}
        icon={icon}
        onClick={() => setActiveMarker(`driver-${driver.driverId}`)}
        title={`Driver: ${driver.name}`}
      />
    );
  })}

      {emergencies
        .filter((e) => isValidCoord(e.location?.latitude, e.location?.longitude))
        .map((e) => (
          <Marker
            key={e.id}
            position={{ lat: e.location.latitude, lng: e.location.longitude }}
            icon={{ url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png" }}
            title={`Emergency: ${e.patientName || e.id}`}
          />
        ))}

      {activeDriverInfo && (
        <InfoWindow
          position={{ lat: activeDriverInfo.lat, lng: activeDriverInfo.lng }}
          onCloseClick={() => setActiveMarker(null)}
        >
          <div>
            <strong>{activeDriverInfo.name}</strong>
            <br />
            Status: {activeDriverInfo.tripStatus || "N/A"}
            <br />
            Availability: {activeDriverInfo.availability || "N/A"}
          </div>
        </InfoWindow>
      )}

      {routePoints && !directionsRequested && (
        <DirectionsService
          options={{
            origin: routePoints.origin,
            destination: routePoints.destination,
            travelMode: "DRIVING",
            drivingOptions: {
              departureTime: new Date(),
              trafficModel: "bestguess",
            },
          }}
          callback={handleDirectionsCallback}
        />
      )}

      {directions && (
        <DirectionsRenderer
          options={{
            directions,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#1890ff",
              strokeOpacity: 0.85,
              strokeWeight: 5,
            },
          }}
        />
      )}
    </GoogleMap>
  );
}