import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  AlertTriangle,
  User,
  Ambulance,
  Building2,
  ShieldCheck,
  Clock,
  MapPin,
  Calendar,
  ExternalLink,
  Activity,
  CheckCircle2,
  FileText,
  Navigation,
  Copy,
  Code,
  ShieldAlert,
  RefreshCcw,
} from "lucide-react";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime } from "../../utils/formatters.js";
import Button from "../ui/Button.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import Select from "../ui/Select.jsx";
import Modal from "../ui/Modal.jsx";
import {
  CANONICAL_EMERGENCY_STATUS,
  EMERGENCY_STATUS_LABELS,
  EMERGENCY_TIMELINE_STAGES,
  getEmergencyTimelineStepIndex,
  normalizeEmergencyStatus,
} from "../../utils/emergencyLifecycle.js";
import {
  resolveAmbulancePlate,
  resolveDriverName,
  resolveHospitalName,
  getEmergencyDisplayId,
} from "../../utils/entityDisplay.js";
import { getCurrentAdmin } from "../../services/auth/adminAuthService.js";

const priorityBadgeMap = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export default function EmergencyDetailsDrawer({ open, emergency, onClose }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState("completed");
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);
  const [overrideError, setOverrideError] = useState("");

  const { drivers = [], ambulances = [], hospitals = [], activityLogs = [], emergenciesActions } = useOps();

  // Load current admin profile for Super Admin check
  useEffect(() => {
    async function loadAdmin() {
      try {
        const prof = await getCurrentAdmin();
        setCurrentAdmin(prof);
      } catch {
        setCurrentAdmin(null);
      }
    }
    if (open) {
      loadAdmin();
    }
  }, [open]);

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

  if (!open || !emergency) return null;

  const emgId = emergency.id;
  const hospId = emergency.hospitalId || emergency.assignedHospitalId;
  const ambId = emergency.ambulanceId || emergency.assignedAmbulance;
  const drvName = emergency.driverName || emergency.assignedDriver;

  const isSuperAdmin = currentAdmin?.role === "Super Admin" || currentAdmin?.role === "super_admin";
  const normStatus = normalizeEmergencyStatus(emergency.status);
  const activeTimelineIndex = getEmergencyTimelineStepIndex(emergency.status);

  // Derive related resource records
  const hospitalRecord = (hospitals || []).find((h) => h.id === hospId || h.hospitalId === hospId);
  const ambulanceRecord = (ambulances || []).find((a) => a.id === ambId || a.numberPlate === ambId);
  const driverRecord = (drivers || []).find((d) => d.name === drvName || d.fullName === drvName || d.id === emergency.driverId);

  const emergencyActivity = (activityLogs || []).filter(
    (log) =>
      log.targetId === emgId ||
      log.emergencyId === emgId ||
      (log.details && log.details.includes(emgId)),
  );

  const handleCopyId = () => {
    if (emgId) {
      navigator.clipboard.writeText(emgId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmOverride = async () => {
    if (!overrideReason.trim()) {
      setOverrideError("Please state a clear reason for the administrative status override.");
      return;
    }

    setIsSubmittingOverride(true);
    setOverrideError("");

    try {
      if (emergenciesActions?.overrideStatus) {
        await emergenciesActions.overrideStatus(
          emgId,
          targetStatus,
          overrideReason.trim(),
          emergency.status,
          emergency
        );
      }
      setShowOverrideModal(false);
      setOverrideReason("");
      onClose?.();
    } catch (err) {
      setOverrideError(err.message || "Failed to execute administrative override.");
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  return (
    <>
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
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 font-bold">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    {emergency.incidentType || "Emergency Incident"}
                  </h2>
                  <StatusBadge status={priorityBadgeMap[emergency.priority] || emergency.priority || "Critical"} />
                  <StatusBadge status={EMERGENCY_STATUS_LABELS[normStatus] || "Reported"} />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                  Ref ID: {getEmergencyDisplayId(emergency)}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close emergency details" className="h-8 w-8 shrink-0">
              <X className="h-4.5 w-4.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" />
            </Button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* SECTION 1: EMERGENCY OVERVIEW & TECHNICAL KEYS */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Section 1 · Emergency Overview</h3>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleCopyId}
                >
                  {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                  <span>{copied ? "Copied ID" : "Copy Doc ID"}</span>
                </Button>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 text-sm">
                <InfoItem icon={<AlertTriangle className="h-4 w-4 text-red-500" />} label="Priority Level" value={(emergency.priority || "critical").toUpperCase()} />
                <InfoItem icon={<Activity className="h-4 w-4 text-amber-500" />} label="Dispatch Status" value={EMERGENCY_STATUS_LABELS[normStatus] || normStatus} />
                <InfoItem icon={<Clock className="h-4 w-4 text-blue-500" />} label="Estimated ETA" value={emergency.eta ? `${emergency.eta}` : "4 mins"} />
                <InfoItem icon={<Calendar className="h-4 w-4 text-slate-400" />} label="Created Time" value={formatDateTime(emergency.createdAt || emergency.startTime || emergency.timestamp)} />
                <div className="sm:col-span-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Firestore Document ID</p>
                    <p className="font-mono font-medium text-slate-800 dark:text-slate-200">{emgId}</p>
                  </div>
                  <Code className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            </section>

            {/* SECTION 2: PATIENT INFORMATION */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 2 · Patient & Victim Information</h3>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <InfoItem icon={<User className="h-4 w-4 text-slate-400" />} label="Patient Name" value={emergency.patientName || emergency.patient || "Patient"} />
                <InfoItem icon={<FileText className="h-4 w-4 text-slate-400" />} label="Age / Gender" value={emergency.patientAge ? `${emergency.patientAge} yrs / ${emergency.patientGender || "M"}` : "38 yrs / Male"} />
                <InfoItem icon={<User className="h-4 w-4 text-slate-400" />} label="Contact Phone" value={emergency.patientPhone || emergency.contactPhone || "Emergency Line"} />
                <div className="sm:col-span-2">
                  <InfoItem icon={<FileText className="h-4 w-4 text-slate-400" />} label="Medical Notes" value={emergency.medicalNotes || emergency.condition || "Severe trauma - Immediate priority transport required."} />
                </div>
              </div>
            </section>

            {/* SECTION 3: DISPATCH INFORMATION */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 3 · Dispatch Assignment</h3>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <InfoItem icon={<Building2 className="h-4 w-4 text-slate-400" />} label="Hospital" value={hospitalRecord?.name || resolveHospitalName(hospId, hospitals)} />
                <InfoItem icon={<Ambulance className="h-4 w-4 text-emerald-600" />} label="Ambulance" value={ambulanceRecord?.numberPlate || resolveAmbulancePlate(ambId, ambulances)} />
                <InfoItem icon={<User className="h-4 w-4 text-blue-600" />} label="Driver" value={driverRecord?.name || resolveDriverName(drvName || emergency.driverId, drivers)} />
                <InfoItem icon={<ShieldCheck className="h-4 w-4 text-purple-600" />} label="Police Escort" value={emergency.policeOfficer || emergency.badgeId || "P-OFFICER-01"} />
              </div>
            </section>

            {/* SECTION 4: LOCATION */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 4 · Incident Location</h3>
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-slate-600 dark:text-slate-400" onClick={() => navigate("/admin/live-tracking")}>
                  Focus on Map <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
              {emergency.location ? (
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-mono font-medium">
                    <MapPin className="h-4 w-4 text-red-600 shrink-0" />
                    <span>{emergency.location.latitude?.toFixed(4)}, {emergency.location.longitude?.toFixed(4)}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 pl-6">{emergency.address || emergency.locationAddress || "Primary Emergency Junction Coordinates"}</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3 text-center">Location coordinates pending GPS lock.</p>
              )}
            </section>

            {/* SECTION 5: OPERATIONAL TIMELINE */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 5 · Operational Timeline Progression</h3>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {EMERGENCY_TIMELINE_STAGES.map((step, index) => {
                  const isDone = index <= activeTimelineIndex;
                  const stepTime =
                    index === 0
                      ? emergency.createdAt || emergency.startTime
                      : index === 1
                      ? emergency.assignedAt || emergency.hospitalAssignedAt
                      : index === 2
                      ? emergency.dispatchTime || emergency.dispatchedAt
                      : index === 3
                      ? emergency.arrivedTime || emergency.arrivedAt
                      : emergency.completedTime || emergency.completedAt;

                  return (
                    <div key={step.key} className="relative flex items-start gap-3 text-xs">
                      <div className={`absolute -left-6 top-0.5 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                        isDone ? "bg-emerald-500 text-white ring-2 ring-emerald-100 dark:ring-emerald-950" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                      }`}>
                        {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                      </div>
                      <div>
                        <p className={`font-semibold ${isDone ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>{step.label}</p>
                        <p className="text-[11px] text-slate-400">{stepTime ? formatDateTime(stepTime) : isDone ? "Completed" : "Pending"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SUPER ADMIN OVERRIDE CONTROLS */}
            {isSuperAdmin && (
              <section className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Administrative Controls</h3>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  As Super Admin, you can manually override this emergency dispatch status if operational state becomes desynchronized. All overrides require justification and are logged.
                </p>
                <Button
                  variant="secondary"
                  className="w-full justify-center gap-2 text-xs py-2 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800"
                  onClick={() => {
                    setTargetStatus("completed");
                    setOverrideReason("");
                    setOverrideError("");
                    setShowOverrideModal(true);
                  }}
                >
                  <ShieldAlert className="h-4 w-4" />
                  <span>Override Emergency Status</span>
                </Button>
              </section>
            )}

            {/* SECTION 6: RECENT ACTIVITY */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Section 6 · Incident Activity Logs ({emergencyActivity.length})
              </h3>
              {emergencyActivity.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No activity logs recorded for this emergency.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {emergencyActivity.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-start gap-2.5 py-1.5 border-b border-slate-50 dark:border-slate-800 text-xs">
                      <Activity className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{log.details || log.action}</p>
                        <p className="text-[11px] text-slate-400">{formatDateTime(log.createdAt || log.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 7: RELATED RESOURCES */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 shadow-xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 7 · Related Resources</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Hospital</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{hospitalRecord?.name || resolveHospitalName(hospId, hospitals)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => navigate("/admin/hospitals")}>
                    <Building2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase">Ambulance</p>
                    <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{ambulanceRecord?.numberPlate || resolveAmbulancePlate(ambId, ambulances)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => navigate("/admin/ambulances")}>
                    <Ambulance className="h-3.5 w-3.5 text-emerald-600" />
                  </Button>
                </div>
              </div>
            </section>

            {/* SECTION 8: QUICK ACTIONS */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Section 8 · Quick Navigation</h3>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="secondary" className="justify-center gap-1 text-xs py-2" onClick={() => navigate("/admin/drivers")}>
                  <User className="h-3.5 w-3.5" />
                  <span>Driver</span>
                </Button>
                <Button variant="secondary" className="justify-center gap-1 text-xs py-2" onClick={() => navigate("/admin/ambulances")}>
                  <Ambulance className="h-3.5 w-3.5" />
                  <span>Ambulance</span>
                </Button>
                <Button variant="secondary" className="justify-center gap-1 text-xs py-2" onClick={() => navigate("/admin/live-tracking")}>
                  <Navigation className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Tracking</span>
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* SUPER ADMIN OVERRIDE CONFIRMATION MODAL */}
      <Modal
        open={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        title="Super Admin Emergency Status Override"
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-3 text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              Administrative Emergency Override
            </p>
            <p>
              You are about to manually change the operational status of emergency <span className="font-mono font-bold">{emgId}</span>. This action will update Firestore, trigger driver/ambulance release if completed, and be recorded in audit logs.
            </p>
          </div>

          <div className="grid gap-3">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Current Status</label>
              <p className="font-bold text-slate-900 dark:text-slate-100">{EMERGENCY_STATUS_LABELS[normStatus] || normStatus}</p>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">New Target Status</label>
              <Select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                options={["reported", "assigned", "en_route", "arrived", "completed"]}
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Override Reason (Required)</label>
              <textarea
                rows={3}
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                placeholder="State the operational reason for this status override..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>
          </div>

          {overrideError && (
            <p className="text-red-600 font-semibold">{overrideError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowOverrideModal(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 text-white hover:bg-amber-700 gap-1.5"
              onClick={handleConfirmOverride}
              disabled={isSubmittingOverride}
            >
              {isSubmittingOverride ? (
                <>
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Confirm Override</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase">{label}</p>
        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{value || "Not provided"}</p>
      </div>
    </div>
  );
}
