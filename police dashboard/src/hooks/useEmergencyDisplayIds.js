import { useMemo } from "react";

import { usePoliceStore } from "@/store/policeStore";
import { buildEmergencyDisplayIds } from "@/utils/emergencyId";

// Built from the store's full, unfiltered emergency history (all statuses,
// all stations) so a given emergency's EMG-#### code is the same everywhere
// it's shown - Active Emergencies, Live Tracking, the Activity Feed history,
// and the details drawer - regardless of any station/status filtering
// applied on top for that particular view.
export function useEmergencyDisplayIds() {
  const emergencies = usePoliceStore((state) => state.emergencies);
  return useMemo(() => buildEmergencyDisplayIds(emergencies), [emergencies]);
}
