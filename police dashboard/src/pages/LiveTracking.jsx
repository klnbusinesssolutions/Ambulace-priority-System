import { DetailsDrawer } from "@/components/emergencies/DetailsDrawer";
import { EmergencyCard } from "@/components/emergencies/EmergencyCard";
import { MapContainer } from "@/components/maps/MapContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFilteredEmergencies } from "@/hooks/useFilteredEmergencies";
import { usePoliceStore } from "@/store/policeStore";

export function LiveTracking() {
  const emergencies = useFilteredEmergencies();
  const hospitals = usePoliceStore((state) => state.hospitals);
  const trafficReports = usePoliceStore((state) => state.trafficReports);

  return (
    <>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Realtime route visibility</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Live Tracking</h1>
      </div>

      <div className="flex flex-col gap-4">
        <MapContainer emergencies={emergencies} hospitals={hospitals} trafficReports={trafficReports} />

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Units On Map</CardTitle>
            <span className="text-xs text-slate-500">{emergencies.length} routes</span>
          </CardHeader>
          <CardContent>
            {emergencies.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No active units to display right now.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {emergencies.map((emergency) => (
                  <EmergencyCard key={emergency.id} emergency={emergency} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DetailsDrawer />
    </>
  );
}
