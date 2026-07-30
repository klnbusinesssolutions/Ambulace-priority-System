import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Ambulance,
  User,
  Building2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MapPin,
  Calendar,
  ExternalLink,
  Activity,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime } from "../../utils/formatters.js";
import Button from "../ui/Button.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import VerificationStatusBadge from "../ui/VerificationStatusBadge.jsx";

export default function AmbulanceDetailsDrawer({ open, ambulance, onClose }) {
  const navigate = useNavigate();
  const { drivers = [], emergencies = [], activityLogs = [] } = useOps();

  // Handle Escape key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !ambulance) return null;

  const ambId = ambulance.id || ambulance.ambulanceId;
  const plateNumber = ambulance.numberPlate || ambulance.registrationNumber;

  // Filter connected data from OpsContext live collections
  const assignedDriver = (drivers || []).find(
    (d) => d.id === ambulance.activeDriverId || (ambulance.assignedDrivers || []).includes(d.id),
  );

  const vehicleEmergencies = (emergencies || []).filter(
    (e) => e.ambulanceId === ambId || e.assignedAmbulance === ambId || e.ambulanceId === plateNumber,
  );

  const activeEmergency = vehicleEmergencies.find(
    (e) => e.status !== "completed" && e.status !== "cancelled" && e.status !== "resolved",
  );

  const completedEmergencies = vehicleEmergencies.filter(
    (e) => e.status === "completed" || e.status === "resolved",
  );

  const ambulanceActivity = (activityLogs || []).filter(
    (log) =>
      log.targetId === ambId ||
      (log.details && log.details.includes(plateNumber)),
  );

  const capabilitiesList = Array.isArray(ambulance.medicalCapabilities)
    ? ambulance.medicalCapabilities
    : (ambulance.medicalCapabilities || "").split(",").filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close drawer backdrop"
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-in Container */}
      <div className="relative z-10 flex h-full w-full max-w-2xl flex-col bg-white dark:bg-slate-900 shadow-2xl transition-transform animate-in slide-in-from-right duration-250 ease-out border-l border-slate-200 dark:border-slate-800">
        {/* Compact Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-slate-50/80 dark:bg-slate-900/90">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <Ambulance className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{plateNumber}</h2>
                <StatusBadge status={ambulance.availability === "available" ? "Available" : ambulance.availability === "on_trip" ? "En Route" : "Offline"} />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">ID: {ambId}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close ambulance details" className="h-8 w-8 shrink-0">
            <X className="h-4.5 w-4.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" />
          </Button>
        </div>

        {/* Drawer Body - Reduced Spacing */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* SECTION 1: VEHICLE OVERVIEW */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-xs space-y-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Section 1 · Vehicle Overview</h3>
            <div className="grid gap-2.5 sm:grid-cols-2 text-sm">
              <InfoItem icon={<Ambulance className="h-4 w-4 text-slate-400" />} label="Number Plate" value={plateNumber} />
              <InfoItem icon={<ShieldCheck className="h-4 w-4 text-slate-400" />} label="Registration No." value={ambulance.registrationNumber} />
              <InfoItem icon={<Building2 className="h-4 w-4 text-slate-400" />} label="Hospital ID" value={ambulance.hospitalId} />
              <InfoItem icon={<Zap className="h-4 w-4 text-slate-400" />} label="Vehicle Type" value={ambulance.vehicleType || "Advanced ICU"} />
              <InfoItem icon={<User className="h-4 w-4 text-slate-400" />} label="Capacity" value={ambulance.capacity || "12 Seater"} />
              <InfoItem icon={<Calendar className="h-4 w-4 text-slate-400" />} label="Submitted Date" value={formatDateTime(ambulance.submittedAt || ambulance.createdAt)} />
            </div>
          </section>

          {/* SECTION 2: ASSIGNED DRIVER */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 2 · Assigned Active Driver</h3>
              {assignedDriver && (
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-slate-600" onClick={() => navigate("/admin/drivers")}>
                  View Driver <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
            {!assignedDriver ? (
              <p className="text-xs text-slate-400 py-3 text-center">No driver currently assigned to this vehicle.</p>
            ) : (
              <div className="flex items-center justify-between text-xs rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-blue-700 font-bold">
                    {(assignedDriver.name || assignedDriver.fullName || "D")[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{assignedDriver.name || assignedDriver.fullName}</p>
                    <p className="text-slate-500">{assignedDriver.phone || "No phone listed"}</p>
                  </div>
                </div>
                <StatusBadge status={assignedDriver.availability === "on_trip" ? "En Route" : "Available"} />
              </div>
            )}
          </section>

          {/* SECTION 3: CURRENT EMERGENCY */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 3 · Current Active Mission</h3>
            {!activeEmergency ? (
              <p className="text-xs text-slate-400 py-3 text-center">Vehicle is currently standby. No active emergency.</p>
            ) : (
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-600 uppercase">{activeEmergency.priority || "P1 Critical"}</span>
                    <span className="font-medium text-slate-900">{activeEmergency.patientName || "Patient"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Destination: {activeEmergency.hospitalId}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    {activeEmergency.status || "En Route"}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">ETA: {activeEmergency.eta || "4 mins"}</p>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 4: LIVE GPS */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 4 · Live Telemetry</h3>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-slate-600" onClick={() => navigate("/admin/live-tracking")}>
                Focus on Live Tracking <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            {ambulance.location ? (
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700 font-mono">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{ambulance.location.latitude?.toFixed(4)}, {ambulance.location.longitude?.toFixed(4)}</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {ambulance.updatedAt ? formatDateTime(ambulance.updatedAt) : "Live GPS"}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">GPS telemetry currently standby.</p>
            )}
          </section>

          {/* SECTION 5: EQUIPMENT SUMMARY */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 5 · Medical Equipment & Capabilities</h3>
            {capabilitiesList.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                <Zap className="h-4 w-4 text-slate-400" />
                <span>Standard Ventilator, Oxygen Cylinder, First Aid Kit, Suction Machine.</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {capabilitiesList.map((cap, i) => (
                  <span key={i} className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200">
                    {cap.trim()}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* SECTION 6: EMERGENCY HISTORY */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Section 6 · Emergency History ({completedEmergencies.length})
            </h3>
            {completedEmergencies.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No completed emergency logs for this ambulance.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {completedEmergencies.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                    <div>
                      <p className="font-medium text-slate-900">{e.id} · {e.patientName || "Emergency"}</p>
                      <p className="text-[11px] text-slate-400">{e.hospitalId}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Completed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECTION 7: RECENT ACTIVITY */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Section 7 · Recent Activity ({ambulanceActivity.length})
            </h3>
            {ambulanceActivity.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No activity logs recorded for this vehicle.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {ambulanceActivity.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-2.5 py-1.5 border-b border-slate-50 text-xs">
                    <Activity className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-900">{log.details || log.action}</p>
                      <p className="text-[11px] text-slate-400">{formatDateTime(log.createdAt || log.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECTION 8: QUICK ACTIONS */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 8 · Quick Actions</h3>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="secondary" className="justify-center gap-1 text-xs py-2" onClick={() => navigate("/admin/drivers")}>
                <User className="h-3.5 w-3.5" />
                <span>Driver</span>
              </Button>
              <Button variant="secondary" className="justify-center gap-1 text-xs py-2" onClick={() => navigate("/admin/hospitals")}>
                <Building2 className="h-3.5 w-3.5" />
                <span>Hospital</span>
              </Button>
              <Button variant="secondary" className="justify-center gap-1 text-xs py-2" onClick={() => navigate("/admin/live-tracking")}>
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                <span>Tracking</span>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase">{label}</p>
        <p className="font-medium text-slate-900 truncate">{value || "Not provided"}</p>
      </div>
    </div>
  );
}
