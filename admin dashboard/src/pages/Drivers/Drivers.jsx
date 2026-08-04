import { useMemo, useState } from "react";
import { Ban, MapPin } from "lucide-react";
import DataTable from "../../components/ui/DataTable.jsx";
import Input from "../../components/ui/Input.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { useOverlay } from "../../context/OverlayContext.jsx";
import { formatDateTime, matchesSearch } from "../../utils/formatters.js";

const availabilityStatus = {
  available: "Available",
  on_trip: "On Call",
  offline: "Offline",
};

export default function Drivers() {
  const { drivers = [], driversActions } = useOps();
  const { openDrawer } = useOverlay();
  const [query, setQuery] = useState("");
  const [hospital, setHospital] = useState("All hospitals");
  const [confirmRemove, setConfirmRemove] = useState(null);
  const hospitals = ["All hospitals", ...Array.from(new Set(drivers.map((driver) => driver.hospitalName).filter(Boolean)))];

  const rows = useMemo(
    () =>
      drivers.filter(
        (driver) =>
          (hospital === "All hospitals" || driver.hospitalName === hospital) &&
          matchesSearch(driver, query, ["name", "phone", "hospitalName", "email"]),
      ),
    [drivers, query, hospital],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Drivers"
        description="Live view of the drivers collection, written by the Android driver app once an account is approved."
      />
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[minmax(220px,1fr)_240px]">
        <Input placeholder="Search drivers..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select value={hospital} onChange={(event) => setHospital(event.target.value)} options={hospitals} />
      </div>
      <DataTable
        rows={rows}
        emptyTitle="No drivers found"
        onRowClick={(row) => openDrawer({ type: "driver", item: row })}
        columns={[
          { key: "name", header: "Driver", render: (row) => <div><p className="font-medium text-slate-950 dark:text-slate-100">{row.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{row.phone || row.email || "Active Driver"}</p></div> },
          { key: "hospitalName", header: "Hospital" },
          { key: "phone", header: "Phone" },
          { key: "email", header: "Email" },
          { key: "availability", header: "Availability", render: (row) => <StatusBadge status={availabilityStatus[row.availability] || row.availability} /> },
          { key: "tripStatus", header: "Trip Status", render: (row) => <StatusBadge status={row.tripStatus === "on_trip" ? "En Route" : row.tripStatus === "completed" ? "Approved" : "Standby"} /> },
          {
            key: "location",
            header: "Last Location",
            render: (row) =>
              row.location ? (
                <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {row.location.latitude?.toFixed(3)}, {row.location.longitude?.toFixed(3)}
                </span>
              ) : (
                "—"
              ),
          },
          { key: "tripStatusUpdatedAt", header: "Updated", render: (row) => (row.tripStatusUpdatedAt ? formatDateTime(row.tripStatusUpdatedAt) : "—") },
          {
            key: "actions",
            header: "",
            render: (row) => (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmRemove(row);
                }}
                aria-label={`Remove ${row.name}`}
              >
                <Ban className="h-4 w-4 text-red-600" />
              </Button>
            ),
          },
        ]}
      />

      <Modal
        open={Boolean(confirmRemove)}
        title="Remove driver"
        description={confirmRemove ? `Remove ${confirmRemove.name} from the drivers collection.` : ""}
        onClose={() => setConfirmRemove(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRemove(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { driversActions.remove(confirmRemove.id); setConfirmRemove(null); }}>Remove</Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">This revokes the driver's operational record. They'll need to be re-approved via a new pending_drivers request to regain access.</p>
      </Modal>
    </div>
  );
}
