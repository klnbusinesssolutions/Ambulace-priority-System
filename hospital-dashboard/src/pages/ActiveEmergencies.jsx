import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Table, Tag } from 'antd';
import { FiFilter, FiNavigation, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useEmergencies } from '../hooks/useEmergencies';
import { useHospitalAmbulances } from '../hooks/useHospitalAmbulances';
import { formatEmergencyDisplayId, resolveAmbulanceLabel } from '../utils/formatters';

const PRIORITY_COLORS = {
  critical: 'red',
  high: 'gold',
  medium: 'blue',
  low: 'green',
};

const STATUS_COLORS = {
  active: 'processing',
  dispatched: 'blue',
  arrived: 'purple',
  completed: 'green',
  resolved: 'green',
  rejected: 'red',
  needs_correction: 'orange',
  pending: 'default',
};

function formatStatusLabel(status) {
  return status.replace(/_/g, ' ');
}

function ActiveEmergencies() {
  const navigate = useNavigate();
  const { emergencies, loading } = useEmergencies();
  const { ambulances } = useHospitalAmbulances();
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const emergencyIdMap = useMemo(() => {
    const sortedAsc = [...emergencies].sort(
      (a, b) => new Date(a.startTime?.toDate?.() || a.startTime) - new Date(b.startTime?.toDate?.() || b.startTime)
    );
    const map = new Map();
    sortedAsc.forEach((item, index) => map.set(item.id, formatEmergencyDisplayId(index)));
    return map;
  }, [emergencies]);

  // Build status filter options directly from the data that actually exists,
  // instead of a hardcoded guess — so the filters always match reality.
  const availableStatuses = useMemo(() => {
    const unique = new Set(emergencies.map((e) => e.status).filter(Boolean));
    return Array.from(unique).sort();
  }, [emergencies]);

  const availablePriorities = useMemo(() => {
    const unique = new Set(emergencies.map((e) => e.priority).filter(Boolean));
    const order = ['critical', 'high', 'medium', 'low'];
    return Array.from(unique).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [emergencies]);

  const filteredEmergencies = emergencies.filter((emergency) => {
    const priorityMatch = priorityFilter === 'all' || emergency.priority === priorityFilter;
    const statusMatch = statusFilter === 'all' || emergency.status === statusFilter;
    return priorityMatch && statusMatch;
  });

  const criticalCount = filteredEmergencies.filter((e) => e.priority === 'critical').length;
  const highCount = filteredEmergencies.filter((e) => e.priority === 'high').length;
  const activeCount = filteredEmergencies.filter((e) => e.status === 'active').length;
  const hasActiveFilters = priorityFilter !== 'all' || statusFilter !== 'all';

  const handleClearFilters = () => {
    setPriorityFilter('all');
    setStatusFilter('all');
  };

  const tableData = filteredEmergencies.map((emergency) => ({
    key: emergency.id,
    displayId: emergencyIdMap.get(emergency.id) || emergency.id,
    incidentType: emergency.incidentType || 'N/A',
    priority: emergency.priority,
    status: emergency.status,
    ambulanceLabel: resolveAmbulanceLabel(emergency.ambulanceId, ambulances),
    driverName: emergency.driverName || 'Unassigned',
    eta: emergency.eta || 'N/A',
    location:
      emergency.location?.latitude && emergency.location?.longitude
        ? `${emergency.location.latitude.toFixed(4)}, ${emergency.location.longitude.toFixed(4)}`
        : 'N/A',
    rawId: emergency.id,
  }));

  const columns = [
    { title: 'Emergency ID', dataIndex: 'displayId', render: (v) => <strong>{v}</strong> },
    { title: 'Incident Type', dataIndex: 'incidentType' },
    {
      title: 'Priority',
      dataIndex: 'priority',
      render: (v) => <Tag color={PRIORITY_COLORS[v] || 'default'}>{v?.toUpperCase() || 'N/A'}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v) => <Tag color={STATUS_COLORS[v] || 'default'}>{v ? formatStatusLabel(v).toUpperCase() : 'N/A'}</Tag>,
    },
    { title: 'Ambulance', dataIndex: 'ambulanceLabel' },
    { title: 'Driver', dataIndex: 'driverName' },
    { title: 'ETA', dataIndex: 'eta' },
    { title: 'Location', dataIndex: 'location' },
    {
      title: 'Action',
      render: (_, row) => (
        <button
          className="table-action-button"
          onClick={() => navigate(`/emergency/${row.rawId}`)}
        >
          Open <FiNavigation size={13} />
        </button>
      ),
    },
  ];

  return (
    <motion.section className="page-stack" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="title-group">
        <p className="eyebrow">Emergency Operations</p>
        <h2>Emergency Incidents</h2>
        <p>
          Complete log of healthcare emergencies across the smart-city emergency response network — active, dispatched, and resolved.
        </p>
      </div>

      {loading && <LoadingSkeleton rows={1} />}

      {!loading && (
        <motion.div className="filter-controls" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <FiFilter />
          <span className="filter-label">Filter by:</span>

          <div className="filter-button-group" aria-label="Priority filter">
            <button
              className={`filter-chip ${priorityFilter === 'all' ? 'active' : ''}`}
              onClick={() => setPriorityFilter('all')}
              aria-pressed={priorityFilter === 'all'}
            >
              All Priorities
            </button>
            {availablePriorities.map((priority) => (
              <button
                key={priority}
                className={`filter-chip ${priorityFilter === priority ? 'active' : ''}`}
                onClick={() => setPriorityFilter(priority)}
                aria-pressed={priorityFilter === priority}
              >
                {priority}
              </button>
            ))}
          </div>

          <div className="filter-button-group filter-button-group-right" aria-label="Status filter">
            <button
              className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
              aria-pressed={statusFilter === 'all'}
            >
              All Statuses
            </button>
            {availableStatuses.map((status) => (
              <button
                key={status}
                className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
              >
                {formatStatusLabel(status)}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button onClick={handleClearFilters} className="filter-clear">
              <FiX size={16} /> Clear Filters
            </button>
          )}
        </motion.div>
      )}

      {!loading && (
        <motion.div className="filter-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="filter-stat-card">
            <div>Total Emergencies</div>
            <strong>{filteredEmergencies.length}</strong>
          </div>
          <div className="filter-stat-card red">
            <div>Critical</div>
            <strong>{criticalCount}</strong>
          </div>
          <div className="filter-stat-card amber">
            <div>High Priority</div>
            <strong>{highCount}</strong>
          </div>
          <div className="filter-stat-card">
            <div>Active</div>
            <strong>{activeCount}</strong>
          </div>
        </motion.div>
      )}

      <div className="panel dense-panel">
        <Table
          rowKey="key"
          columns={columns}
          dataSource={tableData}
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No emergencies matching current filters' }}
        />
      </div>
    </motion.section>
  );
}

export default ActiveEmergencies;