import { useOverlay } from "../../context/OverlayContext.jsx";
import HospitalDetailsDrawer from "../hospitals/HospitalDetailsDrawer.jsx";
import DriverDetailsDrawer from "../drivers/DriverDetailsDrawer.jsx";
import AmbulanceDetailsDrawer from "../ambulances/AmbulanceDetailsDrawer.jsx";
import EmergencyDetailsDrawer from "../emergencies/EmergencyDetailsDrawer.jsx";
import RequestDrawer from "../ui/RequestDrawer.jsx";

export default function GlobalDrawerContainer() {
  const { activeOverlay, closeOverlay } = useOverlay();

  if (activeOverlay?.type !== "DRAWER" || !activeOverlay?.payload) {
    return null;
  }

  const { payload } = activeOverlay;
  const drawerCategory = payload.type; // 'hospital' | 'driver' | 'ambulance' | 'emergency' | 'police'
  const item = payload.item;
  const targetId = payload.targetId || payload.requestId || item?.id || item?.hospitalId;

  // Determine if this is a pending verification request drawer vs standard entity details drawer
  const isRequestDrawer = payload.isRequest || drawerCategory === "police" || (!item && targetId);

  return (
    <>
      {/* Standard Hospital Drawer */}
      {drawerCategory === "hospital" && !isRequestDrawer && (
        <HospitalDetailsDrawer
          open={true}
          hospital={item}
          onClose={closeOverlay}
        />
      )}

      {/* Standard Driver Drawer */}
      {drawerCategory === "driver" && !isRequestDrawer && (
        <DriverDetailsDrawer
          open={true}
          driver={item}
          onClose={closeOverlay}
        />
      )}

      {/* Standard Ambulance Drawer */}
      {drawerCategory === "ambulance" && !isRequestDrawer && (
        <AmbulanceDetailsDrawer
          open={true}
          ambulance={item}
          onClose={closeOverlay}
        />
      )}

      {/* Standard Emergency Drawer */}
      {drawerCategory === "emergency" && !isRequestDrawer && (
        <EmergencyDetailsDrawer
          open={true}
          emergency={item}
          onClose={closeOverlay}
        />
      )}

      {/* Pending Request / Police Drawer */}
      {(isRequestDrawer || drawerCategory === "police") && (
        <RequestDrawer
          open={true}
          onClose={closeOverlay}
          type={drawerCategory}
          requestId={targetId}
          onViewFullDetails={payload.onViewFullDetails}
        />
      )}
    </>
  );
}
