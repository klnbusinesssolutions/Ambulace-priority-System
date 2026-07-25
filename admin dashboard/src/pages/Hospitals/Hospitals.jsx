import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import HospitalForm, { hospitalDefaults, getNextHospitalId } from "../../components/hospitals/HospitalForm.jsx";
import { validateHospitalForm } from "../../utils/hospitalValidation.js";
import HospitalsTable from "../../components/hospitals/HospitalsTable.jsx";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { matchesSearch } from "../../utils/formatters.js";

export default function Hospitals() {
  const { hospitals, hospitalsActions } = useOps();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState(hospitalDefaults);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const rows = useMemo(
    () =>
      hospitals.filter((hospital) => {
        const statusMatches =
          status === "All statuses" ||
          (status === "Active" && hospital.isActive) ||
          (status === "Inactive" && !hospital.isActive);
        return statusMatches && matchesSearch(hospital, query, ["name", "city", "state", "phone", "email", "hospitalId"]);
      }),
    [hospitals, query, status],
  );

  function openAdd() {
    const nextId = getNextHospitalId(hospitals);
    setDraft({ ...hospitalDefaults, hospitalId: nextId });
    setErrorMsg("");
    setFieldErrors({});
    setModal("add");
  }

  function openEdit(record) {
    setDraft(record);
    setErrorMsg("");
    setFieldErrors({});
    setModal("edit");
  }

  async function submit() {
    setErrorMsg("");
    setFieldErrors({});

    const errors = validateHospitalForm(draft, modal === "edit");
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg(Object.values(errors)[0]);
      return;
    }

    setSaving(true);
    try {
      if (modal === "edit") {
        await hospitalsActions.update(draft.hospitalId, draft);
      } else if (modal === "add") {
        await hospitalsActions.add(draft);
      }
      setModal(null);
    } catch (err) {
      console.error("Failed to save hospital:", err);
      setErrorMsg(err.message || "Failed to save hospital. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hospitals"
        description="Manage connected hospitals — synced live with the hospitals Firestore collection."
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4" />Add hospital</Button>}
      />
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row">
        <Input placeholder="Search hospitals..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select className="sm:w-52" value={status} onChange={(event) => setStatus(event.target.value)} options={["All statuses", "Active", "Inactive"]} />
      </div>
      <HospitalsTable rows={rows} onEdit={openEdit} onDelete={(record) => { setDraft(record); setModal("delete"); }} />

      <Modal
        open={modal === "add" || modal === "edit"}
        title={modal === "edit" ? "Edit hospital" : "Add hospital"}
        description={modal === "edit" ? "Update hospital profile details in Firestore." : "Auto-generates Hospital ID, creates Firebase Auth account, and saves hospital to Firestore."}
        onClose={() => setModal(null)}
        footer={<><Button variant="secondary" onClick={() => setModal(null)} disabled={saving}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? "Saving..." : modal === "edit" ? "Save changes" : "Create hospital"}</Button></>}
      >
        {errorMsg && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
            {errorMsg}
          </div>
        )}
        <HospitalForm
          value={draft}
          onChange={(next) => {
            setDraft(next);
            setFieldErrors({});
          }}
          errors={fieldErrors}
          isEdit={modal === "edit"}
        />
      </Modal>

      <Modal
        open={modal === "delete"}
        title="Delete hospital"
        description={`Remove ${draft.name} from Firestore.`}
        onClose={() => setModal(null)}
        footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button variant="danger" onClick={() => { hospitalsActions.remove(draft.hospitalId); setModal(null); }}>Delete</Button></>}
      >
        <p className="text-sm text-slate-600">This permanently deletes the hospital document. Related drivers and ambulances are not cascade-deleted.</p>
      </Modal>
    </div>
  );
}

