import { Ambulance, CheckCircle2, ClipboardCheck, OctagonX, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../ui/Card.jsx";

const icons = [UserCheck, Ambulance, ClipboardCheck, CheckCircle2, OctagonX];

const routeMap = {
  "Pending Driver Requests": "/admin/verification/pending-drivers",
  "Pending Ambulance Requests": "/admin/verification/pending-ambulances",
  "Operational Drivers": "/admin/drivers",
  "Pending Police Officers": "/admin/verification/pending-police-officers",
  "Rejected Requests": "/admin/verification/rejected-requests",
  "Active Ambulances": "/admin/ambulances",
  "Active Hospitals": "/admin/hospitals",
  "Active Emergencies": "/admin/emergencies?status=active",
};

const tooltipMap = {
  "Pending Driver Requests": "Click to review pending driver registrations.",
  "Pending Ambulance Requests": "Click to review pending ambulance registrations.",
  "Operational Drivers": "Click to view operational drivers list.",
  "Pending Police Officers": "Click to review pending police officer registrations.",
  "Rejected Requests": "Click to view rejected verification requests.",
  "Active Ambulances": "Click to view active ambulance fleet.",
  "Active Hospitals": "Click to view connected hospitals network.",
  "Active Emergencies": "Click to view active emergency queue.",
};

export default function OverviewCards({ stats }) {
  const navigate = useNavigate();

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat, index) => {
        const Icon = icons[index] || ClipboardCheck;
        const targetRoute = routeMap[stat.label] || "/admin";
        const tooltipText = tooltipMap[stat.label] || `Click to open ${stat.label}`;

        const handleCardClick = () => {
          if (targetRoute) navigate(targetRoute);
        };

        const handleKeyDown = (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        };

        return (
          <Card
            key={stat.label}
            tabIndex={0}
            role="button"
            title={tooltipText}
            onClick={handleCardClick}
            onKeyDown={handleKeyDown}
            className="cursor-pointer transition-all hover:scale-[1.015] hover:shadow-lg active:scale-[0.99] focus-ring group border-slate-200/90 dark:border-slate-700/80"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-slate-50">
                    {stat.value}
                  </p>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors shrink-0">
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-normal">{stat.detail}</span>
                <span
                  className={
                    stat.tone === "warning"
                      ? "font-bold text-amber-600 dark:text-amber-400"
                      : stat.tone === "danger"
                      ? "font-bold text-red-600 dark:text-red-400"
                      : "font-bold text-emerald-600 dark:text-emerald-400"
                  }
                >
                  {stat.trend}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
