import { AlertTriangle, Check, Clock, Trash2 } from "lucide-react";

import { StatusBadge } from "@/components/police/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatRelativeTime } from "@/utils/format";

export function AlertCard({ alert, onMarkRead, onDelete }) {
  return (
    <article className={cn("rounded-lg border bg-white p-3", !alert.read && "border-blue-200 bg-blue-50/40")}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-status-critical">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-slate-950">{alert.title}</p>
            <StatusBadge value={alert.severity} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{alert.category}</p>
          <p className="mt-2 text-sm leading-5 text-slate-600">{alert.description}</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              {formatRelativeTime(alert.timestamp)}
            </p>
            {(onMarkRead || onDelete) && (
              <div className="flex gap-1">
                {onMarkRead && !alert.read && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMarkRead(alert.id)} aria-label="Mark read">
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-status-critical hover:bg-red-50"
                    onClick={() => onDelete(alert.id)}
                    aria-label="Delete alert"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
