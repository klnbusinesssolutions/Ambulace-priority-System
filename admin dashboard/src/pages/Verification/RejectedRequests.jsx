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
  const {
    pendingDrivers,
    pendingAmbulances,
    pendingPoliceOfficers,
    rejectedRequests,
    pendingDriversActions,
    pendingAmbulancesActions,
    pendingPoliceOfficersActions,
  } = useOps();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All types");
  const [errorMsg, setErrorMsg] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  const combined = useMemo(() => {
    const fromRejectedCollection = (rejectedRequests || []).map((doc) => {
      const reqType =
        doc.requestType ||
        (doc.licenseNumber || doc.aadhaarNumber ? "driver" : doc.numberPlate || doc.registrationNumber ? "ambulance" : "police_officer");
      if (reqType === "driver") {
        return {
          kind: "Driver",
          id: doc.id,
          name: doc.fullName || doc.driverName || "Driver",
          hospitalId: doc.hospitalId || "N/A",
          reason: doc.rejectionReason,
          updatedAt: doc.rejectedAt || doc.updatedAt,
          raw: doc,
        };
      } else if (reqType === "ambulance") {
        return {
          kind: "Ambulance",
          id: doc.id,
          name: doc.numberPlate || doc.registrationNumber || "Ambulance",
          hospitalId: doc.hospitalId || "N/A",
          reason: doc.rejectionReason,
          updatedAt: doc.rejectedAt || doc.updatedAt,
          raw: doc,
        };
      } else {
        return {
          kind: "Police Officer",
          id: doc.id,
          name: doc.name || doc.badgeId || "Police Officer",
          hospitalId: doc.station?.name || doc.hospitalId || "Police Dept",
          reason: doc.rejectionReason,
          updatedAt: doc.rejectedAt || doc.updatedAt || doc.requestedAt,
          raw: doc,
        };
      }
    });

    const collectionIds = new Set(fromRejectedCollection.map((i) => i.id));

    const rejectedDrivers = (pendingDrivers || [])
      .filter((driver) => driver.status === "rejected" && !collectionIds.has(driver.id))
      .map((driver) => ({
        kind: "Driver",
        id: driver.id,
        name: driver.fullName || driver.driverName,
        hospitalId: driver.hospitalId,
        reason: driver.rejectionReason,
        updatedAt: driver.updatedAt || driver.rejectedAt,
        raw: driver,
      }));

    const rejectedAmbulances = (pendingAmbulances || [])
      .filter((unit) => unit.status === "rejected" && !collectionIds.has(unit.id))
      .map((unit) => ({
        kind: "Ambulance",
        id: unit.id,
        name: unit.numberPlate || unit.registrationNumber,
        hospitalId: unit.hospitalId,
        reason: unit.rejectionReason,
        updatedAt: unit.updatedAt || unit.rejectedAt,
        raw: unit,
      }));

    const rejectedPolice = (pendingPoliceOfficers || [])
      .filter((officer) => officer.status === "rejected" && !collectionIds.has(officer.id))
      .map((officer) => ({
        kind: "Police Officer",
        id: officer.id,
        name: officer.name || officer.badgeId,
        hospitalId: officer.station?.name || "Police Dept",
        reason: officer.rejectionReason,
        updatedAt: officer.updatedAt || officer.requestedAt,
        raw: officer,
      }));

    return [...fromRejectedCollection, ...rejectedDrivers, ...rejectedAmbulances, ...rejectedPolice].filter(
      (item) => (type === "All types" || item.kind === type) && matchesSearch(item, query, ["name", "hospitalId", "reason"]),
    );
  }, [rejectedRequests, pendingDrivers, pendingAmbulances, pendingPoliceOfficers, query, type]);

  async function requestResubmission(item) {
    setErrorMsg("");
    setLoadingId(item.id);
    try {
      if (item.kind === "Driver") {
        await pendingDriversActions.requestResubmission(item.raw, item.reason);
      } else if (item.kind === "Ambulance") {
        await pendingAmbulancesActions.requestResubmission(item.raw, item.reason);
      } else if (item.kind === "Police Officer") {
        await pendingPoliceOfficersActions.requestResubmission(item.raw, item.reason);
      }
    } catch (err) {
      console.error("Failed to request resubmission:", err);
      setErrorMsg(err.message || "Failed to request resubmission. Please try again.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Rejected Requests"
        description="Drivers, ambulances, and police officer registration requests with status: rejected."
      />
      {errorMsg && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
          {errorMsg}
        </div>
      )}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[minmax(220px,1fr)_200px]">
        <Input placeholder="Search rejected requests..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select value={type} onChange={(event) => setType(event.target.value)} options={["All types", "Driver", "Ambulance", "Police Officer"]} />
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => requestResubmission(row)}
                disabled={loadingId === row.id}
              >
                {loadingId === row.id ? "Processing..." : "Request resubmission"}
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}

