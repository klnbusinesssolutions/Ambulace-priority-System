import { useContext, useEffect, useState } from 'react';
import { Table, Tag } from 'antd';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { FiTruck } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebase/config';

function MyAmbulances() {
  const { user } = useContext(AuthContext);
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.hospitalId) return;

    const q = query(
      collection(db, 'pending_ambulances'),
      where('hospitalId', '==', user.hospitalId),
      where('status', '==', 'approved')
    );

    const unsub = onSnapshot(q, (snap) => {
      setAmbulances(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
      setLoading(false);
    });

    return unsub;
  }, [user?.hospitalId]);

  const columns = [
    {
      title: 'Number Plate',
      dataIndex: 'numberPlate',
      render: (val) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiTruck /> {val}
        </span>
      ),
    },
    { title: 'Manufacturer', dataIndex: 'manufacturer' },
    { title: 'Model', dataIndex: 'model' },
    { title: 'Registration No', dataIndex: 'registrationNumber' },
    { title: 'Vehicle Type', dataIndex: 'vehicleType' },
    { title: 'Capacity', dataIndex: 'capacity' },
    {
      title: 'Medical Capabilities',
      dataIndex: 'medicalCapabilities',
      render: (val) =>
        val?.length
          ? val.map((cap) => (
              <Tag key={cap} color="blue" style={{ marginBottom: 4 }}>
                {cap}
              </Tag>
            ))
          : 'N/A',
    },
    {
      title: 'Availability',
      dataIndex: 'availability',
      render: (val) => (
        <Tag color={val === 'available' ? 'green' : val === 'on_trip' ? 'orange' : 'red'}>
          {val || 'N/A'}
        </Tag>
      ),
    },
    {
      title: 'Documents',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {row.documents?.rcBook?.downloadUrl && (
            <a href={row.documents.rcBook.downloadUrl} target="_blank" rel="noreferrer">
              RC Book
            </a>
          )}
          {row.documents?.insurance?.downloadUrl && (
            <a href={row.documents.insurance.downloadUrl} target="_blank" rel="noreferrer">
              Insurance
            </a>
          )}
          {row.documents?.puc?.downloadUrl && (
            <a href={row.documents.puc.downloadUrl} target="_blank" rel="noreferrer">
              PUC
            </a>
          )}
          {row.documents?.vehiclePhoto?.downloadUrl && (
            <a href={row.documents.vehiclePhoto.downloadUrl} target="_blank" rel="noreferrer">
              Photo
            </a>
          )}
        </div>
      ),
    },
    {
      title: 'Approved At',
      dataIndex: 'approvedAt',
      render: (val) =>
        val?.toDate ? val.toDate().toLocaleDateString() : val ? new Date(val).toLocaleDateString() : 'N/A',
    },
  ];

  return (
    <section className="page-stack">
      <div className="title-group compact-title">
        <p className="eyebrow">Hospital fleet</p>
        <h2>My Ambulances</h2>
      </div>
      <div className="panel dense-panel">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={ambulances}
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No approved ambulances yet.' }}
        />
      </div>
    </section>
  );
}

export default MyAmbulances;
