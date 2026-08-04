import { Inbox } from "lucide-react";

export default function EmptyState({ title = "Nothing here yet", description = "Try changing filters or adding a new record." }) {
  return (
    <div className="grid place-items-center px-6 py-12 text-center">
      <div className="rounded-full bg-slate-100 dark:bg-slate-800 p-3 text-slate-500 dark:text-slate-400">
        <Inbox className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-950 dark:text-slate-100">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}
