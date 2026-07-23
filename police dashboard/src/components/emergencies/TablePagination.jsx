import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function TablePagination({ page, totalPages, totalRows, onPageChange }) {
  if (totalRows === 0) return null;

  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <p className="text-xs text-slate-500">
        Page {page} of {totalPages} · {totalRows} record{totalRows === 1 ? "" : "s"}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
          Prev
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
