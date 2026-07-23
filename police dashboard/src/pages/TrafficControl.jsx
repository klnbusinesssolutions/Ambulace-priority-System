import { CreateIncidentForm } from "@/components/traffic/CreateIncidentForm";
import { IncidentCard } from "@/components/traffic/IncidentCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { usePoliceStore } from "@/store/policeStore";

export function TrafficControl() {
  const trafficReports = usePoliceStore((state) => state.trafficReports);
  const updateTrafficIncidentStatus = usePoliceStore((state) => state.updateTrafficIncidentStatus);
  const removeTrafficIncident = usePoliceStore((state) => state.removeTrafficIncident);

  const active = trafficReports.filter((report) => report.status !== "Resolved");
  const resolved = trafficReports.filter((report) => report.status === "Resolved");

  return (
    <div>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Route coordination</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Traffic Control</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report an Incident</CardTitle>
          <span className="text-xs text-slate-500">Shared with hospital &amp; driver apps via Firestore</span>
        </CardHeader>
        <CreateIncidentForm />

        <CardContent>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active &amp; monitored ({active.length})
          </h3>
          {active.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {active.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onStatusChange={updateTrafficIncidentStatus}
                  onDelete={removeTrafficIncident}
                />
              ))}
            </div>
          ) : (
            <EmptyState title="No active traffic incidents" description="Report an incident above to notify coordination teams." />
          )}

          {resolved.length > 0 && (
            <>
              <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Resolved ({resolved.length})
              </h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {resolved.map((incident) => (
                  <IncidentCard
                    key={incident.id}
                    incident={incident}
                    onStatusChange={updateTrafficIncidentStatus}
                    onDelete={removeTrafficIncident}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
