import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Truck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/Card.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Input from "../../components/ui/Input.jsx";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Select from "../../components/ui/Select.jsx";
import StatusBadge from "../../components/ui/StatusBadge.jsx";
import { useOps } from "../../context/OpsContext.jsx";
import { formatDateTime } from "../../utils/formatters.js";
import { calculateEmergencyAnalyticsData, safeParseDate } from "../../utils/analyticsAggregator.js";

const PRIORITY_COLORS = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#2563eb",
  low: "#059669",
};

export default function Analytics() {
  const { analytics = [], hospitals = [], emergencies = [] } = useOps();
  const [searchTerm, setSearchTerm] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState("all");

  // Merge analytics and emergencies strictly driven by Firestore data (NO FAKE RANDOM NUMBERS)
  const combinedAnalytics = useMemo(() => {
    return calculateEmergencyAnalyticsData(analytics, emergencies, hospitals);
  }, [analytics, emergencies, hospitals]);

  // Filtering by search term, hospital, priority, and date range
  const filteredData = useMemo(() => {
    const now = new Date();
    return combinedAnalytics.filter((record) => {
      const matchesSearch =
        !searchTerm ||
        record.emergencyId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.incidentType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.driverName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesHospital = hospitalFilter === "all" || record.hospitalId === hospitalFilter;
      const matchesPriority = priorityFilter === "all" || record.priority === priorityFilter;

      let matchesTime = true;
      if (timeRangeFilter !== "all") {
        const recordDate = safeParseDate(record.createdAt);
        if (recordDate) {
          const diffDays = (now - recordDate) / (1000 * 60 * 60 * 24);
          if (timeRangeFilter === "today") matchesTime = diffDays <= 1;
          else if (timeRangeFilter === "7days") matchesTime = diffDays <= 7;
          else if (timeRangeFilter === "30days") matchesTime = diffDays <= 30;
        }
      }

      return matchesSearch && matchesHospital && matchesPriority && matchesTime;
    });
  }, [combinedAnalytics, searchTerm, hospitalFilter, priorityFilter, timeRangeFilter]);

  // Aggregate KPI Statistics
  const stats = useMemo(() => {
    const total = filteredData.length;
    if (total === 0) {
      return {
        avgResponseTime: "0.0",
        avgDuration: "0.0",
        totalIncidents: 0,
        efficiencyRate: 100,
        criticalCount: 0,
      };
    }

    const sumResponse = filteredData.reduce((sum, item) => sum + (Number(item.responseTime) || 0), 0);
    const sumDuration = filteredData.reduce(
      (sum, item) => sum + (Number(item.totalDuration) || Number(item.duration) || 0),
      0,
    );
    const fastResponses = filteredData.filter((item) => (Number(item.responseTime) || 0) <= 10).length;
    const criticalCount = filteredData.filter((item) => item.priority === "critical").length;

    return {
      avgResponseTime: (sumResponse / total).toFixed(1),
      avgDuration: (sumDuration / total).toFixed(1),
      totalIncidents: total,
      efficiencyRate: Math.round((fastResponses / total) * 100),
      criticalCount,
    };
  }, [filteredData]);

  // Priority Breakdown Donut Data
  const priorityChartData = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    filteredData.forEach((item) => {
      const p = item.priority in counts ? item.priority : "medium";
      counts[p] = (counts[p] || 0) + 1;
    });

    const total = filteredData.length;

    return [
      { name: "Critical", value: counts.critical, color: PRIORITY_COLORS.critical, percentage: total ? Math.round((counts.critical / total) * 100) : 0 },
      { name: "High", value: counts.high, color: PRIORITY_COLORS.high, percentage: total ? Math.round((counts.high / total) * 100) : 0 },
      { name: "Medium", value: counts.medium, color: PRIORITY_COLORS.medium, percentage: total ? Math.round((counts.medium / total) * 100) : 0 },
      { name: "Low", value: counts.low, color: PRIORITY_COLORS.low, percentage: total ? Math.round((counts.low / total) * 100) : 0 },
    ].filter((item) => item.value > 0);
  }, [filteredData]);

  // Hospital Comparison Bar Chart Data
  const hospitalChartData = useMemo(() => {
    const hospitalGroup = {};
    filteredData.forEach((item) => {
      const name = item.hospitalName || "Unknown";
      if (!hospitalGroup[name]) {
        hospitalGroup[name] = { totalResponse: 0, count: 0 };
      }
      hospitalGroup[name].totalResponse += Number(item.responseTime) || 0;
      hospitalGroup[name].count += 1;
    });

    return Object.entries(hospitalGroup).map(([name, data]) => ({
      hospital: name.length > 15 ? `${name.substring(0, 13)}...` : name,
      avgResponse: Number((data.totalResponse / data.count).toFixed(1)),
      incidents: data.count,
    }));
  }, [filteredData]);

  // Table Columns Setup
  const tableColumns = [
    {
      key: "emergencyId",
      header: "Incident ID",
      render: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{row.emergencyId || row.id}</span>
      ),
    },
    {
      key: "hospitalName",
      header: "Hospital",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{row.hospitalName}</p>
          <p className="text-xs text-slate-500">{row.hospitalId}</p>
        </div>
      ),
    },
    {
      key: "incidentType",
      header: "Incident Type",
      render: (row) => row.incidentType || "Emergency",
    },
    {
      key: "priority",
      header: "Priority",
      render: (row) => {
        const priorityLabel =
          row.priority.charAt(0).toUpperCase() + row.priority.slice(1);
        return <StatusBadge status={priorityLabel} />;
      },
    },
    {
      key: "responseTime",
      header: "Response Time",
      render: (row) => (
        <span
          className={`font-semibold ${
            (row.responseTime || 0) <= 8
              ? "text-emerald-600 dark:text-emerald-400"
              : (row.responseTime || 0) <= 12
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400"
          }`}
        >
          {row.responseTime ? `${row.responseTime} mins` : "N/A"}
        </span>
      ),
    },
    {
      key: "totalDuration",
      header: "Total Duration",
      render: (row) => (row.totalDuration || row.duration ? `${row.totalDuration || row.duration} mins` : "N/A"),
    },
    {
      key: "createdAt",
      header: "Date & Time",
      render: (row) => formatDateTime(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics & Performance"
        description="Monitor system-wide emergency response times, hospital efficiency, and mission duration metrics."
      />

      {/* KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Avg Response Time</p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{stats.avgResponseTime}m</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Dispatch to scene pickup</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Avg Total Duration</p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{stats.avgDuration}m</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Truck className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Total pickup to admission</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Incidents</p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{stats.totalIncidents}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Tracked analytics records</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Target Response Rate</p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{stats.efficiencyRate}%</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Responses under 10 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Critical Cases</p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{stats.criticalCount}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">High priority emergencies</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hospital Response Time Comparison</CardTitle>
            <CardDescription>Average emergency response time (minutes) per hospital facility</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {hospitalChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState title="No hospital metrics available" description="Response times per hospital will display as emergencies complete." />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hospitalChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="hospital" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} unit="m" allowDecimals={false} />
                  <Tooltip cursor={{ fill: "#f8fafc" }} />
                  <Legend />
                  <Bar dataKey="avgResponse" name="Avg Response (m)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="incidents" name="Total Incidents" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Emergency Priority Distribution</CardTitle>
            <CardDescription>Proportion of emergency incidents categorized by priority level</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {priorityChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState title="No priority metrics available" description="Priority distribution will display as emergencies are logged." />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {priorityChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name, entry) => [`${val} (${entry.payload.percentage}%)`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Section */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Emergency Analytics Log</CardTitle>
            <CardDescription>Comprehensive record of response times and mission performance metrics.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search analytics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select
                value={timeRangeFilter}
                onChange={(e) => setTimeRangeFilter(e.target.value)}
                options={[
                  { value: "all", label: "All Time" },
                  { value: "today", label: "Today" },
                  { value: "7days", label: "Last 7 Days" },
                  { value: "30days", label: "Last 30 Days" },
                ]}
              />
              <Select
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                options={[
                  { value: "all", label: "All Hospitals" },
                  ...hospitals.map((h) => ({
                    value: h.hospitalId || h.id,
                    label: h.name,
                  })),
                ]}
              />
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                options={[
                  { value: "all", label: "All Priorities" },
                  { value: "critical", label: "Critical" },
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={tableColumns}
            rows={filteredData}
            emptyTitle="No analytics records found"
          />
        </CardContent>
      </Card>
    </div>
  );
}
