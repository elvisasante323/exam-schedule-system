export const STATUS_LABELS = {
  pending: "Pending",
  started: "In progress",
  finished: "Finished",
};

export const STATUS_ORDER = ["pending", "started", "finished"];

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "Unknown";
}

export function getNextStatus(status) {
  const index = STATUS_ORDER.indexOf(status);
  if (index === -1 || index === STATUS_ORDER.length - 1) {
    return null;
  }
  return STATUS_ORDER[index + 1];
}

export function getAdvanceLabel(status) {
  if (status === "pending") return "Start exam";
  if (status === "started") return "Finish exam";
  return null;
}

export function getInitials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}
