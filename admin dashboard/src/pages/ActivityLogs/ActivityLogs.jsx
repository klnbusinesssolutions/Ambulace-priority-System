import { useMemo, useState } from "react";
import ActivityLogsTable from "../../components/activity/ActivityLogsTable.jsx";
import Input from "../../components/ui/Input.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { matchesSearch } from "../../utils/formatters.js";

export default function ActivityLogs() {
  const { activityLogs } = useOps();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("All actions");

  const actions = ["All actions", ...Array.from(new Set(activityLogs.map((log) => log.action).filter(Boolean)))];

  const rows = useMemo(
    () =>
      activityLogs.filter(
        (log) => (action === "All actions" || log.action === action) && matchesSearch(log, query, ["performedBy", "action", "details", "hospitalId", "targetId"]),
      ),
    [activityLogs, query, action],
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Activity Logs" description="Audit trail from the activity_logs collection — every approval, rejection, and admin action." />
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row">
        <Input placeholder="Search logs..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <Select className="sm:w-56" value={action} onChange={(event) => setAction(event.target.value)} options={actions} />
      </div>
      <ActivityLogsTable rows={rows} />
    </div>
  );
}
