import { useContext, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Table, Tag } from 'antd';
import {FiActivity, FiAlertTriangle, FiCheckCircle,FiClock, FiNavigation, FiShield, FiTruck, FiUsers,} from 'react-icons/fi';
import ActivityTimeline from '../components/ActivityTimeline';
import LiveMap from "../components/LiveMap";
import RoutingAssignmentPanel from '../components/RoutingAssignmentPanel';
import StatCard from '../components/StatCard';
import { useEmergencies, useEmergencyStats } from '../hooks/useEmergencies';
import { fetchNearestAmbulance } from '../services/emergencyRoutingService';
import { AuthContext } from '../context/AuthContext';
import { subscribeHospitalData } from '../services/hospitalDataService';
import { listenHospitalDriverRequests, listenHospitalAmbulanceRequests } from '../services/hospitalRequestService';
import { useNavigate } from 'react-router-dom';
import { useDriverLocations } from '../hooks/useDriverLocations';
import { formatEmergencyDisplayId, resolveAmbulanceLabel } from '../utils/formatters';

const PRIORITY_COLORS = { critical: 'red', high: 'gold', medium: 'blue', low: 'green' };
const STATUS_COLORS = {
  active: 'processing', dispatched: 'blue', arrived: 'purple',
  completed: 'green', resolved: 'green', rejected: 'red', needs_correction: 'orange',
};

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

  const [pendingDriverRequests, setPendingDriverRequests] = useState([]);
  const [pendingAmbulanceRequests, setPendingAmbulanceRequests] = useState([]);
  const { driverLocations } = useDriverLocations();

  const activeEmergenciesForMap = useMemo(
    () => emergencies.filter((e) => e.status !== 'completed' && e.status !== 'resolved'),
    [emergencies]
  );

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

  useEffect(() => {
    const hospitalId = user?.hospitalId;
    if (!hospitalId) return undefined;

    const unsubDrivers = listenHospitalDriverRequests(
      hospitalId,
      (requests) => setPendingDriverRequests(requests.filter((r) => r.status === 'pending')),
      (err) => console.error('pending drivers listener error:', err)
    );

    const unsubAmbulances = listenHospitalAmbulanceRequests(
      hospitalId,
      (requests) => setPendingAmbulanceRequests(requests.filter((r) => r.status === 'pending')),
      (err) => console.error('pending ambulances listener error:', err)
    );

    return () => {
      unsubDrivers();
      unsubAmbulances();
    };
  }, [user?.hospitalId]);

  const emergencyIdMap = useMemo(() => {
    const sortedAsc = [...emergencies].sort(
      (a, b) => new Date(a.startTime?.toDate?.() || a.startTime) - new Date(b.startTime?.toDate?.() || b.startTime)
    );
    const map = new Map();
    sortedAsc.forEach((item, index) => map.set(item.id, formatEmergencyDisplayId(index)));
    return map;
  }, [emergencies]);

  const hospitalStats = useMemo(() => {
    const approvedDrivers = snapshot.drivers.filter(
      (item) => item.status === 'approved'
    );
    const approvedAmbulances = snapshot.ambulances.filter(
      (item) => item.status === 'approved'
    );
    const activeAmbulanceIds = new Set(
      snapshot.emergencies
        .filter((item) => item.status !== 'resolved' && item.status !== 'completed')
        .map((item) => item.ambulanceId)
    );

    return {
      totalDrivers: approvedDrivers.length,
      totalAmbulances: approvedAmbulances.length,
      pendingApprovals: pendingDriverRequests.length + pendingAmbulanceRequests.length,
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
  }, [snapshot, pendingDriverRequests, pendingAmbulanceRequests]);

  const getActivityPriority = (type = '') => {
    const t = type.toLowerCase();
    if (t.includes('reject')) return 'critical';
    if (t.includes('emergency') || t.includes('sos')) return 'critical';
    if (t.includes('approve')) return 'success';
    return 'warning';
  };

  const activityItems = useMemo(
    () =>
      [
        ...snapshot.notifications.map((note) => ({
          id: note.id,
          message: note.message || note.title || 'Notification',
          timestamp: note.createdAt,
          priority: getActivityPriority(note.type),
          type: note.type,
        })),
        ...snapshot.liveLocations.map((loc) => ({
          id: `loc-${loc.id}`,
          message: `Location update for ${loc.ambulanceId}`,
          timestamp: loc.updatedAt,
          priority: 'info',
          type: 'location_update',
        })),
      ]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10),
    [snapshot]
  );

  const handleActivityItemClick = (item) => {
    const t = (item.type || '').toLowerCase();
    if (t.includes('driver') || t.includes('ambulance')) {
      navigate('/approvals');
    } else if (t.includes('emergency') || t.includes('sos')) {
      navigate('/emergencies');
    } else if (t === 'location_update') {
      navigate('/tracking');
    }
  };

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
    <motion.section className="page-stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="hero-banner">
        <div className="hero-banner-text">
          <p className="hero-banner-eyebrow">Emergency Operations Center</p>
          <h2>Welcome back, {user?.hospitalName || 'Team'} 👋</h2>
          <p>{getStatusMessage()}</p>
        </div>
        <div className="hero-banner-badge">
          <span className="hero-banner-pulse">
            <span className="pulse-dot" /> Live Command Center
          </span>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={FiUsers} label="Total Drivers" value={hospitalStats.totalDrivers} helper="approved" tone="blue" onClick={() => navigate('/my-drivers')} />
        <StatCard icon={FiTruck} label="Total Ambulances" value={hospitalStats.totalAmbulances} helper="approved" tone="teal" onClick={() => navigate('/my-ambulances')} />
        <StatCard icon={FiCheckCircle} label="Pending Approvals" value={hospitalStats.pendingApprovals} helper="drivers + ambulances" tone="amber" onClick={() => navigate('/approvals')} />
        <StatCard icon={FiAlertTriangle} label="Active Emergencies" value={hospitalStats.activeEmergencies} helper="status not resolved" tone="red" onClick={() => navigate('/emergencies')} />
        <StatCard icon={FiShield} label="Unread Notifications" value={hospitalStats.unreadNotifications} helper="count only" tone="purple" onClick={() => document.querySelector('.bell-button')?.click()} />
      </div>

      <div className="dashboard-grid">
        <section className="panel map-panel glass-card">
          <div className="section-heading">
            <h3>Active Ambulance Tracking</h3>
            <p>Real-time GPS monitoring of emergency response units.</p>
          </div>
          <div className="routing-map-layout">
            <LiveMap
              emergencies={activeEmergenciesForMap}
              driverLocations={driverLocations}
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

        <section className="panel glass-card">
          <div className="section-heading">
            <h3>Live Activity Feed</h3>
            <p>Emergency operations telemetry and dispatch coordination updates.</p>
          </div>
          <ActivityTimeline
            items={
              activityItems.length
                ? activityItems
                : [{ id: 'empty', message: 'No activity yet.', timestamp: new Date().toISOString(), priority: 'info' }]
            }
            onItemClick={handleActivityItemClick}
          />
        </section>
      </div>

      <section className="panel glass-card">
        <div className="section-heading split-heading">
          <div>
            <h3>Emergency Timeline</h3>
            <p>Active critical incidents requiring immediate command center attention.</p>
          </div>
          <span className="pulse-chip">Command Center Active</span>
        </div>

        <Table
          rowKey="id"
          pagination={{ pageSize: 8 }}
          locale={{ emptyText: 'No active emergencies. System monitoring continues.' }}
          dataSource={emergencies}
          columns={[
            {
              title: 'Emergency ID',
              dataIndex: 'id',
              render: (id) => <strong>{emergencyIdMap.get(id) || id}</strong>,
            },
            { title: 'Incident Type', dataIndex: 'incidentType', render: (v) => v || 'N/A' },
            {
              title: 'Priority',
              dataIndex: 'priority',
              render: (v) => <Tag color={PRIORITY_COLORS[v] || 'default'}>{v?.toUpperCase() || 'N/A'}</Tag>,
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{v?.toUpperCase() || 'N/A'}</Tag>,
            },
            {
              title: 'Ambulance',
              dataIndex: 'ambulanceId',
              render: (id) => resolveAmbulanceLabel(id, snapshot.ambulances),
            },
            { title: 'Driver', dataIndex: 'driverName', render: (v) => v || 'Unassigned' },
            { title: 'ETA', dataIndex: 'eta', render: (v) => v || 'N/A' },
            {
              title: 'Location',
              render: (_, row) =>
                row.location?.latitude && row.location?.longitude
                  ? `${row.location.latitude.toFixed(4)}, ${row.location.longitude.toFixed(4)}`
                  : 'N/A',
            },
            {
              title: 'Action',
              render: (_, row) => (
                <button className="table-action-button" onClick={() => handleSelectEmergency(row)}>
                  Open <FiNavigation size={13} />
                </button>
              ),
            },
          ]}
        />
      </section>

      {emergencies.length > 0 && (
        <motion.div
          className="panel glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ padding: '20px', marginTop: '12px' }}
        >
          <div className="emergency-meta" style={{ gap: '20px' }}>
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