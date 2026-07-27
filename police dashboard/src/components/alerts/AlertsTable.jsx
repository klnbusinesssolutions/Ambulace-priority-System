import { Check, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/police/StatusBadge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmergencyDisplayIds } from "@/hooks/useEmergencyDisplayIds";
import { usePoliceStore } from "@/store/policeStore";
import { formatRelativeTime } from "@/utils/format";

// Replaces the old large notification-card grid with a compact, scannable table so an
// operator monitoring several simultaneous emergencies can see all of them at once instead
// of scrolling through cards. Each row joins a priority_alerts doc (severity/category/read
// state) back onto its source emergency (via alert.tripId) to surface the driver, patient,
// ambulance and hospital details the spec asks for - the alert doc itself only carries a
// tripId, not those details.
const columns = [
  "Priority",
  "Emergency ID",
  "Driver Name",
  "Ambulance Number",
  "Patient Name",
  "Hospital",
  "ETA",
  "Status",
  "Time",
  "Action",
];

export function AlertsTable({ alerts, onMarkRead, onDelete }) {
  const emergencies = usePoliceStore((state) => state.emergencies);
  const displayIds = useEmergencyDisplayIds();

  if (!alerts.length) {
    return <EmptyState title="No alerts match your filters" />;
  }

  return (
    <Table>
      <TableHeader>
        <tr>
          {columns.map((label) => (
            <TableHead key={label}>{label}</TableHead>
          ))}
        </tr>
      </TableHeader>
      <TableBody>
        {alerts.map((alert) => {
          const emergency = emergencies.find((item) => item.id === alert.tripId);
          const emergencyDisplayId = alert.emergencyDisplayId ?? displayIds.get(alert.tripId) ?? alert.tripId ?? "--";

          return (
            <TableRow key={alert.id} className={!alert.read ? "bg-blue-50/40" : undefined}>
              <TableCell>
                <StatusBadge value={alert.severity} />
              </TableCell>
              <TableCell className="font-medium text-slate-950">{emergencyDisplayId}</TableCell>
              <TableCell>{emergency?.driverName ?? "--"}</TableCell>
              <TableCell>{emergency?.ambulanceNumber ?? "--"}</TableCell>
              <TableCell>{emergency?.patientName ?? "--"}</TableCell>
              <TableCell>{emergency?.destinationHospital ?? "--"}</TableCell>
              <TableCell>{emergency?.eta ?? "--"}</TableCell>
              <TableCell>{emergency?.status ?? alert.category ?? "--"}</TableCell>
              <TableCell className="whitespace-nowrap text-xs text-slate-500">
                {formatRelativeTime(alert.timestamp)}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {onMarkRead && !alert.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onMarkRead(alert.id)}
                      aria-label="Mark read"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-status-critical hover:bg-red-50"
                      onClick={() => onDelete(alert.id)}
                      aria-label="Delete alert"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
