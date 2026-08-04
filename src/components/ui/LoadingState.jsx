export default function LoadingState({ rows = 4 }) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
      ))}
    </div>
  );
}
