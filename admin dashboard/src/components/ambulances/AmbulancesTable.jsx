import { Check, Eye, FileSearch, Loader2, Pencil, RotateCcw, X } from "lucide-react";
import { formatDateTime } from "../../utils/formatters.js";
import Button from "../ui/Button.jsx";
import DataTable from "../ui/DataTable.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";
import VerificationStatusBadge from "../ui/VerificationStatusBadge.jsx";

export default function AmbulancesTable({
  rows,
  onApprove,
  onReject,
  onRequestResubmission,
  onViewDetails,
  onViewDocuments,
  onEdit,
  showVerificationActions = true,
  actionId = null,
}) {
  const columns = [
    {
      key: "numberPlate",
      header: "Vehicle Number",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-950">{row.numberPlate || row.registrationNumber}</p>
          <p className="text-xs text-slate-500">{row.id}</p>
        </div>
      ),
    },
    { key: "hospitalId", header: "Hospital" },
    { key: "vehicleType", header: "Type" },
    { key: "capacity", header: "Capacity" },
    { key: "availability", header: "Availability", render: (row) => <StatusBadge status={row.availability === "available" ? "Available" : row.availability === "on_trip" ? "En Route" : "Offline"} /> },
  ];

  if (showVerificationActions) {
    columns.push({ key: "status", header: "Verification Status", render: (row) => <VerificationStatusBadge status={row.status} /> });
  }

  columns.push({ key: "submittedAt", header: "Submitted Date", render: (row) => formatDateTime(row.submittedAt) });

  columns.push({
    key: "actions",
    header: "",
    render: (row) => (
      <div className="flex justify-end gap-1">
        {onEdit && (
          <Button variant="ghost" size="icon" onClick={() => onEdit(row)} aria-label={`Edit ${row.numberPlate}`} disabled={actionId === row.id}>
            <Pencil className="h-4 w-4 text-slate-600" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => onViewDetails(row)} aria-label={`View ${row.numberPlate}`}>
          <Eye className="h-4 w-4" />
        </Button>
        {onViewDocuments && (
          <Button variant="ghost" size="icon" onClick={() => onViewDocuments(row)} aria-label={`View documents for ${row.numberPlate}`}>
            <FileSearch className="h-4 w-4" />
          </Button>
        )}
        {showVerificationActions && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onApprove(row)}
              aria-label={`Approve ${row.numberPlate}`}
              disabled={row.status === "approved" || actionId === row.id}
            >
              {actionId === row.id ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
              ) : (
                <Check className="h-4 w-4 text-emerald-700" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onReject(row)}
              aria-label={`Reject ${row.numberPlate}`}
              disabled={row.status === "rejected" || actionId === row.id}
            >
              <X className="h-4 w-4 text-red-700" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRequestResubmission(row)}
              aria-label={`Request resubmission for ${row.numberPlate}`}
              disabled={row.status === "resubmission_required" || actionId === row.id}
            >
              <RotateCcw className="h-4 w-4 text-orange-700" />
            </Button>
          </>
        )}
      </div>
    ),
  });


  return <DataTable rows={rows} emptyTitle="No ambulances match this view" columns={columns} />;
}
