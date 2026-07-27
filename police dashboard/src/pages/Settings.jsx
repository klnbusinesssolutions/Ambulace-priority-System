import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, LogOut, MapPinned, Monitor, ShieldCheck, User, Info, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { changeCurrentUserPassword } from "@/services/authService";
import { APP_NAME, APP_VERSION, BUILD_ENV, BUILD_NUMBER } from "@/services/appInfo";
import { usePoliceStore } from "@/store/policeStore";
import {
  applyThemePreference,
  loadDashboardPreferences,
  loadMapPreferences,
  loadNotificationPreferences,
  saveDashboardPreferences,
  saveMapPreferences,
  saveNotificationPreferences,
} from "@/utils/settingsPreferences";

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-slate-50 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-md border border-input bg-background px-2 text-sm text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// -------------------------------------------------------------------------
// Police Officer Profile - editable name/phone (badge id + station are
// admin-assigned and stay read-only), backed by police_officers/{uid}.
// -------------------------------------------------------------------------
function ProfileSection() {
  const currentOperator = usePoliceStore((state) => state.currentOperator);
  const updateOperatorProfile = usePoliceStore((state) => state.updateOperatorProfile);
  const [name, setName] = useState(currentOperator?.displayName ?? "");
  const [phone, setPhone] = useState(currentOperator?.phone ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = name !== (currentOperator?.displayName ?? "") || phone !== (currentOperator?.phone ?? "");

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOperatorProfile({ name: name.trim(), phone: phone.trim() });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400" /> Police Officer Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Full name
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Officer name" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Contact number
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 XXXXX XXXXX" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Badge ID
            <Input value={currentOperator?.badgeId ?? "--"} disabled />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Station
            <Input value={currentOperator?.station?.name ?? "Not assigned"} disabled />
          </label>
        </div>
        <p className="text-xs text-slate-400">
          Badge ID and station are assigned by an administrator and can't be changed here.
        </p>
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------------------
// Change Password - reauthenticates with the current password (required by
// Firebase Auth) then sets the new one.
// -------------------------------------------------------------------------
function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setSaving(true);
    try {
      await changeCurrentUserPassword(currentPassword, newPassword);
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Could not change password. Check your current password and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-slate-400" /> Change Password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Current password
            <Input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              New password
              <Input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Confirm new password
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </label>
          </div>
          {error && <p className="text-xs font-medium text-status-critical">{error}</p>}
          <div className="flex justify-end">
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? "Updating..." : "Update password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------------------
// Notification Preferences - persisted to localStorage, actually consumed by
// services/notify.js so toggling these has an immediate real effect on the
// next toast/sound/desktop notification.
// -------------------------------------------------------------------------
function NotificationPreferencesSection() {
  const [prefs, setPrefs] = useState(loadNotificationPreferences);

  const update = async (key, value) => {
    if (key === "desktop" && value && "Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Desktop notifications were blocked in the browser");
        return;
      }
    }
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveNotificationPreferences(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-slate-400" /> Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <SettingRow label="Emergency alerts" description="New emergency created near your station">
          <Switch checked={prefs.emergencyAlerts} onCheckedChange={(v) => update("emergencyAlerts", v)} />
        </SettingRow>
        <SettingRow label="ETA alerts" description="Ambulance stopped or approaching hospital (under 5 mins)">
          <Switch checked={prefs.etaAlerts} onCheckedChange={(v) => update("etaAlerts", v)} />
        </SettingRow>
        <SettingRow label="Trip completion" description="Ambulance reached the destination hospital">
          <Switch checked={prefs.tripCompletion} onCheckedChange={(v) => update("tripCompletion", v)} />
        </SettingRow>
        <SettingRow label="Sound" description="Play a chime when a notification arrives">
          <Switch checked={prefs.sound} onCheckedChange={(v) => update("sound", v)} />
        </SettingRow>
        <SettingRow label="Desktop notifications" description="Show a system notification outside the browser tab">
          <Switch checked={prefs.desktop} onCheckedChange={(v) => update("desktop", v)} />
        </SettingRow>
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------------------
// Map Preferences - defaultMapType/trafficLayer/autoCenter are read directly
// by MapContainer.jsx (see loadMapPreferences() calls there), so these are
// real settings, not decorative toggles.
// -------------------------------------------------------------------------
function MapPreferencesSection() {
  const [prefs, setPrefs] = useState(loadMapPreferences);

  const update = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveMapPreferences(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPinned className="h-4 w-4 text-slate-400" /> Map Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <SettingRow label="Default map type" description="Applied when the map loads">
          <SelectField
            value={prefs.defaultMapType}
            onChange={(v) => update("defaultMapType", v)}
            options={[
              { value: "roadmap", label: "Standard" },
              { value: "satellite", label: "Satellite" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Auto-center on active emergency" description="Pan and zoom to a unit when you open its details">
          <Switch
            checked={prefs.autoCenterOnActiveEmergency}
            onCheckedChange={(v) => update("autoCenterOnActiveEmergency", v)}
          />
        </SettingRow>
        <SettingRow label="Traffic layer" description="Show live Google traffic conditions on the map">
          <Switch checked={prefs.trafficLayer} onCheckedChange={(v) => update("trafficLayer", v)} />
        </SettingRow>
      </CardContent>
      <div className="border-t px-4 py-2 text-xs text-slate-400">Changes apply the next time a map loads.</div>
    </Card>
  );
}

// -------------------------------------------------------------------------
// Dashboard Preferences - landing page feeds Login.jsx's post-login redirect,
// auto-refresh feeds MapContainer's viewport refresh interval, theme toggles
// the `dark` Tailwind class on <html> (tailwind.config.js: darkMode: ["class"]).
// -------------------------------------------------------------------------
function DashboardPreferencesSection() {
  const [prefs, setPrefs] = useState(loadDashboardPreferences);

  const update = (key, value) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveDashboardPreferences(next);
    if (key === "theme") applyThemePreference(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-slate-400" /> Dashboard Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <SettingRow label="Default landing page" description="Where you land right after logging in">
          <SelectField
            value={prefs.landingPage}
            onChange={(v) => update("landingPage", v)}
            options={[
              { value: "/", label: "Dashboard" },
              { value: "/emergencies", label: "Active Emergencies" },
              { value: "/tracking", label: "Live Tracking" },
              { value: "/alerts", label: "Priority Alerts" },
              { value: "/activity", label: "Activity Feed" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Auto refresh interval" description="How often the live map re-fits to active units">
          <SelectField
            value={String(prefs.autoRefreshSeconds)}
            onChange={(v) => update("autoRefreshSeconds", Number(v))}
            options={[
              { value: "10", label: "10 seconds" },
              { value: "15", label: "15 seconds" },
              { value: "30", label: "30 seconds" },
              { value: "60", label: "60 seconds" },
            ]}
          />
        </SettingRow>
        <SettingRow label="Theme" description="Light or dark interface">
          <SelectField
            value={prefs.theme}
            onChange={(v) => update("theme", v)}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </SettingRow>
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------------------
// Account & Security - real sign-out; "Active sessions" is reported honestly
// rather than faked, since the Firebase Auth client SDK doesn't expose a
// list of an account's other active sessions/devices.
// -------------------------------------------------------------------------
function AccountSecuritySection() {
  const currentOperator = usePoliceStore((state) => state.currentOperator);
  const logout = usePoliceStore((state) => state.logout);
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-slate-400" /> Account &amp; Security
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SettingRow label="Signed in as" description={currentOperator?.email ?? "--"}>
          <Badge variant="success">{currentOperator?.approvalStatus ?? "active"}</Badge>
        </SettingRow>
        <SettingRow
          label="Active sessions"
          description="Per-device session management isn't available with this project's current Firebase Auth plan."
        >
          <Badge variant="neutral">Not available</Badge>
        </SettingRow>
        <div className="flex justify-end">
          <Button size="sm" variant="danger" onClick={handleLogout} disabled={loggingOut}>
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Signing out..." : "Log out"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------------------------------------------------------------
// About the System - real version/build metadata (src/services/appInfo.js),
// not placeholder copy.
// -------------------------------------------------------------------------
function AboutSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-4 w-4 text-slate-400" /> About the System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-600">
        <div className="flex items-center justify-between">
          <span>Application</span>
          <span className="font-medium text-slate-900">{APP_NAME}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Version</span>
          <span className="font-medium text-slate-900">{APP_VERSION}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Build</span>
          <span className="font-medium text-slate-900">
            {BUILD_NUMBER} ({BUILD_ENV})
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function Settings() {
  return (
    <div>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Configuration</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Settings</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileSection />
        <PasswordSection />
        <NotificationPreferencesSection />
        <MapPreferencesSection />
        <DashboardPreferencesSection />
        <AccountSecuritySection />
        <div className="lg:col-span-2">
          <AboutSection />
        </div>
      </div>
    </div>
  );
}
