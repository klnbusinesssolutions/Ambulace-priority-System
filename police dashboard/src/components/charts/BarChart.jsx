export function BarChart({ data, labelKey = "label", valueKey = "value", color = "#175cd3", suffix = "" }) {
  const max = Math.max(...data.map((item) => item[valueKey]), 1);

  return (
    <div className="flex h-48 items-end gap-3 px-1">
      {data.map((item) => {
        const heightPct = Math.max((item[valueKey] / max) * 100, 4);
        return (
          <div key={item[labelKey]} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">
              {item[valueKey]}
              {suffix}
            </span>
            <div className="flex h-36 w-full items-end rounded-md bg-slate-100">
              <div
                className="w-full rounded-md transition-all"
                style={{ height: `${heightPct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-center text-[11px] leading-tight text-slate-500">{item[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}
