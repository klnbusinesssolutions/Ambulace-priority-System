import { useMemo, useState } from "react";
import { ShieldCheck, XCircle, Loader2, CheckCircle2 } from "lucide-react";
import DataTable from "../../components/ui/DataTable.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Button from "../../components/ui/Button.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime, matchesSearch } from "../../utils/formatters.js";
import { VERIFICATION_STATUS } from "../../firebase/collections.js";

export default function PendingPoliceOfficers() {
  const { pendingPoliceOfficers = [], pendingPoliceOfficersActions } = useOps();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [stationName, setStationName] = useState("");
  const [stationLat, setStationLat] = useState("");
  const [stationLng, setStationLng] = useState("");
  const [radiusKm, setRadiusKm] = useState("8");
  const [reason, setReason] = useState("");
  const [approving, setApproving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const rows = useMemo(
    () =>
      pendingPoliceOfficers
        .filter((request) => request.status === VERIFICATION_STATUS.pending)
        .filter((request) => matchesSearch(request, query, ["name", "badgeId", "email", "department"])),
    [pendingPoliceOfficers, query],
  );

  function openApproveModal(request) {
    setSelected(request);
    setApproving(false);
    setStationName(request.station?.name || "");
    setStationLat(request.station?.lat != null ? String(request.station.lat) : "");
    setStationLng(request.station?.lng != null ? String(request.station.lng) : "");
    setRadiusKm(request.serviceRadiusKm != null ? String(request.serviceRadiusKm) : "8");
    setModal("approve");
  }

  function openRejectModal(request) {
    setSelected(request);
    setReason("");
    setModal("reject");
  }

  async function confirmApprove() {
    if (!selected) return;
    setApproving(true);

    const overrides = {
      station: {
        name: stationName,
        lat: stationLat.trim() ? Number(stationLat) : null,
        lng: stationLng.trim() ? Number(stationLng) : null,
      },
      serviceRadiusKm: radiusKm.trim() ? Number(radiusKm) : 8,
    };

    try {
      await pendingPoliceOfficersActions.approve(selected, overrides);
      setModal(null);
      setSelected(null);
      setToastMessage("Police Officer approved successfully.");
      setTimeout(() => setToastMessage(""), 4000);
    } catch (err) {
      console.error("Failed to approve police officer:", err);
    } finally {
      setApproving(false);
    }
  }

  async function confirmReject() {
    if (!selected) return;
    try {
      await pendingPoliceOfficersActions.reject(selected, reason);
      setModal(null);
      setSelected(null);
    } catch (err) {
      console.error("Failed to reject police officer:", err);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pending Police Officers"
        description="Review and approve registration requests submitted by police officers."
      />

      {/* Success Toast Banner */}
      {toastMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 transition-all">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium">{toastMessage}</p>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <Input
          placeholder="Search by name, badge ID, email..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <DataTable
        rows={rows}
        emptyTitle="No pending police officer requests"
        columns={[
          {
            key: "name",
            header: "Officer",
            render: (row) => (
              <div>
                <p className="font-medium text-slate-950 dark:text-slate-100">{row.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{row.badgeId ? `Badge: ${row.badgeId}` : row.email || "Police Escort"}</p>
              </div>
            ),
          },
          { key: "badgeId", header: "Badge ID" },
          { key: "email", header: "Email" },
          { key: "department", header: "Department" },
          {
            key: "station",
            header: "Station",
            render: (row) => (
              <div>
                <p className="text-slate-950 dark:text-slate-100">{row.station?.name || "-"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {row.station?.lat && row.station?.lng
                    ? `${row.station.lat.toFixed(4)}, ${row.station.lng.toFixed(4)}`
                    : "No location captured"}
                </p>
              </div>
            ),
          },
          { key: "requestedAt", header: "Requested", render: (row) => formatDateTime(row.requestedAt) },
          {
            key: "actions",
            header: "",
            render: (row) => (
              <div className="flex flex-wrap justify-end gap-2">
                <Button className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white" onClick={() => openApproveModal(row)}>
                  <ShieldCheck className="h-4 w-4" />
                  Approve
                </Button>
                <Button variant="danger" onClick={() => openRejectModal(row)}>
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            ),
          },
        ]}
      />

      {/* APPROVE MODAL */}
      <Modal
        open={modal === "approve"}
        title="Approve Police Officer"
        description={selected ? `${selected.name} · Badge ${selected.badgeId}` : ""}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)} disabled={approving}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={confirmApprove} disabled={approving}>
              {approving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Approving...
                </>
              ) : (
                "Approve Police Officer"
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Approving this request will activate the officer's account using the credentials created during registration.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block font-medium text-slate-700 dark:text-slate-300">
              Station name
              <Input
                value={stationName}
                onChange={(event) => setStationName(event.target.value)}
                className="mt-1"
                disabled={approving}
              />
            </label>
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              Latitude
              <Input
                value={stationLat}
                onChange={(event) => setStationLat(event.target.value)}
                placeholder="e.g. 18.5019"
                className="mt-1"
                disabled={approving}
              />
            </label>
            <label className="block font-medium text-slate-700 dark:text-slate-300">
              Longitude
              <Input
                value={stationLng}
                onChange={(event) => setStationLng(event.target.value)}
                placeholder="e.g. 73.8636"
                className="mt-1"
                disabled={approving}
              />
            </label>
            <label className="col-span-2 block font-medium text-slate-700 dark:text-slate-300">
              Patrol radius (km)
              <Input
                value={radiusKm}
                onChange={(event) => setRadiusKm(event.target.value)}
                className="mt-1"
                disabled={approving}
              />
            </label>
          </div>
        </div>
      </Modal>

      {/* REJECT MODAL */}
      <Modal
        open={modal === "reject"}
        title="Reject Request"
        description={selected ? `${selected.name} · Badge ${selected.badgeId}` : ""}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmReject}>
              Confirm Rejection
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Reason for Rejection
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            className="mt-2 w-full rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 px-3 py-2 text-sm outline-none focus:border-slate-400"
            placeholder="Explain why this request was rejected..."
          />
        </label>
      </Modal>
    </div>
  );
}
