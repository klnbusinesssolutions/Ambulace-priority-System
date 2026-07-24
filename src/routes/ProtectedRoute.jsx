import { Navigate, Outlet } from "react-router-dom";

import { usePoliceStore } from "@/store/policeStore";

export function ProtectedRoute() {
  const isAuthenticated = usePoliceStore((state) => state.isAuthenticated);
  const authReady = usePoliceStore((state) => state.authReady);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Checking secure session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
