import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { usePoliceStore } from "@/store/policeStore";

function Select({ label, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function EmergencyFilterBar({ emergencies }) {
  const filters = usePoliceStore((state) => state.emergencyFilters);
  const setEmergencyFilter = usePoliceStore((state) => state.setEmergencyFilter);
  const resetEmergencyFilters = usePoliceStore((state) => state.resetEmergencyFilters);
  const searchQuery = usePoliceStore((state) => state.searchQuery);
  const setSearchQuery = usePoliceStore((state) => state.setSearchQuery);

  const unique = (key) => ["All", ...new Set(emergencies.map((e) => e[key]).filter(Boolean))];

  const hasActiveFilters =
    Object.values(filters).some((value) => value !== "All") || searchQuery.trim().length > 0;

  return (
    <div className="flex flex-wrap items-end gap-3 border-b p-4">
      <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
        Search
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-8"
            placeholder="Search emergency, driver, ambulance..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </label>

      <Select label="Priority" value={filters.severity} options={unique("severity")} onChange={(v) => setEmergencyFilter("severity", v)} />
      <Select label="Hospital" value={filters.hospital} options={unique("destinationHospital")} onChange={(v) => setEmergencyFilter("hospital", v)} />
      <Select label="Status" value={filters.status} options={unique("status")} onChange={(v) => setEmergencyFilter("status", v)} />
      <Select label="Area" value={filters.area} options={unique("area")} onChange={(v) => setEmergencyFilter("area", v)} />
      <Select label="Driver" value={filters.driverName} options={unique("driverName")} onChange={(v) => setEmergencyFilter("driverName", v)} />

      {hasActiveFilters && (
        <button
          type="button"
          className="flex h-9 items-center gap-1 rounded-md border px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
          onClick={() => {
            resetEmergencyFilters();
            setSearchQuery("");
          }}
        >
          <X className="h-3.5 w-3.5" />
          Clear filters
        </button>
      )}
    </div>
  );
}
