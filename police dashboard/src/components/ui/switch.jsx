import { cn } from "@/utils/cn";

// Lightweight checkbox-based toggle (no extra dependency) styled to match the rest of the
// dashboard's inputs/badges. Fully keyboard accessible since it's a real <input type="checkbox">
// under the hood, just visually restyled.
export function Switch({ checked, onCheckedChange, disabled = false, "aria-label": ariaLabel }) {
  return (
    <label
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        checked ? "bg-primary" : "bg-slate-200",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </label>
  );
}
