import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Globe,
  Key,
  Laptop,
  Lock,
  LogOut,
  Monitor,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Input from "../../components/ui/Input.jsx";
import Modal from "../../components/ui/Modal.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import Toggle from "../../components/ui/Toggle.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { hasFirebaseConfig } from "../../firebase/client.js";
import { updateAdmin } from "../../services/firestore/adminsService.js";
import {
  updateAdminPasswordSecure,
  updateAdminEmailSecure,
  deleteAdminAccountSecure,
} from "../../services/auth/adminAuthService.js";
import {
  revokeOtherSessions,
  revokeAllSessions,
} from "../../services/firestore/loginHistoryService.js";
import { applyTheme } from "../../utils/theme.js";
import { formatDateTime } from "../../utils/formatters.js";

export default function Settings() {
  const { settings, setSettings, loginHistory: rawLoginHistory } = useOps();
  const { admin, logout } = useAuth();

  const [savedSettings, setSavedSettings] = useState(settings);
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null); // { type: 'success' | 'error', text: '' }

  // Current session tracking ID
  const currentSessionId =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("ambugrid_current_session_id")
      : null;

  // Modals state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Email Re-authentication Modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailReauthPassword, setEmailReauthPassword] = useState("");
  const [emailModalError, setEmailModalError] = useState("");
  const [emailModalSaving, setEmailModalSaving] = useState(false);

  // Delete Account Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmCheck, setDeleteConfirmCheck] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Sync saved settings when context updates or admin changes
  useEffect(() => {
    if (admin) {
      const merged = {
        ...settings,
        adminName: admin.displayName || settings.adminName || "Super Admin",
        email: admin.email || settings.email || "admin@ambugrid.com",
      };
      setSavedSettings(merged);
      setDraft(merged);
    } else {
      setSavedSettings(settings);
      setDraft(settings);
    }
  }, [settings, admin]);

  // Derive real active sessions and login history from live audit records
  const userLoginHistory = useMemo(() => {
    const list = rawLoginHistory || [];
    const filtered = list.filter(
      (item) => !admin?.uid || item.uid === admin.uid || item.uid === "demo-admin"
    );
    return filtered.sort(
      (a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)
    );
  }, [rawLoginHistory, admin?.uid]);

  const activeSessions = useMemo(() => {
    if (!userLoginHistory.length) return [];
    // Active sessions are those marked 'active' or matching currentSessionId
    const activeList = userLoginHistory.filter(
      (item) =>
        item.status === "active" ||
        item.sessionId === currentSessionId ||
        item.current === true
    );
    // If no active flag found, treat most recent record as current active session
    return activeList.length > 0 ? activeList : [userLoginHistory[0]];
  }, [userLoginHistory, currentSessionId]);

  // Toast feedback helper
  const showToast = (text, type = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Determine if draft has any unsaved changes
  const isDirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(savedSettings);
  }, [draft, savedSettings]);

  const update = (field, value) => {
    setDraft((current) => {
      const next = { ...current, [field]: value };
      if (field === "theme") {
        applyTheme(value);
      }
      return next;
    });
  };

  function handleReset() {
    setDraft(savedSettings);
    applyTheme(savedSettings.theme);
  }

  // Trigger Save settings flow
  async function handleSave() {
    if (saving) return;
    // If email has changed, trigger secure re-authentication modal first
    if (draft.email !== savedSettings.email) {
      setEmailModalOpen(true);
      return;
    }

    await executeSaveSettings(draft);
  }

  async function executeSaveSettings(settingsToSave) {
    setSaving(true);
    try {
      setSettings(settingsToSave);
      setSavedSettings(settingsToSave);
      if (hasFirebaseConfig() && admin?.uid) {
        await updateAdmin(admin.uid, { displayName: settingsToSave.adminName });
      }
      showToast("Settings updated successfully! Preferences saved.");
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast(error.message || "Failed to save settings.", "error");
    } finally {
      setSaving(false);
    }
  }

  // Handle Secure Email Update submit
  async function handleEmailUpdateSubmit(e) {
    e.preventDefault();
    if (emailModalSaving) return;
    setEmailModalError("");
    if (!emailReauthPassword) {
      setEmailModalError("Please enter your current password to authorize email update.");
      return;
    }

    setEmailModalSaving(true);
    try {
      await updateAdminEmailSecure(emailReauthPassword, draft.email);
      await executeSaveSettings(draft);
      setEmailModalOpen(false);
      setEmailReauthPassword("");
      showToast("Email address updated successfully in Auth & Firestore!");
    } catch (err) {
      setEmailModalError(err.message || "Failed to update email.");
    } finally {
      setEmailModalSaving(false);
    }
  }

  // Handle Secure Password Update submit
  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (passwordSaving) return;
    setPasswordError("");

    if (!passwordForm.currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      await updateAdminPasswordSecure(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordModalOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("Password updated successfully!");
    } catch (err) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  // Handle Session Revocation
  async function handleSignOutOtherDevices() {
    try {
      await revokeOtherSessions(admin?.uid || "demo-admin", currentSessionId);
      showToast("Successfully signed out all other device sessions.");
    } catch (err) {
      showToast(err.message || "Failed to revoke other sessions.", "error");
    }
  }

  async function handleSignOutAllDevices() {
    try {
      await revokeAllSessions(admin?.uid || "demo-admin");
      showToast("All active sessions revoked.");
      await logout();
    } catch (err) {
      showToast(err.message || "Failed to revoke sessions.", "error");
    }
  }

  // Handle Account Deletion submit
  async function handleDeleteAccountSubmit(e) {
    e.preventDefault();
    if (deleteSaving) return;
    setDeleteError("");

    if (!deletePassword) {
      setDeleteError("Please enter your password to confirm deletion.");
      return;
    }
    if (!deleteConfirmCheck) {
      setDeleteError("Please confirm that you understand this action is permanent.");
      return;
    }

    setDeleteSaving(true);
    try {
      await deleteAdminAccountSecure(deletePassword);
      // Clean up local storage per admin key
      const key = admin?.uid ? `ambugrid_settings_${admin.uid}` : "ambugrid_settings_default";
      localStorage.removeItem(key);
      localStorage.removeItem("ambugrid_settings");
      sessionStorage.clear();
      await logout();
    } catch (err) {
      setDeleteError(err.message || "Failed to delete account. Please verify password.");
      setDeleteSaving(false);
    }
  }

  const adminInitials = useMemo(() => {
    const name = draft.adminName || admin?.displayName || "Super Admin";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  }, [draft.adminName, admin?.displayName]);

  return (
    <div className="space-y-6">
      {/* Page Header with Save and Reset Actions */}
      <PageHeader
        title="Settings Workspace"
        description="Admin profile, console appearance, regional formats, security controls, and sessions."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={!isDirty || saving}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Changes
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        }
      />

      {/* Unsaved Changes Banner */}
      {isDirty && (
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700/80 dark:bg-amber-950/60 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-sm font-semibold">
              You have unsaved changes. Click <strong>Save settings</strong> to commit your updates.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleReset}>
              Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between rounded-lg border p-4 text-sm font-medium transition-all duration-200 ${
            toastMessage.type === "error"
              ? "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200"
              : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {toastMessage.type === "error" ? (
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            ) : (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            className="text-xs font-semibold opacity-70 hover:opacity-100"
            onClick={() => setToastMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Primary Workspace Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Section 1: Profile Header & Editable Info */}
        <Card className="flex flex-col md:col-span-2">
          <CardHeader>
            <CardTitle>
              <User className="h-4 w-4 text-slate-500 dark:text-slate-300" />
              Administrator Profile
            </CardTitle>
            <CardDescription>
              Manage account identity and primary contact credentials used across console operations and audit logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Compact Profile Summary Header */}
            <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/60">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-blue-600 text-white font-extrabold text-xl shadow-md shrink-0">
                {adminInitials}
              </div>
              <div className="space-y-1 text-center sm:text-left min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                    {draft.adminName}
                  </h3>
                  <StatusBadge status="Approved" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-300 font-mono">
                  {draft.email}
                </p>
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Super Admin Console Authorization</span>
                </div>
              </div>
            </div>

            {/* Editable Profile Inputs */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                value={draft.adminName}
                onChange={(e) => update("adminName", e.target.value)}
                placeholder="e.g. Super Admin"
              />
              <Input
                label="Email Address"
                type="email"
                value={draft.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="admin@ambugrid.com"
                helperText="Saving a new email will prompt for current password to sync Firebase Auth & Firestore."
              />
            </div>

            {/* Read-Only Administrative Role */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Role
                </label>
                <Lock className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">Super Admin</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Managed by organization permissions and system security policies.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Appearance */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>
              <Monitor className="h-4 w-4 text-slate-500 dark:text-slate-300" />
              Appearance
            </CardTitle>
            <CardDescription>
              Configure theme preferences, interface micro-animations, and content display density.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <Select
              label="Console Theme"
              value={draft.theme}
              onChange={(e) => update("theme", e.target.value)}
              options={["System Default", "Light", "Dark"]}
            />
            <Toggle
              label="Enable Animations"
              description="Show smooth transitions and subtle visual micro-interactions across pages."
              checked={draft.enableAnimations}
              onChange={(val) => update("enableAnimations", val)}
            />
            <Toggle
              label="Compact Mode"
              description="Increase density for data tables, lists, and operational control cards."
              checked={draft.compactMode}
              onChange={(val) => update("compactMode", val)}
            />
          </CardContent>
        </Card>

        {/* Section 3: Regional Settings (Console Language Removed) */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>
              <Globe className="h-4 w-4 text-slate-500 dark:text-slate-300" />
              Regional & Format Settings
            </CardTitle>
            <CardDescription>
              Set timezone standards, 12/24-hour time formats, and date display rules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <Select
              label="Console Timezone"
              value={draft.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              options={["Asia/Calcutta", "UTC", "America/New_York", "Europe/London"]}
            />
            <Select
              label="Time Format"
              value={draft.timeFormat || "12-hour"}
              onChange={(e) => update("timeFormat", e.target.value)}
              options={["12-hour", "24-hour"]}
            />
            <Select
              label="Date Format"
              value={draft.dateFormat || "DD/MM/YYYY"}
              onChange={(e) => update("dateFormat", e.target.value)}
              options={["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]}
            />
          </CardContent>
        </Card>

        {/* Section 4: Security & Authentication */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>
              <ShieldCheck className="h-4 w-4 text-slate-500 dark:text-slate-300" />
              Security & Credentials
            </CardTitle>
            <CardDescription>
              Review authentication status, session duration timeouts, and administrator credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-700 dark:bg-slate-900">
              <div>
                <p className="text-sm font-bold text-slate-950 dark:text-slate-100">Password Management</p>
                <p className="text-xs text-slate-500 dark:text-slate-300">Update your console access credentials.</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => setPasswordModalOpen(true)}
              >
                <Key className="h-3.5 w-3.5" />
                Change Password
              </Button>
            </div>

            <Select
              label="Session Timeout Duration"
              value={draft.sessionTimeout || "30 Minutes"}
              onChange={(e) => update("sessionTimeout", e.target.value)}
              options={["15 Minutes", "30 Minutes", "1 Hour", "Never"]}
            />
          </CardContent>
        </Card>

        {/* Section 5: Active Sessions */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>
              <Laptop className="h-4 w-4 text-slate-500 dark:text-slate-300" />
              Active Sessions
            </CardTitle>
            <CardDescription>
              Manage real active device connections authenticated to your admin account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {activeSessions.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                No external active session recorded.
              </p>
            ) : (
              activeSessions.map((session, idx) => {
                const isCurrent =
                  session.sessionId === currentSessionId || idx === 0;

                return (
                  <div
                    key={session.id || session.sessionId || idx}
                    className="rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Laptop className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {session.device || session.browser || "Active Console Session"}
                        </span>
                      </div>
                      <StatusBadge status={isCurrent ? "Approved" : "Info"} />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      IP: <span className="font-mono">{session.ip || "Dynamic"}</span> · {session.location || "Location unavailable"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Last active: {formatDateTime(session.lastActive || session.timestamp, draft.timeFormat)} {isCurrent && "(Current Session)"}
                    </p>
                  </div>
                );
              })
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="secondary" size="sm" className="text-xs gap-1" onClick={() => logout()}>
                <LogOut className="h-3.5 w-3.5" /> Sign Out This Session
              </Button>
              <Button variant="secondary" size="sm" className="text-xs gap-1" onClick={handleSignOutOtherDevices}>
                <ShieldAlert className="h-3.5 w-3.5" /> Sign Out Other Devices
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 6: Recent Login History */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Clock className="h-4 w-4 text-slate-500 dark:text-slate-300" />
            Recent Login History
          </CardTitle>
          <CardDescription>
            Audit log of recent successful console authentication events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userLoginHistory.length === 0 ? (
            <EmptyState
              title="No recent login history"
              description="Login events will be recorded here automatically upon authentication."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 font-bold uppercase">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Device & OS</th>
                    <th className="py-2.5 px-3">Browser</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {userLoginHistory.map((item, idx) => {
                    const isCurrent = item.sessionId === currentSessionId || idx === 0;

                    return (
                      <tr key={item.id || item.sessionId || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/80">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {formatDateTime(item.timestamp || item.date, draft)}
                        </td>
                        <td className="py-2.5 px-3">{item.device || item.os || "Desktop"}</td>
                        <td className="py-2.5 px-3">{item.browser || "Chrome"}</td>
                        <td className="py-2.5 px-3 font-mono">{item.ip || "Dynamic"}</td>
                        <td className="py-2.5 px-3">{item.location || "Location unavailable"}</td>
                        <td className="py-2.5 px-3 text-right">
                          <StatusBadge status={isCurrent ? "Approved" : "Info"} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 7: Account Actions (Bottom Red Card) */}
      <Card className="border-red-300 bg-red-50/40 dark:border-red-800/90 dark:bg-red-950/30">
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            Account Actions
          </CardTitle>
          <CardDescription className="text-red-700/80 dark:text-red-300/90">
            Irreversible account management actions, session termination, and permanent account removal.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Administrative Session & Account Controls
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Sign out from this device, invalidate all active sessions, or permanently delete your account.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => logout()} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
            <Button variant="secondary" onClick={handleSignOutAllDevices} className="gap-2">
              <ShieldAlert className="h-4 w-4" />
              Sign Out All Devices
            </Button>
            <Button variant="danger" onClick={() => setDeleteModalOpen(true)} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Re-authenticate Modal for Email Update */}
      <Modal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        title="Confirm Email Address Change"
        description="Changing your email updates both Firebase Authentication and your Firestore Admin Profile. Enter your current password to proceed."
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailUpdateSubmit} disabled={emailModalSaving}>
              {emailModalSaving ? "Updating Email..." : "Confirm & Update Email"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleEmailUpdateSubmit} className="space-y-4">
          {emailModalError && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
              {emailModalError}
            </div>
          )}
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
            <strong>New Email:</strong> {draft.email}
          </div>
          <Input
            label="Current Password"
            type="password"
            value={emailReauthPassword}
            onChange={(e) => setEmailReauthPassword(e.target.value)}
            placeholder="••••••••"
          />
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Change Console Password"
        description="Enter your current password and specify a new secure password."
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordSubmit} disabled={passwordSaving}>
              {passwordSaving ? "Updating Password..." : "Update Password"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
              {passwordError}
            </div>
          )}

          <Input
            label="Current Password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))}
            placeholder="••••••••"
          />
          <Input
            label="New Password"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))}
            placeholder="••••••••"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))}
            placeholder="••••••••"
          />
        </form>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Admin Account"
        description="Warning: This action is permanent and cannot be undone. It will delete your Firebase Auth account and remove your Firestore admin profile."
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteAccountSubmit} disabled={deleteSaving || !deleteConfirmCheck}>
              {deleteSaving ? "Deleting Account..." : "Permanently Delete Account"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleDeleteAccountSubmit} className="space-y-4">
          {deleteError && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
              {deleteError}
            </div>
          )}

          <Input
            label="Current Password"
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="••••••••"
          />

          <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={deleteConfirmCheck}
              onChange={(e) => setDeleteConfirmCheck(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 dark:border-slate-600 dark:bg-slate-800"
            />
            <span>I understand that deleting my account is permanent and revokes all administrative access.</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}
