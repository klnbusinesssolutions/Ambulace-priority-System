import { useContext, useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AuthContext } from '../context/AuthContext';

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad) {
  return (rad * 180) / Math.PI;
}

function computeBearing(lat1, lng1, lat2, lng2) {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  const brng = toDeg(Math.atan2(y, x));
  return (brng + 360) % 360;
}

// Rough distance in meters (Haversine) — used to ignore GPS jitter when stationary
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function mapDriverLocationDoc(docSnap) {
  const data = docSnap.data();
  return {
    driverId: docSnap.id,
    name: data.Name || 'Unknown Driver',
    phone: data['Phone Number'] || null,
    availability: data.Availability || null,
    tripStatus: data.tripStatus || null,
    lat: data.location?.latitude ?? null,
    lng: data.location?.longitude ?? null,
    updatedAt: data.location?.updatedAt ?? null,
  };
}

export function useDriverLocations() {
  const { user } = useContext(AuthContext);
  const hospitalId = user?.hospitalId;
  const [driverLocations, setDriverLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const prevPositionsRef = useRef({}); // { [driverId]: { lat, lng, heading } }

  useEffect(() => {
    if (!hospitalId) {
      setDriverLocations([]);
      setLoading(false);
      return undefined;
    }

    const q = query(
      collection(db, 'drivers'),
      where('hospitalId', '==', hospitalId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const drivers = snap.docs
          .map(mapDriverLocationDoc)
          .filter((d) => d.lat !== null && d.lng !== null)
          .map((d) => {
            const prev = prevPositionsRef.current[d.driverId];
            let heading = prev?.heading ?? 0;

            if (prev) {
              const moved = distanceMeters(prev.lat, prev.lng, d.lat, d.lng);
              // Only update heading if it moved enough to be real movement, not GPS jitter
              if (moved > 3) {
                heading = computeBearing(prev.lat, prev.lng, d.lat, d.lng);
              }
            }

            prevPositionsRef.current[d.driverId] = { lat: d.lat, lng: d.lng, heading };

            return { ...d, heading };
          });

        setDriverLocations(drivers);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [hospitalId]);

  return { driverLocations, loading, error };
}