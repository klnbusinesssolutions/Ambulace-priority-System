import { Clock3, MapPin, Navigation2 } from "lucide-react";
import { Card, CardContent } from "../ui/Card.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import Select from "../ui/Select.jsx";

const statusOptions = ["active", "dispatched", "arrived", "completed", "resolved"];

const priorityLabels = { critical: "Critical", high: "High", medium: "Medium", low: "Info" };
const statusLabels = { active: "Warning", dispatched: "Dispatched", arrived: "En Route", completed: "Approved", resolved: "Operational" };

export default function EmergencyCards({ rows, onStatusChange }) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        No emergencies match this view.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((item) => (
        <Card key={item.id}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-950">{item.id}</h2>
                  <StatusBadge status={priorityLabels[item.priority] || item.priority} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{item.incidentType} · {item.patientName}</p>
              </div>
              <Select
                className="w-40"
                value={item.status}
                onChange={(event) => onStatusChange(item.id, event.target.value)}
                options={statusOptions}
              />
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400" />
                {item.location ? `${item.location.latitude?.toFixed(3)}, ${item.location.longitude?.toFixed(3)}` : "Location pending"}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Clock3 className="h-4 w-4 text-slate-400" />
                ETA {item.eta || "—"}
              </div>
              <div>
                <p className="text-xs text-slate-500">Ambulance / Driver</p>
                <p className="font-medium text-slate-950">{item.ambulanceId} · {item.driverName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Hospital</p>
                <p className="font-medium text-slate-950">{item.hospitalId}</p>
              </div>
            </div>
            {item.status === "dispatched" && (
              <div className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <Navigation2 className="h-3.5 w-3.5" />
                Live position tracked on the Live Tracking page.
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
