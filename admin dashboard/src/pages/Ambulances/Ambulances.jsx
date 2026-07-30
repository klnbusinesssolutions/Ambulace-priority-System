import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import AmbulanceForm, { ambulanceDefaults } from "../../components/ambulances/AmbulanceForm.jsx";
import AmbulancesTable from "../../components/ambulances/AmbulancesTable.jsx";
import Button from "../../components/ui/Button.jsx";
import DocumentViewerModal from "../../components/ui/DocumentViewerModal.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { useOverlay } from "../../context/OverlayContext.jsx";
import { matchesSearch } from "../../utils/formatters.js";
import { validateAmbulanceForm, formatMedicalCapabilities } from "../../utils/ambulanceValidation.js";

function ambulanceDocuments(ambulance) {
  const docs = ambulance.documents || {};
  return [
    docs.rcBook && { label: "RC book", name: docs.rcBook.name, type: docs.rcBook.contentType, url: docs.rcBook.downloadUrl },
    docs.insurance && { label: "Insurance", name: docs.insurance.name, type: docs.insurance.contentType, url: docs.insurance.downloadUrl },
    docs.puc && { label: "Pollution certificate", name: docs.puc.name, type: docs.puc.contentType, url: docs.puc.downloadUrl },
    docs.vehiclePhoto && { label: "Vehicle photo", name: docs.vehiclePhoto.name, type: docs.vehiclePhoto.contentType, url: docs.vehiclePhoto.downloadUrl },
  ].filter(Boolean);
}

export default function Ambulances() {
  const { ambulances, hospitals, pendingAmbulancesActions } = useOps();
  const { openDrawer } = useOverlay();
  const [query, setQuery] = useState("");
  const [hospitalId, setHospitalId] = useState("All hospitals");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState(ambulanceDefaults);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const hospitalOptions = ["All hospitals", ...Array.from(new Set(ambulances.map((unit) => unit.hospitalId).filter(Boolean)))];

  const rows = useMemo(
    () =>
      ambulances.filter(
        (unit) =>
          (hospitalId === "All hospitals" || unit.hospitalId === hospitalId) &&
          matchesSearch(unit, query, ["numberPlate", "registrationNumber", "hospitalId", "vehicleType"]),
      ),
    [ambulances, query, hospitalId],
  );

  function openAdd() {
    setDraft(ambulanceDefaults);
    setErrorMsg("");
    setFieldErrors({});
    setModal("add");
  }

  function openEdit(record) {
    setDraft({ ...ambulanceDefaults, ...record });
    setErrorMsg("");
    setFieldErrors({});
    setModal("edit");
  }

  async function submitForm() {
    setErrorMsg("");
    setFieldErrors({});

    const formattedRegNum = (draft.registrationNumber || "").trim().toUpperCase();
    const formattedCap = formatMedicalCapabilities(draft.medicalCapabilities);

    const payload = {
      ...draft,
      registrationNumber: formattedRegNum,
      medicalCapabilities: formattedCap,
    };

    const errors = validateAmbulanceForm(payload);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg(Object.values(errors)[0]);
      return;
    }

    setSaving(true);
    try {
      if (modal === "edit") {
        await pendingAmbulancesActions.update(draft.id || draft.ambulanceId, payload);
      } else {
        await pendingAmbulancesActions.add(payload);
      }
      setModal(null);
    } catch (err) {
      console.error("Failed to save ambulance:", err);
      setErrorMsg(err.message || "Failed to save ambulance. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ambulances"
        description="Active fleet — pending_ambulances documents with status: approved."
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4" />Add ambulance</Button>}
      />
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(220px,1fr)_240px]">
        <Input placeholder="Search vehicle number..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select value={hospitalId} onChange={(event) => setHospitalId(event.target.value)} options={hospitalOptions} />
      </div>
      <AmbulancesTable
        rows={rows}
        showVerificationActions={false}
        onEdit={openEdit}
        onViewDetails={(row) => { setSelected(row); setModal("details"); }}
        onViewDocuments={(row) => { setSelected(row); setModal("documents"); }}
        onRowClick={(row) => openDrawer({ type: "ambulance", item: row })}
      />

      <Modal
        open={modal === "add" || modal === "edit"}
        title={modal === "edit" ? "Edit ambulance" : "Add ambulance"}
        description={modal === "edit" ? "Update vehicle parameters in pending_ambulances." : "Creates a pre-approved record directly in pending_ambulances."}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
            <Button onClick={submitForm} disabled={saving}>
              {saving ? "Saving..." : modal === "edit" ? "Save changes" : "Create ambulance"}
            </Button>
          </>
        }
      >
        {errorMsg && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
            {errorMsg}
          </div>
        )}
        <AmbulanceForm
          value={draft}
          onChange={(next) => {
            setDraft(next);
            setFieldErrors({});
          }}
          hospitals={hospitals}
          errors={fieldErrors}
        />
      </Modal>

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
            <Detail label="Active driver" value={selected.activeDriverId} />
            <Detail label="Assigned drivers" value={(selected.assignedDrivers || []).join(", ") || "None"} />
            <div className="sm:col-span-2">
              <Detail label="Medical capabilities" value={(selected.medicalCapabilities || []).join(", ") || "None listed"} />
            </div>
          </div>
        )}
      </Modal>

      <DocumentViewerModal
        open={modal === "documents"}
        title={selected ? `${selected.numberPlate} documents` : "Ambulance documents"}
        documents={selected ? ambulanceDocuments(selected) : []}
        onClose={() => setModal(null)}
      />
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

