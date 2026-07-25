import { useContext, useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AuthContext } from '../context/AuthContext';

export function useHospitalAmbulances() {
  const { user } = useContext(AuthContext);
  const hospitalId = user?.hospitalId;
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalId) {
      setAmbulances([]);
      setLoading(false);
      return undefined;
    }

    const q = query(collection(db, 'ambulances'), where('hospitalId', '==', hospitalId));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setAmbulances(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Ambulances listener error:', err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [hospitalId]);

  return { ambulances, loading };
}