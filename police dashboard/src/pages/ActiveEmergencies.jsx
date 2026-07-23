import { DetailsDrawer } from "@/components/emergencies/DetailsDrawer";
import { EmergencyFilterBar } from "@/components/emergencies/EmergencyFilterBar";
import { EmergencyTable } from "@/components/emergencies/EmergencyTable";
import { TablePagination } from "@/components/emergencies/TablePagination";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmergencyTableData } from "@/hooks/useEmergencyTableData";
import { useFilteredEmergencies } from "@/hooks/useFilteredEmergencies";
import { usePoliceStore } from "@/store/policeStore";

export function ActiveEmergencies() {
  const allEmergencies = useFilteredEmergencies();
  const { rows, totalRows, totalPages, page } = useEmergencyTableData();
  const setPage = usePoliceStore((state) => state.setPage);

  return (
    <>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Emergency operations</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Active Emergencies</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live Emergency Queue</CardTitle>
          <span className="text-xs text-slate-500">{totalRows} matching records</span>
        </CardHeader>
        <EmergencyFilterBar emergencies={allEmergencies} />
        <EmergencyTable emergencies={rows} />
        <TablePagination page={page} totalPages={totalPages} totalRows={totalRows} onPageChange={setPage} />
      </Card>

      <DetailsDrawer />
    </>
  );
}
