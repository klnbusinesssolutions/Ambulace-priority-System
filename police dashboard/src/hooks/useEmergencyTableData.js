import { useMemo } from "react";

import { useFilteredEmergencies } from "@/hooks/useFilteredEmergencies";
import { usePoliceStore } from "@/store/policeStore";

function compareValues(a, b) {
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
  return (a ?? 0) - (b ?? 0);
}

export function useEmergencyTableData() {
  const searched = useFilteredEmergencies();
  const filters = usePoliceStore((state) => state.emergencyFilters);
  const sortKey = usePoliceStore((state) => state.sortKey);
  const sortDir = usePoliceStore((state) => state.sortDir);
  const page = usePoliceStore((state) => state.page);
  const pageSize = usePoliceStore((state) => state.pageSize);

  return useMemo(() => {
    let rows = searched;

    if (filters.severity !== "All") rows = rows.filter((e) => e.severity === filters.severity);
    if (filters.hospital !== "All") rows = rows.filter((e) => e.destinationHospital === filters.hospital);
    if (filters.status !== "All") rows = rows.filter((e) => e.status === filters.status);
    if (filters.area !== "All") rows = rows.filter((e) => e.area === filters.area);
    if (filters.driverName !== "All") rows = rows.filter((e) => e.driverName === filters.driverName);

    const sorted = [...rows].sort((a, b) => {
      const result = compareValues(a[sortKey], b[sortKey]);
      return sortDir === "asc" ? result : -result;
    });

    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);

    return { rows: pageRows, totalRows: sorted.length, totalPages, page: safePage };
  }, [searched, filters, sortKey, sortDir, page, pageSize]);
}
