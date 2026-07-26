import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ChevronDown, LogOut, Menu, MapPin, Radio, Search, Siren } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePoliceStore } from "@/store/policeStore";
import { formatRelativeTime } from "@/utils/format";

export function Topbar() {
  const setMobileSidebarOpen = usePoliceStore((state) => state.setMobileSidebarOpen);
  const searchQuery = usePoliceStore((state) => state.searchQuery);
  const setSearchQuery = usePoliceStore((state) => state.setSearchQuery);
  const priorityAlerts = usePoliceStore((state) => state.priorityAlerts);
  const stationaryAlerts = usePoliceStore((state) => state.stationaryAlerts);
  const logout = usePoliceStore((state) => state.logout);
  const currentOperator = usePoliceStore((state) => state.currentOperator);
  const liveDataConnected = usePoliceStore((state) => state.liveDataConnected);
  const systemStatus = usePoliceStore((state) => state.systemStatus);
  const cityWide = usePoliceStore((state) => state.cityWide);
  const toggleCityWide = usePoliceStore((state) => state.toggleCityWide);
  const getNotifications = usePoliceStore((state) => state.getNotifications);
  const markNotificationRead = usePoliceStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = usePoliceStore((state) => state.markAllNotificationsRead);
  // Re-render the panel whenever the underlying feed/read-state changes.
  usePoliceStore((state) => state.activityFeed);
  usePoliceStore((state) => state.readNotificationIds);

  const unreadAlertCount = priorityAlerts.filter((alert) => !alert.read).length + stationaryAlerts.length;
  const notifications = getNotifications();
  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const navigate = useNavigate();
  const initials = (currentOperator?.displayName || "Police Operator")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white/95 px-4 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative min-w-0 flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search emergency ID, ambulance, driver, hospital..."
        />
      </div>

      <div className="hidden items-center gap-2 rounded-md border bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 md:flex">
        <Radio className="h-4 w-4" />
        {liveDataConnected ? "Live connected" : systemStatus.firestoreConnection}
      </div>

      <button
        onClick={toggleCityWide}
        className="hidden items-center gap-2 rounded-md border bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 md:flex"
        title={currentOperator?.station?.name ? `Station: ${currentOperator.station.name}` : "No station assigned"}
      >
        <MapPin className="h-4 w-4" />
        {cityWide ? "Entire city" : currentOperator?.station?.name || "My area"}
      </button>

      <button
        onClick={() => navigate("/alerts")}
        className="relative flex h-9 items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <Siren className="h-4 w-4 text-status-critical" />
        <span className="hidden sm:inline">{unreadAlertCount} alerts</span>
        {unreadAlertCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-critical px-1 text-[10px] font-semibold text-white">
            {unreadAlertCount}
          </span>
        )}
      </button>

      <div className="relative" ref={notificationsRef}>
        <Button
          variant="outline"
          size="icon"
          aria-label="Notifications"
          className="relative"
          onClick={() => setNotificationsOpen((open) => !open)}
        >
          <Bell className="h-4 w-4" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-critical px-1 text-[10px] font-semibold text-white">
              {unreadNotificationCount}
            </span>
          )}
        </Button>

        {notificationsOpen && (
          <div className="absolute right-0 z-40 mt-2 w-80 rounded-md border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-2">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              {unreadNotificationCount > 0 && (
                <button
                  onClick={markAllNotificationsRead}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {notifications.length ? (
                notifications.slice(0, 20).map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => {
                      markNotificationRead(notification.id);
                      setNotificationsOpen(false);
                      if (notification.tripId) navigate(`/emergencies?focus=${notification.tripId}`);
                    }}
                    className={`flex w-full flex-col gap-0.5 border-b px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-slate-50 ${
                      notification.read ? "opacity-60" : "bg-blue-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900">{notification.title}</p>
                      {!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    </div>
                    {notification.detail && <p className="text-xs text-slate-500">{notification.detail}</p>}
                    <p className="text-[11px] text-slate-400">{formatRelativeTime(notification.timestamp)}</p>
                  </button>
                ))
              ) : (
                <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative hidden md:block" ref={profileRef}>
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="flex h-10 items-center gap-3 rounded-md border bg-white px-2 pr-3 transition-colors hover:bg-slate-50"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold text-slate-900">{currentOperator?.displayName || "Police Operator"}</p>
            <p className="text-[11px] text-slate-500">{currentOperator?.role || "Police control"}</p>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        {profileOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
            <button
              onClick={() => {
                setProfileOpen(false);
                logout().finally(() => navigate("/login"));
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
