import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePoliceStore } from "@/store/policeStore";

function StatTile({ label, value, suffix }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">
        {value}
        {suffix ? <span className="ml-1 text-sm font-medium text-slate-500">{suffix}</span> : null}
      </p>
    </div>
  );
}

export function TripAnalytics() {
  const analytics = usePoliceStore((state) => state.analytics);

  return (
    <div>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Insights</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Trip Analytics</h1>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Trips Today" value={analytics.tripsToday} />
        <StatTile label="Average ETA" value={analytics.averageEta} suffix="min" />
        <StatTile label="Average Response Time" value={analytics.averageResponseTime} suffix="min" />
        <StatTile label="Completion Rate" value={analytics.completionRate} suffix="%" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Trips This Week</CardTitle>
            <span className="text-xs text-slate-500">Daily volume</span>
          </CardHeader>
          <CardContent>
            <BarChart data={analytics.tripsThisWeek} labelKey="day" valueKey="trips" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peak Emergency Hours</CardTitle>
            <span className="text-xs text-slate-500">Trips by time band</span>
          </CardHeader>
          <CardContent>
            <BarChart data={analytics.peakEmergencyHours} labelKey="hour" valueKey="trips" color="#f79009" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Priority Distribution</CardTitle>
            <span className="text-xs text-slate-500">Active + recent emergencies</span>
          </CardHeader>
          <CardContent>
            <DonutChart data={analytics.priorityDistribution} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trips Per Hospital</CardTitle>
            <span className="text-xs text-slate-500">Destination distribution</span>
          </CardHeader>
          <CardContent>
            <DonutChart data={analytics.tripsPerHospital} colors={["#12b76a", "#175cd3", "#6941c6", "#94a3b8"]} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
