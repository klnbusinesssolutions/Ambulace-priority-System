import { useContext, useEffect, useMemo, useState } from 'react';
import { Table, Button } from 'antd';
import { FiActivity, FiAlertTriangle, FiClock, FiTruck, FiDownload, FiFileText } from 'react-icons/fi';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../firebase/config';
import StatCard from '../components/StatCard';
import { AuthContext } from '../context/AuthContext';
import { useEmergencies } from '../hooks/useEmergencies';
import { formatEmergencyDisplayId } from '../utils/formatters';

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

  const emergencyIdMap = useMemo(() => {
    const sortedAsc = [...emergencies].sort(
      (a, b) => new Date(a.startTime?.toDate?.() || a.startTime) - new Date(b.startTime?.toDate?.() || b.startTime)
    );
    const map = new Map();
    sortedAsc.forEach((item, index) => map.set(item.id, formatEmergencyDisplayId(index)));
    return map;
  }, [emergencies]);

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

  const exportRows = useMemo(
    () =>
      emergencies.map((e) => ({
        'Emergency ID': emergencyIdMap.get(e.id) || e.id,
        'Incident Type': e.incidentType || 'N/A',
        Patient: e.patientName || 'N/A',
        Driver: e.driverName || 'Unassigned',
        Ambulance: e.ambulanceId ? ambulanceMap[e.ambulanceId] || 'Loading...' : 'N/A',
        Priority: e.priority?.toUpperCase() || 'N/A',
        Status: e.status?.toUpperCase() || 'N/A',
        ETA: e.eta || 'N/A',
        'Actual Time Taken': (() => {
          const mins = actualDurationMinutes(e);
          return mins !== null ? `${mins}m` : 'N/A';
        })(),
      })),
    [emergencies, emergencyIdMap, ambulanceMap]
  );

  function handleExportExcel() {
    const summarySheet = XLSX.utils.json_to_sheet([
      { Metric: 'Avg ETA (mins)', Value: stats.avgEta },
      { Metric: 'Avg Actual Time (mins)', Value: stats.avgActualTime ?? 'N/A' },
      { Metric: 'Total Emergencies', Value: emergencies.length },
      { Metric: 'Completed', Value: stats.completed.length },
      { Metric: 'Critical', Value: stats.critical.length },
    ]);
    const detailSheet = XLSX.utils.json_to_sheet(exportRows);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Emergencies');

    XLSX.writeFile(workbook, `hospital-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function handleExportPdf() {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(16);
    doc.text('Hospital Emergency Performance Report', 14, 16);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [['Metric', 'Value']],
      body: [
        ['Avg ETA (mins)', String(stats.avgEta)],
        ['Avg Actual Time (mins)', stats.avgActualTime !== null ? String(stats.avgActualTime) : 'N/A'],
        ['Total Emergencies', String(emergencies.length)],
        ['Completed', String(stats.completed.length)],
        ['Critical', String(stats.critical.length)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [229, 57, 53] },
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [Object.keys(exportRows[0] || { 'Emergency ID': '' })],
      body: exportRows.map((row) => Object.values(row)),
      theme: 'striped',
      headStyles: { fillColor: [229, 57, 53] },
      styles: { fontSize: 8 },
    });

    doc.save(`hospital-analytics-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const columns = [
    {
      title: 'Emergency ID',
      dataIndex: 'id',
      render: (v) => emergencyIdMap.get(v) || v,
    },
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
      <div className="title-group compact-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="eyebrow">Hospital analytics</p>
          <h2>Emergency Performance</h2>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button icon={<FiDownload />} onClick={handleExportExcel} disabled={!emergencies.length}>
            Export Excel
          </Button>
          <Button icon={<FiFileText />} onClick={handleExportPdf} disabled={!emergencies.length}>
            Export PDF
          </Button>
        </div>
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
        <StatCard icon={FiActivity} label="Total Emergencies" value={emergencies.length} helper="All time" tone="blue" />
        <StatCard icon={FiTruck} label="Completed" value={stats.completed.length} helper="Resolved + completed" tone="teal" />
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