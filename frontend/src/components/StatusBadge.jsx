const toneByStatus = {
  CONNECTED: "success",
  READY: "info",
  RUNNING: "info",
  TARGET_READY: "info",
  IN_PROGRESS: "info",
  ACTION_CONFIRMED: "success",
  COMPLETED: "success",
  FOLLOW_CONFIRMED: "success",
  UNFOLLOW_CONFIRMED: "success",
  LIKE_CONFIRMED: "success",
  AUTH_REQUIRED: "warning",
  PENDING_AUTH: "warning",
  PENDING: "muted",
  PAUSED: "warning",
  ERROR: "danger",
  FAILED: "danger",
  SKIPPED: "muted",
  DISCONNECTED: "muted",
};

const StatusBadge = ({ status }) => {
  const tone = toneByStatus[status] || "muted";

  return <span className={`status-badge ${tone}`}>{status}</span>;
};

export default StatusBadge;
