import { useMemo } from "react";

import { filterByStationArea, isLiveEmergency } from "@/services/policeConstants";
import { usePoliceStore } from "@/store/policeStore";

export function useFilteredEmergencies() {
  const emergencies = usePoliceStore((state) => state.emergencies);
  const searchQuery = usePoliceStore((state) => state.searchQuery);
  const cityWide = usePoliceStore((state) => state.cityWide);
  const station = usePoliceStore((state) => state.currentOperator?.station);
  const serviceRadiusKm = usePoliceStore((state) => state.currentOperator?.serviceRadiusKm);

  return useMemo(() => {
    const live = emergencies.filter(isLiveEmergency);

    const inArea = filterByStationArea(
      live,
      { station, radiusKm: serviceRadiusKm, cityWide },
      (emergency) => emergency.coordinates,
    );

    const query = searchQuery.trim().toLowerCase();
    if (!query) return inArea;

    return inArea.filter((emergency) =>
      [
        emergency.id,
        emergency.type,
        emergency.driverName,
        emergency.ambulanceNumber,
        emergency.severity,
        emergency.destinationHospital,
        emergency.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [emergencies, searchQuery, station, serviceRadiusKm, cityWide]);
}
