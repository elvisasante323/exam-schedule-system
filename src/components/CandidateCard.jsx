import { getApiDatePart, getApiTimePart } from "../utils/datetime";
import { getInitials, getStatusLabel } from "../utils/status";

export default function CandidateCard({ candidate }) {
  const exams = candidate.exams || [];
  const countries = candidate.countries || [];
  const nextExam = candidate.nextExam;
  const statusCounts = candidate.statusCounts || {
    pending: 0,
    started: 0,
    finished: 0,
  };

  const nextDate = nextExam ? getApiDatePart(nextExam.datetime) : "";
  const nextTime = nextExam
    ? getApiTimePart(nextExam.datetime).slice(0, 5)
    : "";
  const locationLine =
    countries.length > 0 ? countries.join(", ") : "No locations";

  return (
    <section className="CandidateCard">
      <div className="CandidateIdentity">
        <span className="CandidateAvatar CandidateAvatar--lg" aria-hidden="true">
          {getInitials(candidate.name) || "?"}
        </span>
        <div>
          <h3 className="ExamTitle">{candidate.name}</h3>
          <p className="ExamMeta">
            {exams.length} exam{exams.length === 1 ? "" : "s"}
            {countries.length
              ? ` · ${countries.length} location${
                  countries.length === 1 ? "" : "s"
                }`
              : ""}
          </p>
        </div>
      </div>

      <div className="CandidateExamSummary">
        {nextExam ? (
          <>
            <p className="CandidateNextLabel">Next exam</p>
            <p className="CandidateNextTitle">{nextExam.title}</p>
            <p className="ExamMeta">
              {nextTime || "-"} · {nextDate}
              {nextExam.location?.country
                ? ` · ${nextExam.location.country}`
                : ""}
            </p>
          </>
        ) : (
          <p className="ExamMeta">No upcoming exams</p>
        )}
      </div>

      <div className="CandidateLocations">{locationLine}</div>

      <div className="CandidateStatusStack">
        {["pending", "started", "finished"].map((status) =>
          statusCounts[status] ? (
            <span
              key={status}
              className={`StatusPill StatusPill--${status}`}
            >
              <span className={`StatusDot StatusDot--${status}`} />
              {statusCounts[status]} {getStatusLabel(status)}
            </span>
          ) : null
        )}
        {!statusCounts.pending &&
        !statusCounts.started &&
        !statusCounts.finished ? (
          <span className="ExamMeta">No exams</span>
        ) : null}
      </div>
    </section>
  );
}
