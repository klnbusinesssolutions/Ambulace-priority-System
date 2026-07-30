import { useNavigate } from "react-router-dom";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card.jsx";
import EmptyState from "../ui/EmptyState.jsx";

const colors = {
  Approved: "#059669",
  Rejected: "#dc2626",
  Pending: "#ca8a04",
  Resubmission: "#ea580c",
};

export default function VerificationCharts({ trend = [], breakdown = [] }) {
  const navigate = useNavigate();

  const totalBreakdownValue = breakdown.reduce((sum, item) => sum + (item.value || 0), 0);
  const totalTrendValue = trend.reduce(
    (sum, item) => sum + (item.approvals || 0) + (item.rejections || 0) + (item.pending || 0) + (item.resubmissions || 0),
    0
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
      <Card
        onClick={() => navigate("/admin/analytics")}
        className="cursor-pointer transition-all hover:shadow-md"
        title="Click to open Analytics workspace"
      >
        <CardHeader>
          <CardTitle>Verification Trends</CardTitle>
          <CardDescription>Approval, rejection, and pending request activity over time.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {totalTrendValue === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="No verification activity yet"
                description="Live requests across drivers, ambulances, hospitals, and police will appear here."
              />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "#f8fafc" }} />
                <Legend />
                <Bar dataKey="approvals" name="Approvals" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rejections" name="Rejections" fill="#dc2626" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" name="Pending" fill="#ca8a04" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resubmissions" name="Resubmissions" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card
        onClick={() => navigate("/admin/analytics")}
        className="cursor-pointer transition-all hover:shadow-md"
        title="Click to open Analytics workspace"
      >
        <CardHeader>
          <CardTitle>Approval vs Rejection Rate</CardTitle>
          <CardDescription>Current verification queue distribution across all categories.</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {totalBreakdownValue === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="No request records"
                description="Verification requests will be categorized here automatically."
              />
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {breakdown.map((entry) => (
                      <Cell key={entry.name} fill={colors[entry.name] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name, entry) => [
                      `${val} (${entry.payload.percentage || Math.round((val / totalBreakdownValue) * 100)}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-[-18px] grid grid-cols-2 gap-2 text-xs text-slate-600">
                {breakdown.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[entry.name] || "#94a3b8" }} />
                    <span className="truncate">
                      {entry.name}: {entry.value} ({totalBreakdownValue ? Math.round((entry.value / totalBreakdownValue) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
