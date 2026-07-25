import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { usePoliceStore } from "@/store/policeStore";

export function PoliceLayout() {
  const subscribeToLiveData = usePoliceStore((state) => state.subscribeToLiveData);

  useEffect(() => {
    const unsubscribe = subscribeToLiveData();
    return unsubscribe;
  }, [subscribeToLiveData]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" richColors closeButton />
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
