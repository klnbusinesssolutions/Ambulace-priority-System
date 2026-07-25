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
      collection(db, 'drivers'),
      where('hospitalId', '==', user.hospitalId)
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
      render: (_, row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiUser /> {row.Name || row.fullName || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Mobile Number',
      render: (_, row) => row['Phone Number'] || row.phone || 'N/A',
    },
    {
      title: 'Email',
      render: (_, row) => row['Email ID'] || row.email || 'N/A',
    },
    {
      title: 'Gender',
      render: (_, row) => row.Gender || row.gender || 'N/A',
    },
    {
      title: 'Hospital Name',
      render: (_, row) => row['Hospital Name'] || row.hospitalName || 'N/A',
    },
    { title: 'License No', dataIndex: 'licenseNumber' },
    { title: 'License Expiry', dataIndex: 'licenseExpiry' },
    {
      title: 'City',
      render: (_, row) => row.City || row.city || 'N/A',
    },
    {
      title: 'State',
      render: (_, row) => row.State || row.state || 'N/A',
    },
    {
      title: 'Availability',
      render: (_, row) => {
        const val = row.Availability || row.availability || 'N/A';
        return (
          <Tag color={val === 'available' ? 'green' : val === 'on_trip' ? 'orange' : 'red'}>
            {val}
          </Tag>
        );
      },
    },
    {
      title: 'Documents',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 8 }}>
          {row.Documents?.aadhaar?.downloadUrl && (
            <a href={row.Documents.aadhaar.downloadUrl} target="_blank" rel="noreferrer">
              Aadhaar
            </a>
          )}
          {row.Documents?.drivingLicence?.downloadUrl && (
            <a href={row.Documents.drivingLicence.downloadUrl} target="_blank" rel="noreferrer">
              Licence
            </a>
          )}
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