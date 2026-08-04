import { X } from "lucide-react";
import Button from "./Button.jsx";

export default function Modal({ open, title, description, children, onClose, footer }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close modal overlay"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-950 dark:text-slate-100">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}
