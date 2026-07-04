import { Edit3, Trash2 } from "lucide-react";
import Button from "../ui/Button.jsx";
import DataTable from "../ui/DataTable.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";

export default function HospitalsTable({ rows, onEdit, onDelete }) {
  return (
    <DataTable
      rows={rows}
      emptyTitle="No hospitals match this view"
      columns={[
        {
          key: "name",
          header: "Hospital",
          render: (row) => (
            <div>
              <p className="font-medium text-slate-950">{row.name}</p>
              <p className="text-xs text-slate-500">{row.hospitalId}</p>
            </div>
          ),
        },
        { key: "city", header: "City", render: (row) => `${row.city || "—"}, ${row.state || "—"}` },
        { key: "phone", header: "Phone" },
        { key: "email", header: "Email" },
        {
          key: "isActive",
          header: "Status",
          render: (row) => <StatusBadge status={row.isActive ? "Operational" : "Offline"} />,
        },
        {
          key: "actions",
          header: "",
          render: (row) => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(row)} aria-label={`Edit ${row.name}`}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onDelete(row)} aria-label={`Delete ${row.name}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ),
        },
      ]}
    />
  );
}
