import { useState } from "react";
import { toast } from "react-hot-toast";
import { updateExamStatus } from "../utils/api";
import { getApiDatePart, getApiTimePart } from "../utils/datetime";
import {
  getAdvanceLabel,
  getInitials,
  getNextStatus,
  getStatusLabel,
} from "../utils/status";

const toastStyle = {
  style: {
    borderRadius: "12px",
    padding: "12px",
    color: "#FFFFFF",
    backgroundColor: "#0B1F3A",
  },
};

export default function ExamCard({ session, onStatusChange }) {
  const [updating, setUpdating] = useState(false);

  const date = getApiDatePart(session.datetime);
  const time = getApiTimePart(session.datetime).slice(0, 5);
  const candidates = session.candidates || [];
  const primaryCandidate = candidates[0]?.name || "No candidate";
  const extraCount = Math.max(candidates.length - 1, 0);
  const country = session.location?.country || "Unknown location";
  const status = session.status || "pending";
  const statusClass = ["pending", "started", "finished"].includes(status)
    ? status
    : "finished";
  const nextStatus = getNextStatus(status);
  const advanceLabel = getAdvanceLabel(status);
  const candidateLine =
    extraCount > 0
      ? `${primaryCandidate} +${extraCount}`
      : primaryCandidate;

  async function handleAdvanceStatus() {
    if (!nextStatus || updating) return;

    setUpdating(true);
    try {
      await updateExamStatus(session.id, nextStatus);
      onStatusChange?.(session.id, nextStatus);
      toast.success(
        `${session.title} is now ${getStatusLabel(nextStatus).toLowerCase()}`,
        toastStyle
      );
    } catch (err) {
      console.error(err);
      toast.error(`Couldn't update status for ${session.title}`, toastStyle);
    } finally {
      setUpdating(false);
    }
  }

  function renderStatusControl() {
    if (status === "finished" || !nextStatus) {
      return <span className="CompletedLabel">✓ Completed</span>;
    }

    return (
      <button
        type="button"
        className="Button Button--primary AdvanceButton"
        onClick={handleAdvanceStatus}
        disabled={updating}
      >
        {updating ? "Updating..." : advanceLabel}
      </button>
    );
  }

  return (
    <section className={`ExamCard ExamCard--${statusClass}`}>
      <div className="ExamTimeBlock">
        <p className="ExamTime">
          {time || "-"}
          <span>{date}</span>
        </p>
      </div>

      <div className="ExamDetails">
        <div className="ExamCardTop">
          <h3 className="ExamTitle">{session.title}</h3>
          <span
            key={`mobile-${statusClass}`}
            className={`StatusPill StatusPill--${statusClass} StatusPill--mobile`}
          >
            <span className={`StatusDot StatusDot--${statusClass}`} />
            {getStatusLabel(status)}
          </span>
        </div>
        <p className="ExamMeta ExamMeta--mobile">
          {candidateLine} · {country}
          {session.language ? ` · ${session.language}` : ""}
        </p>
        <div className="ExamMetaRow ExamCandidate">
          <span className="CandidateAvatar" aria-hidden="true">
            {getInitials(primaryCandidate) || "?"}
          </span>
          <span className="ExamMeta">{candidateLine}</span>
        </div>
      </div>

      <div className="ExamLocation">{country}</div>

      <div className="ExamStatusAction">
        <span
          key={`desktop-${statusClass}`}
          className={`StatusPill StatusPill--${statusClass}`}
        >
          <span className={`StatusDot StatusDot--${statusClass}`} />
          {getStatusLabel(status)}
        </span>
        {renderStatusControl()}
      </div>

      <div className="ExamActions">{renderStatusControl()}</div>
    </section>
  );
}
