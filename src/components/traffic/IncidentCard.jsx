import { Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/police/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/utils/format";

const STATUS_OPTIONS = ["Active", "Monitoring", "Resolved"];

export function IncidentCard({ incident, onStatusChange, onDelete }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{incident.road}</p>
          <p className="mt-0.5 text-xs text-slate-500">{incident.type}</p>
        </div>
        <StatusBadge value={incident.severity} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>By {incident.createdBy}</span>
        <span>·</span>
        <span>{formatRelativeTime(incident.createdAt)}</span>
      </div>

      {incident.affectedTrips?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {incident.affectedTrips.map((tripId) => (
            <Badge key={tripId} variant="neutral">
              {tripId}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <select
          value={incident.status}
          onChange={(event) => onStatusChange(incident.id, event.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-status-critical hover:bg-red-50"
          onClick={() => onDelete(incident.id)}
          aria-label="Remove incident"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
