import { useContext, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AuthContext } from '../context/AuthContext';
import { formatEmergencyDisplayId } from '../utils/formatters';

export function useGlobalSearch() {
  const { user } = useContext(AuthContext);
  const hospitalId = user?.hospitalId;

  const [drivers, setDrivers] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [term, setTerm] = useState('');

  useEffect(() => {
    if (!hospitalId) return undefined;

    const unsubDrivers = onSnapshot(
      query(collection(db, 'drivers'), where('hospitalId', '==', hospitalId)),
      (snap) => setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubAmbulances = onSnapshot(
      query(collection(db, 'ambulances'), where('hospitalId', '==', hospitalId)),
      (snap) => setAmbulances(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    const unsubEmergencies = onSnapshot(
      query(collection(db, 'emergencies'), where('hospitalId', '==', hospitalId)),
      (snap) => setEmergencies(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => {
      unsubDrivers();
      unsubAmbulances();
      unsubEmergencies();
    };
  }, [hospitalId]);

  const emergencyIdMap = useMemo(() => {
    const sortedAsc = [...emergencies].sort(
      (a, b) => new Date(a.startTime?.toDate?.() || a.startTime) - new Date(b.startTime?.toDate?.() || b.startTime)
    );
    const map = new Map();
    sortedAsc.forEach((item, index) => map.set(item.id, formatEmergencyDisplayId(index)));
    return map;
  }, [emergencies]);

  const results = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return { drivers: [], ambulances: [], emergencies: [] };

    return {
      drivers: drivers
        .filter((d) => (d.Name || d.fullName || '').toLowerCase().includes(q) || (d.phone || d['Phone Number'] || '').includes(q))
        .slice(0, 5),
      ambulances: ambulances
        .filter((a) => (a.numberPlate || '').toLowerCase().includes(q) || (a.registrationNumber || '').toLowerCase().includes(q))
        .slice(0, 5),
      emergencies: emergencies
        .filter((e) => {
          const displayId = (emergencyIdMap.get(e.id) || '').toLowerCase();
          return (
            displayId.includes(q) ||
            e.id.toLowerCase().includes(q) ||
            (e.patientName || '').toLowerCase().includes(q) ||
            (e.incidentType || '').toLowerCase().includes(q)
          );
        })
        .slice(0, 5)
        .map((e) => ({ ...e, displayId: emergencyIdMap.get(e.id) || e.id })),
    };
  }, [term, drivers, ambulances, emergencies, emergencyIdMap]);

  const hasResults = results.drivers.length + results.ambulances.length + results.emergencies.length > 0;

  return { term, setTerm, results, hasResults };
}