import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiFilter, FiSearch, FiX } from 'react-icons/fi';
import { Input } from 'antd';
import EmergencyCard from '../components/EmergencyCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useEmergencies } from '../hooks/useEmergencies';

function ActiveEmergencies() {
  const { emergencies, loading } = useEmergencies();
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');

  const filteredEmergencies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return emergencies.filter((emergency) => {
      const priorityMatch = priorityFilter === 'all' || emergency.priority === priorityFilter;
      const statusMatch = statusFilter === 'all' || emergency.status === statusFilter;
      const queryMatch =
        normalizedQuery.length === 0 ||
        [emergency.id, emergency.patientName, emergency.incidentType, emergency.ambulanceId, emergency.driverName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));

      return priorityMatch && statusMatch && queryMatch;
    });
  }, [emergencies, priorityFilter, query, statusFilter]);

  const criticalCount = filteredEmergencies.filter((e) => e.priority === 'critical').length;
  const highCount = filteredEmergencies.filter((e) => e.priority === 'high').length;
  const activeCount = filteredEmergencies.filter((e) => e.status === 'active').length;
  const hasActiveFilters = priorityFilter !== 'all' || statusFilter !== 'all';

  const handleClearFilters = () => {
    setPriorityFilter('all');
    setStatusFilter('all');
  };

  return (
    <motion.section className="page-stack" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="title-group">
        <p className="eyebrow">Emergency Operations</p>
        <h2>Active Emergency Incidents</h2>
        <p>
          Real-time monitoring of critical healthcare emergencies across the smart-city emergency response network.
        </p>
      </div>

      {loading && <LoadingSkeleton rows={1} />}

      {!loading && (
        <motion.div className="filter-controls" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 260 }}>
            <FiSearch />
            <Input
              allowClear
              placeholder="Search by incident ID, patient, or ambulance"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              bordered={false}
              style={{ padding: 0, boxShadow: 'none' }}
            />
          </div>

          <div className="filter-button-group" aria-label="Priority filter">
            {['all', 'critical', 'high', 'medium', 'low'].map((priority) => (
              <button
                key={priority}
                className={`filter-chip ${priorityFilter === priority ? 'active' : ''}`}
                onClick={() => setPriorityFilter(priority)}
                aria-pressed={priorityFilter === priority}
              >
                {priority === 'all' ? 'All Priorities' : priority}
              </button>
            ))}
          </div>

          <div className="filter-button-group filter-button-group-right" aria-label="Status filter">
            {['all', 'active', 'dispatched', 'arrived'].map((status) => (
              <button
                key={status}
                className={`filter-chip ${statusFilter === status ? 'active' : ''}`}
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
              >
                {status === 'all' ? 'All Statuses' : status}
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

      {!loading && filteredEmergencies.length === 0 && (
        <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p>No emergencies matching current filters</p>
          <p>Adjust filters or check back for incoming incidents</p>
        </motion.div>
      )}

      {!loading && filteredEmergencies.length > 0 && (
        <div className="emergency-grid">
          {filteredEmergencies.map((emergency) => (
            <EmergencyCard key={emergency.id} emergency={emergency} />
          ))}
        </div>
      )}
    </motion.section>
  );
}

export default ActiveEmergencies;
