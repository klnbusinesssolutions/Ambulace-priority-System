const DEFAULT_COLORS = ["#175cd3", "#d92d20", "#f79009", "#12b76a", "#6941c6"];

export function DonutChart({ data, labelKey = "label", valueKey = "value", colors = DEFAULT_COLORS }) {
  const total = data.reduce((sum, item) => sum + item[valueKey], 0) || 1;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" className="h-36 w-36 shrink-0 -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" />
        {data.map((item, index) => {
          const fraction = item[valueKey] / total;
          const dash = fraction * circumference;
          const circle = (
            <circle
              key={item[labelKey]}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={colors[index % colors.length]}
              strokeWidth="14"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return circle;
        })}
      </svg>
      <ul className="space-y-2 text-sm">
        {data.map((item, index) => (
          <li key={item[labelKey]} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
            <span className="text-slate-600">{item[labelKey]}</span>
            <span className="font-semibold text-slate-900">{item[valueKey]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
