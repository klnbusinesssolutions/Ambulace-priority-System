import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import LiveMap from '../components/LiveMap';
import StatusBadge from '../components/StatusBadge';
import { useEmergencies } from '../hooks/useEmergencies';

function LiveTracking() {
  const { emergencies, loading } = useEmergencies();

  const formatLocation = (location) => {
    if (!location?.latitude || !location?.longitude) return 'Location unavailable';
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  };

  const formatTimestamp = (value) => {
    if (!value) return 'Unknown';

    const date = value?.toDate
      ? value.toDate()
      : value?.seconds
      ? new Date(value.seconds * 1000)
      : new Date(value);

    if (Number.isNaN(date.getTime())) return 'Unknown';

    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

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
          <LiveMap emergencies={emergencies} />
        </div>

        <aside className="panel tracking-list glass-card">
          <div className="section-heading">
            <h3>Response Units</h3>
            <p>Active emergency response fleet status</p>
          </div>

          {loading && <div style={{ padding: 12 }}>Loading units...</div>}

          {!loading && emergencies.length === 0 && (
            <div style={{ padding: 12 }} className="body-muted">
              No active emergencies right now.
            </div>
          )}

          {!loading && emergencies.length > 0 && (
            <div className="response-table-scroll">
              <table className="response-table">
                <thead>
                  <tr>
                    <th>Ambulance ID</th>
                    <th>Driver Name</th>
                    <th>Current Location</th>
                    <th>Status</th>
                    <th>ETA</th>
                    <th>Emergency ID</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {emergencies.map((emergency) => (
                    <tr key={emergency.id}>
                      <td>{emergency.ambulanceId || emergency.id}</td>
                      <td>{emergency.driverName || 'Unassigned'}</td>
                      <td>{formatLocation(emergency.location)}</td>
                      <td>
                        <StatusBadge
                          status={emergency.status}
                          priority={emergency.priority}
                        />
                      </td>
                      <td>{emergency.eta || 'N/A'}</td>
                      <td>{emergency.id}</td>
                      <td>{formatTimestamp(emergency.updatedAt || emergency.createdAt)}</td>
                      <td>
                        <Link className="table-action-link" to={`/emergency/${emergency.id}`}>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </aside>
      </section>
    </motion.section>
  );
}

export default LiveTracking;