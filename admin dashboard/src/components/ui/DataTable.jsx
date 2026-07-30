import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import EmptyState from "./EmptyState.jsx";
import { cn } from "../../utils/cn.js";

export default function DataTable({ columns, rows, emptyTitle = "No records found", highlightId: customHighlightId, onRowClick }) {
  const [searchParams] = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const activeHighlightId = customHighlightId || highlightParam;
  const [highlightedId, setHighlightedId] = useState(activeHighlightId);

  useEffect(() => {
    if (activeHighlightId) {
      setHighlightedId(activeHighlightId);

      const scrollTimer = setTimeout(() => {
        const rowElement = document.getElementById(`row-${activeHighlightId}`);
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 150);

      const clearTimer = setTimeout(() => {
        setHighlightedId(null);
      }, 3500);

      return () => {
        clearTimeout(scrollTimer);
        clearTimeout(clearTimer);
      };
    }
  }, [activeHighlightId]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
            {rows.map((row) => {
              const isMatch =
                highlightedId &&
                (row.id === highlightedId ||
                  row.hospitalId === highlightedId ||
                  row.ambulanceId === highlightedId);

              return (
                <tr
                  key={row.id}
                  id={`row-${row.id}`}
                  onClick={(e) => onRowClick?.(row, e)}
                  className={cn(
                    "transition-colors duration-500 hover:bg-slate-50/70 dark:hover:bg-slate-800/60",
                    onRowClick && "cursor-pointer",
                    isMatch && "bg-amber-100/90 dark:bg-amber-950/60 ring-2 ring-amber-400 dark:ring-amber-700 font-medium",
                  )}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!rows.length && <EmptyState title={emptyTitle} />}
    </div>
  );
}
