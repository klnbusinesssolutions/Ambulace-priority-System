import { formatDateTime } from "../../utils/formatters.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";

export default function AmbulanceMonitoring({ ambulances }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ambulance Monitoring</CardTitle>
        <CardDescription>Fleet availability, GPS connectivity, and assignment coverage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {ambulances.slice(0, 5).map((unit) => (
          <div key={unit.id} className="flex items-center justify-between gap-4 rounded-md border border-slate-100 px-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-950">{unit.numberPlate || unit.registrationNumber} · {unit.vehicleType}</p>
              <p className="truncate text-xs text-slate-500">{unit.hospitalId} · approved {formatDateTime(unit.approvedAt || unit.submittedAt)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={unit.activeDriverId ? "Online" : "Offline"} />
              <StatusBadge status={unit.availability === "available" ? "Available" : unit.availability === "on_trip" ? "En Route" : "Offline"} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
