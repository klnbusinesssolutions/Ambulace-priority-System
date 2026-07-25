import { useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Checkbox, Input, Select } from 'antd';
import { AuthContext } from '../context/AuthContext';
import {
  CAPACITIES,
  MEDICAL_CAPABILITIES,
  VEHICLE_TYPES,
} from '../services/hospitalDataService';
import { createAmbulanceRequest, resubmitAmbulanceRequest } from '../services/hospitalRequestService';
import { validateField, validateForm } from '../utils/validators';

const REQUIRED_FIELDS = ['numberPlate', 'manufacturer', 'model', 'registrationNumber'];

function AmbulanceRegistration() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const resubmitMode = location.state?.resubmit || false;
  const requestId = location.state?.requestId || null;
  const prefill = location.state?.prefill || {};

  const [form, setForm] = useState({
    numberPlate: prefill.numberPlate || '',
    manufacturer: prefill.manufacturer || '',
    model: prefill.model || '',
    registrationNumber: prefill.registrationNumber || '',
    vehicleType: prefill.vehicleType || undefined,
    capacity: prefill.capacity || undefined,
    medicalCapabilities: prefill.medicalCapabilities || [],
    assignedDrivers: prefill.assignedDrivers || [],
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (touched[field]) {
      setFieldErrors((current) => ({ ...current, [field]: validateField(field, value) }));
    }
  }

  function handleBlur(field) {
    setTouched((current) => ({ ...current, [field]: true }));
    setFieldErrors((current) => ({ ...current, [field]: validateField(field, form[field]) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user?.hospitalId) {
      setError('Hospital profile is missing. Please login again.');
      return;
    }

    const errors = validateForm(form, REQUIRED_FIELDS);
    if (!form.vehicleType) errors.vehicleType = 'This field is required';
    if (!form.capacity) errors.capacity = 'This field is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTouched(Object.fromEntries([...REQUIRED_FIELDS, 'vehicleType', 'capacity'].map((f) => [f, true])));
      setError('Please fix the highlighted fields before submitting.');
      return;
    }

    setError('');
    setSubmitted(false);
    setSubmitting(true);
    try {
      if (resubmitMode && requestId) {
        await resubmitAmbulanceRequest(user.hospitalId, requestId, form);
      } else {
        await createAmbulanceRequest(user.hospitalId, form);
        setForm({ medicalCapabilities: [], assignedDrivers: [] });
      }
      setSubmitted(true);
      setFieldErrors({});
      setTouched({});
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit ambulance request.');
    } finally {
      setSubmitting(false);
    }
  }

  function renderField(field, label) {
    const hasError = touched[field] && fieldErrors[field];
    return (
      <label key={field} className={hasError ? 'field-invalid' : ''}>
        {label}
        <Input
          required
          value={form[field] || ''}
          onChange={(event) => update(field, event.target.value)}
          onBlur={() => handleBlur(field)}
          status={hasError ? 'error' : ''}
        />
        {hasError && <span className="field-error-text">{fieldErrors[field]}</span>}
      </label>
    );
  }

  return (
    <section className="page-stack">
      <div className="title-group compact-title">
        <p className="eyebrow">{resubmitMode ? 'Resubmission' : 'Fleet onboarding'}</p>
        <h2>{resubmitMode ? 'Edit & Resubmit Ambulance' : 'Register Ambulance'}</h2>
        {resubmitMode && prefill.message && (
          <div className="status-card rejected">
            <strong>Admin feedback:</strong>
            <span>{prefill.message}</span>
          </div>
        )}
      </div>

      {submitted && (
        <div className="status-card submitted">
          <strong>{resubmitMode ? 'Resubmitted successfully.' : 'Submitted. Awaiting admin approval.'}</strong>
          <span>{resubmitMode ? 'Admin will review your updated request.' : 'The request is now saved in pending_ambulances.'}</span>
        </div>
      )}

      {error && (
        <div className="status-card rejected">
          <strong>Submission failed.</strong>
          <span>{error}</span>
        </div>
      )}

      <form className="ops-form panel" onSubmit={handleSubmit} noValidate>
        {renderField('numberPlate', 'Number plate')}
        {renderField('manufacturer', 'Manufacturer')}
        {renderField('model', 'Model')}
        {renderField('registrationNumber', 'Registration number')}

        <label className={touched.vehicleType && fieldErrors.vehicleType ? 'field-invalid' : ''}>
          Vehicle type
          <Select
            required
            options={VEHICLE_TYPES}
            value={form.vehicleType}
            onChange={(value) => { update('vehicleType', value); handleBlur('vehicleType'); }}
            style={{ width: '100%' }}
            status={touched.vehicleType && fieldErrors.vehicleType ? 'error' : ''}
          />
          {touched.vehicleType && fieldErrors.vehicleType && <span className="field-error-text">{fieldErrors.vehicleType}</span>}
        </label>

        <label className={touched.capacity && fieldErrors.capacity ? 'field-invalid' : ''}>
          Capacity
          <Select
            required
            options={CAPACITIES.map((value) => ({ value, label: value }))}
            value={form.capacity}
            onChange={(value) => { update('capacity', value); handleBlur('capacity'); }}
            style={{ width: '100%' }}
            status={touched.capacity && fieldErrors.capacity ? 'error' : ''}
          />
          {touched.capacity && fieldErrors.capacity && <span className="field-error-text">{fieldErrors.capacity}</span>}
        </label>

        <label className="full-span">
          Medical capabilities
          <Checkbox.Group
            options={MEDICAL_CAPABILITIES}
            value={form.medicalCapabilities}
            onChange={(value) => update('medicalCapabilities', value)}
          />
        </label>

        <label className="full-span">
          Assigned drivers
          <Select
            mode="multiple"
            showSearch
            value={form.assignedDrivers}
            options={[]}
            placeholder="Driver assignment will be enabled after driver approval flow"
            onChange={(value) => update('assignedDrivers', value)}
          />
        </label>

        {[
          ['rcBook', 'RC Book'],
          ['insurance', 'Insurance Certificate'],
          ['puc', 'PUC Certificate'],
          ['vehiclePhoto', 'Vehicle Photo'],
        ].map(([field, label]) => (
          <label key={field}>
            {label}
            {resubmitMode && (
              <span className="body-muted"> (only upload if you want to replace)</span>
            )}
            <Input
              type="file"
              required={!resubmitMode}
              onChange={(event) => update(field, event.target.files?.[0])}
            />
          </label>
        ))}

        <Button
          type="primary"
          htmlType="submit"
          className="ops-submit button-primary"
          loading={submitting}
          disabled={submitting || submitted}
        >
          {submitting ? 'Submitting...' : resubmitMode ? 'Resubmit for approval' : 'Submit for approval'}
        </Button>
      </form>
    </section>
  );
}

export default AmbulanceRegistration;