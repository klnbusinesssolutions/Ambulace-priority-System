import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

const OverlayContext = createContext(null);

export function OverlayProvider({ children }) {
  const [activeOverlay, setActiveOverlay] = useState(null);
  const timeoutRef = useRef(null);

  // Clear pending transition timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  /**
   * Close any currently active overlay.
   */
  const closeOverlay = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveOverlay(null);
  }, []);

  /**
   * Open a specific overlay type, gracefully closing any existing overlay.
   * Overlay types: 'GLOBAL_SEARCH' | 'NOTIFICATIONS' | 'COMMAND_PALETTE' | 'DRAWER' | 'MODAL'
   */
  const openOverlay = useCallback((type, payload = null) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveOverlay({ type, payload });
  }, []);

  /**
   * Helper: Close active overlay immediately -> wait delayMs -> open target drawer.
   */
  const closeAndOpenDrawer = useCallback((drawerPayload, delayMs = 150) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveOverlay(null);

    timeoutRef.current = setTimeout(() => {
      setActiveOverlay({ type: "DRAWER", payload: drawerPayload });
    }, delayMs);
  }, []);

  /**
   * Helper: Close active overlay immediately -> wait delayMs -> navigate to route.
   */
  const closeAndNavigate = useCallback((navigateFn, to, delayMs = 150) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveOverlay(null);

    timeoutRef.current = setTimeout(() => {
      if (typeof navigateFn === "function" && to) {
        navigateFn(to);
      }
    }, delayMs);
  }, []);

  /**
   * Direct drawer opener (no delay).
   */
  const openDrawer = useCallback((drawerPayload) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveOverlay({ type: "DRAWER", payload: drawerPayload });
  }, []);

  /**
   * Check if a given overlay type is active.
   */
  const isOverlayOpen = useCallback(
    (type) => activeOverlay?.type === type,
    [activeOverlay]
  );

  const value = {
    activeOverlay,
    openOverlay,
    closeOverlay,
    openDrawer,
    openDrawerWithDelay: closeAndOpenDrawer,
    closeAndOpenDrawer,
    closeAndNavigate,
    isOverlayOpen,
  };

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlay() {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error("useOverlay must be used within an OverlayProvider");
  }
  return context;
}
