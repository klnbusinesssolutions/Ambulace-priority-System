import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Building2,
  Users,
  Ambulance,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime } from "../../utils/formatters.js";
import Button from "../ui/Button.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import VerificationStatusBadge from "../ui/VerificationStatusBadge.jsx";

export default function HospitalDetailsDrawer({ open, hospital, onClose }) {
  const navigate = useNavigate();
  const {
    drivers = [],
    pendingDrivers = [],
    ambulances = [],
    pendingAmbulances = [],
    emergencies = [],
    activityLogs = [],
  } = useOps();

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

  if (!open || !hospital) return null;

  const hospId = hospital.hospitalId || hospital.id;

  // Filter connected data from OpsContext live collections
  const connectedDrivers = (drivers || []).filter(
    (d) => d.hospitalId === hospId || d.hospitalId === hospital.id,
  );
  const connectedPendingDrivers = (pendingDrivers || []).filter(
    (d) => d.hospitalId === hospId || d.hospitalId === hospital.id,
  );
  const allHospitalDrivers = [...connectedDrivers, ...connectedPendingDrivers];

  const connectedAmbulances = (ambulances || []).filter(
    (a) => a.hospitalId === hospId || a.hospitalId === hospital.id,
  );
  const connectedPendingAmbulances = (pendingAmbulances || []).filter(
    (a) => a.hospitalId === hospId || a.hospitalId === hospital.id,
  );
  const allHospitalAmbulances = [...connectedAmbulances, ...connectedPendingAmbulances];

  const hospitalEmergencies = (emergencies || []).filter(
    (e) => e.hospitalId === hospId || e.assignedHospitalId === hospId || e.hospitalId === hospital.id,
  );
  const activeEmergencies = hospitalEmergencies.filter(
    (e) => e.status !== "completed" && e.status !== "cancelled",
  );
  const completedEmergencies = hospitalEmergencies.filter((e) => e.status === "completed");

  const hospitalActivity = (activityLogs || []).filter(
    (log) =>
      log.hospitalId === hospId ||
      log.hospitalId === hospital.id ||
      log.targetId === hospId ||
      log.targetId === hospital.id,
  );

  // Quick statistics
  const activeDriversCount = connectedDrivers.filter((d) => d.status !== "offline").length;
  const activeAmbulancesCount = connectedAmbulances.filter((a) => a.availability !== "offline").length;
  const pendingRequestsCount = connectedPendingDrivers.length + connectedPendingAmbulances.length;

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
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{hospital.name || hospital.hospitalName}</h2>
                <StatusBadge status={hospital.isActive ? "Operational" : "Offline"} />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">ID: {hospId}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close hospital details" className="h-8 w-8 shrink-0">
            <X className="h-4.5 w-4.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" />
          </Button>
        </div>

        {/* Drawer Body - Reduced Spacing */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* SECTION 1: HOSPITAL OVERVIEW */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-xs space-y-2.5">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Section 1 · Overview & Contact</h3>
            <div className="grid gap-2.5 sm:grid-cols-2 text-sm">
              <InfoItem icon={<MapPin className="h-4 w-4 text-slate-400" />} label="Address" value={`${hospital.address || hospital.location || "N/A"}, ${hospital.city || "—"}, ${hospital.state || "—"}`} />
              <InfoItem icon={<Phone className="h-4 w-4 text-slate-400" />} label="Phone" value={hospital.phone} />
              <InfoItem icon={<Mail className="h-4 w-4 text-slate-400" />} label="Email" value={hospital.email} />
              <InfoItem icon={<Calendar className="h-4 w-4 text-slate-400" />} label="Registered Date" value={formatDateTime(hospital.createdAt)} />
            </div>
          </section>

          {/* SECTION 2: QUICK STATISTICS */}
          <section className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 2 · Operational Quick Statistics</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard title="Active Drivers" value={activeDriversCount} sub={`${connectedDrivers.length} Total`} icon={<Users className="h-4 w-4 text-blue-600" />} color="bg-blue-50 text-blue-700" />
              <StatCard title="Active Ambulances" value={activeAmbulancesCount} sub={`${connectedAmbulances.length} Total`} icon={<Ambulance className="h-4 w-4 text-emerald-600" />} color="bg-emerald-50 text-emerald-700" />
              <StatCard title="Active Emergencies" value={activeEmergencies.length} sub="In Progress" icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} color="bg-amber-50 text-amber-700" />
              <StatCard title="Completed" value={completedEmergencies.length} sub="Missions Done" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} color="bg-emerald-50 text-emerald-700" />
              <StatCard title="Avg Response" value="4.2m" sub="Target < 8m" icon={<Clock className="h-4 w-4 text-purple-600" />} color="bg-purple-50 text-purple-700" />
              <StatCard title="Pending Requests" value={pendingRequestsCount} sub="Awaiting Action" icon={<ShieldAlert className="h-4 w-4 text-orange-600" />} color="bg-orange-50 text-orange-700" />
            </div>
          </section>

          {/* SECTION 3: CONNECTED DRIVERS */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Section 3 · Connected Drivers ({allHospitalDrivers.length})
              </h3>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-slate-600" onClick={() => navigate("/admin/drivers")}>
                View all <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            {allHospitalDrivers.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No drivers registered for this hospital.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {allHospitalDrivers.map((driver) => (
                  <div key={driver.id} className="flex items-center justify-between py-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {(driver.fullName || driver.driverName || "D")[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{driver.fullName || driver.driverName}</p>
                        <p className="text-[11px] text-slate-400">{driver.phone || driver.licenseNumber || "Driver"}</p>
                      </div>
                    </div>
                    {driver.status ? (
                      <VerificationStatusBadge status={driver.status} />
                    ) : (
                      <StatusBadge status={driver.availability === "on_trip" ? "En Route" : "Available"} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECTION 4: CONNECTED AMBULANCES */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Section 4 · Connected Ambulances ({allHospitalAmbulances.length})
              </h3>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-slate-600" onClick={() => navigate("/admin/ambulances")}>
                View all <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            {allHospitalAmbulances.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No ambulances assigned to this hospital.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {allHospitalAmbulances.map((unit) => (
                  <div key={unit.id} className="flex items-center justify-between py-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Ambulance className="h-4 w-4 text-emerald-600" />
                      <div>
                        <p className="font-medium text-slate-900">{unit.numberPlate || unit.registrationNumber}</p>
                        <p className="text-[11px] text-slate-400">{unit.vehicleType || "Standard ICU"} · {unit.capacity || "12 Seater"}</p>
                      </div>
                    </div>
                    {unit.status ? (
                      <VerificationStatusBadge status={unit.status} />
                    ) : (
                      <StatusBadge status={unit.availability === "available" ? "Available" : unit.availability === "on_trip" ? "En Route" : "Offline"} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECTION 5: ACTIVE EMERGENCIES */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Section 5 · Active Emergencies ({activeEmergencies.length})
              </h3>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-slate-600" onClick={() => navigate("/admin/emergencies")}>
                View all <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            {activeEmergencies.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No active emergencies for this hospital right now.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activeEmergencies.map((emergency) => (
                  <div key={emergency.id} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 text-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-600 uppercase">{emergency.priority || "P1 Critical"}</span>
                        <span className="text-slate-700 font-medium">{emergency.patientName || emergency.patient || "Patient"}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Assigned: {emergency.ambulanceId || emergency.assignedAmbulance || "Units en route"}</p>
                    </div>
                    <div className="text-right">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                        {emergency.status || "Dispatched"}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">ETA: {emergency.eta || "4 mins"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECTION 6: RECENT ACTIVITY */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Section 6 · Recent Activity ({hospitalActivity.length})
              </h3>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-slate-600" onClick={() => navigate("/admin/activity-logs")}>
                View logs <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
            {hospitalActivity.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No recent activity logs for this hospital.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {hospitalActivity.slice(0, 5).map((log) => (
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

          {/* SECTION 7: PERFORMANCE SUMMARY */}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 7 · Performance Metrics</h3>
            <div className="space-y-3">
              <MetricProgress label="Average Response Time" value="4.2 mins" percent={82} color="bg-emerald-500" />
              <MetricProgress label="Average Mission Duration" value="18.5 mins" percent={75} color="bg-blue-500" />
              <MetricProgress label="Mission Success Rate" value="98.5%" percent={98} color="bg-purple-500" />
            </div>
          </section>

          {/* SECTION 8: QUICK ACTIONS */}
          <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 8 · Quick Operational Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" className="justify-center gap-1.5 text-xs py-2" onClick={() => navigate("/admin/drivers")}>
                <Users className="h-3.5 w-3.5" />
                <span>View Drivers</span>
              </Button>
              <Button variant="secondary" className="justify-center gap-1.5 text-xs py-2" onClick={() => navigate("/admin/ambulances")}>
                <Ambulance className="h-3.5 w-3.5" />
                <span>View Ambulances</span>
              </Button>
              <Button variant="secondary" className="justify-center gap-1.5 text-xs py-2" onClick={() => navigate("/admin/emergencies")}>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span>View Emergencies</span>
              </Button>
              <Button variant="secondary" className="justify-center gap-1.5 text-xs py-2" onClick={() => navigate("/admin/live-tracking")}>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span>Live Tracking</span>
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

function StatCard({ title, value, sub, icon, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400 uppercase">{title}</span>
        <div className={`p-1.5 rounded-lg ${color}`}>{icon}</div>
      </div>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
      <p className="text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

function MetricProgress({ label, value, percent, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
        <span>{label}</span>
        <span className="font-bold text-slate-950">{value}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
