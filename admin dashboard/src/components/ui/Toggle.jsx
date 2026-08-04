import { cn } from "../../utils/cn.js";

export default function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className,
  id,
}) {
  const toggleId = id || (label ? `toggle-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      onClick={handleToggle}
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs transition-all hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/90 dark:hover:border-slate-600 cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      <div className="grid gap-0.5">
        <span id={toggleId ? `${toggleId}-label` : undefined} className="text-sm font-bold text-slate-950 dark:text-slate-100">
          {label}
        </span>
        {description && (
          <span className="text-xs text-slate-500 dark:text-slate-300">{description}</span>
        )}
      </div>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        aria-labelledby={label && toggleId ? `${toggleId}-label` : undefined}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        className={cn(
          "focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none",
          checked ? "bg-slate-950 dark:bg-blue-600" : "bg-slate-200 dark:bg-slate-700",
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
