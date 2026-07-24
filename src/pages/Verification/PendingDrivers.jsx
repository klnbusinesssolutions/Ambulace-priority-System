import { useMemo, useState } from "react";
import { Eye, FileSearch } from "lucide-react";
import DataTable from "../../components/ui/DataTable.jsx";
import DocumentViewerModal from "../../components/ui/DocumentViewerModal.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import Button from "../../components/ui/Button.jsx";
import VerificationActionButtons from "../../components/ui/VerificationActionButtons.jsx";
import VerificationStatusBadge from "../../components/ui/VerificationStatusBadge.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime, matchesSearch } from "../../utils/formatters.js";
import { VERIFICATION_STATUS } from "../../firebase/collections.js";

function driverDocuments(driver) {
  const docs = driver.documents || {};
  return [
    docs.aadhaar && { label: "Aadhaar card", name: docs.aadhaar.name, type: docs.aadhaar.contentType, url: docs.aadhaar.downloadUrl },
    docs.drivingLicence && { label: "Driving licence", name: docs.drivingLicence.name, type: docs.drivingLicence.contentType, url: docs.drivingLicence.downloadUrl },
  ].filter(Boolean);
}

export default function PendingDrivers() {
  const { pendingDrivers, pendingDriversActions } = useOps();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState("");

  const rows = useMemo(
  () =>
    pendingDrivers.filter(
      (driver) =>
        driver.status === VERIFICATION_STATUS.pending &&
        matchesSearch(driver, query, [
          "fullName",
          "driverName",
          "email",
          "phone",
          "hospitalId",
          "licenseNumber",
        ]),
    ),
  [pendingDrivers, query],
); 

  function openReasonModal(kind, driver) {
    setSelected(driver);
    setReason("");
    setModal(kind);
  }

  async function confirmReasonAction() {
    if (modal === "reject") await pendingDriversActions.reject(selected, reason);
    if (modal === "resubmit") await pendingDriversActions.requestResubmission(selected, reason);
    setModal(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pending Drivers"
        description="Verification queue from the pending_drivers collection, written by hospital dashboards."
      />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
  <Input
    placeholder="Search by name, phone, licence..."
    value={query}
    onChange={(event) => setQuery(event.target.value)}
  />
</div>

      <DataTable
        rows={rows}
        emptyTitle="No pending driver requests"
        columns={[
          { key: "fullName", header: "Driver", render: (row) => <div><p className="font-medium text-slate-950">{row.fullName || row.driverName}</p><p className="text-xs text-slate-500">{row.id}</p></div> },
          { key: "hospitalId", header: "Hospital" },
          { key: "phone", header: "Phone" },
          { key: "licenseNumber", header: "Licence No." },
          { key: "status", header: "Status", render: (row) => <VerificationStatusBadge status={row.status} /> },
          { key: "submittedAt", header: "Submitted", render: (row) => formatDateTime(row.submittedAt) },
          {
            key: "actions",
            header: "",
            render: (row) => (
              <div className="flex flex-wrap justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setSelected(row); setModal("details"); }} aria-label="View details">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setSelected(row); setModal("documents"); }} aria-label="View documents">
                  <FileSearch className="h-4 w-4" />
                </Button>
                {row.status === VERIFICATION_STATUS.pending && (
  <VerificationActionButtons
    record={row}
    onVerify={(driver) => pendingDriversActions.approve(driver)}
    onReject={(driver) => openReasonModal("reject", driver)}
    onRequestResubmission={(driver) => openReasonModal("resubmit", driver)}
  />
)}
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={modal === "details"}
        title="Driver details"
        description={selected ? `${selected.fullName || selected.driverName} · ${selected.hospitalId}` : ""}
        onClose={() => setModal(null)}
      >
        {selected && (
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="Aadhaar number" value={selected.aadhaarNumber} />
            <Detail label="Licence number" value={selected.licenseNumber} />
            <Detail label="Licence expiry" value={selected.licenseExpiry} />
            <Detail label="Emergency contact" value={selected.emergencyContact} />
            <div className="sm:col-span-2">
              <Detail label="Address" value={`${selected.streetAddress || ""}, ${selected.city || ""}, ${selected.state || ""} ${selected.pincode || ""}`} />
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
        title={selected ? `${selected.fullName || selected.driverName} documents` : "Driver documents"}
        documents={selected ? driverDocuments(selected) : []}
        onClose={() => setModal(null)}
      />

      <Modal
        open={modal === "reject" || modal === "resubmit"}
        title={modal === "reject" ? "Reject driver" : "Request resubmission"}
        description={selected ? `${selected.fullName || selected.driverName} · ${selected.hospitalId}` : ""}
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
