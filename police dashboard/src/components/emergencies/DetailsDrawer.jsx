import { useEffect, useMemo, useState } from "react";
import {
  Ambulance,
  CalendarClock,
  Check,
  Gauge,
  Hospital,
  MapPin,
  Phone,
  Route,
  Signpost,
  UserRound,
  X,
} from "lucide-react";

import { StatusBadge } from "@/components/police/StatusBadge";
import { Button } from "@/components/ui/button";
import { useEmergencyDisplayIds } from "@/hooks/useEmergencyDisplayIds";
import { usePoliceStore } from "@/store/policeStore";
import { cn } from "@/utils/cn";
import { formatCoordinate, formatRelativeTime } from "@/utils/format";

const TIMELINE_STAGES = [
  "Emergency Created",
  "Driver Assigned",
  "Started",
  "Reached Pickup",
  "Patient Picked",
  "Heading Hospital",
  "ETA Under 5 Minutes",
  "Arrived Hospital",
  "Completed",
];

// Maps the driver app's tripStatus taps (drivers/{driverId}.tripStatus, see
// emergencyEnrichment.js + tripAlertWatcher.js) onto the police Trip Timeline stages,
// so the timeline actually advances step by step with what the driver is doing
// instead of jumping straight to "Heading Hospital" for every trip.
const TRIP_STATUS_STAGE = {
  going_to_patient: "Started",
  reached_patient: "Reached Pickup",
  patient_onboard: "Patient Picked",
  near_hospital: "ETA Under 5 Minutes",
  trip_completed: "Arrived Hospital",
};

function stageFor(emergency) {
  const status = String(emergency.status ?? "").toLowerCase();
  if (status === "completed" || status === "resolved") return "Completed";

  const tripStage = TRIP_STATUS_STAGE[emergency.tripStatus];
  if (tripStage) return tripStage;

  // Fallback for trips whose ETA has already dropped under 5 minutes even though
  // the driver hasn't tapped "Near Hospital" yet.
  const etaMinutes = parseInt(emergency.eta, 10);
  if (!Number.isNaN(etaMinutes) && etaMinutes <= 5) return "ETA Under 5 Minutes";

  if (status === "started" || status === "in_progress" || status === "accepted" || status === "en route") {
    return "Started";
  }
  if (emergency.driverId) return "Driver Assigned";
  return "Emergency Created";
}

// Once the driver taps "Near Hospital" (tripStatus = near_hospital), the police
// dashboard has no live ETA feed from the driver app - just the one-time alert.
// This counts the ETA down live from 5 minutes based on when that alert fired,
// so "Estimated arrival" actually ticks down instead of sitting frozen.
function useLiveEta(emergency) {
  const priorityAlerts = usePoliceStore((state) => state.priorityAlerts);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (emergency.tripStatus !== "near_hospital") return emergency.eta;

    const alert = priorityAlerts.find(
      (a) => a.tripId === emergency.id && a.category === "ETA Below 5 Minutes",
    );
    if (!alert?.createdAt) return emergency.eta;

    const firedAt = new Date(alert.createdAt).getTime();
    if (!Number.isFinite(firedAt)) return emergency.eta;

    const elapsedMinutes = Math.floor((now - firedAt) / 60000);
    const remaining = Math.max(0, 5 - elapsedMinutes);
    return remaining === 0 ? "Arriving now" : `${remaining} min`;
  }, [emergency, priorityAlerts, now]);
}

function Timeline({ emergency }) {
  const currentIndex = TIMELINE_STAGES.indexOf(stageFor(emergency));

  return (
    <div className="space-y-0">
      {TIMELINE_STAGES.map((stage, index) => {
        const done = index <= currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <div key={stage} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  done ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-400",
                  isCurrent && "ring-4 ring-primary/15",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              {index < TIMELINE_STAGES.length - 1 && (
                <span className={cn("h-6 w-px", done ? "bg-primary" : "bg-slate-200")} />
              )}
            </div>
            <p className={cn("pb-6 text-sm", done ? "font-medium text-slate-900" : "text-slate-400")}>{stage}</p>
          </div>
        );
      })}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 rounded-lg border bg-slate-50 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-slate-900">{value ?? "--"}</p>
      </div>
    </div>
  );
}

export function DetailsDrawer() {
  const open = usePoliceStore((state) => state.drawerOpen);
  const closeDrawer = usePoliceStore((state) => state.closeDrawer);
  const getSelectedEmergency = usePoliceStore((state) => state.getSelectedEmergency);
  const emergency = getSelectedEmergency();
  const displayIds = useEmergencyDisplayIds();
  const liveEta = useLiveEta(emergency ?? {});

  if (!emergency) return null;

  return (
    <div className={cn("fixed inset-0 z-50", !open && "pointer-events-none")}>
      <button
        className={cn("absolute inset-0 bg-slate-950/30 transition-opacity", open ? "opacity-100" : "opacity-0")}
        onClick={closeDrawer}
        aria-label="Close emergency details"
      />
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l bg-white shadow-xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-950">{displayIds.get(emergency.id) ?? emergency.id}</h2>
              <StatusBadge value={emergency.severity} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {emergency.type ?? "Ambulance"} emergency - {emergency.status ?? "Status pending"}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={closeDrawer} aria-label="Close drawer">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailRow icon={UserRound} label="Patient" value={emergency.patientName} />
            <DetailRow icon={Phone} label="Patient phone" value={emergency.patientPhone} />
            <DetailRow icon={UserRound} label="Driver" value={emergency.driverName} />
            <DetailRow icon={Phone} label="Driver phone" value={emergency.driverPhone} />
            <DetailRow icon={Ambulance} label="Ambulance" value={emergency.ambulanceNumber} />
            <DetailRow icon={Hospital} label="Destination hospital" value={emergency.destinationHospital} />
            <DetailRow
              icon={MapPin}
              label="Pickup location"
              value={
                emergency.pickupAddress ??
                (emergency.pickup
                  ? `${formatCoordinate(emergency.pickup.lat)}, ${formatCoordinate(emergency.pickup.lng)}`
                  : "--")
              }
            />
            <DetailRow
              icon={Gauge}
              label="Speed / heading"
              value={`${emergency.speed ?? "--"} km/h · ${emergency.heading ?? "--"}°`}
            />
            <DetailRow
              icon={Signpost}
              label="Distance / current road"
              value={`${emergency.distanceRemaining ?? "--"} km · ${emergency.currentRoad ?? "Unknown"}`}
            />
            <DetailRow
              icon={MapPin}
              label="Live coordinates"
              value={
                emergency.coordinates
                  ? `${formatCoordinate(emergency.coordinates.lat)}, ${formatCoordinate(emergency.coordinates.lng)}`
                  : "--"
              }
            />
            <DetailRow icon={CalendarClock} label="Last updated" value={formatRelativeTime(emergency.lastUpdated)} />
          </div>

          <section className="mt-5 rounded-lg border">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-950">Trip Timeline</h3>
            </div>
            <div className="p-4 pb-0">
              <Timeline emergency={emergency} />
            </div>
          </section>

          <section className="mt-5 rounded-lg border">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-950">Route Information</h3>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="text-xs text-slate-500">Estimated arrival</p>
                  <p className="text-xl font-semibold text-slate-950">{liveEta}</p>
                </div>
                <Route className="h-5 w-5 text-slate-500" />
              </div>
              <p className="text-sm leading-6 text-slate-600">{emergency.routeNotes ?? "No route notes available."}</p>
              <div className="space-y-3">
                {(emergency.route ?? []).map((point, index) => (
                  <div key={`${point.lat}-${point.lng}`} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {index + 1}
                    </div>
                    <p className="text-sm text-slate-700">
                      {formatCoordinate(point.lat)}, {formatCoordinate(point.lng)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-5 rounded-lg border">
            <div className="border-b px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-950">Timestamps</h3>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <DetailRow icon={CalendarClock} label="Emergency started" value={formatRelativeTime(emergency.startedAt)} />
              <DetailRow icon={CalendarClock} label="Realtime update" value={formatRelativeTime(emergency.lastUpdated)} />
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
