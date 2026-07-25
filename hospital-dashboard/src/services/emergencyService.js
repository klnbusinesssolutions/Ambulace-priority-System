import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, updateDoc, doc, where } from 'firebase/firestore';
import { db } from '../firebase/config';

export function subscribeToEmergencies(hospitalId, callback) {
  if (!hospitalId) return () => {};

  const q = query(
    collection(db, 'emergencies'),
    where('hospitalId', '==', hospitalId),
    orderBy('startTime', 'desc')
  );

  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((item) => ({ id: item.id, ...item.data() })));
  });
}

export async function logActivity(hospitalId, type, message, meta = {}) {
  await addDoc(collection(db, 'activity_logs'), {
    hospitalId,
    type,
    message,
    ...meta,
    createdAt: serverTimestamp(),
  });
}

export async function createEmergency(hospitalId, values) {
  const isReferral = !!values.isReferral;

  const payload = {
    hospitalId,
    patientName: values.patientName,
    phoneNumber: values.phoneNumber || '',
    incidentType: values.incidentType,
    incidentDescription: values.incidentType === 'Other' ? values.incidentDescription || '' : '',
    priority: values.priority,
    status: 'requested',
    ambulanceId: values.ambulanceId,
    driverId: values.driverId,
    driverName: values.driverName,
    eta: null,
    location: {
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
    },
    address: values.address || '',
    isReferral,
    referral: isReferral
      ? {
          hospitalName: values.referredHospitalName || '',
          address: values.referredHospitalAddress || '',
          location: {
            latitude: values.referredHospitalLat ? Number(values.referredHospitalLat) : null,
            longitude: values.referredHospitalLng ? Number(values.referredHospitalLng) : null,
          },
          reason: values.referralReason || '',
        }
      : null,
    startTime: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'emergencies'), payload);

  const activityMessage = isReferral
    ? `New emergency created: ${values.incidentType} (${values.priority}) — referred to ${values.referredHospitalName || 'another hospital'}`
    : `New emergency created: ${values.incidentType} (${values.priority}) — request sent to ${values.driverName}`;

  await logActivity(hospitalId, 'emergency_created', activityMessage, {
    emergencyId: ref.id,
  });

  return { id: ref.id, ...payload };
}

export async function assignAmbulanceToEmergency(hospitalId, emergencyId, assignment) {
  await updateDoc(doc(db, 'emergencies', emergencyId), {
    ambulanceId: assignment.ambulanceId,
    driverName: assignment.driverName,
    eta: assignment.eta,
    status: 'dispatched',
  });

  await logActivity(hospitalId, 'driver_assigned', `Ambulance ${assignment.ambulanceId} assigned, ETA ${assignment.eta}`, {
    emergencyId,
    ambulanceId: assignment.ambulanceId,
  });
}