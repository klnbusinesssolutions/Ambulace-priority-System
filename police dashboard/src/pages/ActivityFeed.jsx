import { useEffect, useState } from "react";

import { DetailsDrawer } from "@/components/emergencies/DetailsDrawer";
import { StatusBadge } from "@/components/police/StatusBadge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEmergencyDisplayIds } from "@/hooks/useEmergencyDisplayIds";
import { usePoliceStore } from "@/store/policeStore";
import { formatRelativeTime } from "@/utils/format";

// Every emergency the platform has ever recorded, present and past - not
// filtered to "live" ones (that's what Active Emergencies is for) and not
// scoped to the officer's station area, since a full history should stay
// complete regardless of the map/table's cityWide toggle. Reuses the same
// EMG-#### display ids shown everywhere else so a trip is easy to trace
// from here into Active Emergencies or Live Tracking.
export function ActivityFeedPage() {
  const emergencies = usePoliceStore((state) => state.emergencies);
  const selectEmergency = usePoliceStore((state) => state.selectEmergency);
  const displayIds = useEmergencyDisplayIds();
  const [, forceRerender] = useState(0);

  // Auto-refresh so "time ago" labels stay current without a page reload.
  useEffect(() => {
    const interval = setInterval(() => forceRerender((tick) => tick + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const sorted = [...emergencies].sort((a, b) => {
    const aTime = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const bTime = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operational history</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Activity Feed</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Emergencies - Present &amp; Past</CardTitle>
          <span className="text-xs text-slate-500">{sorted.length} total records</span>
        </CardHeader>

        {sorted.length === 0 ? (
          <EmptyState title="No emergencies recorded yet" description="New and past emergencies will appear here as soon as they're created." />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Emergency</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Ambulance</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {sorted.map((emergency) => (
                <TableRow
                  key={emergency.id}
                  className="cursor-pointer"
                  onClick={() => selectEmergency(emergency.id)}
                >
                  <TableCell>
                    <div>
                      <p className="font-semibold text-slate-900">{displayIds.get(emergency.id) ?? emergency.id}</p>
                      <p className="text-xs text-slate-500">{emergency.type}</p>
                    </div>
                  </TableCell>
                  <TableCell>{emergency.driverName ?? "--"}</TableCell>
                  <TableCell className="font-medium">{emergency.ambulanceNumber ?? "--"}</TableCell>
                  <TableCell>
                    <StatusBadge value={emergency.severity} />
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">{emergency.eta ?? "--"}</TableCell>
                  <TableCell>{emergency.destinationHospital ?? "--"}</TableCell>
                  <TableCell>{emergency.status ?? "--"}</TableCell>
                  <TableCell>{formatRelativeTime(emergency.startedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <DetailsDrawer />
    </div>
  );
}
