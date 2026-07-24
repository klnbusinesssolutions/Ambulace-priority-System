/**
 * Standalone script: processes approved police officer requests.
 *
 * This does the SAME job as the `createPoliceOfficerCredentialsOnApproval`
 * Cloud Function, but instead of being triggered automatically by a
 * Firestore write, you run it manually (or on a schedule) with:
 *
 *   node approvePoliceOfficers.js
 *
 * It scans `pending_police_officers` for docs where status === "approved"
 * and credentials haven't been created yet, creates the Firebase Auth
 * account + `police_officers/{uid}` profile, and writes the temp password
 * to `police_temp_credentials/{requestId}` — exactly what the admin
 * dashboard's modal is waiting to see.
 *
 * SETUP (one time):
 * 1. Firebase Console -> Project settings -> Service accounts
 *    -> "Generate new private key". Save the downloaded JSON file
 *    as `serviceAccountKey.json` in this same folder.
 *    (Keep this file secret — never commit it to git.)
 * 2. npm install firebase-admin
 * 3. node approvePoliceOfficers.js
 *
 * Run it again any time you approve new officers in the admin dashboard,
 * or set up a loop/scheduled task to run it every minute (see bottom).
 */

const admin = require('firebase-admin');
const crypto = require('crypto');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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

async function processOneRequest(doc) {
  const after = doc.data();
  const requestId = doc.id;

  if (after.status !== 'approved') return;
  if (after.uid && after.credentialsCreatedAt) return; // already processed

  console.log(`Processing request ${requestId} (${after.name || after.email})...`);

  if (!after.email || !after.name) {
    await doc.ref.update({
      adminReviewMessage: 'Approval failed: email and name are required.',
      status: 'needs_correction',
    });
    console.log(`  -> Skipped: missing email or name.`);
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
        await doc.ref.update({
          adminReviewMessage: `Police officer credential creation failed after ${maxAttempts} attempts: ${error.message}`,
        });
        console.error(`  -> Failed after ${maxAttempts} attempts:`, error.message);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }

  const batch = db.batch();

  batch.delete(doc.ref);

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

  const tempCredRef = db.collection('police_temp_credentials').doc(requestId);
  batch.set(tempCredRef, {
    uid: userRecord.uid,
    requestId,
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
    requestId,
    credentialsDocPath: `police_temp_credentials/${requestId}`,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  console.log(`  -> Done. Auth uid: ${userRecord.uid}. Temp password written to police_temp_credentials/${requestId}.`);
}

async function run() {
  const snapshot = await db
    .collection('pending_police_officers')
    .where('status', '==', 'approved')
    .get();

  if (snapshot.empty) {
    console.log('No approved-but-unprocessed police officer requests found.');
    return;
  }

  for (const doc of snapshot.docs) {
    await processOneRequest(doc);
  }

  console.log('Done processing all approved requests.');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

/**
 * OPTIONAL: to keep this running continuously instead of running it by
 * hand every time, replace the `run().then(...)` block above with:
 *
 *   setInterval(() => { run().catch(console.error); }, 30 * 1000);
 *
 * and leave the script running (e.g. in a terminal, or under pm2 / as a
 * Windows scheduled task) so approvals get picked up automatically.
 */
