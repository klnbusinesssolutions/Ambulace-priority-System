import { COLLECTIONS } from "../../firebase/collections.js";
import { createCollectionService } from "./firestoreCollection.js";

const loginHistory = createCollectionService(COLLECTIONS.loginHistory);

export async function logAdminLogin({ uid, email, browser, os, ip, location }) {
  return loginHistory.add({
    uid: uid || "demo-admin",
    email: email || "admin@ambugrid.com",
    browser: browser || "Chrome",
    os: os || "Windows",
    ip: ip || "192.168.1.100",
    location: location || "Local Network / HQ",
    timestamp: new Date().toISOString(),
  });
}

export async function listenToLoginHistory(callback, options) {
  return loginHistory.listen(callback, options);
}

export async function getLoginHistoryByUid(uid) {
  return loginHistory.query([{ field: "uid", op: "==", value: uid }]);
}
