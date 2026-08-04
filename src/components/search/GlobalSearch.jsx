import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  Building2,
  User,
  Ambulance,
  AlertTriangle,
  ShieldCheck,
  X,
  ChevronRight,
} from "lucide-react";
import { useOps } from "../../context/OpsContext.jsx";
import { useOverlay } from "../../context/OverlayContext.jsx";
import { matchesSearch } from "../../utils/formatters.js";
import { getEmergencyDisplayId, getHospitalDisplayId } from "../../utils/entityDisplay.js";

function SearchHighlight({ text = "", query = "" }) {
  if (!query || !text) return <span>{text}</span>;
  const strText = String(text);
  const index = strText.toLowerCase().indexOf(query.toLowerCase());
  if (index === -1) return <span>{strText}</span>;

  const before = strText.slice(0, index);
  const match = strText.slice(index, index + query.length);
  const after = strText.slice(index + query.length);

  return (
    <span>
      {before}
      <mark className="bg-amber-200 text-amber-950 dark:bg-amber-950 dark:text-amber-200 font-semibold rounded-xs px-0.5">{match}</mark>
      {after}
    </span>
  );
}

export default function GlobalSearch() {
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
  const isOpen = isOverlayOpen("GLOBAL_SEARCH");

  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(rawQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (isOpen) closeOverlay();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        closeOverlay();
        inputRef.current?.blur();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeOverlay]);

  const { filterCategory, searchTerm } = useMemo(() => {
    let filterCategory = null;
    let searchTerm = debouncedQuery;

    if (debouncedQuery.includes(":")) {
      const parts = debouncedQuery.split(":");
      const prefix = parts[0].toLowerCase();
      const term = parts.slice(1).join(":").trim();

      if (["hospital", "hospitals"].includes(prefix)) filterCategory = "hospitals";
      else if (["driver", "drivers"].includes(prefix)) filterCategory = "drivers";
      else if (["ambulance", "ambulances"].includes(prefix)) filterCategory = "ambulances";
      else if (["emergency", "emergencies"].includes(prefix)) filterCategory = "emergencies";
      else if (["police"].includes(prefix)) filterCategory = "police";

      if (filterCategory) {
        searchTerm = term;
      }
    }

    return { filterCategory, searchTerm };
  }, [debouncedQuery]);

  const allDrivers = useMemo(() => {
    const map = new Map();
    [...(drivers || []), ...(pendingDrivers || [])].forEach((d) => {
      const id = d.id || d.driverId;
      if (id && !map.has(id)) map.set(id, d);
    });
    return Array.from(map.values());
  }, [drivers, pendingDrivers]);

  const allAmbulances = useMemo(() => {
    const map = new Map();
    [...(ambulances || []), ...(pendingAmbulances || [])].forEach((a) => {
      const id = a.id || a.ambulanceId;
      if (id && !map.has(id)) map.set(id, a);
    });
    return Array.from(map.values());
  }, [ambulances, pendingAmbulances]);

  const searchResults = useMemo(() => {
    if (!searchTerm) {
      return { hospitals: [], drivers: [], ambulances: [], emergencies: [], police: [] };
    }

    const res = { hospitals: [], drivers: [], ambulances: [], emergencies: [], police: [] };

    if (!filterCategory || filterCategory === "hospitals") {
      res.hospitals = (hospitals || [])
        .filter((h) =>
          matchesSearch(h, searchTerm, ["name", "hospitalName", "email", "phone", "city", "state", "hospitalId"]),
        )
        .slice(0, 4);
    }

    if (!filterCategory || filterCategory === "drivers") {
      res.drivers = allDrivers
        .filter((d) =>
          matchesSearch(d, searchTerm, [
            "name",
            "fullName",
            "driverName",
            "phone",
            "email",
            "licenseNumber",
            "hospitalName",
            "hospitalId",
          ]),
        )
        .slice(0, 4);
    }

    if (!filterCategory || filterCategory === "ambulances") {
      res.ambulances = allAmbulances
        .filter((a) =>
          matchesSearch(a, searchTerm, [
            "numberPlate",
            "registrationNumber",
            "hospitalId",
            "vehicleType",
            "activeDriverId",
          ]),
        )
        .slice(0, 4);
    }

    if (!filterCategory || filterCategory === "emergencies") {
      res.emergencies = (emergencies || [])
        .filter((e) =>
          matchesSearch(e, searchTerm, [
            "id",
            "patientName",
            "incidentType",
            "hospitalId",
            "ambulanceId",
            "driverName",
            "priority",
            "status",
          ]),
        )
        .slice(0, 4);
    }

    if (!filterCategory || filterCategory === "police") {
      res.police = (pendingPoliceOfficers || [])
        .filter((p) => matchesSearch(p, searchTerm, ["name", "badgeId", "email", "phone", "department"]))
        .slice(0, 4);
    }

    return res;
  }, [searchTerm, filterCategory, hospitals, allDrivers, allAmbulances, emergencies, pendingPoliceOfficers]);

  const flatResults = useMemo(() => {
    const list = [];
    searchResults.hospitals.forEach((item) => list.push({ category: "hospitals", item }));
    searchResults.drivers.forEach((item) => list.push({ category: "drivers", item }));
    searchResults.ambulances.forEach((item) => list.push({ category: "ambulances", item }));
    searchResults.emergencies.forEach((item) => list.push({ category: "emergencies", item }));
    searchResults.police.forEach((item) => list.push({ category: "police", item }));
    return list;
  }, [searchResults]);

  const hasResults = flatResults.length > 0;

  const handleSelectResult = (resultObj) => {
    if (!resultObj) return;
    const { category, item } = resultObj;

    // 1. Clear query & blur input
    setRawQuery("");
    inputRef.current?.blur();

    // 2. Close search overlay & open drawer with 200ms delay
    let type = category;
    if (category === "hospitals") type = "hospital";
    else if (category === "drivers") type = "driver";
    else if (category === "ambulances") type = "ambulance";
    else if (category === "emergencies") type = "emergency";
    else if (category === "police") type = "police";

    openDrawerWithDelay({ type, item, targetId: item?.id || item?.hospitalId }, 200);
  };

  const handleKeyDownInput = (e) => {
    if (!isOpen || !hasResults) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        handleSelectResult(flatResults[selectedIndex]);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative hidden min-w-0 flex-1 sm:block max-w-xl">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={rawQuery}
          onChange={(e) => {
            setRawQuery(e.target.value);
            if (!isOpen) openOverlay("GLOBAL_SEARCH");
            setSelectedIndex(0);
          }}
          onFocus={() => openOverlay("GLOBAL_SEARCH")}
          onKeyDown={handleKeyDownInput}
          className="focus-ring h-9 w-full rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 pl-9 pr-8 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
          placeholder="Search for anything"
        />
        {rawQuery ? (
          <button
            type="button"
            onClick={() => {
              setRawQuery("");
              closeOverlay();
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openOverlay("COMMAND_PALETTE")}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
            title="Press Ctrl+K to open Command Palette"
          >
            <span className="font-mono">Ctrl</span> K
          </button>
        )}
      </div>

      {isOpen && searchTerm && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-[80vh] overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {!hasResults ? (
            <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              <Search className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600 mb-1" />
              <p className="font-medium text-slate-700 dark:text-slate-200">No matching results found.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Try searching with name, vehicle plate, or ID.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.hospitals.length > 0 && (
                <CategoryGroup icon={<Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />} title="Hospitals">
                  {searchResults.hospitals.map((h) => {
                    const flatIdx = flatResults.findIndex((r) => r.item === h);
                    const isSelected = selectedIndex === flatIdx;
                    return (
                      <ResultItem
                        key={h.id || h.hospitalId}
                        isSelected={isSelected}
                        onClick={() => handleSelectResult({ category: "hospitals", item: h })}
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            <SearchHighlight text={h.name || h.hospitalName} query={searchTerm} />
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            <SearchHighlight text={`${h.city || "—"}, ${h.state || "—"}`} query={searchTerm} /> · Code: {h.hospitalCode || getHospitalDisplayId(h)}
                          </p>
                        </div>
                      </ResultItem>
                    );
                  })}
                </CategoryGroup>
              )}

              {searchResults.drivers.length > 0 && (
                <CategoryGroup icon={<User className="h-4 w-4 text-blue-600 dark:text-blue-400" />} title="Drivers">
                  {searchResults.drivers.map((d) => {
                    const flatIdx = flatResults.findIndex((r) => r.item === d);
                    const isSelected = selectedIndex === flatIdx;
                    const name = d.fullName || d.driverName || d.name;
                    return (
                      <ResultItem
                        key={d.id}
                        isSelected={isSelected}
                        onClick={() => handleSelectResult({ category: "drivers", item: d })}
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            <SearchHighlight text={name} query={searchTerm} />
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            <SearchHighlight text={d.phone || d.hospitalName || "Driver"} query={searchTerm} /> · Licence: {d.licenseNumber || "—"}
                          </p>
                        </div>
                      </ResultItem>
                    );
                  })}
                </CategoryGroup>
              )}

              {searchResults.ambulances.length > 0 && (
                <CategoryGroup icon={<Ambulance className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />} title="Ambulances">
                  {searchResults.ambulances.map((a) => {
                    const flatIdx = flatResults.findIndex((r) => r.item === a);
                    const isSelected = selectedIndex === flatIdx;
                    const plate = a.numberPlate || a.registrationNumber;
                    return (
                      <ResultItem
                        key={a.id || a.ambulanceId}
                        isSelected={isSelected}
                        onClick={() => handleSelectResult({ category: "ambulances", item: a })}
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            <SearchHighlight text={plate} query={searchTerm} />
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            <SearchHighlight text={a.vehicleType || "Standard ICU"} query={searchTerm} /> · Hospital: {a.hospitalName || a.hospitalId || "Assigned"}
                          </p>
                        </div>
                      </ResultItem>
                    );
                  })}
                </CategoryGroup>
              )}

              {searchResults.emergencies.length > 0 && (
                <CategoryGroup icon={<AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />} title="Active Emergencies">
                  {searchResults.emergencies.map((e) => {
                    const flatIdx = flatResults.findIndex((r) => r.item === e);
                    const isSelected = selectedIndex === flatIdx;
                    const emgDisplay = getEmergencyDisplayId(e);
                    return (
                      <ResultItem
                        key={e.id}
                        isSelected={isSelected}
                        onClick={() => handleSelectResult({ category: "emergencies", item: e })}
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span><SearchHighlight text={emgDisplay} query={searchTerm} /></span>
                            <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400">({e.priority})</span>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            <SearchHighlight text={e.patientName || e.incidentType || "Emergency"} query={searchTerm} /> · {e.status}
                          </p>
                        </div>
                      </ResultItem>
                    );
                  })}
                </CategoryGroup>
              )}

              {searchResults.police.length > 0 && (
                <CategoryGroup icon={<ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />} title="Police Officers">
                  {searchResults.police.map((p) => {
                    const flatIdx = flatResults.findIndex((r) => r.item === p);
                    const isSelected = selectedIndex === flatIdx;
                    return (
                      <ResultItem
                        key={p.id}
                        isSelected={isSelected}
                        onClick={() => handleSelectResult({ category: "police", item: p })}
                      >
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            <SearchHighlight text={p.name} query={searchTerm} />
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Badge: <SearchHighlight text={p.badgeId} query={searchTerm} /> · {p.department}
                          </p>
                        </div>
                      </ResultItem>
                    );
                  })}
                </CategoryGroup>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryGroup({ icon, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 rounded-md mb-1">
        {icon}
        <span>{title}</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ResultItem({ isSelected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
        isSelected
          ? "bg-amber-100/80 ring-1 ring-amber-300 dark:bg-amber-950/60 dark:ring-amber-800 font-medium"
          : "hover:bg-slate-50 dark:hover:bg-slate-800"
      }`}
    >
      {children}
      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
    </button>
  );
}
