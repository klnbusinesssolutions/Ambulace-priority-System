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
