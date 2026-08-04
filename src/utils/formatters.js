/** Accepts a JS Date, ISO string, Firestore Timestamp, or millis and returns a Date (or null). */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate(); // Firestore Timestamp
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value, options = {}) {
  const date = toDate(value);
  if (!date) return "—";

  let timeFormat = "12-hour";
  let dateFormat = "DD/MM/YYYY";
  let timezone = "Asia/Calcutta";

  if (typeof options === "string") {
    timeFormat = options;
  } else if (options && typeof options === "object") {
    if (options.timeFormat) timeFormat = options.timeFormat;
    if (options.dateFormat) dateFormat = options.dateFormat;
    if (options.timezone) timezone = options.timezone;
  }

  // Fallback to active localStorage settings if options not explicitly specified
  if (!options || typeof options !== "object" || (!options.timeFormat && !options.dateFormat && !options.timezone)) {
    try {
      // Find any logged in admin's saved settings in localStorage
      let saved = null;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("ambugrid_settings")) {
          saved = localStorage.getItem(key);
          break;
        }
      }
      if (!saved) saved = localStorage.getItem("ambugrid_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.timeFormat) timeFormat = parsed.timeFormat;
        if (parsed.dateFormat) dateFormat = parsed.dateFormat;
        if (parsed.timezone) timezone = parsed.timezone;
      }
    } catch (_) {}
  }

  const hour12 = timeFormat !== "24-hour";

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12,
    });

    const parts = formatter.formatToParts(date);
    const partMap = {};
    parts.forEach((p) => {
      partMap[p.type] = p.value;
    });

    let dateStr = `${partMap.day}/${partMap.month}/${partMap.year}`;
    if (dateFormat === "MM/DD/YYYY") {
      dateStr = `${partMap.month}/${partMap.day}/${partMap.year}`;
    } else if (dateFormat === "YYYY-MM-DD") {
      dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
    }

    const timeStr = `${partMap.hour}:${partMap.minute}${partMap.dayPeriod ? " " + partMap.dayPeriod.toUpperCase() : ""}`;
    return `${dateStr}, ${timeStr}`;
  } catch (e) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12,
    }).format(date);
  }
}

export function formatRelativeMinutes(minutes) {
  if (minutes < 1) return "now";
  return `${minutes} min ago`;
}

export function formatTimeAgo(value) {
  const date = toDate(value);
  if (!date) return "Just now";
  const diffSec = Math.max(0, Math.floor((new Date() - date) / 1000));
  if (diffSec < 45) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export function matchesSearch(item, query, keys) {
  if (!query) return true;
  const term = query.toLowerCase();
  return keys.some((key) => String(item[key] ?? "").toLowerCase().includes(term));
}
