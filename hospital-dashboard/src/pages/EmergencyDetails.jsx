import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Descriptions, Spin } from 'antd';
import { FiClock, FiMapPin } from 'react-icons/fi';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import LiveMap from '../components/LiveMap';
import StatusBadge from '../components/StatusBadge';
import { useEmergency } from '../hooks/useEmergencies';
import { useDriverLocations } from '../hooks/useDriverLocations';
import { AuthContext } from '../context/AuthContext';

const TRIP_STATUS_LABELS = {
  going_to_patient: 'Going to Patient',
  reached_patient: 'Reached Patient',
  patient_onboard: 'Patient Onboard',
  near_hospital: 'Near Hospital',
  trip_completed: 'Trip Completed',
};

function EmergencyDetails() {
  const { id } = useParams();
  const { emergency, loading, error } = useEmergency(id);
  const { user } = useContext(AuthContext);
  const [ambulanceLabel, setAmbulanceLabel] = useState(null);
  const { driverLocations } = useDriverLocations();
  const completionTriggeredRef = useRef(false);

  const assignedDriver = driverLocations.find((d) => d.driverId === emergency?.driverId);

  useEffect(() => {
    async function completeIfNeeded() {
      if (
        assignedDriver?.tripStatus === 'trip_completed' &&
        emergency?.status &&
        emergency.status !== 'completed' &&
        emergency.status !== 'resolved' &&
        !completionTriggeredRef.current
      ) {
        completionTriggeredRef.current = true;
        try {
          await updateDoc(doc(db, 'emergencies', emergency.id), {
            status: 'completed',
            completedAt: serverTimestamp(),
          });
        } catch (err) {
          completionTriggeredRef.current = false;
          console.error('Failed to mark emergency completed', err);
        }
      }
    }
    completeIfNeeded();
  }, [assignedDriver?.tripStatus, emergency?.status, emergency?.id]);

  useEffect(() => {
    async function loadAmbulance() {
      if (!emergency?.ambulanceId) {
        setAmbulanceLabel(null);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'ambulances', emergency.ambulanceId));
        if (snap.exists()) {
          const data = snap.data();
          setAmbulanceLabel(
            `${data.numberPlate || emergency.ambulanceId}${data.vehicleType ? ` — ${data.vehicleType}` : ''}`
          );
        } else {
          setAmbulanceLabel(emergency.ambulanceId);
        }
      } catch {
        setAmbulanceLabel(emergency.ambulanceId);
      }
    }

    loadAmbulance();
  }, [emergency?.ambulanceId]);

  if (error) {
    return (
      <section className="page-stack">
        <div className="panel glass-card">
          <h2>Error Loading Emergency</h2>
          <p className="error-text">{error}</p>
          <Link className="details-link" to="/emergencies">
            Return to Emergency Operations
          </Link>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="page-stack loading-center">
        <Spin />
      </section>
    );
  }

  if (!emergency) {
    return (
      <section className="page-stack">
        <div className="panel glass-card">
          <h2>Emergency Incident Not Found</h2>
          <p className="body-muted">
            This emergency incident could not be found in the system.
          </p>
          <Link className="details-link" to="/emergencies">
            Return to Emergency Operations
          </Link>
        </div>
      </section>
    );
  }

  const isFinished = emergency.status === 'completed' || emergency.status === 'resolved';

  return (
    <motion.section
      className="page-stack"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="title-group">
        <p className="eyebrow">Emergency Incident - Live Monitoring</p>
        <h2>{emergency.id}</h2>
        <p>
          Critical emergency response coordination and real-time monitoring for
          smart-city healthcare operations. All data updates live.
        </p>
      </div>

      <section className="details-layout">
        <div className="panel glass-card">
          <div className="section-heading split-heading">
            <div>
              <h3>{emergency.incidentType}</h3>
              <p>{emergency.patientName}</p>
            </div>
            <StatusBadge status={emergency.status} priority={emergency.priority} />
          </div>

          <Descriptions column={1} bordered size="small" className="details-table">
            <Descriptions.Item label="Response Unit">
              {emergency.ambulanceId ? (ambulanceLabel || 'Loading...') : 'Not assigned'}
            </Descriptions.Item>
            <Descriptions.Item label="Emergency Operator">
              {emergency.driverName}
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <span className="details-label-icon">
                  <FiClock size={16} /> Trip Status
                </span>
              }
            >
              {isFinished ? (
                <span className="priority-text low">Trip Completed</span>
              ) : assignedDriver?.tripStatus ? (
                <span className="priority-text high">
                  {TRIP_STATUS_LABELS[assignedDriver.tripStatus] || assignedDriver.tripStatus}
                </span>
              ) : (
                <span className="body-muted">Not available</span>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Destination Hospital">
              {emergency.hospitalId}
            </Descriptions.Item>
            <Descriptions.Item label="Priority Level">
              <span className={`priority-text ${emergency.priority}`}>
                {emergency.priority}
              </span>
            </Descriptions.Item>
            {isFinished ? (
              <Descriptions.Item
                label={
                  <span className="details-label-icon">
                    <FiClock size={16} /> Completed At
                  </span>
                }
              >
                <span className="body-muted">
                  {emergency.completedAt
                    ? new Date(
                        emergency.completedAt?.toDate
                          ? emergency.completedAt.toDate()
                          : emergency.completedAt
                      ).toLocaleTimeString()
                    : 'Just now'}
                </span>
              </Descriptions.Item>
            ) : (
              <Descriptions.Item
                label={
                  <span className="details-label-icon">
                    <FiClock size={16} /> Estimated Arrival
                  </span>
                }
              >
                <span className="eta-value">{emergency.eta}</span>
              </Descriptions.Item>
            )}
            <Descriptions.Item
              label={
                <span className="details-label-icon">
                  <FiMapPin size={16} /> GPS Location
                </span>
              }
            >
              {emergency.location?.latitude && emergency.location?.longitude ? (
                <span className="mono-value">
                  {emergency.location.latitude.toFixed(6)},{' '}
                  {emergency.location.longitude.toFixed(6)}
                </span>
              ) : (
                <span className="body-muted">Location not available</span>
              )}
            </Descriptions.Item>
            {emergency.timestamp && (
              <Descriptions.Item label="Last Updated">
                <span className="body-muted">
                  {new Date(emergency.timestamp).toLocaleTimeString()}
                </span>
              </Descriptions.Item>
            )}
          </Descriptions>

          <div className="live-status">
            <span />
            Real-time updates active - refreshes every 5 seconds
          </div>
        </div>

        <div className="panel details-map glass-card">
          <div className="section-heading">
            <h3>Live Ambulance Tracking</h3>
            <p>GPS coordinates update as ambulance moves</p>
          </div>
          <LiveMap
            emergencies={[emergency]}
            driverLocations={driverLocations}
            selectedEmergencyId={emergency.id}
          />
        </div>
      </section>
    </motion.section>
  );
}

export default EmergencyDetails;