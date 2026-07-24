import { useContext, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {FiActivity, FiAlertTriangle, FiCheckCircle,FiClock, FiRadio, FiShield, FiTruck, FiUsers,} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import ActivityTimeline from '../components/ActivityTimeline';
import AlertBanner from '../components/AlertBanner';
import EmergencyCard from '../components/EmergencyCard';
import LiveMap from '../components/LiveMap';
import RoutingAssignmentPanel from '../components/RoutingAssignmentPanel';
import StatCard from '../components/StatCard';
import { useEmergencies, useEmergencyStats } from '../hooks/useEmergencies';
import { fetchNearestAmbulance } from '../services/emergencyRoutingService';
import { AuthContext } from '../context/AuthContext';
import { subscribeHospitalData } from '../services/hospitalDataService';
function Dashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { emergencies } = useEmergencies();
  const stats = useEmergencyStats();

  const [snapshot, setSnapshot] = useState({
    drivers: [],
    ambulances: [],
    emergencies: [],
    liveLocations: [],
    notifications: [],
  });

  const [selectedEmergencyId, setSelectedEmergencyId] = useState(null);
  const [selectedEmergencySnapshot, setSelectedEmergencySnapshot] = useState(null);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [routeAssignment, setRouteAssignment] = useState(null);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingError, setRoutingError] = useState('');

  const selectedEmergency =
    emergencies.find((e) => e.id === selectedEmergencyId) || selectedEmergencySnapshot;

  useEffect(() => {
    const hospitalId = user?.hospitalId;
    if (!hospitalId) return undefined;
    return subscribeHospitalData(hospitalId, setSnapshot);
  }, [user?.hospitalId, user?.uid]);

  const hospitalStats = useMemo(() => {
    const approvedDrivers = snapshot.drivers.filter(
      (item) => item.status === 'approved'
    );
    const approvedAmbulances = snapshot.ambulances.filter(
      (item) => item.status === 'approved'
    );
    const pendingDrivers = snapshot.drivers.filter(
      (item) => item.status === 'pending'
    );
    const pendingAmbulances = snapshot.ambulances.filter(
      (item) => item.status === 'pending'
    );
    const activeAmbulanceIds = new Set(
      snapshot.emergencies
        .filter((item) => item.status !== 'resolved' && item.status !== 'completed')
        .map((item) => item.ambulanceId)
    );

    return {
      totalDrivers: approvedDrivers.length,
      totalAmbulances: approvedAmbulances.length,
      pendingApprovals: pendingDrivers.length + pendingAmbulances.length,
      activeEmergencies: snapshot.emergencies.filter(
        (item) => item.status !== 'resolved' && item.status !== 'completed'
      ).length,
      availableAmbulances: approvedAmbulances.filter(
        (item) => !activeAmbulanceIds.has(item.id)
      ).length,
      unreadNotifications: snapshot.notifications.filter(
        (note) => !note.read
      ).length,
      activeDrivers: approvedAmbulances.filter(
        (item) => item.activeDriverId
      ).length,
    };
  }, [snapshot]);

  const activityItems = useMemo(() => {
    const operationalEvents = [];

    const emergencyFeed = [...(emergencies || []), ...(snapshot.emergencies || [])]
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0));

    emergencyFeed.slice(0, 8).forEach((emergency, index) => {
      const status = String(emergency.status || '').toLowerCase();
      const baseTime = emergency.createdAt || emergency.updatedAt || new Date().toISOString();

      let title = 'New emergency received';
      let message = `Emergency ${emergency.id || `#${index + 1}`} is being monitored by dispatch.`;
      let priority = 'warning';
      let icon = 'alert';

      if (['dispatched', 'assigned'].includes(status)) {
        title = 'Ambulance dispatched';
        message = `${emergency.ambulanceId || 'An ambulance'} has been assigned to ${emergency.id || 'the incident'}.`;
        priority = 'warning';
        icon = 'truck';
      } else if (['en_route', 'enroute', 'moving', 'in_transit'].includes(status)) {
        title = 'Ambulance en route';
        message = `${emergency.ambulanceId || 'The response unit'} is moving toward the patient.`;
        priority = 'info';
        icon = 'navigation';
      } else if (['arrived', 'on_scene'].includes(status)) {
        title = 'Ambulance arrived at patient';
        message = `${emergency.ambulanceId || 'The ambulance'} has reached the scene.`;
        priority = 'info';
        icon = 'map-pin';
      } else if (['transported', 'patient_transport'].includes(status)) {
        title = 'Patient transported';
        message = `Patient transfer is in progress for ${emergency.id || 'the incident'}.`;
        priority = 'info';
        icon = 'check-circle';
      } else if (['resolved', 'completed', 'closed'].includes(status)) {
        title = 'Emergency resolved';
        message = `${emergency.id || 'The incident'} has been closed and cleared.`;
        priority = 'info';
        icon = 'shield';
      }

      operationalEvents.push({
        id: `emergency-${emergency.id || index}`,
        title,
        message,
        timestamp: baseTime,
        priority,
        icon,
      });
    });

    const locationFeed = [...(snapshot.liveLocations || [])]
      .filter(Boolean)
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .slice(0, 4);

    locationFeed.forEach((loc, index) => {
      const gpsStatus = String(loc.gpsStatus || loc.connectionStatus || loc.status || '').toLowerCase();
      const driverStatus = String(loc.driverStatus || '').toLowerCase();

      if (gpsStatus.includes('disconnect')) {
        operationalEvents.push({
          id: `gps-${loc.id || index}`,
          title: 'GPS disconnected',
          message: `${loc.ambulanceId || 'The ambulance'} lost live telemetry.` ,
          timestamp: loc.updatedAt || new Date().toISOString(),
          priority: 'warning',
          icon: 'wifi-off',
        });
      } else if (gpsStatus.includes('reconnect')) {
        operationalEvents.push({
          id: `gps-${loc.id || index}`,
          title: 'GPS reconnected',
          message: `${loc.ambulanceId || 'The ambulance'} telemetry is live again.` ,
          timestamp: loc.updatedAt || new Date().toISOString(),
          priority: 'info',
          icon: 'wifi',
        });
      } else if (driverStatus.includes('offline')) {
        operationalEvents.push({
          id: `driver-${loc.id || index}`,
          title: 'Driver went offline',
          message: `${loc.ambulanceId || 'The driver'} is offline during an active response.` ,
          timestamp: loc.updatedAt || new Date().toISOString(),
          priority: 'warning',
          icon: 'radio',
        });
      } else if (driverStatus.includes('online')) {
        operationalEvents.push({
          id: `driver-${loc.id || index}`,
          title: 'Driver went online',
          message: `${loc.ambulanceId || 'The driver'} is back online.` ,
          timestamp: loc.updatedAt || new Date().toISOString(),
          priority: 'info',
          icon: 'radio',
        });
      }
    });

    return operationalEvents
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
  }, [emergencies, snapshot]);

  const getStatusMessage = () => {
    if (stats.totalCount === 0) return 'System monitoring active. No emergencies reported.';
    if (stats.criticalCount > 0)
      return `CRITICAL: ${stats.criticalCount} critical emergency${stats.criticalCount > 1 ? 'ies' : ''} requiring immediate attention`;
    if (stats.activeCount > 0)
      return `Live dispatch: ${stats.activeCount} active emergency${stats.activeCount > 1 ? 'ies' : ''} being coordinated`;
    return 'Live GPS bridge prepared. System ready for incoming emergencies.';
  };

  const handleSelectEmergency = async (emergency) => {
    setSelectedEmergencyId(emergency.id);
    setSelectedEmergencySnapshot(emergency);
    setSelectedAmbulance(null);
    setRouteAssignment(null);
    setRoutingLoading(true);
    setRoutingError('');

    try {
      const assignment = await fetchNearestAmbulance(emergency);
      setSelectedAmbulance(assignment);
      setRouteAssignment(assignment);
    } catch (err) {
      setSelectedAmbulance(null);
      setRouteAssignment(null);
      setRoutingError(err.message || 'Unable to calculate nearest ambulance');
    } finally {
      setRoutingLoading(false);
    }
  };

  return (
    <motion.section
      className="page-stack dashboard-page !gap-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <AlertBanner message={getStatusMessage()} />

      <div className="title-group !rounded-2xl !border-slate-200 !px-7 !py-6">
        <p className="eyebrow">Emergency Operations Center</p>
        <h2 className="!text-slate-950">Hospital Emergency Coordination Dashboard</h2>
        <p className="!max-w-3xl !text-slate-600">
          National healthcare infrastructure monitoring for smart-city ambulance dispatch and
          hospital emergency response coordination.
        </p>
      </div>

      <div className="overview-grid">
        <div className="stats-grid !gap-4">
          <StatCard icon={FiUsers} label="Total Drivers" value={hospitalStats.totalDrivers} helper="approved" onClick={() => navigate('/approvals')} />
          <StatCard icon={FiTruck} label="Total Ambulances" value={hospitalStats.totalAmbulances} helper="approved" onClick={() => navigate('/approvals')} />
          <StatCard icon={FiCheckCircle} label="Pending Approvals" value={hospitalStats.pendingApprovals} helper="drivers + ambulances" tone="amber" onClick={() => navigate('/approvals')} />
          <StatCard icon={FiAlertTriangle} label="Active Emergencies" value={hospitalStats.activeEmergencies} helper="status not resolved" tone="red" onClick={() => navigate('/emergencies')} />
          <StatCard icon={FiShield} label="Unread Notifications" value={hospitalStats.unreadNotifications} helper="count only" tone="amber" onClick={() => document.querySelector('.bell-button')?.click()} />
          <StatCard icon={FiRadio} label="Available Ambulances" value={hospitalStats.availableAmbulances} helper="approved + inactive" onClick={() => navigate('/approvals')} />
        </div>

        <section className="panel glass-card operations-panel !rounded-2xl !border-slate-200 !p-6">
          <div className="section-heading !mb-5">
            <h3>Live Operations Feed</h3>
            <p className="!max-w-3xl !text-slate-600">Real-time operational response events from the emergency command network.</p>
          </div>
          <div className="operations-feed-shell">
            <ActivityTimeline
              items={
                activityItems.length
                  ? activityItems.slice(0, 8)
                  : [{ id: 'empty', title: 'Operations feed ready', message: 'No dispatch activity recorded yet.', timestamp: new Date().toISOString(), priority: 'info', icon: 'radio' }]
              }
            />
          </div>
          <div className="operations-footer">
            <Link className="operations-footer-link" to="/emergencies">
              View All Operations
            </Link>
          </div>
        </section>
      </div>

      <section className="panel map-panel glass-card !rounded-2xl !border-slate-200 !p-6">
        <div className="section-heading !mb-5">
          <h3>Active Ambulance Tracking</h3>
          <p className="!max-w-3xl !text-slate-600">Real-time GPS monitoring of emergency response units.</p>
        </div>
        <div className="routing-map-layout">
          <LiveMap
            emergencies={emergencies}
            selectedEmergencyId={selectedEmergencyId}
            routeAssignment={routeAssignment}
            onSelectEmergency={handleSelectEmergency}
          />
          <RoutingAssignmentPanel
            assignment={routeAssignment}
            emergency={selectedEmergency}
            ambulance={selectedAmbulance}
            loading={routingLoading}
            error={routingError}
          />
        </div>
      </section>

      <section className="panel glass-card !rounded-2xl !border-slate-200 !p-6">
        <div className="section-heading split-heading !mb-5">
          <div>
            <h3>Active Emergencies</h3>
            <p className="!max-w-3xl !text-slate-600">Active critical incidents requiring immediate command center attention.</p>
          </div>
          <span className="pulse-chip">Command Center Active</span>
        </div>

        {emergencies.length === 0 ? (
          <div className="empty-state compact">
            <p className="!max-w-3xl !text-slate-600">No active emergencies. System monitoring continues.</p>
          </div>
        ) : (
          <div className="emergency-timeline-grid">
            {emergencies.map((emergency) => (
              <EmergencyCard
                key={emergency.id}
                emergency={emergency}
                onSelect={handleSelectEmergency}
                selected={emergency.id === selectedEmergencyId}
              />
            ))}
          </div>
        )}
      </section>

      {emergencies.length > 0 && (
        <motion.div
          className="panel glass-card !mt-3 !rounded-2xl !border-slate-200 !p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="emergency-meta !gap-x-5 !gap-y-3">
            <span><FiActivity /> Total Active: {stats.activeCount}</span>
            <span><FiTruck /> Critical Priority: {stats.criticalCount}</span>
            <span><FiAlertTriangle /> High Priority: {stats.highPriorityCount}</span>
            <span><FiClock /> Average Response: {stats.averageEta} mins</span>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}

export default Dashboard;