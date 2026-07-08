import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { hasFirebaseConfig } from "../firebase/client.js";
import Button from "../components/ui/Button.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const firebaseReady = hasFirebaseConfig();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_460px]">
        <div className="hidden border-r border-slate-200 bg-white p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-sm font-semibold text-white">AG</div>
              <div>
                <p className="text-sm font-semibold text-slate-950">AmbuGrid</p>
                <p className="text-xs text-slate-500">Emergency Ambulance Coordination SaaS</p>
              </div>
            </div>
            <div className="mt-24 max-w-2xl">
              <h1 className="text-4xl font-semibold tracking-normal text-slate-950">Super admin operations console</h1>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Company-owned control panel for hospitals, drivers, ambulances, active emergencies, roles, and platform health.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <ShieldCheck className="h-4 w-4" />
              {firebaseReady
                ? "Sign-in is verified against the admins collection (super_admin role required)."
                : "Firebase isn't configured yet — you're in local demo mode."}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-10">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-soft sm:p-8"
          >
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-sm font-semibold text-white">AG</div>
              <div>
                <p className="text-sm font-semibold text-slate-950">AmbuGrid</p>
                <p className="text-xs text-slate-500">Secure admin console</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Sign in</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {firebaseReady
                  ? "Use your super admin credentials to continue."
                  : "Enter anything to explore the console in demo mode."}
              </p>
            </div>

            <div className="mt-8 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <span className="mt-2 flex h-11 items-center gap-3 rounded-md border border-slate-200 bg-white px-3">
                  <Mail size={18} className="text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                    placeholder="admin@ambugrid.com"
                    autoComplete="email"
                  />
                </span>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <span className="mt-2 flex h-11 items-center gap-3 rounded-md border border-slate-200 bg-white px-3">
                  <LockKeyhole size={18} className="text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </span>
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <Button type="submit" className="mt-8 h-11 w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Enter Dashboard"}
              <ArrowRight size={18} />
            </Button>

            <p className="mt-5 text-center text-xs leading-5 text-slate-400">
              {firebaseReady
                ? "Access is limited to accounts with role: super_admin in Firestore."
                : "Demo-only login. Connect VITE_FIREBASE_* env vars to enable real authentication."}
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
