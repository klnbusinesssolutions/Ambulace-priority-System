import { useMemo, useState } from "react";
import AmbulancesTable from "../../components/ambulances/AmbulancesTable.jsx";
import Button from "../../components/ui/Button.jsx";
import DocumentViewerModal from "../../components/ui/DocumentViewerModal.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { matchesSearch } from "../../utils/formatters.js";

function ambulanceDocuments(ambulance) {
  const docs = ambulance.documents || {};
  return [
    docs.rcBook && { label: "RC book", name: docs.rcBook.name, type: docs.rcBook.contentType, url: docs.rcBook.downloadUrl },
    docs.insurance && { label: "Insurance", name: docs.insurance.name, type: docs.insurance.contentType, url: docs.insurance.downloadUrl },
    docs.puc && { label: "Pollution certificate", name: docs.puc.name, type: docs.puc.contentType, url: docs.puc.downloadUrl },
    docs.vehiclePhoto && { label: "Vehicle photo", name: docs.vehiclePhoto.name, type: docs.vehiclePhoto.contentType, url: docs.vehiclePhoto.downloadUrl },
  ].filter(Boolean);
}

export default function PendingAmbulances() {
  const { pendingAmbulances, pendingAmbulancesActions } = useOps();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState("");

  const rows = useMemo(
    () =>
      pendingAmbulances.filter(
        (unit) =>
          (status === "All statuses" || unit.status === status) &&
          matchesSearch(unit, query, ["numberPlate", "registrationNumber", "hospitalId", "vehicleType"]),
      ),
    [pendingAmbulances, query, status],
  );

  function openReasonModal(kind, unit) {
    setSelected(unit);
    setReason("");
    setModal(kind);
  }

  async function confirmReasonAction() {
    if (modal === "reject") await pendingAmbulancesActions.reject(selected, reason);
    if (modal === "resubmit") await pendingAmbulancesActions.requestResubmission(selected, reason);
    setModal(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pending Ambulances"
        description="Verification queue from the pending_ambulances collection, written by hospital dashboards."
      />
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(220px,1fr)_220px]">
        <Input placeholder="Search vehicle number..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select value={status} onChange={(event) => setStatus(event.target.value)} options={["All statuses", "pending", "approved", "rejected", "resubmission_required"]} />
      </div>

      <AmbulancesTable
        rows={rows}
        onApprove={(unit) => pendingAmbulancesActions.approve(unit)}
        onReject={(unit) => openReasonModal("reject", unit)}
        onRequestResubmission={(unit) => openReasonModal("resubmit", unit)}
        onViewDetails={(unit) => { setSelected(unit); setModal("details"); }}
        onViewDocuments={(unit) => { setSelected(unit); setModal("documents"); }}
      />

      <Modal
        open={modal === "details"}
        title="Ambulance details"
        description={selected ? `${selected.numberPlate} · ${selected.hospitalId}` : ""}
        onClose={() => setModal(null)}
      >
        {selected && (
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="Manufacturer / Model" value={`${selected.manufacturer || "—"} ${selected.model || ""}`} />
            <Detail label="Registration number" value={selected.registrationNumber} />
            <Detail label="Vehicle type" value={selected.vehicleType} />
            <Detail label="Capacity" value={selected.capacity} />
            <div className="sm:col-span-2">
              <Detail label="Medical capabilities" value={(selected.medicalCapabilities || []).join(", ") || "None listed"} />
            </div>
            {selected.rejectionReason && (
              <div className="sm:col-span-2">
                <Detail label="Rejection reason" value={selected.rejectionReason} />
              </div>
            )}
          </div>
        )}
      </Modal>

      <DocumentViewerModal
        open={modal === "documents"}
        title={selected ? `${selected.numberPlate} documents` : "Ambulance documents"}
        documents={selected ? ambulanceDocuments(selected) : []}
        onClose={() => setModal(null)}
      />

      <Modal
        open={modal === "reject" || modal === "resubmit"}
        title={modal === "reject" ? "Reject ambulance" : "Request resubmission"}
        description={selected ? `${selected.numberPlate} · ${selected.hospitalId}` : ""}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant={modal === "reject" ? "danger" : "primary"} onClick={confirmReasonAction}>
              {modal === "reject" ? "Confirm rejection" : "Request resubmission"}
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium text-slate-700">
          Reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            placeholder="Explain what needs to change..."
          />
        </label>
      </Modal>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-900">{value || "Not provided"}</p>
    </div>
  );
}
