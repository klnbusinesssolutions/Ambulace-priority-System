import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";

export default function ActiveEmergenciesPanel({ emergencies }) {
  const [query, setQuery] = useState("");

  const filteredEmergencies = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return emergencies.slice(0, 4);

    return emergencies.filter((item) => [item.id, item.patientName, item.incidentType, item.hospitalId, item.driverName].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized))).slice(0, 4);
  }, [emergencies, query]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Active Emergencies</CardTitle>
          <CardDescription>Live dispatch queue across connected regions.</CardDescription>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search incidents"
            className="w-36 bg-transparent text-sm outline-none"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {filteredEmergencies.length === 0 ? (
            <div className="px-6 py-5 text-sm text-slate-500">No matching incidents found.</div>
          ) : (
            filteredEmergencies.map((item) => (
              <div key={item.id} className="grid gap-3 px-6 py-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-950">{item.id}</p>
                    <StatusBadge status={item.priority === "critical" ? "Critical" : item.priority === "high" ? "High" : item.priority === "medium" ? "Medium" : "Info"} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.incidentType} · {item.patientName} → {item.hospitalId}</p>
                </div>
                <StatusBadge status={item.status === "dispatched" ? "Dispatched" : item.status === "arrived" ? "En Route" : item.status === "active" ? "Warning" : "Approved"} />
                <div className="text-left md:text-right">
                  <p className="text-sm font-semibold text-slate-950">{item.eta || "—"}</p>
                  <p className="text-xs text-slate-500">ETA</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
