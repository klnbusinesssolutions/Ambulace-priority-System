import { useContext, useEffect, useState } from 'react';
import { Table, Tag } from 'antd';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { FiUser } from 'react-icons/fi';
import { AuthContext } from '../context/AuthContext';
import { db } from '../firebase/config';

function MyDrivers() {
  const { user } = useContext(AuthContext);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.hospitalId) return;

    const q = query(
      collection(db, 'pending_drivers'),
      where('hospitalId', '==', user.hospitalId),
      where('status', '==', 'approved')
    );

    const unsub = onSnapshot(q, (snap) => {
      setDrivers(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
      setLoading(false);
    });

    return unsub;
  }, [user?.hospitalId]);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'fullName',
      render: (name) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiUser /> {name}
        </span>
      ),
    },
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Email', dataIndex: 'email' },
    { title: 'License No', dataIndex: 'licenseNumber' },
    { title: 'License Expiry', dataIndex: 'licenseExpiry' },
    { title: 'City', dataIndex: 'city' },
    { title: 'State', dataIndex: 'state' },
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
        <div style={{ display: 'flex', gap: 8 }}>
          {row.documents?.aadhaar?.downloadUrl && (
            <a href={row.documents.aadhaar.downloadUrl} target="_blank" rel="noreferrer">
              Aadhaar
            </a>
          )}
          {row.documents?.drivingLicence?.downloadUrl && (
            <a href={row.documents.drivingLicence.downloadUrl} target="_blank" rel="noreferrer">
              Licence
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
        <h2>My Drivers</h2>
      </div>
      <div className="panel dense-panel">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={drivers}
          loading={loading}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No approved drivers yet.' }}
        />
      </div>
    </section>
  );
}

export default MyDrivers;
