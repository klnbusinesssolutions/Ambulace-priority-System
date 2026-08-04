import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Mail,
  MailOpen,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  ExternalLink,
  User,
  Ambulance,
  Building2,
  ShieldCheck,
  CheckSquare,
  Square,
  Clock,
  FileText,
} from "lucide-react";
import { useOps } from "../../context/OpsContext.jsx";
import { useOverlay } from "../../context/OverlayContext.jsx";
import { formatDateTime, matchesSearch } from "../../utils/formatters.js";
import Button from "../../components/ui/Button.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { NOTIFICATION_TYPES, VERIFICATION_STATUS } from "../../firebase/collections.js";
import { resolveNotificationDestination } from "../../services/notifications/notificationRouter.js";
import { getNotificationConfig, NOTIFICATION_CATEGORIES, isActionRequiredNotification, isResolvedNotification } from "../../services/notifications/notificationConfig.js";

const typeOptions = ["All types", "Driver", "Ambulance", "Hospital", "Police", "Emergency", "System", "Audit"];
const statusOptions = ["All status", "Unread", "Read"];
const sortOptions = ["Newest First", "Oldest First"];

export default function Notifications() {
  const navigate = useNavigate();
  const {
    notifications = [],
    notificationsActions,
    pendingDrivers = [],
    pendingAmbulances = [],
    pendingPoliceOfficers = [],
    hospitals = [],
    drivers = [],
    ambulances = [],
    emergencies = [],
  } = useOps();
  const { openDrawer } = useOverlay();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [statusFilter, setStatusFilter] = useState("All status");
  const [sortOrder, setSortOrder] = useState("Newest First");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [collapsedSections, setCollapsedSections] = useState({
    actionRequired: false,
    activityLog: false,
  });

  // Keyboard accessibility: Escape clears selections
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const opsData = useMemo(
    () => ({
      pendingDrivers,
      pendingAmbulances,
      pendingPoliceOfficers,
      hospitals,
      drivers,
      ambulances,
      emergencies,
    }),
    [pendingDrivers, pendingAmbulances, pendingPoliceOfficers, hospitals, drivers, ambulances, emergencies],
  );

  const activePendingTargetIds = useMemo(() => {
    const ids = new Set();
    (pendingDrivers || []).forEach((d) => (d.status === "pending" || d.status === VERIFICATION_STATUS.pending) && ids.add(d.id));
    (pendingAmbulances || []).forEach((a) => (a.status === "pending" || a.status === VERIFICATION_STATUS.pending) && ids.add(a.id));
    (pendingPoliceOfficers || []).forEach((p) => (p.status === "pending" || p.status === VERIFICATION_STATUS.pending) && ids.add(p.id));
    (hospitals || []).forEach((h) => (h.status === "pending" || h.isPending) && ids.add(h.id || h.hospitalId));
    return ids;
  }, [pendingDrivers, pendingAmbulances, pendingPoliceOfficers, hospitals]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter((n) => !n.read).length;
    const actionRequired = notifications.filter((n) => isActionRequiredNotification(n, activePendingTargetIds)).length;
    const activityLog = total - actionRequired;
    return { total, unread, actionRequired, activityLog };
  }, [notifications, activePendingTargetIds]);

  // Filtering & Sorting
  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((n) => {
        if (query && !matchesSearch(n, query, ["title", "message", "type", "targetId"])) return false;
        if (typeFilter !== "All types" && !n.type?.toLowerCase().includes(typeFilter.toLowerCase())) return false;
        if (statusFilter === "Unread" && n.read) return false;
        if (statusFilter === "Read" && !n.read) return false;
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return sortOrder === "Newest First" ? timeB - timeA : timeA - timeB;
      });
  }, [notifications, query, typeFilter, statusFilter, sortOrder]);

  // Grouped Action Required (Open Tasks) vs Recently Resolved Tasks
  const actionRequiredGroup = useMemo(() => {
    return filteredNotifications.filter((n) => isActionRequiredNotification(n, activePendingTargetIds));
  }, [filteredNotifications, activePendingTargetIds]);

  const recentlyResolvedGroup = useMemo(() => {
    return filteredNotifications
      .filter((n) => isResolvedNotification(n, activePendingTargetIds))
      .sort((a, b) => {
        const timeA = new Date(a.resolvedAt || a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.resolvedAt || b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });
  }, [filteredNotifications, activePendingTargetIds]);

  // Selection state helpers
  const allFilteredIds = useMemo(() => filteredNotifications.map((n) => n.id), [filteredNotifications]);
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  };

  const handleToggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkMarkRead = () => {
    selectedIds.forEach((id) => notificationsActions.markRead(id));
    setSelectedIds(new Set());
  };

  const handleBulkMarkUnread = () => {
    selectedIds.forEach((id) => notificationsActions.markUnread?.(id));
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => notificationsActions.remove?.(id));
    setSelectedIds(new Set());
  };

  const handleOpenNotification = (n) => {
    notificationsActions.markRead(n.id);

    const destination = resolveNotificationDestination(n, opsData);

    if (destination.action === "OPEN_DRAWER") {
      openDrawer(destination.payload);
    } else {
      navigate(destination.route);
    }
  };

  const toggleSection = (secKey) => {
    setCollapsedSections((prev) => ({ ...prev, [secKey]: !prev[secKey] }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Center & Activity Logs"
        description="Enterprise notification control hub separating actionable requests from historical audit logs."
      />

      {/* STATISTICS OVERVIEW */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Notifications" value={stats.total} icon={<Bell className="h-5 w-5 text-blue-600" />} color="bg-blue-50 text-blue-700" />
        <StatCard title="Unread Messages" value={stats.unread} icon={<Mail className="h-5 w-5 text-amber-600" />} color="bg-amber-50 text-amber-700" />
        <StatCard title="Action Required" value={stats.actionRequired} icon={<AlertTriangle className="h-5 w-5 text-red-600" />} color="bg-red-50 text-red-700" />
        <StatCard title="Activity & Audit Logs" value={stats.activityLog} icon={<FileText className="h-5 w-5 text-emerald-600" />} color="bg-emerald-50 text-emerald-700" />
      </div>

      {/* TOOLBAR: SEARCH, FILTERS & BULK ACTIONS */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notifications by title, message, ID..."
              className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-9 text-xs">
              {typeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 text-xs">
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
            <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="h-9 text-xs">
              {sortOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* BULK ACTIONS CONTROL */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
            >
              {isAllSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-slate-400" />}
              <span>Select All ({allFilteredIds.length})</span>
            </button>
            {selectedIds.size > 0 && <span className="text-slate-400">· {selectedIds.size} selected</span>}
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <Button variant="secondary" size="sm" className="h-7 text-xs gap-1" onClick={handleBulkMarkRead}>
                <MailOpen className="h-3.5 w-3.5" /> Mark Read
              </Button>
              <Button variant="secondary" size="sm" className="h-7 text-xs gap-1" onClick={handleBulkMarkUnread}>
                <Mail className="h-3.5 w-3.5" /> Mark Unread
              </Button>
              <Button variant="danger" size="sm" className="h-8 gap-1 text-xs" onClick={handleBulkDelete}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* EMPTY STATE */}
      {filteredNotifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-slate-500">
          <Bell className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">No notifications available.</p>
          <p className="text-xs text-slate-400 mt-1">Try clearing filters or search terms.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* CATEGORY A: ACTION REQUIRED */}
          {actionRequiredGroup.length > 0 && (
            <SectionBlock
              title="⚡ Action Required (Category A)"
              count={actionRequiredGroup.length}
              color="bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60"
              isCollapsed={collapsedSections.actionRequired}
              onToggle={() => toggleSection("actionRequired")}
            >
              {actionRequiredGroup.map((n) => (
                <NotificationCardItem
                  key={n.id}
                  notification={n}
                  isSelected={selectedIds.has(n.id)}
                  onToggleSelect={() => handleToggleSelect(n.id)}
                  onOpen={() => handleOpenNotification(n)}
                  onMarkRead={() => notificationsActions.markRead(n.id)}
                  onMarkUnread={() => notificationsActions.markUnread?.(n.id)}
                  onDelete={() => notificationsActions.remove?.(n.id)}
                />
              ))}
            </SectionBlock>
          )}

          {/* RECENTLY RESOLVED TASKS */}
          {recentlyResolvedGroup.length > 0 && (
            <SectionBlock
              title="✓ Recently Resolved Tasks"
              count={recentlyResolvedGroup.length}
              color="bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60"
              isCollapsed={collapsedSections.activityLog}
              onToggle={() => toggleSection("activityLog")}
            >
              {recentlyResolvedGroup.map((n) => (
                <NotificationCardItem
                  key={n.id}
                  notification={n}
                  isSelected={selectedIds.has(n.id)}
                  onToggleSelect={() => handleToggleSelect(n.id)}
                  onOpen={() => handleOpenNotification(n)}
                  onMarkRead={() => notificationsActions.markRead(n.id)}
                  onMarkUnread={() => notificationsActions.markUnread?.(n.id)}
                  onDelete={() => notificationsActions.remove?.(n.id)}
                />
              ))}
            </SectionBlock>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-slate-100">{value}</p>
    </div>
  );
}

function SectionBlock({ title, count, color, isCollapsed, onToggle, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div
        onClick={onToggle}
        className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none border-b ${color}`}
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <span>{title}</span>
          <span className="rounded-full bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 text-xs font-bold shadow-2xs">{count}</span>
        </div>
        <button type="button" className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {!isCollapsed && <div className="divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-1">{children}</div>}
    </div>
  );
}

function NotificationCardItem({
  notification,
  isSelected,
  onToggleSelect,
  onOpen,
  onMarkRead,
  onMarkUnread,
  onDelete,
}) {
  const type = notification.type || "";
  const cfg = getNotificationConfig(type);
  let TypeIcon = Bell;
  if (type.includes("driver")) TypeIcon = User;
  else if (type.includes("ambulance")) TypeIcon = Ambulance;
  else if (type.includes("hospital")) TypeIcon = Building2;
  else if (type.includes("police")) TypeIcon = ShieldCheck;
  else if (type.includes("emergency")) TypeIcon = AlertTriangle;

  return (
    <div
      className={`group flex items-start justify-between gap-4 rounded-lg p-3 transition-colors ${
        notification.read
          ? "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60"
          : "bg-blue-50/40 hover:bg-blue-50/70 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
      }`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <button type="button" onClick={onToggleSelect} className="mt-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          {isSelected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}
        </button>

        <div className="mt-0.5 grid h-8 w-8 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
          <TypeIcon className="h-4 w-4" />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-bold text-sm text-slate-950 dark:text-slate-100">{notification.title}</h4>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                cfg.category === NOTIFICATION_CATEGORIES.actionRequired
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {cfg.category === NOTIFICATION_CATEGORIES.actionRequired ? "Action Required" : "Activity Log"}
            </span>
            {!notification.read && <StatusBadge status="Unread" />}
          </div>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{notification.message}</p>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
            <Clock className="h-3 w-3" /> {formatDateTime(notification.createdAt)}
            {notification.targetId && <span className="font-mono text-slate-500">· ID: {notification.targetId}</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onOpen}>
          Open <ExternalLink className="h-3 w-3" />
        </Button>
        {notification.read ? (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMarkUnread} title="Mark as Unread">
            <Mail className="h-4 w-4 text-slate-400" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMarkRead} title="Mark as Read">
            <MailOpen className="h-4 w-4 text-slate-600" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={onDelete} title="Delete">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
