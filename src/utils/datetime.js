/**
 * API exam datetimes use "YYYY-MM-DD HH:mm:ss" (space separator, not ISO "T").
 */

/** @param {string} value */
export function parseApiDatetime(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** @param {string} value */
export function getApiDatePart(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  return value.slice(0, 10);
}

/** @param {string} value */
export function getApiTimePart(value) {
  if (!value || typeof value !== "string") {
    return "";
  }
  const time = value.includes("T")
    ? value.split("T")[1]
    : value.split(" ")[1];
  return time ? time.slice(0, 8) : "";
}

/** @param {string} value @param {Intl.DateTimeFormatOptions} [options] */
export function formatApiDatetime(value, options) {
  const date = parseApiDatetime(value);
  if (!date) {
    return "";
  }
  return date.toLocaleString(undefined, options);
}
