/** Accepts a JS Date, ISO string, Firestore Timestamp, or millis and returns a Date (or null). */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate(); // Firestore Timestamp
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value, timeFormat = "12-hour") {
  const date = toDate(value);
  if (!date) return "—";
  const hour12 = timeFormat !== "24-hour";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  }).format(date);
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
