# Police officer approval script

This replaces the `createPoliceOfficerCredentialsOnApproval` Cloud Function
(currently defined in `../../hospital-dashboard/functions/index.js`, which
is where the shared Cloud Functions for this project live) for anyone who
hasn't deployed Cloud Functions yet. It does the exact same job — create
the Firebase Auth account and drop
a temp password into `police_temp_credentials/{requestId}` — but you trigger
it manually by running a command instead of Firestore triggering it
automatically.

## One-time setup

1. Firebase Console → ⚙️ Project settings → **Service accounts** tab →
   **Generate new private key**. This downloads a JSON file.
2. Save it in this folder as `serviceAccountKey.json`.
   **Never commit this file** — it's a full admin key to your Firebase
   project. It's already excluded via `.gitignore`.
3. Install dependencies:
   ```bash
   cd hospital-dashboard/scripts
   npm install
   ```

## Usage

1. In the admin dashboard, click "Approve" on a pending police officer as
   usual. This flips the request's `status` to `"approved"` in Firestore
   — nothing else happens automatically without the Cloud Function.
2. Run the script:
   ```bash
   npm run approve
   ```
   or
   ```bash
   node approvePoliceOfficers.js
   ```
3. It scans `pending_police_officers` for any request with
   `status: "approved"` that hasn't been processed yet, creates the Auth
   account, and writes the temp password. Within a couple seconds the
   admin dashboard's "Approve police officer" modal (which is watching
   `police_temp_credentials/{requestId}`) will update and show the
   credentials.

## Running it continuously instead of by hand

Open `approvePoliceOfficers.js` and see the comment at the bottom — swap
the one-shot `run()` call for the `setInterval(...)` version and leave the
process running (e.g. under `pm2`, or a scheduled task) to auto-process
new approvals every 30 seconds without you needing to run the command
each time.

## Once you deploy the real Cloud Function

If you later deploy `createPoliceOfficerCredentialsOnApproval` (see
`../../hospital-dashboard/functions/index.js`), you can stop using this
script — the Cloud Function does the same thing automatically on every
approval.
