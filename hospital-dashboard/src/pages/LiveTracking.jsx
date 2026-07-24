import { useState } from 'react';
import { motion } from 'framer-motion';
import LiveMap from '../components/LiveMap';
import StatusBadge from '../components/StatusBadge';
import { useEmergencies } from '../hooks/useEmergencies';
import { useDriverLocations } from '../hooks/useDriverLocations';
import { useMemo } from 'react';

function LiveTracking() {
  const { emergencies, loading } = useEmergencies();
  const { driverLocations, loading: driversLoading } = useDriverLocations();
  const [selectedEmergencyId, setSelectedEmergencyId] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const activeEmergencies = useMemo(
  () => emergencies.filter((e) => e.status !== 'completed' && e.status !== 'resolved'),
  [emergencies]
);

  const selectedEmergency = emergencies.find((e) => e.id === selectedEmergencyId);

  return (
    <motion.section
      className="page-stack"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="title-group">
        <p className="eyebrow">GPS Monitoring</p>
        <h2>Live Emergency Tracking</h2>
        <p>
          Real-time GPS monitoring of ambulance units and emergency response
          coordination across the smart-city healthcare infrastructure.
        </p>
      </div>

      <section className="tracking-layout">
        <div className="panel tracking-map-panel glass-card">
          <LiveMap
  emergencies={activeEmergencies}
  driverLocations={driverLocations}
  selectedEmergencyId={selectedEmergencyId}
  onRouteInfo={setRouteInfo}
/>
        </div>

        <aside className="panel tracking-list glass-card">
          <div className="section-heading">
            <h3>Response Units</h3>
            <p>Active emergency response fleet status</p>
          </div>

          {selectedEmergency && (
            <div className="routing-panel" style={{ marginBottom: 12 }}>
              <div className="routing-panel-header">
                <div>
                  <span>Selected route</span>
                  <strong>{selectedEmergency.patientName || selectedEmergency.id}</strong>
                </div>
              </div>
              {routeInfo ? (
                <div className="routing-metrics">
                  <div>Distance: {routeInfo.distanceText || 'N/A'}</div>
                  <div>ETA (with traffic): {routeInfo.durationInTrafficText || routeInfo.durationText || 'N/A'}</div>
                </div>
              ) : (
                <p>Calculating route...</p>
              )}
            </div>
          )}

          {(loading || driversLoading) && (
            <div style={{ padding: 12 }}>Loading units...</div>
          )}

          {!loading && emergencies.length === 0 && (
            <div style={{ padding: 12 }} className="body-muted">
              No active emergencies right now.
            </div>
          )}

          {!loading &&
            emergencies.map((emergency) => (
              <div
                className={`unit-row ${
                  selectedEmergencyId === emergency.id ? 'unit-row-active' : ''
                }`}
                key={emergency.id}
                onClick={() =>
                  setSelectedEmergencyId(
                    selectedEmergencyId === emergency.id ? null : emergency.id
                  )
                }
                style={{ cursor: 'pointer' }}
              >
                <div>
                  <strong>{emergency.ambulanceId || 'Unknown Unit'}</strong>
                  <span>{emergency.driverName || 'Unassigned'}</span>
                </div>
                <StatusBadge
                  status={emergency.status}
                  priority={emergency.priority}
                />
                <small>
                  {emergency.location?.latitude && emergency.location?.longitude
                    ? `${emergency.location.latitude.toFixed(4)}, ${emergency.location.longitude.toFixed(4)}`
                    : 'Location unavailable'}
                </small>
              </div>
            ))}
        </aside>
      </section>
    </motion.section>
  );
}

export default LiveTracking;