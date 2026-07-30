import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmergencyCards from "../../components/emergencies/EmergencyCards.jsx";
import Input from "../../components/ui/Input.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { useOverlay } from "../../context/OverlayContext.jsx";
import { matchesSearch } from "../../utils/formatters.js";

export default function Emergencies() {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "All statuses";
  const initialPriority = searchParams.get("priority") || "All priority";

  const { emergencies, emergenciesActions } = useOps();
  const { openDrawer } = useOverlay();
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState(initialPriority);
  const [status, setStatus] = useState(initialStatus);

  const rows = useMemo(
    () =>
      emergencies.filter(
        (item) =>
          (priority === "All priority" || item.priority === priority) &&
          (status === "All statuses" || item.status === status) &&
          matchesSearch(item, query, ["id", "patientName", "incidentType", "hospitalId", "ambulanceId", "driverName"]),
      ),
    [emergencies, query, priority, status],
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Emergencies" description="Live incidents from the emergencies collection — priority, ETA, and dispatch status." />
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row">
        <Input placeholder="Search emergencies..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select className="sm:w-44" value={priority} onChange={(event) => setPriority(event.target.value)} options={["All priority", "critical", "high", "medium", "low"]} />
        <Select className="sm:w-48" value={status} onChange={(event) => setStatus(event.target.value)} options={["All statuses", "active", "dispatched", "arrived", "completed", "resolved"]} />
      </div>
      <EmergencyCards
        rows={rows}
        onStatusChange={(id, next) => emergenciesActions.updateStatus(id, next)}
        onCardClick={(emergency) => openDrawer({ type: "emergency", item: emergency })}
      />
    </div>
  );
}
