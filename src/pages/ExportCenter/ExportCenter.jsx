import { useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  Calendar,
  Filter,
  CheckCircle2,
  Trash2,
  Clock,
  Building2,
  User,
  Ambulance,
  AlertTriangle,
  ClipboardCheck,
  Activity,
  Bell,
  BarChart3,
  RefreshCcw,
} from "lucide-react";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime } from "../../utils/formatters.js";
import {
  getEmergencyDisplayId,
  getHospitalDisplayId,
  resolveAmbulancePlate,
  resolveDriverName,
  resolveHospitalName,
} from "../../utils/entityDisplay.js";
import { exportToCSV, exportToExcel, exportToPDF } from "../../utils/exportUtils.js";
import Button from "../../components/ui/Button.jsx";
import Input from "../../components/ui/Input.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";

const moduleTabs = [
  { id: "hospitals", label: "Hospitals", icon: Building2 },
  { id: "drivers", label: "Drivers", icon: User },
  { id: "ambulances", label: "Ambulances", icon: Ambulance },
  { id: "emergencies", label: "Emergencies", icon: AlertTriangle },
  { id: "verifications", label: "Verification Requests", icon: ClipboardCheck },
  { id: "activity", label: "Activity Logs", icon: Activity },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "analytics", label: "Analytics Summary", icon: BarChart3 },
];

export default function ExportCenter() {
  const {
    hospitals = [],
    drivers = [],
    pendingDrivers = [],
    ambulances = [],
    pendingAmbulances = [],
    emergencies = [],
    pendingPoliceOfficers = [],
    rejectedRequestsCollection = [],
    activityLogs = [],
    notifications = [],
    overviewStats = [],
    operationalStats = [],
  } = useOps();

  const [selectedModule, setSelectedModule] = useState("hospitals");
  const [exportFormat, setExportFormat] = useState("excel"); // csv, excel, pdf
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All status");
  const [hospitalFilter, setHospitalFilter] = useState("All hospitals");
  const [priorityFilter, setPriorityFilter] = useState("All priority");

  const [exporting, setExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // History from localStorage
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("ambugrid_export_history");
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      return [];
    }
  });

  const saveHistory = (newItem) => {
    const updated = [newItem, ...history].slice(0, 15);
    setHistory(updated);
    try {
      localStorage.setItem("ambugrid_export_history", JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const removeFromHistory = (id) => {
    const updated = history.filter((item) => item.id !== id);
    setHistory(updated);
    try {
      localStorage.setItem("ambugrid_export_history", JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const hospitalOptions = ["All hospitals", ...Array.from(new Set(hospitals.map((h) => h.name || h.hospitalId).filter(Boolean)))];

  // Helper date filter
  const isWithinDateRange = (dateVal) => {
    if (!dateVal) return true;
    const dt = new Date(dateVal).getTime();
    if (isNaN(dt)) return true;

    if (startDate) {
      const start = new Date(startDate).getTime();
      if (dt < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000; // end of day
      if (dt > end) return false;
    }
    return true;
  };

  // Filtered dataset & column definitions per module
  const { columns, data, title } = useMemo(() => {
    if (selectedModule === "hospitals") {
      const cols = [
        { key: "hospitalCode", header: "Hospital Code", getValue: (item) => item.hospitalCode || getHospitalDisplayId(item) },
        { key: "name", header: "Hospital Name" },
        { key: "phone", header: "Phone" },
        { key: "email", header: "Email" },
        { key: "city", header: "City" },
        { key: "state", header: "State" },
        { key: "isActive", header: "Status", getValue: (item) => (item.isActive ? "Active" : "Offline") },
        { key: "createdAt", header: "Created Date", getValue: (item) => formatDateTime(item.createdAt) },
      ];

      const list = hospitals.filter((h) => {
        if (statusFilter === "Approved / Active" && !h.isActive) return false;
        if (statusFilter === "Offline" && h.isActive) return false;
        if (hospitalFilter !== "All hospitals" && (h.name !== hospitalFilter && h.hospitalId !== hospitalFilter)) return false;
        return isWithinDateRange(h.createdAt);
      });

      return { columns: cols, data: list, title: "Hospitals Report" };
    }

    if (selectedModule === "drivers") {
      const cols = [
        { key: "name", header: "Driver Name", getValue: (item) => item.name || item.fullName },
        { key: "phone", header: "Phone" },
        { key: "email", header: "Email" },
        { key: "licenseNumber", header: "Licence Number" },
        { key: "hospitalName", header: "Hospital" },
        { key: "availability", header: "Availability" },
        { key: "tripStatus", header: "Trip Status" },
        { key: "createdAt", header: "Submitted Date", getValue: (item) => formatDateTime(item.createdAt || item.submittedAt) },
      ];

      const combined = [...drivers, ...pendingDrivers];
      const list = combined.filter((d) => {
        if (statusFilter === "Approved / Active" && d.status === "pending") return false;
        if (statusFilter === "Pending" && d.status !== "pending") return false;
        if (hospitalFilter !== "All hospitals" && d.hospitalName !== hospitalFilter && d.hospitalId !== hospitalFilter) return false;
        return isWithinDateRange(d.createdAt || d.submittedAt);
      });

      return { columns: cols, data: list, title: "Drivers Fleet Report" };
    }

    if (selectedModule === "ambulances") {
      const cols = [
        { key: "numberPlate", header: "Number Plate", getValue: (item) => item.numberPlate || item.registrationNumber },
        { key: "vehicleType", header: "Vehicle Type" },
        { key: "capacity", header: "Capacity" },
        { key: "hospitalId", header: "Hospital", getValue: (item) => item.hospitalName || item.hospitalId || "Assigned" },
        { key: "availability", header: "Availability" },
        { key: "submittedAt", header: "Approved Date", getValue: (item) => formatDateTime(item.approvedAt || item.submittedAt) },
      ];

      const combined = [...ambulances, ...pendingAmbulances];
      const list = combined.filter((a) => {
        if (statusFilter === "Approved / Active" && a.status === "pending") return false;
        if (statusFilter === "Pending" && a.status !== "pending") return false;
        if (hospitalFilter !== "All hospitals" && a.hospitalId !== hospitalFilter) return false;
        return isWithinDateRange(a.approvedAt || a.submittedAt);
      });

      return { columns: cols, data: list, title: "Ambulance Fleet Report" };
    }

    if (selectedModule === "emergencies") {
      const cols = [
        { key: "referenceId", header: "Reference ID", getValue: (item) => getEmergencyDisplayId(item) },
        { key: "patientName", header: "Patient Name" },
        { key: "incidentType", header: "Incident Type" },
        { key: "priority", header: "Priority" },
        { key: "status", header: "Dispatch Status" },
        { key: "hospitalName", header: "Assigned Hospital", getValue: (item) => resolveHospitalName(item.hospitalName || item.hospitalId, hospitals) },
        { key: "ambulanceId", header: "Ambulance Plate", getValue: (item) => resolveAmbulancePlate(item.ambulanceId, ambulances) },
        { key: "driverName", header: "Driver", getValue: (item) => resolveDriverName(item.driverName || item.driverId, drivers) },
        { key: "eta", header: "ETA" },
        { key: "createdAt", header: "Created Time", getValue: (item) => formatDateTime(item.createdAt || item.timestamp) },
      ];

      const list = emergencies.filter((e) => {
        if (priorityFilter !== "All priority" && e.priority !== priorityFilter) return false;
        if (statusFilter === "Approved / Active" && (e.status === "completed" || e.status === "resolved")) return false;
        if (statusFilter === "Offline" && e.status !== "completed") return false;
        if (hospitalFilter !== "All hospitals" && e.hospitalId !== hospitalFilter) return false;
        return isWithinDateRange(e.createdAt || e.timestamp);
      });

      return { columns: cols, data: list, title: "Active Emergencies Report" };
    }

    if (selectedModule === "verifications") {
      const cols = [
        { key: "entityName", header: "Entity Name", getValue: (item) => item.fullName || item.name || item.numberPlate || item.hospitalId },
        { key: "requestType", header: "Entity Type", getValue: (item) => item.numberPlate ? "Ambulance" : item.badgeId ? "Police" : item.licenseNumber ? "Driver" : "Hospital" },
        { key: "status", header: "Status" },
        { key: "hospitalId", header: "Hospital", getValue: (item) => item.hospitalName || item.hospitalId },
        { key: "submittedAt", header: "Submitted Date", getValue: (item) => formatDateTime(item.submittedAt || item.createdAt) },
      ];

      const combined = [...pendingDrivers, ...pendingAmbulances, ...pendingPoliceOfficers, ...rejectedRequestsCollection];
      const list = combined.filter((v) => {
        if (statusFilter === "Pending" && v.status !== "pending") return false;
        if (statusFilter === "Rejected" && v.status !== "rejected") return false;
        if (hospitalFilter !== "All hospitals" && v.hospitalId !== hospitalFilter) return false;
        return isWithinDateRange(v.submittedAt || v.createdAt);
      });

      return { columns: cols, data: list, title: "Verification Requests Report" };
    }

    if (selectedModule === "activity") {
      const cols = [
        { key: "action", header: "Action" },
        { key: "details", header: "Details" },
        { key: "performedBy", header: "Performed By" },
        { key: "createdAt", header: "Timestamp", getValue: (item) => formatDateTime(item.createdAt) },
      ];

      const list = activityLogs.filter((log) => isWithinDateRange(log.createdAt));
      return { columns: cols, data: list, title: "Platform Activity Logs Report" };
    }

    if (selectedModule === "notifications") {
      const cols = [
        { key: "title", header: "Title" },
        { key: "message", header: "Message" },
        { key: "type", header: "Type" },
        { key: "read", header: "Read Status", getValue: (item) => (item.read ? "Read" : "Unread") },
        { key: "createdAt", header: "Created Timestamp", getValue: (item) => formatDateTime(item.createdAt) },
      ];

      const list = notifications.filter((n) => {
        if (statusFilter === "Unread" && n.read) return false;
        if (statusFilter === "Read" && !n.read) return false;
        return isWithinDateRange(n.createdAt);
      });

      return { columns: cols, data: list, title: "Notifications Log Report" };
    }

    // Default: Analytics Summary
    const cols = [
      { key: "metric", header: "Metric Name" },
      { key: "value", header: "Value" },
      { key: "category", header: "Category" },
      { key: "detail", header: "Details" },
    ];

    const list = [
      ...overviewStats.map((s) => ({ metric: s.label, value: s.value, category: "Verification Overview", detail: s.detail })),
      ...operationalStats.map((s) => ({ metric: s.label, value: s.value, category: "Operational Stats", detail: s.detail })),
    ];

    return { columns: cols, data: list, title: "Analytics Summary Report" };
  }, [
    selectedModule,
    hospitals,
    drivers,
    pendingDrivers,
    ambulances,
    pendingAmbulances,
    emergencies,
    pendingPoliceOfficers,
    rejectedRequestsCollection,
    activityLogs,
    notifications,
    overviewStats,
    operationalStats,
    statusFilter,
    hospitalFilter,
    priorityFilter,
    startDate,
    endDate,
  ]);

  // Estimated File Size Calculation
  const estimatedFileSize = useMemo(() => {
    const bytes = data.length * 180 + columns.length * 40 + 300;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }, [data, columns]);

  // Trigger Export Execution
  const handleExecuteExport = () => {
    setExporting(true);
    setSuccessMsg("");

    const baseName = `${title.toLowerCase().replaceAll(" ", "_")}_${new Date().toISOString().slice(0, 10)}`;
    const filterSummary = `Module: ${selectedModule} | Hospital: ${hospitalFilter} | Priority: ${priorityFilter} | Status: ${statusFilter}`;
    const statsSummary = [
      { label: "Total Records", value: String(data.length) },
      { label: "Format", value: exportFormat.toUpperCase() },
      { label: "Generated By", value: "Super Admin" },
    ];

    setTimeout(() => {
      try {
        if (exportFormat === "csv") {
          exportToCSV(baseName, columns, data);
        } else if (exportFormat === "excel") {
          exportToExcel(baseName, title, columns, data);
        } else if (exportFormat === "pdf") {
          exportToPDF(baseName, title, filterSummary, statsSummary, columns, data);
        }

        // Save history entry
        const historyItem = {
          id: String(Date.now()),
          filename: `${baseName}.${exportFormat === "excel" ? "xlsx" : exportFormat}`,
          module: title,
          format: exportFormat.toUpperCase(),
          timestamp: new Date().toISOString(),
          recordCount: data.length,
        };
        saveHistory(historyItem);

        setSuccessMsg(`Successfully exported ${data.length} records in ${exportFormat.toUpperCase()} format!`);
      } catch (err) {
        console.error("Export error:", err);
      } finally {
        setExporting(false);
      }
    }, 400);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Export Center"
        description="Centralized operational report generator — filter and export platform datasets into CSV, Excel (.xlsx), and PDF reports."
      />

      {/* MODULE SELECTOR TABS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {moduleTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = selectedModule === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedModule(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                isSelected
                  ? "bg-slate-900 text-white shadow-xs dark:bg-slate-100 dark:text-slate-900"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* FILTER BAR */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1 block">Start Date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1 block">End Date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1 block">Status</label>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={["All status", "Approved / Active", "Pending", "Rejected", "Offline"]} />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1 block">Hospital</label>
          <Select value={hospitalFilter} onChange={(e) => setHospitalFilter(e.target.value)} options={hospitalOptions} />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1 block">Priority</label>
          <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} options={["All priority", "critical", "high", "medium", "low"]} />
        </div>
      </div>

      {/* EXPORT PREVIEW & GENERATION PANEL */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: Data Preview Summary Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-950 dark:text-slate-100">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{data.length} records matching current active filters.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {data.length} Rows
            </span>
          </div>

          {/* Sample Table Preview */}
          <div className="max-h-80 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/60">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-800">
                <tr>
                  {columns.slice(0, 5).map((col) => (
                    <th key={col.key} className="px-3 py-2">{col.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.slice(0, 8).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40">
                    {columns.slice(0, 5).map((col) => {
                      let val = item[col.key];
                      if (col.getValue) val = col.getValue(item);
                      return <td key={col.key} className="px-3 py-2 text-slate-800 dark:text-slate-200">{val !== undefined ? String(val) : "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Export Format Selector & Action */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5 shadow-xs flex flex-col justify-between dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Export Configuration</h3>

            {/* Format Buttons */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target File Format</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat("csv")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold transition ${
                    exportFormat === "csv"
                      ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900/40"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <FileCode className="h-5 w-5 mb-1 text-blue-600 dark:text-blue-400" />
                  <span>CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("excel")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold transition ${
                    exportFormat === "excel"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-100 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/40"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <FileSpreadsheet className="h-5 w-5 mb-1 text-emerald-600 dark:text-emerald-400" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("pdf")}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-bold transition ${
                    exportFormat === "pdf"
                      ? "border-red-600 bg-red-50 text-red-700 ring-2 ring-red-100 dark:border-red-500 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-900/40"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  <FileText className="h-5 w-5 mb-1 text-red-600 dark:text-red-400" />
                  <span>PDF Report</span>
                </button>
              </div>
            </div>

            {/* File Info */}
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs space-y-1.5 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Record Count:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{data.length}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Est. File Size:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{estimatedFileSize}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Format:</span>
                <span className="font-bold uppercase text-slate-900 dark:text-slate-100">{exportFormat}</span>
              </div>
            </div>

            {successMsg && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-xs font-medium text-emerald-800 border border-emerald-200 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>

          <Button
            className="w-full justify-center gap-2 py-3 text-sm"
            onClick={handleExecuteExport}
            disabled={exporting || data.length === 0}
          >
            {exporting ? (
              <>
                <RefreshCcw className="h-4 w-4 animate-spin" />
                <span>Generating {exportFormat.toUpperCase()}...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download {exportFormat.toUpperCase()} Report</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* EXPORT HISTORY SECTION */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-950 dark:text-slate-100">Export History</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Recent report downloads generated in this session.</p>
          </div>
          <span className="text-xs text-slate-400">{history.length} exports logged</span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No export history recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-700 font-bold uppercase text-[10px] dark:bg-slate-800 dark:text-slate-300">
                    {item.format}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">{item.filename}</p>
                    <p className="text-slate-500 dark:text-slate-400">{item.module} · {item.recordCount} records · {formatDateTime(item.timestamp)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={handleExecuteExport}>
                    Download Again <Download className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" onClick={() => removeFromHistory(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
