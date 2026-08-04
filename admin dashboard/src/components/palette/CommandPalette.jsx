import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  LayoutDashboard,
  Building2,
  UsersRound,
  Ambulance,
  Radar,
  Activity,
  BarChart3,
  ClipboardList,
  Bell,
  Download,
  Settings,
  Plus,
  CheckSquare,
  ChevronRight,
  Clock,
  User,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { useOps } from "../../context/OpsContext.jsx";
import { useOverlay } from "../../context/OverlayContext.jsx";
import { matchesSearch } from "../../utils/formatters.js";
import { getEmergencyDisplayId } from "../../utils/entityDisplay.js";

const navigationCommands = [
  { id: "nav-dashboard", label: "Go to Dashboard", category: "Navigation", icon: LayoutDashboard, route: "/admin/dashboard" },
  { id: "nav-hospitals", label: "Go to Hospitals", category: "Navigation", icon: Building2, route: "/admin/hospitals" },
  { id: "nav-drivers", label: "Go to Drivers", category: "Navigation", icon: UsersRound, route: "/admin/drivers" },
  { id: "nav-ambulances", label: "Go to Ambulances", category: "Navigation", icon: Ambulance, route: "/admin/ambulances" },
  { id: "nav-emergencies", label: "Go to Emergencies", category: "Navigation", icon: Activity, route: "/admin/emergencies" },
  { id: "nav-live-tracking", label: "Go to Live Tracking", category: "Navigation", icon: Radar, route: "/admin/live-tracking" },
  { id: "nav-analytics", label: "Go to Analytics", category: "Navigation", icon: BarChart3, route: "/admin/analytics" },
  { id: "nav-activity", label: "Go to Activity Logs", category: "Navigation", icon: ClipboardList, route: "/admin/activity-logs" },
  { id: "nav-notifications", label: "Go to Notifications", category: "Navigation", icon: Bell, route: "/admin/notifications" },
  { id: "nav-export", label: "Go to Export Center", category: "Navigation", icon: Download, route: "/admin/export-center" },
  { id: "nav-settings", label: "Go to Settings", category: "Navigation", icon: Settings, route: "/admin/settings" },
];

const quickActions = [
  { id: "act-create-hospital", label: "Create Hospital", category: "Quick Actions", icon: Plus, route: "/admin/hospitals" },
  { id: "act-create-driver", label: "Create Driver", category: "Quick Actions", icon: Plus, route: "/admin/verification/pending-drivers" },
  { id: "act-create-ambulance", label: "Create Ambulance", category: "Quick Actions", icon: Plus, route: "/admin/ambulances" },
  { id: "act-verification", label: "Open Verification Center", category: "Quick Actions", icon: CheckSquare, route: "/admin/verification/pending-drivers" },
  { id: "act-notifications", label: "Open Notification Center", category: "Quick Actions", icon: Bell, route: "/admin/notifications" },
  { id: "act-export", label: "Open Export Center", category: "Quick Actions", icon: Download, route: "/admin/export-center" },
  { id: "act-tracking", label: "Open Live Tracking", category: "Quick Actions", icon: Radar, route: "/admin/live-tracking" },
];

export default function CommandPalette() {
  const navigate = useNavigate();
  const {
    hospitals = [],
    drivers = [],
    pendingDrivers = [],
    ambulances = [],
    pendingAmbulances = [],
    emergencies = [],
    pendingPoliceOfficers = [],
  } = useOps();
  const { openOverlay, closeOverlay, openDrawerWithDelay, isOverlayOpen } = useOverlay();

  const open = isOverlayOpen("COMMAND_PALETTE");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);

  // Recent commands from localStorage
  const [recents, setRecents] = useState(() => {
    try {
      const saved = localStorage.getItem("ambugrid_recent_commands");
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      return [];
    }
  });

  const saveRecent = (item) => {
    const next = [item, ...recents.filter((r) => r.id !== item.id)].slice(0, 8);
    setRecents(next);
    try {
      localStorage.setItem("ambugrid_recent_commands", JSON.stringify(next));
    } catch (err) {
      console.error(err);
    }
  };

  // Global Keyboard Shortcut: Ctrl + K / Cmd + K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) closeOverlay();
        else openOverlay("COMMAND_PALETTE");
      } else if (e.key === "Escape" && open) {
        closeOverlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, openOverlay, closeOverlay]);

  // Listen for custom trigger event
  useEffect(() => {
    const handleOpenTrigger = () => openOverlay("COMMAND_PALETTE");
    window.addEventListener("open-command-palette", handleOpenTrigger);
    return () => window.removeEventListener("open-command-palette", handleOpenTrigger);
  }, [openOverlay]);

  // Auto focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Combine entity arrays
  const allDrivers = useMemo(() => {
    const map = new Map();
    [...(drivers || []), ...(pendingDrivers || [])].forEach((d) => map.set(d.id || d.driverId, d));
    return Array.from(map.values());
  }, [drivers, pendingDrivers]);

  const allAmbulances = useMemo(() => {
    const map = new Map();
    [...(ambulances || []), ...(pendingAmbulances || [])].forEach((a) => map.set(a.id || a.ambulanceId, a));
    return Array.from(map.values());
  }, [ambulances, pendingAmbulances]);

  // Filtered Commands & Records calculation
  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) {
      return {
        recents,
        navigation: navigationCommands,
        quickActions,
        entities: [],
      };
    }

    const nav = navigationCommands.filter((cmd) => matchesSearch(cmd, q, ["label", "category"]));
    const actions = quickActions.filter((cmd) => matchesSearch(cmd, q, ["label", "category"]));

    const matchedHospitals = hospitals.filter((h) => matchesSearch(h, q, ["name", "hospitalName", "city", "state", "hospitalId"])).slice(0, 3);
    const matchedDrivers = allDrivers.filter((d) => matchesSearch(d, q, ["name", "fullName", "driverName", "phone", "email", "licenseNumber"])).slice(0, 3);
    const matchedAmbulances = allAmbulances.filter((a) => matchesSearch(a, q, ["numberPlate", "registrationNumber", "hospitalId", "vehicleType"])).slice(0, 3);
    const matchedEmergencies = emergencies.filter((e) => matchesSearch(e, q, ["id", "patientName", "incidentType", "hospitalId", "priority"])).slice(0, 3);
    const matchedPolice = (pendingPoliceOfficers || []).filter((p) => matchesSearch(p, q, ["name", "badgeId", "department"])).slice(0, 3);

    const entities = [
      ...matchedHospitals.map((h) => ({ id: `hosp-${h.id || h.hospitalId}`, label: h.name || h.hospitalName, detail: `${h.city || "—"} · Hospital`, category: "Search Results", icon: Building2, entityType: "hospital", item: h })),
      ...matchedDrivers.map((d) => ({ id: `drv-${d.id}`, label: d.name || d.fullName || d.driverName, detail: `Driver · ${d.phone || "—"}`, category: "Search Results", icon: User, entityType: "driver", item: d })),
      ...matchedAmbulances.map((a) => ({ id: `amb-${a.id}`, label: a.numberPlate || a.registrationNumber, detail: `Ambulance · ${a.vehicleType || "ICU"}`, category: "Search Results", icon: Ambulance, entityType: "ambulance", item: a })),
      ...matchedEmergencies.map((e) => ({ id: `emg-${e.id}`, label: `${getEmergencyDisplayId(e)} (${(e.priority || "Critical").toUpperCase()})`, detail: `${e.patientName || "Emergency"} · ${e.status}`, category: "Search Results", icon: AlertTriangle, entityType: "emergency", item: e })),
      ...matchedPolice.map((p) => ({ id: `pol-${p.id}`, label: p.name, detail: `Police Officer · Badge: ${p.badgeId}`, category: "Search Results", icon: ShieldCheck, entityType: "police", item: p })),
    ];

    return { recents: [], navigation: nav, quickActions: actions, entities };
  }, [query, recents, hospitals, allDrivers, allAmbulances, emergencies, pendingPoliceOfficers]);

  const flatItems = useMemo(() => {
    const list = [];
    if (searchResults.recents?.length > 0) list.push(...searchResults.recents);
    if (searchResults.navigation?.length > 0) list.push(...searchResults.navigation);
    if (searchResults.entities?.length > 0) list.push(...searchResults.entities);
    if (searchResults.quickActions?.length > 0) list.push(...searchResults.quickActions);
    return list;
  }, [searchResults]);

  const handleExecuteCommand = (cmd) => {
    if (!cmd) return;
    saveRecent({ id: cmd.id, label: cmd.label, detail: cmd.detail || cmd.category, iconName: cmd.category, route: cmd.route, entityType: cmd.entityType, item: cmd.item });

    if (cmd.entityType) {
      openDrawerWithDelay({ type: cmd.entityType, item: cmd.item, targetId: cmd.item?.id }, 200);
    } else if (cmd.route) {
      closeOverlay();
      navigate(cmd.route);
    }
  };

  const handleKeyDownInput = (e) => {
    if (flatItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        handleExecuteCommand(flatItems[selectedIndex]);
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <button
        type="button"
        aria-label="Close command palette backdrop"
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={closeOverlay}
      />

      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150">
        <div className="relative border-b border-slate-100 dark:border-slate-800 px-4 py-3.5 flex items-center">
          <Search className="h-5 w-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownInput}
            className="w-full bg-transparent text-base font-medium text-slate-900 placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500 focus:outline-none"
            placeholder="Type a command or search hospitals, drivers, emergencies... (Ctrl+K)"
          />
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
            ESC to close
          </span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-4">
          {flatItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              <Search className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600 mb-1" />
              <p className="font-semibold text-slate-700 dark:text-slate-200">No matching commands or records.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Try searching with a different term.</p>
            </div>
          ) : (
            <>
              {searchResults.recents?.length > 0 && (
                <CommandGroup title="Recent Items">
                  {searchResults.recents.map((cmd) => {
                    const idx = flatItems.findIndex((r) => r.id === cmd.id);
                    return (
                      <CommandRow
                        key={cmd.id}
                        isSelected={selectedIndex === idx}
                        icon={Clock}
                        label={cmd.label}
                        detail={cmd.detail}
                        onClick={() => handleExecuteCommand(cmd)}
                      />
                    );
                  })}
                </CommandGroup>
              )}

              {searchResults.navigation?.length > 0 && (
                <CommandGroup title="Navigation">
                  {searchResults.navigation.map((cmd) => {
                    const idx = flatItems.findIndex((r) => r.id === cmd.id);
                    return (
                      <CommandRow
                        key={cmd.id}
                        isSelected={selectedIndex === idx}
                        icon={cmd.icon}
                        label={cmd.label}
                        detail="Page Route"
                        onClick={() => handleExecuteCommand(cmd)}
                      />
                    );
                  })}
                </CommandGroup>
              )}

              {searchResults.entities?.length > 0 && (
                <CommandGroup title="Search Results">
                  {searchResults.entities.map((cmd) => {
                    const idx = flatItems.findIndex((r) => r.id === cmd.id);
                    return (
                      <CommandRow
                        key={cmd.id}
                        isSelected={selectedIndex === idx}
                        icon={cmd.icon}
                        label={cmd.label}
                        detail={cmd.detail}
                        onClick={() => handleExecuteCommand(cmd)}
                      />
                    );
                  })}
                </CommandGroup>
              )}

              {searchResults.quickActions?.length > 0 && (
                <CommandGroup title="Quick Actions">
                  {searchResults.quickActions.map((cmd) => {
                    const idx = flatItems.findIndex((r) => r.id === cmd.id);
                    return (
                      <CommandRow
                        key={cmd.id}
                        isSelected={selectedIndex === idx}
                        icon={cmd.icon}
                        label={cmd.label}
                        detail="Quick Action"
                        onClick={() => handleExecuteCommand(cmd)}
                      />
                    );
                  })}
                </CommandGroup>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span><kbd className="rounded bg-white dark:bg-slate-800 px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 font-mono font-semibold">↑</kbd> <kbd className="rounded bg-white dark:bg-slate-800 px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 font-mono font-semibold">↓</kbd> Navigate</span>
            <span><kbd className="rounded bg-white dark:bg-slate-800 px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 font-mono font-semibold">↵</kbd> Select</span>
          </div>
          <span>Press <kbd className="rounded bg-white dark:bg-slate-800 px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 font-mono font-semibold">Esc</kbd> to exit</span>
        </div>
      </div>
    </div>
  );
}

function CommandGroup({ title, children }) {
  return (
    <div>
      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {title}
      </div>
      <div className="space-y-0.5 mt-0.5">{children}</div>
    </div>
  );
}

function CommandRow({ isSelected, icon: Icon, label, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
        isSelected
          ? "bg-slate-900 text-white font-semibold shadow-xs dark:bg-emerald-600 dark:text-white"
          : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 text-[11px]">
        {detail && <span className={isSelected ? "text-slate-300" : "text-slate-400 dark:text-slate-500"}>{detail}</span>}
        <ChevronRight className={`h-3.5 w-3.5 ${isSelected ? "text-white" : "text-slate-400 dark:text-slate-500"}`} />
      </div>
    </button>
  );
}
