import { cn } from "../../utils/cn.js";

export default function Input({ className, label, helperText, error, ...props }) {
  const control = (
    <input
      className={cn(
        "focus-ring h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700/80 dark:bg-[#0F172A] dark:text-slate-100 dark:placeholder:text-slate-500 transition-colors shadow-xs",
        error && "border-red-500 focus:border-red-500 focus:ring-red-500",
        className,
      )}
      {...props}
    />
  );

  if (!label && !error && !helperText) return control;

  return (
    <div className="grid gap-1.5">
      {label && <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{label}</label>}
      {control}
      {helperText && !error && <p className="text-[11px] text-slate-400">{helperText}</p>}
      {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
