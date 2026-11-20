import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ExamCard from "./ExamCard";
import FilterModal from "./FilterModal";
import { getExams } from "../utils/api";
import {
  getApiDatePart,
  getApiTimePart,
  parseApiDatetime,
} from "../utils/datetime";
import { getStatusLabel } from "../utils/status";

const emptyFilters = { date: "", name: "", location: "" };

const STATUS_SORT_ORDER = {
  pending: 0,
  started: 1,
  finished: 2,
};

function formatGroupLabel(dateKey) {
  const parsed = parseApiDatetime(`${dateKey} 00:00:00`);
  if (!parsed) return dateKey;

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const weekday = parsed.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  if (sameDay(parsed, today)) return `Today · ${weekday}`;
  if (sameDay(parsed, tomorrow)) return `Tomorrow · ${weekday}`;
  return weekday;
}

function matchesFilters(session, filters, statusFilter) {
  if (statusFilter && session.status !== statusFilter) {
    return false;
  }

  if (filters.date) {
    if (getApiDatePart(session.datetime) !== filters.date) {
      return false;
    }
  }

  if (filters.name) {
    const needle = filters.name.toLowerCase();
    const hasMatch = (session.candidates || []).some((candidate) =>
      String(candidate.name || "")
        .toLowerCase()
        .includes(needle)
    );
    if (!hasMatch) return false;
  }

  if (filters.location) {
    const needle = filters.location.toLowerCase();
    const country = String(session.location?.country || "").toLowerCase();
    if (!country.includes(needle)) return false;
  }

  return true;
}

function compareSessions(a, b, sortBy) {
  switch (sortBy) {
    case "title":
      return String(a.title || "").localeCompare(String(b.title || ""), undefined, {
        sensitivity: "base",
      });
    case "status": {
      const statusDiff =
        (STATUS_SORT_ORDER[a.status] ?? 99) -
        (STATUS_SORT_ORDER[b.status] ?? 99);
      if (statusDiff !== 0) return statusDiff;
      return String(a.datetime || "").localeCompare(String(b.datetime || ""));
    }
    case "location": {
      const locationDiff = String(a.location?.country || "").localeCompare(
        String(b.location?.country || ""),
        undefined,
        { sensitivity: "base" }
      );
      if (locationDiff !== 0) return locationDiff;
      return String(a.datetime || "").localeCompare(String(b.datetime || ""));
    }
    case "date":
    default:
      return String(a.datetime || "").localeCompare(String(b.datetime || ""));
  }
}

function hasActiveFilters(filters, statusFilter) {
  return Boolean(filters.date || filters.name || filters.location || statusFilter);
}

export default function ExamList() {
  const [originalExamSessions, setOriginalExamSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hideFilterModal, setHideFilterModal] = useState(true);
  const [filtersObject, setFiltersObject] = useState(emptyFilters);
  const [statusFilter, setStatusFilter] = useState(null);
  const [sortBy, setSortBy] = useState("date");

  useEffect(() => {
    let cancelled = false;

    async function fetchExamSessions() {
      setLoading(true);
      setError(null);
      try {
        const examSessionsData = await getExams();
        if (cancelled) return;
        setOriginalExamSessions(examSessionsData);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err);
        setOriginalExamSessions([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchExamSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  const examSessions = useMemo(() => {
    return originalExamSessions
      .filter((session) => matchesFilters(session, filtersObject, statusFilter))
      .sort((a, b) => compareSessions(a, b, sortBy));
  }, [originalExamSessions, filtersObject, statusFilter, sortBy]);

  const counts = useMemo(() => {
    const source = originalExamSessions;
    return {
      total: source.length,
      pending: source.filter((s) => s.status === "pending").length,
      started: source.filter((s) => s.status === "started").length,
      finished: source.filter((s) => s.status === "finished").length,
      locations: new Set(
        source.map((s) => s.location?.country).filter(Boolean)
      ).size,
    };
  }, [originalExamSessions]);

  const groupedSessions = useMemo(() => {
    const groups = new Map();

    examSessions.forEach((session) => {
      const key = getApiDatePart(session.datetime) || "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(session);
    });

    return [...groups.entries()];
  }, [examSessions]);

  const weekLabel = useMemo(() => {
    if (!originalExamSessions.length) return "Upcoming sessions";
    const dates = originalExamSessions
      .map((s) => parseApiDatetime(s.datetime))
      .filter(Boolean)
      .sort((a, b) => a - b);
    if (!dates.length) return "Upcoming sessions";
    const start = dates[0].toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
    });
    const end = dates[dates.length - 1].toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `From ${start} to ${end}`;
  }, [originalExamSessions]);

  const nextPending = useMemo(() => {
    return [...originalExamSessions]
      .filter((s) => s.status === "pending")
      .sort((a, b) => String(a.datetime).localeCompare(String(b.datetime)))[0];
  }, [originalExamSessions]);

  function handleStatusChange(id, nextStatus) {
    setOriginalExamSessions((sessions) =>
      sessions.map((session) =>
        session.id === id ? { ...session, status: nextStatus } : session
      )
    );
  }

  function handleReset() {
    setFiltersObject(emptyFilters);
    setStatusFilter(null);
    setSortBy("date");
  }

  function handleStatusStripClick(status) {
    setStatusFilter((current) => (current === status ? null : status));
  }

  const modalFiltersActive = hasActiveFilters(filtersObject, null);
  const filtersActive = hasActiveFilters(filtersObject, statusFilter);

  return (
    <main className="ExamList">
      <div className="PageHeader">
        <div>
          <p className="PageEyebrow">{weekLabel}</p>
          <h2>Exam schedule</h2>
        </div>
        <div className="ViewSwitch" aria-label="Schedule views">
          <span className="is-active">List</span>
          <Link to="/exam-map">Map</Link>
        </div>
      </div>

      {!loading && !error ? (
        <section className="StatGrid" aria-label="Schedule summary">
          <article className="StatCard">
            <p className="StatLabel">Sessions</p>
            <p className="StatValue">{counts.total}</p>
            <p className="StatHint">{counts.locations} locations</p>
          </article>
          <button
            type="button"
            className={`StatCard StatCard--filter${
              statusFilter === "pending" ? " is-active" : ""
            }`}
            aria-pressed={statusFilter === "pending"}
            onClick={() => handleStatusStripClick("pending")}
          >
            <p className="StatLabel">
              <span className="StatusDot StatusDot--pending" />
              {getStatusLabel("pending")}
            </p>
            <p className="StatValue">{counts.pending}</p>
            <p className="StatHint">
              {nextPending
                ? `Next ${getApiTimePart(nextPending.datetime).slice(0, 5)} · ${
                    nextPending.location?.country || "TBC"
                  }`
                : "No pending sessions"}
            </p>
          </button>
          <button
            type="button"
            className={`StatCard StatCard--filter${
              statusFilter === "started" ? " is-active" : ""
            }`}
            aria-pressed={statusFilter === "started"}
            onClick={() => handleStatusStripClick("started")}
          >
            <p className="StatLabel">
              <span className="StatusDot StatusDot--started" />
              {getStatusLabel("started")}
            </p>
            <p className="StatValue">{counts.started}</p>
            <p className="StatHint">Live invigilation sessions</p>
          </button>
          <button
            type="button"
            className={`StatCard StatCard--filter${
              statusFilter === "finished" ? " is-active" : ""
            }`}
            aria-pressed={statusFilter === "finished"}
            onClick={() => handleStatusStripClick("finished")}
          >
            <p className="StatLabel">
              <span className="StatusDot StatusDot--finished" />
              {getStatusLabel("finished")}
            </p>
            <p className="StatValue">{counts.finished}</p>
            <p className="StatHint">Completed exams</p>
          </button>
        </section>
      ) : null}

      <div className="Toolbar">
        <FilterModal
          hide={hideFilterModal}
          setHide={setHideFilterModal}
          setFiltersObject={setFiltersObject}
        />
        <div className="SortControl">
          <label htmlFor="sort-sessions">Sort by</label>
          <select
            id="sort-sessions"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="date">Date</option>
            <option value="title">Title</option>
            <option value="status">Status</option>
            <option value="location">Location</option>
          </select>
        </div>
        <div className="FilterContainer">
          <button
            className="FilterButton"
            onClick={() => setHideFilterModal(false)}
            type="button"
          >
            Filters{modalFiltersActive ? " · on" : ""}
          </button>
          <button
            className="FilterButton"
            onClick={handleReset}
            type="button"
            disabled={!filtersActive && sortBy === "date"}
          >
            Reset
          </button>
        </div>
      </div>

      <div id="SessionList">
        {loading ? (
          <>
            <p className="LoadingState">Loading sessions...</p>
            <div className="SkeletonCard" />
            <div className="SkeletonCard" />
            <div className="SkeletonCard" />
          </>
        ) : error ? (
          <div className="ErrorState">
            <p>Couldn&apos;t load the schedule</p>
            <p>The exams API didn&apos;t respond.</p>
          </div>
        ) : examSessions.length ? (
          sortBy === "date" ? (
            groupedSessions.map(([dateKey, sessions]) => (
              <section className="SessionGroup" key={dateKey}>
                <div className="SessionGroupHeader">
                  <strong>{formatGroupLabel(dateKey)}</strong>
                  <span>
                    {sessions.length} session{sessions.length === 1 ? "" : "s"}
                  </span>
                </div>
                {sessions.map((session) => (
                  <ExamCard
                    session={session}
                    key={session.id}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </section>
            ))
          ) : (
            examSessions.map((session) => (
              <ExamCard
                session={session}
                key={session.id}
                onStatusChange={handleStatusChange}
              />
            ))
          )
        ) : (
          <div className="EmptyState">
            <p>No sessions to display...</p>
          </div>
        )}
      </div>

      {!loading && !error && examSessions.length ? (
        <p className="ListFooter">
          Showing {examSessions.length} of {originalExamSessions.length} exams
          {statusFilter ? ` · ${getStatusLabel(statusFilter)} only` : ""}
        </p>
      ) : null}
    </main>
  );
}
