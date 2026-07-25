import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck, XCircle, Copy, Check, Loader2 } from "lucide-react";
import DataTable from "../../components/ui/DataTable.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Button from "../../components/ui/Button.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime, matchesSearch } from "../../utils/formatters.js";
import { VERIFICATION_STATUS } from "../../firebase/collections.js";

export default function PendingPoliceOfficers() {
  const { pendingPoliceOfficers, pendingPoliceOfficersActions } = useOps();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [stationName, setStationName] = useState("");
  const [stationLat, setStationLat] = useState("");
  const [stationLng, setStationLng] = useState("");
  const [radiusKm, setRadiusKm] = useState("8");
  const [reason, setReason] = useState("");
  const [approving, setApproving] = useState(false);
  const [credential, setCredential] = useState(null);
  const [copied, setCopied] = useState(false);
  const unsubscribeCredentialRef = useRef(null);

  const rows = useMemo(
    () =>
      pendingPoliceOfficers
        .filter((request) => request.status === VERIFICATION_STATUS.pending)
        .filter((request) => matchesSearch(request, query, ["name", "badgeId", "email", "department"])),
    [pendingPoliceOfficers, query],
  );

  useEffect(() => {
    return () => unsubscribeCredentialRef.current?.();
  }, []);

  function openApproveModal(request) {
    setSelected(request);
    setApproving(false);
    setCredential(null);
    setCopied(false);
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
    setApproving(true);

    const overrides = {
      station: {
        name: stationName,
        lat: stationLat.trim() ? Number(stationLat) : null,
        lng: stationLng.trim() ? Number(stationLng) : null,
      },
      serviceRadiusKm: radiusKm.trim() ? Number(radiusKm) : 8,
    };

    const requestId = selected.id;
    try {
      const generatedCred = await pendingPoliceOfficersActions.approve(selected, overrides);
      if (generatedCred) {
        setCredential(generatedCred);
      }

      unsubscribeCredentialRef.current = await pendingPoliceOfficersActions.watchCredentials(
        requestId,
        (doc) => {
          if (doc) setCredential(doc);
        },
      );
    } catch (err) {
      console.error("Failed to approve police officer:", err);
    } finally {
      setApproving(false);
    }
  }

  function copyCredentials() {
    if (!credential) return;
    navigator.clipboard?.writeText(`Email: ${credential.email}\nTemporary password: ${credential.tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function closeApproveModal() {
    unsubscribeCredentialRef.current?.();
    unsubscribeCredentialRef.current = null;
    setModal(null);
  }

  async function confirmReject() {
    await pendingPoliceOfficersActions.reject(selected, reason);
    setModal(null);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pending Police Officers"
        description="Registration requests from the police dashboard (pending_police_officers). Approving one creates the officer's login automatically."
      />

      <div className="rounded-lg border border-slate-200 bg-white p-4">
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
                <p className="font-medium text-slate-950">{row.name}</p>
                <p className="text-xs text-slate-500">{row.id}</p>
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
                <p className="text-slate-950">{row.station?.name || "-"}</p>
                <p className="text-xs text-slate-500">
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
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openApproveModal(row)}>
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

      <Modal
        open={modal === "approve"}
        title="Approve police officer"
        description={selected ? `${selected.name} · Badge ${selected.badgeId}` : ""}
        onClose={closeApproveModal}
        footer={
          credential ? (
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={closeApproveModal}>
              Done
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={closeApproveModal} disabled={approving}>
                Cancel
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={confirmApprove} disabled={approving}>
                {approving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Approving...
                  </>
                ) : (
                  "Approve & create login"
                )}
              </Button>
            </>
          )
        }
      >
        {credential ? (
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="h-4 w-4" /> Account created. Share these credentials with the officer securely
              - they'll be asked to change the password on first login.
            </p>
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
                <p className="font-medium text-slate-900">{credential.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Temporary password</p>
                <p className="font-mono font-medium text-slate-900">{credential.tempPassword}</p>
              </div>
            </div>
            <Button variant="secondary" onClick={copyCredentials} className="w-full">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy email + password"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {approving && (
              <p className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Creating the account and generating a temporary
                password - this usually takes a few seconds.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2 block font-medium text-slate-700">
                Station name
                <Input
                  value={stationName}
                  onChange={(event) => setStationName(event.target.value)}
                  className="mt-1"
                  disabled={approving}
                />
              </label>
              <label className="block font-medium text-slate-700">
                Latitude
                <Input
                  value={stationLat}
                  onChange={(event) => setStationLat(event.target.value)}
                  placeholder="e.g. 18.5019"
                  className="mt-1"
                  disabled={approving}
                />
              </label>
              <label className="block font-medium text-slate-700">
                Longitude
                <Input
                  value={stationLng}
                  onChange={(event) => setStationLng(event.target.value)}
                  placeholder="e.g. 73.8636"
                  className="mt-1"
                  disabled={approving}
                />
              </label>
              <label className="col-span-2 block font-medium text-slate-700">
                Patrol radius (km)
                <Input
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(event.target.value)}
                  className="mt-1"
                  disabled={approving}
                />
              </label>
            </div>
            <p className="text-xs text-slate-500">
              Pre-filled from what the officer's browser captured at registration - correct it here if they weren't
              actually at the station, or if location permission was denied.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={modal === "reject"}
        title="Reject request"
        description={selected ? `${selected.name} · Badge ${selected.badgeId}` : ""}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmReject}>
              Confirm rejection
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
            placeholder="Explain why this request was rejected..."
          />
        </label>
      </Modal>
    </div>
  );
}
