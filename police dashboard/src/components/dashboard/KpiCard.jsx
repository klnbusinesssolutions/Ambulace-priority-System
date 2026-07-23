import { useEffect, useRef, useState } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { cn } from "@/utils/cn";

const toneStyles = {
  primary: "border-blue-200 bg-blue-50 text-primary",
  critical: "border-red-200 bg-red-50 text-status-critical",
  warning: "border-amber-200 bg-amber-50 text-status-high",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
};

function useAnimatedCounter(target) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const duration = 600;

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    }

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target]);

  return value;
}

export function KpiCard({ label, value, suffix, icon: Icon, tone = "primary", trend }) {
  const animatedValue = useAnimatedCounter(Number.isFinite(value) ? value : 0);
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  return (
    <div className="ops-panel flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-md border", toneStyles[tone])}>
          <Icon className="h-4 w-4" />
        </span>
        {typeof trend === "number" && (
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend > 0 && "text-emerald-600",
              trend < 0 && "text-status-critical",
              trend === 0 && "text-slate-400",
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            {trend !== 0 ? `${Math.abs(trend)}%` : "Flat"}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums text-slate-950">
          {animatedValue}
          {suffix ? <span className="ml-1 text-sm font-medium text-slate-500">{suffix}</span> : null}
        </p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      </div>
    </div>
  );
}
