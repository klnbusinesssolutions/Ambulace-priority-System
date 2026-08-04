import { cn } from "../../utils/cn.js";

export default function Select({ className, label, error, options = [], ...props }) {
  const validOptions = (options || []).filter((option) => option !== null && option !== undefined);

  const control = (
    <select
      className={cn(
        "focus-ring h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        error && "border-red-500 focus:border-red-500 focus:ring-red-500",
        className,
      )}
      {...props}
    >
      {validOptions.map((option) => (
        <option
          key={typeof option === "string" ? option : option?.value ?? option?.label ?? ""}
          value={typeof option === "string" ? option : option?.value ?? ""}
          className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 py-1"
        >
          {typeof option === "string" ? option : option?.label ?? option?.value ?? ""}
        </option>
      ))}
    </select>
  );

  if (!label && !error) return control;

  return (
    <div className="grid gap-1.5">
      {label && <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">{label}</label>}
      {control}
      {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
