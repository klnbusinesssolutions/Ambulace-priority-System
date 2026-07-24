export default function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
