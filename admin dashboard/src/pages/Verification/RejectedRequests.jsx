import { useMemo, useState } from "react";
import DataTable from "../../components/ui/DataTable.jsx";
import Input from "../../components/ui/Input.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import Button from "../../components/ui/Button.jsx";
import VerificationStatusBadge from "../../components/ui/VerificationStatusBadge.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime, matchesSearch } from "../../utils/formatters.js";

export default function RejectedRequests() {
  const { pendingDrivers, pendingAmbulances, pendingDriversActions, pendingAmbulancesActions } = useOps();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All types");

  const combined = useMemo(() => {
    const rejectedDrivers = pendingDrivers
      .filter((driver) => driver.status === "rejected")
      .map((driver) => ({ kind: "Driver", id: driver.id, name: driver.fullName || driver.driverName, hospitalId: driver.hospitalId, reason: driver.rejectionReason, updatedAt: driver.updatedAt, raw: driver }));

    const rejectedAmbulances = pendingAmbulances
      .filter((unit) => unit.status === "rejected")
      .map((unit) => ({ kind: "Ambulance", id: unit.id, name: unit.numberPlate || unit.registrationNumber, hospitalId: unit.hospitalId, reason: unit.rejectionReason, updatedAt: unit.updatedAt, raw: unit }));

    return [...rejectedDrivers, ...rejectedAmbulances].filter(
      (item) => (type === "All types" || item.kind === type) && matchesSearch(item, query, ["name", "hospitalId", "reason"]),
    );
  }, [pendingDrivers, pendingAmbulances, query, type]);

  function requestResubmission(item) {
    if (item.kind === "Driver") pendingDriversActions.requestResubmission(item.raw, item.reason);
    else pendingAmbulancesActions.requestResubmission(item.raw, item.reason);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rejected Requests"
        description="Drivers and ambulances with status: rejected across pending_drivers and pending_ambulances."
      />
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(220px,1fr)_200px]">
        <Input placeholder="Search rejected requests..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select value={type} onChange={(event) => setType(event.target.value)} options={["All types", "Driver", "Ambulance"]} />
      </div>
      <DataTable
        rows={combined}
        emptyTitle="No rejected requests"
        columns={[
          { key: "kind", header: "Type" },
          { key: "name", header: "Name / Vehicle" },
          { key: "hospitalId", header: "Hospital" },
          { key: "reason", header: "Rejection reason", render: (row) => row.reason || "No reason given" },
          { key: "updatedAt", header: "Rejected on", render: (row) => formatDateTime(row.updatedAt) },
          { key: "status", header: "Status", render: () => <VerificationStatusBadge status="rejected" /> },
          {
            key: "actions",
            header: "",
            render: (row) => (
              <Button variant="secondary" size="sm" onClick={() => requestResubmission(row)}>
                Request resubmission
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
