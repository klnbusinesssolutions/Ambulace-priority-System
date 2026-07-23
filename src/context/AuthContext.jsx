import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { hasFirebaseConfig } from "../firebase/client.js";
import { onAdminAuthChange, signInAdmin, signOutAdmin } from "../services/auth/adminAuthService.js";

const AuthContext = createContext(null);
const demoStorageKey = "ambugrid-demo-authenticated";

const demoAdmin = {
  uid: "demo-admin",
  email: "admin@ambugrid.com",
  displayName: "Demo Super Admin",
  role: "super_admin",
  hospitalId: null,
  hospitalName: null,
  isActive: true,
};

export function AuthProvider({ children }) {
  const firebaseReady = hasFirebaseConfig();
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(firebaseReady);

  useEffect(() => {
    if (!firebaseReady) {
      // No Firebase project configured yet — fall back to a local demo
      // session so the dashboard can still be previewed end to end.
      if (window.sessionStorage.getItem(demoStorageKey) === "true") {
        setAdmin(demoAdmin);
      }
      setIsLoading(false);
      return undefined;
    }

    let unsubscribe;
    (async () => {
      unsubscribe = await onAdminAuthChange((nextAdmin) => {
        setAdmin(nextAdmin);
        setIsLoading(false);
      });
    })();

    return () => unsubscribe?.();
  }, [firebaseReady]);

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(admin),
      isLoading,
      admin,

      async login(email, password) {
        if (!firebaseReady) {
          window.sessionStorage.setItem(demoStorageKey, "true");
          setAdmin(demoAdmin);
          return demoAdmin;
        }
        const signedInAdmin = await signInAdmin(email, password);
        setAdmin(signedInAdmin);
        return signedInAdmin;
      },

      async logout() {
        if (!firebaseReady) {
          window.sessionStorage.removeItem(demoStorageKey);
          setAdmin(null);
          return;
        }
        await signOutAdmin();
        setAdmin(null);
      },
    }),
    [admin, isLoading, firebaseReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
