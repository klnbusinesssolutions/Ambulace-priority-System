import { useMemo, useState } from "react";
import { ShieldCheck, XCircle } from "lucide-react";
import DataTable from "../../components/ui/DataTable.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Button from "../../components/ui/Button.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime, matchesSearch } from "../../utils/formatters.js";

export default function PendingPoliceOfficers() {
  const { pendingPoliceOfficers, pendingPoliceOfficersActions } = useOps();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [uid, setUid] = useState("");
  const [stationName, setStationName] = useState("");
  const [stationLat, setStationLat] = useState("");
  const [stationLng, setStationLng] = useState("");
  const [radiusKm, setRadiusKm] = useState("8");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const rows = useMemo(
    () =>
      pendingPoliceOfficers.filter((request) =>
        matchesSearch(request, query, ["name", "badgeId", "email", "department"]),
      ),
    [pendingPoliceOfficers, query],
  );

  function openOnboardModal(request) {
    setSelected(request);
    setUid("");
    setError("");
    setStationName(request.station?.name || "");
    setStationLat(request.station?.lat != null ? String(request.station.lat) : "");
    setStationLng(request.station?.lng != null ? String(request.station.lng) : "");
    setRadiusKm(request.serviceRadiusKm != null ? String(request.serviceRadiusKm) : "8");
    setModal("onboard");
  }

  function openRejectModal(request) {
    setSelected(request);
    setReason("");
    setModal("reject");
  }

  async function confirmOnboard() {
    if (!uid.trim()) {
      setError("Paste the Firebase Auth UID you created for this officer first.");
      return;
    }

    const requestWithStation = {
      ...selected,
      station: {
        name: stationName,
        lat: stationLat.trim() ? Number(stationLat) : null,
        lng: stationLng.trim() ? Number(stationLng) : null,
      },
      serviceRadiusKm: radiusKm.trim() ? Number(radiusKm) : 8,
    };

    await pendingPoliceOfficersActions.onboard(requestWithStation, uid.trim());
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
        description="Registration requests from the police dashboard (pending_police_officers). Onboarding is manual: create the Auth account in Firebase Console first, then paste the UID here."
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
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openOnboardModal(row)}>
                  <ShieldCheck className="h-4 w-4" />
                  Onboard
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
        open={modal === "onboard"}
        title="Onboard police officer"
        description={selected ? `${selected.name} · Badge ${selected.badgeId}` : ""}
        onClose={() => setModal(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={confirmOnboard}>
              Create profile doc
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="text-slate-600">
            1. Go to Firebase Console → Authentication → Add user, using {selected?.email || "the officer's email"}.
            <br />
            2. Copy the generated UID and paste it below. This writes their profile to{" "}
            <code className="rounded bg-slate-100 px-1">police_officers/&#123;uid&#125;</code> and removes this
            request from the pending queue.
          </p>
          <label className="block font-medium text-slate-700">
            Firebase Auth UID
            <Input
              value={uid}
              onChange={(event) => setUid(event.target.value)}
              placeholder="e.g. 8fK2n1QpRzT..."
              className="mt-1"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 block font-medium text-slate-700">
              Station name
              <Input value={stationName} onChange={(event) => setStationName(event.target.value)} className="mt-1" />
            </label>
            <label className="block font-medium text-slate-700">
              Latitude
              <Input
                value={stationLat}
                onChange={(event) => setStationLat(event.target.value)}
                placeholder="e.g. 18.5019"
                className="mt-1"
              />
            </label>
            <label className="block font-medium text-slate-700">
              Longitude
              <Input
                value={stationLng}
                onChange={(event) => setStationLng(event.target.value)}
                placeholder="e.g. 73.8636"
                className="mt-1"
              />
            </label>
            <label className="col-span-2 block font-medium text-slate-700">
              Patrol radius (km)
              <Input value={radiusKm} onChange={(event) => setRadiusKm(event.target.value)} className="mt-1" />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Pre-filled from what the officer's browser captured at registration - correct it here if they weren't
            actually at the station, or if location permission was denied.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
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
