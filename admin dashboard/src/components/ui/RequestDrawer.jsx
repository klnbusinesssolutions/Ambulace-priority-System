import { useEffect, useState } from "react";
import { ExternalLink, X, User, Ambulance, Building2, ShieldCheck, FileText, Eye, Check, Loader2 } from "lucide-react";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime } from "../../utils/formatters.js";
import { getHospitalDisplayId } from "../../utils/entityDisplay.js";
import { VERIFICATION_STATUS } from "../../firebase/collections.js";
import { resolveNotificationByTargetId } from "../../services/firestore/notificationsService.js";
import Button from "./Button.jsx";
import Modal from "./Modal.jsx";
import DocumentViewerModal from "./DocumentViewerModal.jsx";
import VerificationStatusBadge from "./VerificationStatusBadge.jsx";
import StatusBadge from "./StatusBadge.jsx";

export function extractRequestDocuments(type, record) {
  if (!record) return [];

  const docs = record.documents || {};
  const list = [];

  const addDoc = (key, defaultLabel, fallbackUrl) => {
    const d = docs[key];
    const url = d?.downloadUrl || d?.url || (typeof d === "string" ? d : null) || fallbackUrl;
    if (url) {
      const mimeType =
        d?.contentType ||
        (url.match(/\.(jpg|jpeg|png|webp|gif)/i) ? "image/jpeg" : url.includes(".pdf") ? "application/pdf" : "image/jpeg");
      list.push({
        key,
        label: d?.label || defaultLabel,
        name: d?.name || `${defaultLabel.toLowerCase().replace(/\s+/g, "_")}.${mimeType.includes("pdf") ? "pdf" : "jpg"}`,
        type: mimeType,
        url,
      });
    }
  };

  if (type === "driver") {
    addDoc("aadhaar", "Aadhaar Card", record.aadhaarUrl);
    addDoc("drivingLicence", "Driving Licence", record.licenseUrl || record.drivingLicenceUrl);
    addDoc("driverPhoto", "Driver Photo", record.photoUrl || record.driverPhotoUrl);
    addDoc("vehicleRegistration", "Vehicle Registration", record.registrationUrl);
  } else if (type === "ambulance") {
    addDoc("rcBook", "RC Book", record.rcBookUrl);
    addDoc("insurance", "Insurance Certificate", record.insuranceUrl);
    addDoc("puc", "Pollution Certificate", record.pucUrl);
    addDoc("vehiclePhoto", "Vehicle Photo", record.vehiclePhotoUrl);
  } else if (type === "hospital") {
    addDoc("registrationCertificate", "Hospital Registration Certificate", record.registrationUrl);
    addDoc("license", "Hospital License", record.licenseUrl);
    addDoc("supporting", "Supporting Documents", record.supportingUrl || record.documentUrl);
  } else if (type === "police") {
    addDoc("idCard", "Police ID Card", record.idCardUrl);
    addDoc("badgeVerification", "Badge Verification", record.badgeUrl);
    addDoc("supporting", "Supporting Documents", record.supportingUrl || record.documentUrl);
  }

  return list;
}

export default function RequestDrawer({
  open,
  onClose,
  type,
  requestId,
  onViewFullDetails,
}) {
  const {
    pendingDrivers,
    pendingDriversActions,
    pendingAmbulances,
    pendingAmbulancesActions,
    hospitals,
    hospitalsActions,
    pendingPoliceOfficers,
    pendingPoliceOfficersActions,
  } = useOps();

  const [viewingDoc, setViewingDoc] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // 'approve' | 'reject' | null
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (viewingDoc) {
          setViewingDoc(null);
        } else if (confirmModal) {
          if (!processing) setConfirmModal(null);
        } else {
          onClose?.();
        }
      }
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, viewingDoc, confirmModal, processing]);

  if (!open) return null;

  // Resolve target record from live context collections
  let record = null;
  if (type === "driver") {
    record = pendingDrivers.find((d) => d.id === requestId);
  } else if (type === "ambulance") {
    record = pendingAmbulances.find((a) => a.id === requestId || a.ambulanceId === requestId);
  } else if (type === "hospital") {
    record = hospitals.find((h) => h.id === requestId || h.hospitalId === requestId);
  } else if (type === "police") {
    record = pendingPoliceOfficers.find((p) => p.id === requestId);
  }

  const documents = extractRequestDocuments(type, record);

  const isPending =
    record &&
    (record.status === "pending" ||
      record.status === VERIFICATION_STATUS.pending ||
      record.status === "resubmission_required" ||
      record.isPending === true);

  const getHeaderIcon = () => {
    switch (type) {
      case "driver":
        return <User className="h-5 w-5 text-amber-600" />;
      case "ambulance":
        return <Ambulance className="h-5 w-5 text-amber-600" />;
      case "hospital":
        return <Building2 className="h-5 w-5 text-amber-600" />;
      case "police":
        return <ShieldCheck className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (type) {
      case "driver":
        return "Driver Request Details";
      case "ambulance":
        return "Ambulance Request Details";
      case "hospital":
        return "Hospital Request Details";
      case "police":
        return "Police Officer Request Details";
      default:
        return "Request Details";
    }
  };

  async function handleApproveConfirm() {
    if (!record || processing) return;
    setProcessing(true);
    setErrorMsg("");

    try {
      if (type === "driver") {
        await pendingDriversActions.approve(record);
      } else if (type === "ambulance") {
        await pendingAmbulancesActions.approve(record);
      } else if (type === "police") {
        await pendingPoliceOfficersActions.approve(record);
      } else if (type === "hospital") {
        const targetId = record.id || record.hospitalId;
        await hospitalsActions.update(targetId, { status: "approved", isActive: true });
        await resolveNotificationByTargetId(targetId);
      }
      setConfirmModal(null);
      onClose();
    } catch (err) {
      console.error("In-drawer approval error:", err);
      setErrorMsg("Failed to approve request. Please check connection and try again.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleRejectConfirm() {
    if (!record || processing || !rejectionReason.trim()) return;
    setProcessing(true);
    setErrorMsg("");

    try {
      if (type === "driver") {
        await pendingDriversActions.reject(record, rejectionReason.trim());
      } else if (type === "ambulance") {
        await pendingAmbulancesActions.reject(record, rejectionReason.trim());
      } else if (type === "police") {
        await pendingPoliceOfficersActions.reject(record, rejectionReason.trim());
      } else if (type === "hospital") {
        const targetId = record.id || record.hospitalId;
        await hospitalsActions.update(targetId, { status: "rejected", isActive: false });
        await resolveNotificationByTargetId(targetId);
      }
      setConfirmModal(null);
      setRejectionReason("");
      onClose();
    } catch (err) {
      console.error("In-drawer rejection error:", err);
      setErrorMsg("Failed to reject request. Please check connection and try again.");
    } finally {
      setProcessing(false);
    }
  }

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

        {/* Slide-in Drawer Container */}
        <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 dark:text-slate-100 shadow-2xl transition-transform animate-in slide-in-from-right duration-250 ease-out">
          {/* Compact Drawer Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-slate-50/80 dark:bg-slate-900/90">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid h-8.5 w-8.5 shrink-0 place-items-center rounded-lg bg-amber-50 dark:bg-amber-950/50">
                {getHeaderIcon()}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-950 dark:text-slate-100 truncate">{getTitle()}</h2>
                <p className="text-[11px] text-slate-400 font-mono">ID: {requestId || "N/A"}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close drawer" className="h-8 w-8 shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Drawer Body - Read Only Details */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {errorMsg && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
                {errorMsg}
              </div>
            )}

            {!record ? (
              <div className="grid h-48 place-items-center text-center">
                <div>
                  <p className="text-sm font-medium text-slate-700">Loading request details...</p>
                  <p className="mt-1 text-xs text-slate-400">Record ID: {requestId}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                {/* Type 1: Driver */}
                {type === "driver" && (
                  <>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                      <div className="mt-1">
                        <VerificationStatusBadge status={record.status} />
                      </div>
                    </div>

                    <Detail label="Full Name" value={record.fullName || record.driverName} />
                    <Detail label="Hospital ID" value={record.hospitalId} />
                    <Detail label="Email Address" value={record.email} />
                    <Detail label="Phone Number" value={record.phone} />
                    <Detail label="Licence Number" value={record.licenseNumber} />
                    <Detail label="Licence Expiry" value={record.licenseExpiry} />
                    <Detail label="Aadhaar Number" value={record.aadhaarNumber} />
                    <Detail label="Emergency Contact" value={record.emergencyContact} />
                    <Detail
                      label="Address"
                      value={[record.streetAddress, record.city, record.state, record.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    />
                    <Detail label="Submitted Date" value={formatDateTime(record.submittedAt)} />
                  </>
                )}

                {/* Type 2: Ambulance */}
                {type === "ambulance" && (
                  <>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                      <div className="mt-1">
                        <VerificationStatusBadge status={record.status} />
                      </div>
                    </div>

                    <Detail label="Vehicle Number" value={record.numberPlate || record.registrationNumber} />
                    <Detail label="Registration Number" value={record.registrationNumber} />
                    <Detail label="Hospital ID" value={record.hospitalId} />
                    <Detail label="Vehicle Type" value={record.vehicleType} />
                    <Detail label="Capacity" value={record.capacity} />
                    <Detail label="Manufacturer / Model" value={`${record.manufacturer || "—"} ${record.model || ""}`} />
                    <Detail
                      label="Availability"
                      value={<StatusBadge status={record.availability === "available" ? "Available" : record.availability === "on_trip" ? "En Route" : "Offline"} />}
                    />
                    <Detail
                      label="Medical Capabilities"
                      value={
                        Array.isArray(record.medicalCapabilities)
                          ? record.medicalCapabilities.join(", ")
                          : record.medicalCapabilities || "None listed"
                      }
                    />
                    <Detail label="Submitted Date" value={formatDateTime(record.submittedAt)} />
                  </>
                )}

                {/* Type 3: Hospital */}
                {type === "hospital" && (
                  <>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                      <div className="mt-1">
                        <StatusBadge status={record.isActive ? "Operational" : "Offline"} />
                      </div>
                    </div>

                    <Detail label="Hospital Name" value={record.name || record.hospitalName} />
                    <Detail label="Hospital Code" value={record.hospitalCode || getHospitalDisplayId(record)} />
                    <Detail label="Phone Number" value={record.phone} />
                    <Detail label="Email Address" value={record.email} />
                    <Detail label="City / State" value={`${record.city || "—"}, ${record.state || "—"}`} />
                    <Detail label="Address / Location" value={record.address || record.location} />
                    <Detail label="Created Date" value={formatDateTime(record.createdAt)} />
                  </>
                )}

                {/* Type 4: Police Officer */}
                {type === "police" && (
                  <>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                      <div className="mt-1">
                        <VerificationStatusBadge status={record.status} />
                      </div>
                    </div>

                    <Detail label="Officer Name" value={record.name} />
                    <Detail label="Badge ID" value={record.badgeId} />
                    <Detail label="Department" value={record.department} />
                    <Detail label="Station Name" value={record.station?.name || "Not assigned"} />
                    <Detail label="Phone Number" value={record.phone} />
                    <Detail label="Email Address" value={record.email} />
                    <Detail label="Service Radius" value={record.serviceRadiusKm ? `${record.serviceRadiusKm} km` : "N/A"} />
                    <Detail label="Requested Date" value={formatDateTime(record.requestedAt || record.createdAt)} />
                  </>
                )}

                {/* Document Verification Section */}
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2.5">
                    Verification Documents ({documents.length})
                  </p>

                  {documents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
                      <FileText className="mx-auto h-6 w-6 text-slate-400" />
                      <p className="mt-1 text-xs font-medium text-slate-500">No documents uploaded.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((doc) => (
                        <div
                          key={doc.key}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-slate-900">{doc.label}</p>
                              <p className="truncate text-[11px] text-slate-400">{doc.name}</p>
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="shrink-0 gap-1.5 text-xs"
                            onClick={() => setViewingDoc(doc)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Preview</span>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer - Verification Actions & View Full Details */}
          <div className="border-t border-slate-100 p-4 bg-slate-50/50 space-y-2">
            {isPending && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white justify-center gap-1.5 text-xs py-2"
                  onClick={() => {
                    setErrorMsg("");
                    setConfirmModal("approve");
                  }}
                  disabled={processing}
                >
                  <Check className="h-4 w-4" />
                  <span>Approve</span>
                </Button>
                <Button
                  variant="danger"
                  className="justify-center gap-1.5 text-xs py-2"
                  onClick={() => {
                    setErrorMsg("");
                    setRejectionReason("");
                    setConfirmModal("reject");
                  }}
                  disabled={processing}
                >
                  <X className="h-4 w-4" />
                  <span>Reject</span>
                </Button>
              </div>
            )}

            <Button
              variant="secondary"
              className="w-full justify-center gap-2 text-xs py-2"
              onClick={() => onViewFullDetails?.(type, requestId)}
            >
              <span>View Full Details</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentViewerModal
        open={Boolean(viewingDoc)}
        title={viewingDoc?.label || "Verification document"}
        documents={viewingDoc ? [viewingDoc] : []}
        onClose={() => setViewingDoc(null)}
      />

      {/* Approval Confirmation Modal */}
      <Modal
        open={confirmModal === "approve"}
        title={`Approve ${type.charAt(0).toUpperCase() + type.slice(1)} Request`}
        description={record ? `Are you sure you want to approve request ${requestId}?` : ""}
        onClose={() => !processing && setConfirmModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmModal(null)} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={handleApproveConfirm}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>{processing ? "Approving..." : "Confirm Approval"}</span>
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Approving this request will verify the user/organization and move the notification out of Action Required.
        </p>
      </Modal>

      {/* Rejection Reason Modal */}
      <Modal
        open={confirmModal === "reject"}
        title={`Reject ${type.charAt(0).toUpperCase() + type.slice(1)} Request`}
        description={record ? `Please provide a reason for rejecting request ${requestId}.` : ""}
        onClose={() => !processing && setConfirmModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmModal(null)} disabled={processing}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="gap-1.5"
              onClick={handleRejectConfirm}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              <span>{processing ? "Rejecting..." : "Confirm Rejection"}</span>
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium text-slate-700">
          Rejection Reason <span className="text-red-500">*</span>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={4}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            placeholder="Explain why this request is being rejected..."
            disabled={processing}
          />
        </label>
      </Modal>
    </>
  );
}

function Detail({ label, value }) {
  return (
    <div className="border-b border-slate-100 pb-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 font-medium text-slate-900">{value || "Not provided"}</div>
    </div>
  );
}
