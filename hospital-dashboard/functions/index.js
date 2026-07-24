const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

function generateSecurePassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '@#$!';
  const all = upper + lower + digits + special;

  const randomBytes = crypto.randomBytes(12);
  let password = '';
  password += upper[randomBytes[0] % upper.length];
  password += lower[randomBytes[1] % lower.length];
  password += digits[randomBytes[2] % digits.length];
  password += special[randomBytes[3] % special.length];

  for (let i = 4; i < 12; i++) {
    password += all[randomBytes[i] % all.length];
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}

exports.createDriverCredentialsOnApproval = onDocumentUpdated(
  'drivers/{driverId}',
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (after.approvalStatus !== 'approved' || before.approvalStatus === 'approved') {
      return;
    }

    if (after.uid && after.credentialsCreatedAt) {
      return;
    }

    if (!after.email || !after.fullName) {
      await event.data.after.ref.update({
        adminReviewMessage: 'Driver approval failed: email and full name are required.',
        approvalStatus: 'needs_correction',
      });
      return;
    }

    const password = generateSecurePassword();

    let userRecord;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        userRecord = await auth.createUser({
          email: after.email,
          password,
          displayName: after.fullName,
          disabled: false,
        });
        break;
      } catch (error) {
        if (error.code === 'auth/email-already-exists') {
          userRecord = await auth.getUserByEmail(after.email);
          await auth.updateUser(userRecord.uid, {
            password,
            displayName: after.fullName,
            disabled: false,
          });
          break;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          await event.data.after.ref.update({
            adminReviewMessage: `Driver credential creation failed after ${maxAttempts} attempts: ${error.message}`,
          });
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }

    const batch = db.batch();

    batch.update(event.data.after.ref, {
      uid: userRecord.uid,
      passwordChanged: false,
      credentialsCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const userRef = db.collection('users').doc(userRecord.uid);
    batch.set(userRef, {
      uid: userRecord.uid,
      role: 'driver',
      hospitalId: after.hospitalId,
      email: after.email,
      requiresPasswordChange: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    const tempCredRef = db
      .collection('hospitals')
      .doc(after.hospitalId)
      .collection('temp_credentials')
      .doc(userRecord.uid);

    batch.set(tempCredRef, {
      driverId: event.params.driverId,
      driverName: after.fullName,
      email: after.email,
      tempPassword: password,
      used: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      hospitalId: after.hospitalId,
      type: 'driver_approved',
      title: 'Driver Approved',
      message: `Driver ${after.fullName} has been approved. Temporary login credentials have been generated. Please share them securely.`,
      driverId: event.params.driverId,
      driverName: after.fullName,
      credentialsDocPath: `hospitals/${after.hospitalId}/temp_credentials/${userRecord.uid}`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }
);

/**
 * Same pattern as createDriverCredentialsOnApproval, for the police onboarding
 * flow: admin dashboard flips `pending_police_officers/{requestId}.status` to
 * "approved", this creates the real Auth account + `police_officers/{uid}`
 * profile doc, and drops a temp password the admin can relay to the officer.
 *
 * The temp-credential doc is keyed by requestId (not uid) so the admin
 * dashboard can start watching it the moment it clicks "Approve", before the
 * Auth user (and its uid) exists yet.
 */
exports.createPoliceOfficerCredentialsOnApproval = onDocumentUpdated(
  'pending_police_officers/{requestId}',
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    if (after.status !== 'approved' || before.status === 'approved') {
      return;
    }

    if (after.uid && after.credentialsCreatedAt) {
      return;
    }

    if (!after.email || !after.name) {
      await event.data.after.ref.update({
        adminReviewMessage: 'Approval failed: email and name are required.',
        status: 'needs_correction',
      });
      return;
    }

    const password = generateSecurePassword();

    let userRecord;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        userRecord = await auth.createUser({
          email: after.email,
          password,
          displayName: after.name,
          disabled: false,
        });
        break;
      } catch (error) {
        if (error.code === 'auth/email-already-exists') {
          userRecord = await auth.getUserByEmail(after.email);
          await auth.updateUser(userRecord.uid, {
            password,
            displayName: after.name,
            disabled: false,
          });
          break;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          await event.data.after.ref.update({
            adminReviewMessage: `Police officer credential creation failed after ${maxAttempts} attempts: ${error.message}`,
          });
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    }

    const batch = db.batch();

    // Delete rather than update: the admin's pending-queue page only shows
    // this collection, so once processed the request should disappear from
    // it. The temp-credentials doc below is keyed by requestId independently,
    // so the admin dashboard can still find the generated password even
    // after this doc is gone.
    batch.delete(event.data.after.ref);

    const officerRef = db.collection('police_officers').doc(userRecord.uid);
    batch.set(officerRef, {
      uid: userRecord.uid,
      email: after.email,
      badgeId: after.badgeId || '',
      displayName: after.name || '',
      department: after.department || '',
      station: after.station ?? null,
      serviceRadiusKm: after.serviceRadiusKm ?? 10,
      role: 'police',
      isActive: true,
      requiresPasswordChange: true,
      onboardedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    const tempCredRef = db.collection('police_temp_credentials').doc(event.params.requestId);
    batch.set(tempCredRef, {
      uid: userRecord.uid,
      requestId: event.params.requestId,
      name: after.name,
      badgeId: after.badgeId || '',
      email: after.email,
      tempPassword: password,
      used: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      hospitalId: null,
      type: 'police_officer_approved',
      title: 'Police Officer Approved',
      message: `Officer ${after.name} (badge ${after.badgeId || 'n/a'}) has been approved. Temporary login credentials have been generated.`,
      requestId: event.params.requestId,
      credentialsDocPath: `police_temp_credentials/${event.params.requestId}`,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }
);
