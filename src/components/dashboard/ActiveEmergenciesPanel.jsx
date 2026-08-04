import { ArrowUpRight, Clock, MapPin, Ambulance, Building2, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import { useOverlay } from "../../context/OverlayContext.jsx";
import { formatTimeAgo } from "../../utils/formatters.js";

import { useOps } from "../../context/OpsContext.jsx";
import {
  resolveAmbulancePlate,
  resolveDriverName,
  resolveHospitalName,
  getEmergencyDisplayId,
} from "../../utils/entityDisplay.js";
import { EMERGENCY_STATUS_LABELS, normalizeEmergencyStatus } from "../../utils/emergencyLifecycle.js";

const PRIORITY_ACCENTS = {
  critical: "border-l-red-600 bg-red-50/20 dark:bg-red-950/10",
  high: "border-l-amber-600 bg-amber-50/20 dark:bg-amber-950/10",
  medium: "border-l-blue-600 bg-blue-50/20 dark:bg-blue-950/10",
  low: "border-l-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10",
};

const PRIORITY_LABELS = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export default function ActiveEmergenciesPanel({ emergencies = [] }) {
  const { openDrawer } = useOverlay();
  const { ambulances = [], drivers = [], hospitals = [] } = useOps();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Emergency Command Center</CardTitle>
          <CardDescription>Live dispatch incidents across connected regional hospitals & emergency units.</CardDescription>
        </div>
        <Link
          to="/admin/emergencies?status=active"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          View queue
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {emergencies.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No active emergency dispatches at this time.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {emergencies.slice(0, 4).map((item) => {
              const priorityKey = (item.priority || "critical").toLowerCase();
              const accentClass = PRIORITY_ACCENTS[priorityKey] || PRIORITY_ACCENTS.medium;
              const patientName = item.patientName || item.patient || "Anonymous Patient";
              const incidentTitle = item.incidentType || "Emergency Incident";
              const hospName = resolveHospitalName(item.hospitalName || item.hospitalId, hospitals);
              const ambPlate = resolveAmbulancePlate(item.ambulanceId, ambulances);
              const drvName = resolveDriverName(item.driverName || item.driverId, drivers);
              const ambInfo = item.ambulanceId ? `${ambPlate}${drvName ? ` · ${drvName}` : ""}` : "Unit Pending";
              const timeAgo = formatTimeAgo(item.createdAt || item.startTime || item.timestamp);

              return (
                <div
                  key={item.id}
                  onClick={() => openDrawer({ type: "emergency", item })}
                  className={`group grid gap-3 border-l-4 px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer md:grid-cols-[1fr_auto_auto] md:items-center ${accentClass}`}
                  title="Click to view complete emergency details"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {incidentTitle}
                      </h3>
                      <StatusBadge status={PRIORITY_LABELS[priorityKey] || item.priority} />
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        Reported {timeAgo}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {patientName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        {hospName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Ambulance className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        {ambInfo}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={EMERGENCY_STATUS_LABELS[normalizeEmergencyStatus(item.status)] || "Reported"} />
                  </div>

                  <div className="text-left md:text-right">
                    <div className="inline-flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-slate-100">
                      <Clock className="h-3.5 w-3.5 text-amber-500" />
                      {item.eta || "4 mins"}
                    </div>
                    <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">Est. Arrival</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
