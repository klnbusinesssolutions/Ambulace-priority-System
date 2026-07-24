import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select } from 'antd';
import { FiAlertTriangle } from 'react-icons/fi';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AuthContext } from '../context/AuthContext';
import { createEmergency } from '../services/emergencyService';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '../lib/googleMapsLoader';

const INCIDENT_TYPES = [
  { value: 'Cardiac Arrest', label: 'Cardiac Arrest' },
  { value: 'Road Accident', label: 'Road Accident' },
  { value: 'Respiratory Distress', label: 'Respiratory Distress' },
  { value: 'Stroke', label: 'Stroke' },
  { value: 'Trauma / Injury', label: 'Trauma / Injury' },
  { value: 'Other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function CreateEmergency() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [form, setForm] = useState({
    patientName: '',
    phoneNumber: '',
    incidentType: undefined,
    priority: undefined,
    address: '',
    latitude: '',
    longitude: '',
    ambulanceId: undefined,
    driverId: undefined,
  });

  const [ambulanceOptions, setAmbulanceOptions] = useState([]);
  const [driverOptions, setDriverOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  useEffect(() => {
    if (!user?.hospitalId) return undefined;
    setLoadingOptions(true);

    const ambulanceQuery = query(
      collection(db, 'ambulances'),
      where('hospitalId', '==', user.hospitalId),
      where('status', '==', 'approved')
    );

    const driverQuery = query(
      collection(db, 'drivers'),
      where('hospitalId', '==', user.hospitalId)
    );

    const unsubAmbulances = onSnapshot(ambulanceQuery, (snap) => {
      const ambulances = snap.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((a) => !a.activeDriverId && a.availability === 'available');

      setAmbulanceOptions(
        ambulances.map((a) => ({
          value: a.id,
          label: `${a.numberPlate || a.id} — ${a.vehicleType || ''}`,
        }))
      );
    });

    const unsubDrivers = onSnapshot(driverQuery, (snap) => {
      const drivers = snap.docs
        .map((item) => {
          const data = item.data();
          return {
            id: item.id,
            name: data.Name || data.fullName || 'Unnamed driver',
            availability: data.Availability || data.availability || 'offline',
          };
        })
        .filter((d) => (d.availability || '').toLowerCase() === 'available');

      setDriverOptions(drivers.map((d) => ({ value: d.id, label: d.name })));
    });

    setLoadingOptions(false);

    return () => {
      unsubAmbulances();
      unsubDrivers();
    };
  }, [user?.hospitalId]);

  useEffect(() => {
    if (!mapsLoaded || !window.google?.maps?.places || !addressInputRef.current) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
      fields: ['formatted_address', 'geometry'],
    });

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (!place.geometry) return;

      setForm((current) => ({
        ...current,
        address: place.formatted_address || current.address,
        latitude: place.geometry.location.lat().toFixed(6),
        longitude: place.geometry.location.lng().toFixed(6),
      }));
    });

    return () => {
      if (window.google?.maps?.event) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, [mapsLoaded]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user?.hospitalId) {
      setError('Hospital profile is missing. Please login again.');
      return;
    }
    if (
      !form.patientName ||
      !form.phoneNumber ||
      !form.incidentType ||
      !form.priority ||
      !form.latitude ||
      !form.longitude ||
      !form.ambulanceId ||
      !form.driverId
    ) {
      setError('Please fill all required fields, including ambulance and driver.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const selectedDriver = driverOptions.find((d) => d.value === form.driverId);
      const emergency = await createEmergency(user.hospitalId, {
        ...form,
        ambulanceId: form.ambulanceId,
        driverId: form.driverId,
        driverName: selectedDriver?.label || 'Assigned Driver',
      });
      navigate(`/emergency/${emergency.id}`);
    } catch (submitError) {
      setError(submitError.message || 'Unable to create emergency.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="title-group compact-title">
        <p className="eyebrow">Dispatch</p>
        <h2>Create Emergency</h2>
        <p>Log a new emergency, pick the address, and assign a driver + ambulance.</p>
      </div>

      {error && (
        <div className="alert-banner alert-critical">
          <FiAlertTriangle />
          <span>{error}</span>
        </div>
      )}

      <form className="ops-form panel" onSubmit={handleSubmit}>
        <label className="full-span">
          Patient name
          <Input
            required
            value={form.patientName}
            onChange={(event) => update('patientName', event.target.value)}
            placeholder="Enter patient's name"
          />
        </label>

        <label>
          Phone number
          <Input
            required
            type="tel"
            value={form.phoneNumber}
            onChange={(event) => update('phoneNumber', event.target.value)}
            placeholder="Enter contact number"
            maxLength={10}
          />
        </label>

        <label>
          Incident type
          <Select
            required
            options={INCIDENT_TYPES}
            value={form.incidentType}
            onChange={(value) => update('incidentType', value)}
            style={{ width: '100%' }}
            placeholder="Select incident type"
          />
        </label>

        <label>
          Priority
          <Select
            required
            options={PRIORITIES}
            value={form.priority}
            onChange={(value) => update('priority', value)}
            style={{ width: '100%' }}
            placeholder="Select priority"
          />
        </label>

        <label className="full-span">
          Pickup location
          <input
            ref={addressInputRef}
            className="ant-input"
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8 }}
            value={form.address}
            onChange={(event) => update('address', event.target.value)}
            placeholder="Search address..."
          />
        </label>

        {form.latitude && form.longitude && (
          <div className="full-span" style={{ color: '#4B5563', fontWeight: 700 }}>
            {form.latitude}, {form.longitude}
          </div>
        )}

        <label>
          Assign ambulance
          <Select
            required
            loading={loadingOptions}
            options={ambulanceOptions}
            value={form.ambulanceId}
            onChange={(value) => update('ambulanceId', value)}
            style={{ width: '100%' }}
            placeholder={ambulanceOptions.length ? 'Select ambulance' : 'No ambulances available'}
            notFoundContent={loadingOptions ? 'Loading...' : 'No available ambulances'}
          />
        </label>

        <label>
          Assign driver
          <Select
            required
            loading={loadingOptions}
            options={driverOptions}
            value={form.driverId}
            onChange={(value) => update('driverId', value)}
            style={{ width: '100%' }}
            placeholder={driverOptions.length ? 'Select driver' : 'No drivers available'}
            notFoundContent={loadingOptions ? 'Loading...' : 'No available drivers'}
          />
        </label>

        <Button
          type="primary"
          htmlType="submit"
          className="ops-submit"
          loading={submitting}
          disabled={submitting}
        >
          {submitting ? 'Sending request...' : 'Create emergency & request driver'}
        </Button>
      </form>
    </section>
  );
}

export default CreateEmergency;