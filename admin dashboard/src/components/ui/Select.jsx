import { cn } from "../../utils/cn.js";

export default function Select({ className, label, error, options = [], ...props }) {
  const control = (
    <select
      className={cn(
        "focus-ring h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900",
        error && "border-red-500 focus:border-red-500 focus:ring-red-500",
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={typeof option === "string" ? option : option.value} value={typeof option === "string" ? option : option.value}>
          {typeof option === "string" ? option : option.label}
        </option>
      ))}
    </select>
  );

  if (!label && !error) return control;

  return (
    <div className="grid gap-1.5">
      {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
      {control}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

