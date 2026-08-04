import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService } from "./firestoreCollection.js";
import { hasFirebaseConfig } from "../../firebase/client.js";

const loginHistory = createCollectionService(COLLECTIONS.loginHistory);
const LOCAL_SESSIONS_KEY = "ambugrid_active_sessions_v1";

function getLocalSessions() {
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalSessions(sessions) {
  try {
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Failed to save local sessions:", e);
  }
}

/** Log a new authentication event with real client metadata and generate session token */
export async function logAdminLogin({ uid, email, browser, os, device, ip, location }) {
  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const record = {
    sessionId,
    uid: uid || "demo-admin",
    email: email || "admin@ambugrid.com",
    browser: browser || "Browser",
    os: os || "Operating System",
    device: device || "PC / Workstation",
    ip: ip && ip !== "Unavailable" ? ip : "Dynamic IP",
    location: location || "Location unavailable",
    status: "active",
    timestamp: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };

  if (!hasFirebaseConfig()) {
    const sessions = getLocalSessions().filter((s) => s.uid === record.uid);
    // Mark previous current sessions as inactive if desired, or keep as log
    const updated = [record, ...sessions.slice(0, 19)];
    saveLocalSessions(updated);
    return { id: sessionId, ...record };
  }

  const doc = await loginHistory.add(record);
  return { id: doc.id || sessionId, ...record };
}

export async function listenToLoginHistory(callback, options) {
  if (!hasFirebaseConfig()) {
    const local = getLocalSessions();
    callback(local);
    return () => {};
  }
  return loginHistory.listen(callback, options);
}

export async function getLoginHistoryByUid(uid) {
  if (!hasFirebaseConfig()) {
    const local = getLocalSessions();
    return local.filter((s) => s.uid === uid);
  }
  return loginHistory.query([{ field: "uid", op: "==", value: uid }]);
}

/** Revoke a single active session */
export async function revokeSession(sessionId) {
  if (!hasFirebaseConfig()) {
    const local = getLocalSessions().map((s) =>
      s.sessionId === sessionId || s.id === sessionId ? { ...s, status: "revoked" } : s
    );
    saveLocalSessions(local);
    return true;
  }

  const records = await loginHistory.query([{ field: "sessionId", op: "==", value: sessionId }]);
  if (records && records.length > 0) {
    await loginHistory.update(records[0].id, { status: "revoked", revokedAt: new Date().toISOString() });
  }
  return true;
}

/** Revoke all active sessions for a user EXCEPT the current session */
export async function revokeOtherSessions(uid, currentSessionId) {
  if (!hasFirebaseConfig()) {
    const local = getLocalSessions().map((s) => {
      if (s.uid === uid && s.sessionId !== currentSessionId && s.id !== currentSessionId) {
        return { ...s, status: "revoked" };
      }
      return s;
    });
    saveLocalSessions(local);
    return true;
  }

  const records = await loginHistory.query([{ field: "uid", op: "==", value: uid }]);
  for (const record of records) {
    if (record.sessionId !== currentSessionId && record.id !== currentSessionId && record.status === "active") {
      await loginHistory.update(record.id, { status: "revoked", revokedAt: new Date().toISOString() });
    }
  }
  return true;
}

/** Revoke ALL active sessions for a user */
export async function revokeAllSessions(uid) {
  if (!hasFirebaseConfig()) {
    const local = getLocalSessions().map((s) => (s.uid === uid ? { ...s, status: "revoked" } : s));
    saveLocalSessions(local);
    return true;
  }

  const records = await loginHistory.query([{ field: "uid", op: "==", value: uid }]);
  for (const record of records) {
    if (record.status === "active") {
      await loginHistory.update(record.id, { status: "revoked", revokedAt: new Date().toISOString() });
    }
  }
  return true;
}
