import { useNavigate } from "react-router-dom";
import { formatDateTime } from "../../utils/formatters.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";

export default function ActivityFeed({ logs }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => navigate("/admin/activity-logs")}
        title="Click to open Activity Logs"
      >
        <CardTitle>Realtime Activity</CardTitle>
        <CardDescription>Operational events from dispatch, fleet, hospital, and access systems.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {logs.slice(0, 5).map((log) => (
          <div
            key={log.id}
            onClick={() => navigate("/admin/activity-logs")}
            className="flex gap-3 cursor-pointer rounded-md p-1.5 transition-colors hover:bg-slate-50"
            title="Click to open activity log detail"
          >
            <div className="mt-1 h-2 w-2 rounded-full bg-slate-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-slate-950">{log.details || log.action?.replaceAll("_", " ")}</p>
                <StatusBadge status={log.action?.includes("rejected") ? "Rejected" : log.action?.includes("resubmission") ? "Resubmission Required" : "Approved"} />
              </div>
              <p className="mt-1 text-xs text-slate-500">{log.performedBy} · {formatDateTime(log.createdAt)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
