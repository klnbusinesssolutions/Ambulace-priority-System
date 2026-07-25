import { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Switch } from 'antd';
import { FiAlertTriangle, FiShare2 } from 'react-icons/fi';
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
  const referralInputRef = useRef(null);
  const referralAutocompleteRef = useRef(null);

  const [form, setForm] = useState({
    patientName: '',
    phoneNumber: '',
    incidentType: undefined,
    incidentDescription: '',
    priority: undefined,
    address: '',
    latitude: '',
    longitude: '',
    ambulanceId: undefined,
    driverId: undefined,
    isReferral: false,
    referredHospitalName: '',
    referredHospitalAddress: '',
    referredHospitalLat: '',
    referredHospitalLng: '',
    referralReason: '',
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

  useEffect(() => {
    if (!mapsLoaded || !window.google?.maps?.places || !form.isReferral || !referralInputRef.current) return;

    referralAutocompleteRef.current = new window.google.maps.places.Autocomplete(referralInputRef.current, {
      fields: ['formatted_address', 'geometry', 'name'],
    });

    const listener = referralAutocompleteRef.current.addListener('place_changed', () => {
      const place = referralAutocompleteRef.current.getPlace();
      if (!place.geometry) return;

      setForm((current) => ({
        ...current,
        referredHospitalName: place.name || current.referredHospitalName,
        referredHospitalAddress: place.formatted_address || current.referredHospitalAddress,
        referredHospitalLat: place.geometry.location.lat().toFixed(6),
        referredHospitalLng: place.geometry.location.lng().toFixed(6),
      }));
    });

    return () => {
      if (window.google?.maps?.event) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, [mapsLoaded, form.isReferral]);

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

    if (form.incidentType === 'Other' && !form.incidentDescription.trim()) {
      setError('Please describe the incident type.');
      return;
    }

    if (form.isReferral && (!form.referredHospitalName || !form.referredHospitalLat || !form.referredHospitalLng)) {
      setError('Please select the hospital you are referring this patient to.');
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
          Mobile Number
          <Input
            required
            type="tel"
            value={form.phoneNumber}
            onChange={(event) => {
              const digitsOnly = event.target.value.replace(/\D/g, '');
              update('phoneNumber', digitsOnly);
            }}
            placeholder="Enter 10-digit mobile number"
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

        {form.incidentType === 'Other' && (
          <label className="full-span">
            Describe the incident
            <Input.TextArea
              required
              rows={3}
              value={form.incidentDescription}
              onChange={(event) => update('incidentDescription', event.target.value)}
              placeholder="Manually describe what happened..."
            />
          </label>
        )}

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

        <div className="full-span referral-section">
          <div className="referral-toggle-row">
            <div>
              <strong><FiShare2 style={{ marginRight: 8 }} />Refer to another hospital</strong>
              <p className="body-muted" style={{ margin: '2px 0 0' }}>
                Turn this on if your hospital doesn't have the facilities to treat this patient.
              </p>
            </div>
            <Switch
              checked={form.isReferral}
              onChange={(checked) => update('isReferral', checked)}
            />
          </div>

          {form.isReferral && (
            <div className="referral-fields">
              <label className="full-span">
                Referred hospital
                <input
                  ref={referralInputRef}
                  className="ant-input"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8 }}
                  value={form.referredHospitalName}
                  onChange={(event) => update('referredHospitalName', event.target.value)}
                  placeholder="Search hospital name / location..."
                />
              </label>

              {form.referredHospitalLat && form.referredHospitalLng && (
                <div className="full-span" style={{ color: '#4B5563', fontWeight: 700 }}>
                  {form.referredHospitalAddress} ({form.referredHospitalLat}, {form.referredHospitalLng})
                </div>
              )}

              <label className="full-span">
                Reason for referral
                <Input.TextArea
                  rows={2}
                  value={form.referralReason}
                  onChange={(event) => update('referralReason', event.target.value)}
                  placeholder="e.g. Requires ICU / neurosurgery facilities not available here"
                />
              </label>
            </div>
          )}
        </div>

        <Button
          type="primary"
          htmlType="submit"
          className="ops-submit button-primary"
          loading={submitting}
          disabled={submitting}
        >
          {submitting
            ? 'Sending request...'
            : form.isReferral
            ? 'Create emergency & refer patient'
            : 'Create emergency & request driver'}
        </Button>
      </form>
    </section>
  );
}

export default CreateEmergency;