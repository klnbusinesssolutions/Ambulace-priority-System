import { useEffect, useRef, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useNotifications({ hospitalId } = {}) {
  const [notifications, setNotifications] = useState([]);
  const knownIdsRef = useRef(new Set());
  const isFirstSnapshotRef = useRef(true);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3');
    audioRef.current.volume = 0.6;
  }, []);

  useEffect(() => {
    if (!hospitalId) return undefined;

    knownIdsRef.current = new Set();
    isFirstSnapshotRef.current = true;

    const q = query(
      collection(db, 'notifications'),
      where('hospitalId', '==', hospitalId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const mapped = snap.docs.map((item) => {
        const data = item.data();
        return {
          id: item.id,
          ...data,
          title: data.title || data.type?.replaceAll('_', ' ') || 'Notification',
          message: data.message || '',
          timestamp: data.createdAt,
          resolvedAt: data.resolvedAt || null,
          read: data.read || false,
        };
      });

      if (!isFirstSnapshotRef.current) {
        const newOnes = mapped.filter((n) => !knownIdsRef.current.has(n.id));
        if (newOnes.length > 0 && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }

      knownIdsRef.current = new Set(mapped.map((n) => n.id));
      isFirstSnapshotRef.current = false;
      setNotifications(mapped);
    });

    return unsub;
  }, [hospitalId]);

  async function markRead(notificationId) {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  }

  return { notifications, markRead };
}