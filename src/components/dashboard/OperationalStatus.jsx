import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/Card.jsx";
import StatusBadge from "../ui/StatusBadge.jsx";

export default function OperationalStatus({ panels }) {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => navigate("/admin/analytics")}
        title="Click to view platform health analytics"
      >
        <CardTitle>System Health</CardTitle>
        <CardDescription>Platform infrastructure and third-party feed status.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {panels.map((panel) => (
          <div
            key={panel.label}
            onClick={() => navigate("/admin/analytics")}
            className="rounded-md border border-slate-200 p-4 cursor-pointer transition-colors hover:bg-slate-50 hover:border-slate-300"
            title="Click to view system health analytics"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-950">{panel.label}</p>
              <StatusBadge status={panel.status} />
            </div>
            <p className="mt-3 text-xl font-semibold text-slate-950">{panel.metric}</p>
            <p className="mt-1 text-xs text-slate-500">{panel.helper}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
