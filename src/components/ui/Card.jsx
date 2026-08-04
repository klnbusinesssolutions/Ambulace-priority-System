import { cn } from "../../utils/cn.js";

export function Card({ className, ...props }) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-100 transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("border-b border-slate-100 dark:border-slate-700/80 px-5 py-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h2 className={cn("text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight", className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn("mt-1 text-xs text-slate-500 dark:text-slate-300 font-normal leading-relaxed", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-5", className)} {...props} />;
}
