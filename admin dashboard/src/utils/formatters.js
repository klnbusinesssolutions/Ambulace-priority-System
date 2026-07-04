/** Accepts a JS Date, ISO string, Firestore Timestamp, or millis and returns a Date (or null). */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate(); // Firestore Timestamp
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeMinutes(minutes) {
  if (minutes < 1) return "now";
  return `${minutes} min ago`;
}

export function matchesSearch(item, query, keys) {
  if (!query) return true;
  const term = query.toLowerCase();
  return keys.some((key) => String(item[key] ?? "").toLowerCase().includes(term));
}
