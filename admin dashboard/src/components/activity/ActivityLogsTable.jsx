import { formatDateTime } from "../../utils/formatters.js";
import DataTable from "../ui/DataTable.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";

const actionTone = {
  driver_approved: "Approved",
  ambulance_approved: "Approved",
  driver_rejected: "Rejected",
  ambulance_rejected: "Rejected",
  driver_resubmission_requested: "Resubmission Required",
  ambulance_resubmission_requested: "Resubmission Required",
};

export default function ActivityLogsTable({ rows }) {
  return (
    <DataTable
      rows={rows}
      emptyTitle="No activity logs match this view"
      columns={[
        { key: "createdAt", header: "Time", render: (row) => formatDateTime(row.createdAt) },
        { key: "performedBy", header: "Performed By" },
        { key: "hospitalId", header: "Hospital" },
        { key: "action", header: "Action", render: (row) => <span className="whitespace-normal text-slate-700">{row.action?.replaceAll("_", " ")}</span> },
        { key: "details", header: "Details", render: (row) => <span className="whitespace-normal text-slate-500">{row.details}</span> },
        { key: "status", header: "Outcome", render: (row) => <StatusBadge status={actionTone[row.action] || "Logged"} /> },
      ]}
    />
  );
}
