import { CheckCheck } from "lucide-react";

import { AlertCard } from "@/components/alerts/AlertCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { alertCategories } from "@/services/policeConstants";
import { usePoliceStore } from "@/store/policeStore";

const severityOptions = ["All", "Critical", "High", "Medium", "Low"];

export function Alerts() {
  const priorityAlerts = usePoliceStore((state) => state.priorityAlerts);
  const filters = usePoliceStore((state) => state.alertFilters);
  const setAlertFilter = usePoliceStore((state) => state.setAlertFilter);
  const searchQuery = usePoliceStore((state) => state.alertSearchQuery);
  const setAlertSearchQuery = usePoliceStore((state) => state.setAlertSearchQuery);
  const markAlertRead = usePoliceStore((state) => state.markAlertRead);
  const markAllAlertsRead = usePoliceStore((state) => state.markAllAlertsRead);
  const deleteAlert = usePoliceStore((state) => state.deleteAlert);

  const query = searchQuery.trim().toLowerCase();
  const filtered = priorityAlerts.filter((alert) => {
    if (filters.category !== "All" && alert.category !== filters.category) return false;
    if (filters.severity !== "All" && alert.severity !== filters.severity) return false;
    if (query && !`${alert.title} ${alert.description} ${alert.tripId ?? ""}`.toLowerCase().includes(query)) {
      return false;
    }
    return true;
  });

  const unreadCount = priorityAlerts.filter((alert) => !alert.read).length;

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Priority coordination</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">Priority Alerts</h1>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAlertsRead}>
            <CheckCheck className="h-4 w-4" />
            Mark all read ({unreadCount})
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Alert Queue</CardTitle>
          <span className="text-xs text-slate-500">{filtered.length} matching alerts</span>
        </CardHeader>

        <div className="flex flex-wrap items-end gap-3 border-b p-4">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs font-medium text-slate-500">
            Search
            <Input
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(event) => setAlertSearchQuery(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Category
            <select
              value={filters.category}
              onChange={(event) => setAlertFilter("category", event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {["All", ...alertCategories].map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Severity
            <select
              value={filters.severity}
              onChange={(event) => setAlertFilter("severity", event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {severityOptions.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </label>
        </div>

        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.length ? (
            filtered.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onMarkRead={markAlertRead} onDelete={deleteAlert} />
            ))
          ) : (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState title="No alerts match your filters" />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
