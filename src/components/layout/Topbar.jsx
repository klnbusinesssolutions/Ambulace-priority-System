import { Bell, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime } from "../../utils/formatters.js";
import Button from "../ui/Button.jsx";
import { MobileMenuButton } from "./Sidebar.jsx";

function initialsOf(name = "") {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "").concat(parts[1]?.[0] || "").toUpperCase() || "AD";
}

export default function Topbar({ onMenuClick }) {
  const { logout } = useAuth();
  const { settings, notifications, notificationsActions } = useOps();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);
  const recentNotifications = notifications.slice(0, 8);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <MobileMenuButton onClick={onMenuClick} />

      <div className="relative hidden min-w-0 flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="focus-ring h-9 w-full max-w-xl rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400"
          placeholder="Search hospitals, drivers, emergencies..."
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 md:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Systems operational
        </div>

        <div className="group relative">
          <Button
            variant="secondary"
            size="icon"
            aria-label="Notifications"
            className="relative"
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          {notificationsOpen && (
            <>
              <button
                type="button"
                aria-label="Close notifications"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setNotificationsOpen(false)}
              />
              <div className="absolute right-0 top-11 z-20 w-80 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <p className="text-sm font-semibold text-slate-950">Notifications</p>
                  <p className="text-xs text-slate-400">{notifications.length} total</p>
                </div>
                <div className="max-h-80 space-y-1 overflow-y-auto">
                  {recentNotifications.length === 0 && (
                    <p className="px-2 py-6 text-center text-sm text-slate-400">You're all caught up.</p>
                  )}
                  {recentNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => notificationsActions.markRead(notification.id)}
                      className={`block w-full rounded-md px-2 py-2 text-left text-sm transition hover:bg-slate-50 ${
                        notification.read ? "opacity-60" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />}
                        <span className="font-medium text-slate-950">{notification.title}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{notification.message}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">{formatDateTime(notification.createdAt)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="group relative">
          <Button variant="secondary" className="gap-3">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-900 text-xs text-white">{initialsOf(settings.adminName)}</span>
            <span className="hidden text-sm sm:inline">{settings.adminName}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </Button>
          <div className="invisible absolute right-0 top-11 w-56 rounded-lg border border-slate-200 bg-white p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-slate-950">{settings.adminName}</p>
              <p className="text-xs text-slate-500">{settings.role}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-950"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
