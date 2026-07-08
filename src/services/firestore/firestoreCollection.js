import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { getFirebaseApp, hasFirebaseConfig } from "../../firebase/client.js";

async function getDb() {
  const app = await getFirebaseApp();
  return getFirestore(app);
}

/**
 * Thin, reusable wrapper around a single Firestore collection.
 * Every feature service (hospitalsService, driversService, ...) is built on
 * top of this so realtime listening + CRUD stays consistent everywhere.
 */
export function createCollectionService(collectionName) {
  return {
    collectionName,

    /**
     * Subscribe to realtime updates for this collection.
     * `constraints` accepts Firestore query constraints, e.g.
     *   [where("hospitalId", "==", "HSP01"), orderBy("createdAt", "desc")]
     * Returns an unsubscribe function.
     */
    async listen(callback, { constraints = [], onError } = {}) {
      try {
        const db = await getDb();
        const q = query(collection(db, collectionName), ...constraints);
        return onSnapshot(
          q,
          (snapshot) => {
            callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
          },
          (error) => {
            console.error(`[${collectionName}] listener error:`, error);
            onError?.(error);
          },
        );
      } catch (error) {
        console.error(`[${collectionName}] failed to start listener:`, error);
        onError?.(error);
        return () => {};
      }
    },

    async getById(id) {
      const db = await getDb();
      const snap = await getDoc(doc(db, collectionName, id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },

    async getAll(constraints = []) {
      const db = await getDb();
      const q = query(collection(db, collectionName), ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    },

    /** Add a doc with an auto-generated id. Returns the new id. */
    async add(data) {
      const db = await getDb();
      const ref = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: data.createdAt ?? serverTimestamp(),
      });
      return ref.id;
    },

    /** Create/overwrite a doc at a specific id (e.g. hospitalId, uid, ambulanceId). */
    async setById(id, data, options = { merge: true }) {
      const db = await getDb();
      await setDoc(doc(db, collectionName, id), data, options);
      return id;
    },

    async update(id, patch) {
      const db = await getDb();
      await updateDoc(doc(db, collectionName, id), {
        ...patch,
        updatedAt: serverTimestamp(),
      });
    },

    async remove(id) {
      const db = await getDb();
      await deleteDoc(doc(db, collectionName, id));
    },
  };
}

export { where, orderBy, serverTimestamp, hasFirebaseConfig };
