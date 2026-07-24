import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/police/StatusBadge";
import { usePoliceStore } from "@/store/policeStore";
import { cn } from "@/utils/cn";
import { formatRelativeTime } from "@/utils/format";

const columns = [
  { key: "id", label: "Emergency" },
  { key: "driverName", label: "Driver" },
  { key: "ambulanceNumber", label: "Ambulance" },
  { key: "severity", label: "Severity" },
  { key: "eta", label: "ETA" },
  { key: "destinationHospital", label: "Destination" },
  { key: "status", label: "Status" },
  { key: "lastUpdated", label: "Updated" },
];

function SortableHead({ column, sortKey, sortDir, onSort }) {
  const isActive = sortKey === column.key;
  const Icon = isActive ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead>
      <button
        type="button"
        className="flex items-center gap-1 text-left font-semibold hover:text-slate-950"
        onClick={() => onSort(column.key)}
      >
        {column.label}
        <Icon className={cn("h-3 w-3", isActive ? "text-primary" : "text-slate-400")} />
      </button>
    </TableHead>
  );
}

export function EmergencyTable({ emergencies }) {
  const selectEmergency = usePoliceStore((state) => state.selectEmergency);
  const sortKey = usePoliceStore((state) => state.sortKey);
  const sortDir = usePoliceStore((state) => state.sortDir);
  const setSort = usePoliceStore((state) => state.setSort);

  if (!emergencies.length) {
    return <EmptyState title="No active emergencies match your search" />;
  }

  return (
    <Table>
      <TableHeader>
        <tr>
          {columns.map((column) => (
            <SortableHead key={column.key} column={column} sortKey={sortKey} sortDir={sortDir} onSort={setSort} />
          ))}
        </tr>
      </TableHeader>
      <TableBody>
        {emergencies.map((emergency) => (
          <TableRow
            key={emergency.id}
            className="cursor-pointer"
            onClick={() => selectEmergency(emergency.id)}
          >
            <TableCell>
              <div>
                <p className="font-semibold text-slate-900">{emergency.id}</p>
                <p className="text-xs text-slate-500">{emergency.type}</p>
              </div>
            </TableCell>
            <TableCell>{emergency.driverName}</TableCell>
            <TableCell className="font-medium">{emergency.ambulanceNumber}</TableCell>
            <TableCell>
              <StatusBadge value={emergency.severity} />
            </TableCell>
            <TableCell className="font-semibold text-slate-900">{emergency.eta}</TableCell>
            <TableCell>{emergency.destinationHospital}</TableCell>
            <TableCell>{emergency.status}</TableCell>
            <TableCell>{formatRelativeTime(emergency.lastUpdated)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
