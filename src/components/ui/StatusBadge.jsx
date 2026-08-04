import { cn } from "../../utils/cn.js";

const styles = {
  // Success / Operational / Approved / Online / Available (Green)
  Operational: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-500/40",
  Available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-500/40",
  "On Call": "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-500/40",
  Success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-500/40",
  Online: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-500/40",
  Approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-500/40",

  // Error / Critical / Rejected / High (Red)
  Critical: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-500/40",
  Rejected: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-500/40",
  High: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-500/40",

  // Warning / Degraded / Pending / Medium / High Load (Amber)
  Warning: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-500/40",
  Pending: "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-500/40",
  Degraded: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-500/40",
  "High Load": "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-500/40",
  "Limited Intake": "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-500/40",
  Medium: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-500/40",

  // Info / Dispatched / En Route / Dispatching (Blue / Indigo)
  Info: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-500/40",
  Dispatching: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-500/40",
  Dispatched: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-500/40",
  "En Route": "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-500/40",

  // Muted / Neutral (Slate)
  Low: "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  Standby: "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  Break: "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  Maintenance: "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  Offline: "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
};

export default function StatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset transition-colors",
        styles[status] || "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300",
        className,
      )}
    >
      {status}
    </span>
  );
}
