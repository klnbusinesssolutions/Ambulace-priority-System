import { useContext, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Input, Select } from 'antd';
import { AuthContext } from '../context/AuthContext';
import { createDriverRequest, resubmitDriverRequest } from '../services/hospitalRequestService';
import { validateField, validateForm } from '../utils/validators';

const REQUIRED_FIELDS = [
  'fullName', 'phone', 'email', 'gender', 'hospitalName',
  'aadhaarNumber', 'licenseNumber', 'licenseExpiry', 'emergencyContact',
];

function DriverRegistration() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const resubmitMode = location.state?.resubmit || false;
  const requestId = location.state?.requestId || null;
  const prefill = location.state?.prefill || {};

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [form, setForm] = useState({
    fullName: prefill.name || '',
    phone: prefill.phone || '',
    email: prefill.email || '',
    gender: prefill.gender || '',
    hospitalName: prefill.hospitalName || user?.hospitalName || '',
    aadhaarNumber: prefill.aadhaarNumber || '',
    licenseNumber: prefill.licenseNumber || '',
    licenseExpiry: prefill.licenseExpiry || '',
    emergencyContact: prefill.emergencyContact || '',
    streetAddress: prefill.streetAddress || '',
    city: prefill.city || '',
    state: prefill.state || '',
    pincode: prefill.pincode || '',
  });

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
    if (form.pincode) {
      const pincodeError = validateField('pincode', form.pincode);
      if (pincodeError) errors.pincode = pincodeError;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTouched(Object.fromEntries(REQUIRED_FIELDS.map((f) => [f, true])));
      setError('Please fix the highlighted fields before submitting.');
      return;
    }

    setError('');
    setSubmitted(false);
    setSubmitting(true);
    try {
      if (resubmitMode && requestId) {
        await resubmitDriverRequest(user.hospitalId, requestId, form);
      } else {
        await createDriverRequest(user.hospitalId, form);
        setForm({});
      }
      setSubmitted(true);
      setFieldErrors({});
      setTouched({});
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit driver request.');
    } finally {
      setSubmitting(false);
    }
  }

  function renderField(field, label, type = 'text', maxLength) {
    const hasError = touched[field] && fieldErrors[field];
    return (
      <label key={field} className={hasError ? 'field-invalid' : ''}>
        {label}
        <Input
          type={type}
          required
          maxLength={maxLength}
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
        <p className="eyebrow">{resubmitMode ? 'Resubmission' : 'Driver onboarding'}</p>
        <h2>{resubmitMode ? 'Edit & Resubmit Driver' : 'Register Driver'}</h2>
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
          <span>{resubmitMode ? 'Admin will review your updated request.' : 'The request is now saved in pending_drivers.'}</span>
        </div>
      )}

      {error && (
        <div className="status-card rejected">
          <strong>Submission failed.</strong>
          <span>{error}</span>
        </div>
      )}

      <form className="ops-form panel" onSubmit={handleSubmit} noValidate>
        {renderField('fullName', 'Full name')}
        {renderField('phone', 'Mobile Number', 'tel', 10)}
        {renderField('email', 'Email', 'email')}

        <label className={touched.gender && fieldErrors.gender ? 'field-invalid' : ''}>
          Gender
          <Select
            value={form.gender || undefined}
            onChange={(value) => { update('gender', value); handleBlur('gender'); }}
            placeholder="Select gender"
            options={[
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
              { value: 'Other', label: 'Other' },
            ]}
            style={{ width: '100%' }}
            status={touched.gender && fieldErrors.gender ? 'error' : ''}
          />
          {touched.gender && fieldErrors.gender && <span className="field-error-text">{fieldErrors.gender}</span>}
        </label>

        <label>
          Hospital Name
          <Input
            required
            value={form.hospitalName || ''}
            onChange={(event) => update('hospitalName', event.target.value)}
            disabled={!!user?.hospitalName}
          />
        </label>

        {renderField('aadhaarNumber', 'Aadhaar number', 'text', 12)}
        {renderField('licenseNumber', 'License number')}
        {renderField('licenseExpiry', 'License expiry', 'date')}
        {renderField('emergencyContact', 'Emergency Contact Number', 'tel', 10)}

        <label>
          Street Address
          <Input value={form.streetAddress || ''} onChange={(event) => update('streetAddress', event.target.value)} />
        </label>
        <label>
          City
          <Input value={form.city || ''} onChange={(event) => update('city', event.target.value)} />
        </label>
        <label>
          State
          <Input value={form.state || ''} onChange={(event) => update('state', event.target.value)} />
        </label>
        <label className={touched.pincode && fieldErrors.pincode ? 'field-invalid' : ''}>
          Pincode
          <Input
            maxLength={6}
            value={form.pincode || ''}
            onChange={(event) => update('pincode', event.target.value)}
            onBlur={() => handleBlur('pincode')}
            status={touched.pincode && fieldErrors.pincode ? 'error' : ''}
          />
          {touched.pincode && fieldErrors.pincode && <span className="field-error-text">{fieldErrors.pincode}</span>}
        </label>

        <label>
          Aadhaar Card
          {resubmitMode && <span className="body-muted"> (only upload if you want to replace)</span>}
          <Input
            type="file"
            required={!resubmitMode}
            onChange={(event) => update('aadhaarCard', event.target.files?.[0])}
          />
        </label>

        <label>
          Driving License
          {resubmitMode && <span className="body-muted"> (only upload if you want to replace)</span>}
          <Input
            type="file"
            required={!resubmitMode}
            onChange={(event) => update('licenseFile', event.target.files?.[0])}
          />
        </label>

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

export default DriverRegistration;