import { useEffect, useState } from "react";

import { ActivityRow } from "@/components/activity/ActivityItem";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader } from "@/components/ui/table";
import { usePoliceStore } from "@/store/policeStore";

export function ActivityFeedPage() {
  const activityFeed = usePoliceStore((state) => state.activityFeed);
  const [, forceRerender] = useState(0);

  // Auto-refresh so "time ago" labels stay current without a page reload.
  useEffect(() => {
    const interval = setInterval(() => forceRerender((tick) => tick + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operational events</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Activity Feed</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Realtime Operational Feed</CardTitle>
          <span className="text-xs text-slate-500">{activityFeed.length} recent events · auto-refreshing</span>
        </CardHeader>
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Officer</TableHead>
              <TableHead>Trip</TableHead>
              <TableHead>Hospital</TableHead>
              <TableHead>Driver</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {activityFeed.map((item) => (
              <ActivityRow key={item.id} item={item} />
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
