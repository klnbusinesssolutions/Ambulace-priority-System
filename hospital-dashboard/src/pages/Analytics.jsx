import { useContext, useEffect, useMemo, useState } from 'react';
import { Table } from 'antd';
import { FiActivity, FiAlertTriangle, FiClock, FiTruck } from 'react-icons/fi';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import StatCard from '../components/StatCard';
import { AuthContext } from '../context/AuthContext';
import { useEmergencies } from '../hooks/useEmergencies';

function toMillis(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

function actualDurationMinutes(emergency) {
  const start = toMillis(emergency.startTime || emergency.acceptedAt);
  const end = toMillis(emergency.completedAt);
  if (!start || !end || end < start) return null;
  return Math.round((end - start) / 60000);
}

function Analytics() {
  const { user } = useContext(AuthContext);
  const { emergencies, loading } = useEmergencies();
  const [ambulanceMap, setAmbulanceMap] = useState({});

  useEffect(() => {
    if (!user?.hospitalId) return undefined;

    const q = query(collection(db, 'ambulances'), where('hospitalId', '==', user.hospitalId));

    const unsub = onSnapshot(q, (snap) => {
      const map = {};
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        map[docSnap.id] = `${data.numberPlate || docSnap.id}${data.vehicleType ? ` — ${data.vehicleType}` : ''}`;
      });
      setAmbulanceMap(map);
    });

    return unsub;
  }, [user?.hospitalId]);

  const stats = useMemo(() => {
    const completed = emergencies.filter(
      (e) => e.status === 'completed' || e.status === 'resolved'
    );
    const active = emergencies.filter(
      (e) => e.status === 'active' || e.status === 'dispatched'
    );
    const critical = emergencies.filter((e) => e.priority === 'critical');

    const avgEta = emergencies.length
      ? Math.round(
          emergencies.reduce((sum, e) => {
            const match = e.eta?.match(/(\d+)/);
            return sum + (match ? parseInt(match[1], 10) : 0);
          }, 0) / emergencies.length
        )
      : 0;

    const actualDurations = completed
      .map((e) => actualDurationMinutes(e))
      .filter((v) => v !== null);

    const avgActualTime = actualDurations.length
      ? Math.round(actualDurations.reduce((sum, v) => sum + v, 0) / actualDurations.length)
      : null;

    return { completed, active, critical, avgEta, avgActualTime };
  }, [emergencies]);

  const columns = [
    { title: 'Emergency ID', dataIndex: 'id' },
    { title: 'Incident Type', dataIndex: 'incidentType', render: (v) => v || 'N/A' },
    { title: 'Patient', dataIndex: 'patientName', render: (v) => v || 'N/A' },
    { title: 'Driver', dataIndex: 'driverName', render: (v) => v || 'Unassigned' },
    {
      title: 'Ambulance',
      dataIndex: 'ambulanceId',
      render: (v) => (v ? ambulanceMap[v] || 'Loading...' : 'N/A'),
    },
    { title: 'Priority', dataIndex: 'priority', render: (v) => v?.toUpperCase() || 'N/A' },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (v) => v?.toUpperCase() || 'N/A',
    },
    { title: 'ETA', dataIndex: 'eta', render: (v) => v || 'N/A' },
    {
      title: 'Actual Time Taken',
      key: 'actualDuration',
      render: (_, record) => {
        const mins = actualDurationMinutes(record);
        return mins !== null ? `${mins}m` : 'N/A';
      },
    },
  ];

  return (
    <section className="page-stack">
      <div className="title-group compact-title">
        <p className="eyebrow">Hospital analytics</p>
        <h2>Emergency Performance</h2>
      </div>

      <div className="stats-grid">
        <StatCard icon={FiClock} label="Avg ETA" value={`${stats.avgEta}m`} helper="Predicted, all emergencies" tone="amber" />
        <StatCard
          icon={FiClock}
          label="Avg Actual Time"
          value={stats.avgActualTime !== null ? `${stats.avgActualTime}m` : 'N/A'}
          helper="Real time to reach hospital"
          tone="green"
        />
        <StatCard icon={FiActivity} label="Total Emergencies" value={emergencies.length} helper="All time" />
        <StatCard icon={FiTruck} label="Completed" value={stats.completed.length} helper="Resolved + completed" />
        <StatCard icon={FiAlertTriangle} label="Critical" value={stats.critical.length} helper="Priority critical" tone="red" />
      </div>

      <div className="panel dense-panel">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={emergencies}
          size="small"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </div>
    </section>
  );
}

export default Analytics;