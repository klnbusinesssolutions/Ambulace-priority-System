import { ExternalLink, Radar, RefreshCcw } from "lucide-react";
import { useMemo } from "react";
import { Card, CardContent } from "../../components/ui/Card.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime } from "../../utils/formatters.js";

/** Fit a set of lat/lng points into a 0-100 plot box, padded a little. */
function projectPoints(points) {
  if (!points.length) return [];
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat || 1;
  const lngSpan = maxLng - minLng || 1;

  return points.map((point) => ({
    ...point,
    x: 10 + ((point.lng - minLng) / lngSpan) * 80,
    y: 10 + (1 - (point.lat - minLat) / latSpan) * 80,
  }));
}

export default function LiveTracking() {
  const { liveLocations, ambulances, drivers, emergencies } = useOps();

  const enriched = useMemo(
    () =>
      liveLocations.map((location) => {
        const ambulance = ambulances.find((unit) => unit.id === location.ambulanceId || unit.id === location.id);
        const driver = drivers.find((item) => item.id === (ambulance?.activeDriverId || location.driverUid));
        const emergency = emergencies.find((item) => item.ambulanceId === (ambulance?.id || location.ambulanceId) && !["completed", "resolved"].includes(item.status));
        return { ...location, ambulance, driver, emergency };
      }),
    [liveLocations, ambulances, drivers, emergencies],
  );

  const points = useMemo(
    () => projectPoints(enriched.filter((item) => typeof item.lat === "number" && typeof item.lng === "number")),
    [enriched],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Live Tracking"
        description="Realtime ambulance positions from the live_locations collection, written by each driver's Android app."
        actions={
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <Radar className="h-3.5 w-3.5 animate-pulse" />
            {liveLocations.length} ambulance{liveLocations.length === 1 ? "" : "s"} reporting
          </div>
        }
      />

      {!liveLocations.length ? (
        <EmptyState
          title="No live positions yet"
          description="Once a driver's app starts sending location updates, ambulances will appear here in realtime."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-medium text-slate-700">Relative position map</p>
              <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <svg viewBox="0 0 100 100" className="h-full w-full">
                  <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100" height="100" fill="url(#grid)" />
                  {points.map((point) => (
                    <g key={point.id} transform={`translate(${point.x} ${point.y})`}>
                      <circle r="3.2" className={point.emergency ? "fill-red-500" : "fill-emerald-500"} opacity="0.9" />
                      <circle r="6" className={point.emergency ? "fill-red-500" : "fill-emerald-500"} opacity="0.2">
                        <animate attributeName="r" values="4;9;4" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                      </circle>
                    </g>
                  ))}
                </svg>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Idle / available</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" />On an active emergency</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {enriched.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-950">{item.ambulanceId || item.id}</p>
                      {item.emergency && <StatusBadge status="Critical" />}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.driver?.name ? `${item.driver.name} · ` : ""}
                      {item.hospitalId || item.ambulance?.hospitalId || "Unassigned"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.lat?.toFixed(4)}, {item.lng?.toFixed(4)} · updated {formatDateTime(item.updatedAt)}
                    </p>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${item.lat},${item.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open in Maps
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <RefreshCcw className="h-3 w-3" />
        Positions update automatically as new writes arrive on live_locations — no manual refresh needed.
      </p>
    </div>
  );
}
