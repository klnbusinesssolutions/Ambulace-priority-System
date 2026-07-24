import { useContext, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Input } from 'antd';
import { AuthContext } from '../context/AuthContext';
import { createDriverRequest, resubmitDriverRequest } from '../services/hospitalRequestService';

const initialState = {
  fullName: '',
  email: '',
  phone: '',
  aadhaarNumber: '',
  licenseNumber: '',
  licenseExpiry: '',
  emergencyContact: '',
  streetAddress: '',
  city: '',
  state: '',
  pincode: '',
  aadhaarCard: null,
  licenseFile: null,
};

function DriverRegistration() {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const resubmitMode = location.state?.resubmit || false;
  const requestId = location.state?.requestId || null;
  const prefill = location.state?.prefill || {};

  const [form, setForm] = useState({
    ...initialState,
    ...prefill,
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fieldGroups = useMemo(
    () => [
      {
        title: 'Personal details',
        description: 'Capture the driver profile information that will be reviewed by the operations team.',
        fields: [
          { key: 'fullName', label: 'Full name', type: 'text', required: true },
          { key: 'email', label: 'Email address', type: 'email', required: true },
          { key: 'phone', label: 'Phone number', type: 'text', required: true },
          { key: 'emergencyContact', label: 'Emergency contact', type: 'text', required: true },
        ],
      },
      {
        title: 'Address details',
        description: 'Include the residential address so the admin review can verify the driver profile.',
        fields: [
          { key: 'streetAddress', label: 'Street address', type: 'text', required: true },
          { key: 'city', label: 'City', type: 'text', required: true },
          { key: 'state', label: 'State', type: 'text', required: true },
          { key: 'pincode', label: 'Pincode', type: 'text', required: true },
        ],
      },
      {
        title: 'Identity & licence',
        description: 'Validate the licence and identity information before submitting it for approval.',
        fields: [
          { key: 'aadhaarNumber', label: 'Aadhar number', type: 'text', required: true },
          { key: 'licenseNumber', label: 'Driving licence number', type: 'text', required: true },
          { key: 'licenseExpiry', label: 'Licence expiry', type: 'date', required: true },
        ],
      },
      {
        title: 'Supporting documents',
        description: 'Attach the Aadhaar and driving licence evidence required for verification.',
        fields: [
          { key: 'aadhaarCard', label: 'Aadhaar card', type: 'file', required: !resubmitMode },
          { key: 'licenseFile', label: 'Driving licence', type: 'file', required: !resubmitMode },
        ],
      },
    ],
    [resubmitMode],
  );

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function validateField(field, value) {
    if (field === 'phone') {
      const normalized = String(value || '').replace(/\D/g, '');
      if (!/^\d{10}$/.test(normalized)) {
        return 'Phone number must be 10 digits';
      }
      return '';
    }

    if (field === 'aadhaarNumber') {
      const normalized = String(value || '').replace(/\D/g, '');
      if (!/^\d{12}$/.test(normalized)) {
        return 'Aadhar number must be 12 digits';
      }
      return '';
    }

    return '';
  }

  function handleFieldChange(field, value) {
    const normalizedValue = field === 'phone' || field === 'aadhaarNumber' ? String(value || '').replace(/\D/g, '') : value;
    update(field, normalizedValue);

    if (field === 'phone' || field === 'aadhaarNumber') {
      setErrors((current) => ({ ...current, [field]: validateField(field, normalizedValue) }));
    }
  }

  function handleFieldBlur(field) {
    setErrors((current) => ({ ...current, [field]: validateField(field, form[field]) }));
  }

  function validateForm() {
    const nextErrors = {
      phone: validateField('phone', form.phone),
      aadhaarNumber: validateField('aadhaarNumber', form.aadhaarNumber),
    };
    setErrors(nextErrors);
    return !nextErrors.phone && !nextErrors.aadhaarNumber;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user?.hospitalId) {
      setError('Hospital profile is missing. Please login again.');
      return;
    }

    if (!validateForm()) {
      setError('Please correct the highlighted validation issues before submitting.');
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
        setForm({ ...initialState, medicalCapabilities: [] });
      }
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit driver request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="title-group compact-title">
        <p className="eyebrow">{resubmitMode ? 'Resubmission' : 'Driver onboarding'}</p>
        <h2>{resubmitMode ? 'Edit & Resubmit Driver' : 'Register Driver'}</h2>
        <p>Submit a complete driver request with grouped personal, address, and licensing details for admin verification.</p>
      </div>

      {submitted && (
        <div className="status-card submitted">
          <strong>{resubmitMode ? 'Resubmitted successfully.' : 'Submitted. Awaiting admin approval.'}</strong>
          <span>{resubmitMode ? 'The updated driver request has been sent for review.' : 'The request is now saved in pending_drivers.'}</span>
        </div>
      )}

      {error && (
        <div className="status-card rejected">
          <strong>Submission failed.</strong>
          <span>{error}</span>
        </div>
      )}

      <form className="ops-form panel form-shell" onSubmit={handleSubmit}>
        {fieldGroups.map((group) => (
          <div key={group.title} className="section-card form-section-card">
            <h3 className="section-title">{group.title}</h3>
            <p className="section-copy">{group.description}</p>
            <div className="form-grid">
              {group.fields.map((field) => {
                const inputProps = {
                  value: form[field.key] || '',
                  onChange: (event) => handleFieldChange(field.key, event.target.value),
                  onBlur: () => handleFieldBlur(field.key),
                  required: field.required,
                };

                if (field.type === 'file') {
                  return (
                    <label key={field.key} className="form-field-card">
                      <span className="field-label">{field.label}</span>
                      {resubmitMode && <span className="helper-copy">(only upload if you want to replace)</span>}
                      <Input type="file" onChange={(event) => handleFieldChange(field.key, event.target.files?.[0])} />
                    </label>
                  );
                }

                return (
                  <label key={field.key} className="form-field-card">
                    <span className="field-label">{field.label}</span>
                    {field.type === 'date' ? (
                      <Input type="date" {...inputProps} />
                    ) : field.type === 'email' ? (
                      <Input type="email" {...inputProps} />
                    ) : (
                      <Input type="text" {...inputProps} />
                    )}
                    {errors[field.key] && <span className="field-error">{errors[field.key]}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <Button type="primary" htmlType="submit" className="ops-submit" loading={submitting} disabled={submitting || submitted}>
          {submitting ? 'Submitting...' : resubmitMode ? 'Resubmit for approval' : 'Submit for approval'}
        </Button>
      </form>
    </section>
  );
}

export default DriverRegistration;
