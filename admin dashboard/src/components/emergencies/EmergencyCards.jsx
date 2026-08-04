import {
  Ambulance,
  Building2,
  CheckCircle2,
  Clock,
  MapPin,
  User,
} from "lucide-react";
import { Card, CardContent } from "../ui/Card.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import { formatTimeAgo } from "../../utils/formatters.js";
import { useOps } from "../../context/OpsContext.jsx";
import {
  EMERGENCY_STATUS_LABELS,
  EMERGENCY_TIMELINE_STAGES,
  getEmergencyTimelineStepIndex,
  normalizeEmergencyStatus,
} from "../../utils/emergencyLifecycle.js";
import {
  resolveAmbulancePlate,
  resolveDriverName,
  resolveHospitalName,
} from "../../utils/entityDisplay.js";

const priorityLabels = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const priorityAccents = {
  critical: "border-l-red-600 dark:border-l-red-500",
  high: "border-l-amber-600 dark:border-l-amber-500",
  medium: "border-l-blue-600 dark:border-l-blue-500",
  low: "border-l-emerald-600 dark:border-l-emerald-500",
};

export default function EmergencyCards({ rows = [], onCardClick }) {
  const { ambulances = [], drivers = [], hospitals = [] } = useOps();

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-sm text-slate-500 dark:text-slate-400">
        No active emergencies currently reporting.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map((item) => {
        const normStatus = normalizeEmergencyStatus(item.status);
        const statusLabel = EMERGENCY_STATUS_LABELS[normStatus] || "Reported";
        const priorityKey = (item.priority || "critical").toLowerCase();
        const accentClass = priorityAccents[priorityKey] || priorityAccents.medium;
        const incidentType = item.incidentType || "Emergency Incident";
        const patientName = item.patientName || item.patient || "Anonymous Patient";
        const hospName = resolveHospitalName(item.hospitalName || item.hospitalId, hospitals);
        const ambName = resolveAmbulancePlate(item.ambulanceId, ambulances);
        const drvName = resolveDriverName(item.driverName || item.driverId, drivers);
        const timeAgo = formatTimeAgo(item.createdAt || item.startTime || item.timestamp);
        const updatedAgo = formatTimeAgo(item.updatedAt || item.createdAt || item.timestamp);

        // Calculate canonical timeline step index (0 to 4)
        const activeIdx = getEmergencyTimelineStepIndex(item.status);

        return (
          <Card
            key={item.id}
            className={`border-l-4 transition-all hover:shadow-md cursor-pointer ${accentClass}`}
            onClick={(e) => onCardClick?.(item, e)}
          >
            <CardContent className="space-y-4 p-5">
              {/* 1. Header: Incident Type + Priority Badge + Read-Only Status Badge */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {incidentType}
                    </h2>
                    <StatusBadge status={priorityLabels[priorityKey] || item.priority} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Reported {timeAgo} · Updated {updatedAgo}
                  </p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={statusLabel} />
                </div>
              </div>

              {/* 2. Compact Operational Stage Progress Timeline */}
              <div className="rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 p-2.5">
                <div className="flex items-center justify-between gap-1">
                  {EMERGENCY_TIMELINE_STAGES.map((stage, idx) => {
                    const isPassed = idx <= activeIdx;
                    const isCurrent = idx === activeIdx;

                    return (
                      <div key={stage.key} className="flex flex-1 flex-col items-center text-center">
                        <div className="flex items-center w-full">
                          {idx > 0 && (
                            <div
                              className={`h-0.5 flex-1 ${
                                isPassed ? "bg-blue-600 dark:bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
                              }`}
                            />
                          )}
                          <div
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                              isCurrent
                                ? "bg-blue-600 text-white ring-2 ring-blue-100 dark:ring-blue-900"
                                : isPassed
                                ? "bg-blue-500 text-white"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {isPassed ? <CheckCircle2 className="h-3 w-3" /> : idx + 1}
                          </div>
                          {idx < EMERGENCY_TIMELINE_STAGES.length - 1 && (
                            <div
                              className={`h-0.5 flex-1 ${
                                idx < activeIdx ? "bg-blue-600 dark:bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
                              }`}
                            />
                          )}
                        </div>
                        <span
                          className={`mt-1 text-[10px] font-medium truncate max-w-[64px] ${
                            isCurrent
                              ? "text-blue-600 dark:text-blue-400 font-bold"
                              : isPassed
                              ? "text-slate-700 dark:text-slate-300"
                              : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Operational Grid Details */}
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <User className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Patient:</span> {patientName}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="truncate">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">ETA:</span> {item.eta || "4 mins"}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Ambulance className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Ambulance:</span> {ambName} ({drvName})
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Hospital:</span> {hospName}
                  </span>
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                  <span className="truncate font-mono">
                    {item.location
                      ? `${item.location.latitude?.toFixed(4)}, ${item.location.longitude?.toFixed(4)}`
                      : item.address || "GPS Location Active"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
