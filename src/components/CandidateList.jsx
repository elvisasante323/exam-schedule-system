import { useEffect, useMemo, useState } from "react";
import CandidateCard from "./CandidateCard";
import FilterModal from "./FilterModal";
import { getCandidates, getLocations } from "../utils/api";
import { getApiDatePart, parseApiDatetime } from "../utils/datetime";
import { getStatusLabel } from "../utils/status";

const emptyFilters = { date: "", name: "", location: "" };

const STATUS_SORT_ORDER = {
  pending: 0,
  started: 1,
  finished: 2,
};

function buildLocationMap(locations) {
  const map = new Map();
  (locations || []).forEach((location) => {
    map.set(location.id, location);
  });
  return map;
}

function enrichCandidate(candidate, locationMap) {
  const exams = (candidate.exams || []).map((exam) => ({
    ...exam,
    location: locationMap.get(exam.location_id) || null,
  }));

  const countries = [
    ...new Set(
      exams
        .map((exam) => exam.location?.country)
        .filter(Boolean)
        .map((country) => String(country))
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const statusCounts = {
    pending: exams.filter((exam) => exam.status === "pending").length,
    started: exams.filter((exam) => exam.status === "started").length,
    finished: exams.filter((exam) => exam.status === "finished").length,
  };

  const nextExam = [...exams]
    .filter((exam) => exam.status !== "finished")
    .sort((a, b) => String(a.datetime || "").localeCompare(String(b.datetime || "")))[0]
    || [...exams].sort((a, b) =>
        String(a.datetime || "").localeCompare(String(b.datetime || ""))
      )[0]
    || null;

  const primaryStatus = statusCounts.started
    ? "started"
    : statusCounts.pending
      ? "pending"
      : statusCounts.finished
        ? "finished"
        : null;

  return {
    ...candidate,
    exams,
    countries,
    statusCounts,
    nextExam,
    primaryStatus,
    examCount: exams.length,
  };
}

function matchesFilters(candidate, filters, statusFilter) {
  if (statusFilter) {
    if (!(candidate.statusCounts?.[statusFilter] > 0)) {
      return false;
    }
  }

  if (filters.date) {
    const hasDate = (candidate.exams || []).some(
      (exam) => getApiDatePart(exam.datetime) === filters.date
    );
    if (!hasDate) return false;
  }

  if (filters.name) {
    const needle = filters.name.toLowerCase();
    if (!String(candidate.name || "").toLowerCase().includes(needle)) {
      return false;
    }
  }

  if (filters.location) {
    const needle = filters.location.toLowerCase();
    const hasLocation = (candidate.countries || []).some((country) =>
      String(country).toLowerCase().includes(needle)
    );
    if (!hasLocation) return false;
  }

  return true;
}

function compareCandidates(a, b, sortBy) {
  switch (sortBy) {
    case "exams": {
      const countDiff = (b.examCount || 0) - (a.examCount || 0);
      if (countDiff !== 0) return countDiff;
      return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base",
      });
    }
    case "status": {
      const statusDiff =
        (STATUS_SORT_ORDER[a.primaryStatus] ?? 99) -
        (STATUS_SORT_ORDER[b.primaryStatus] ?? 99);
      if (statusDiff !== 0) return statusDiff;
      return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base",
      });
    }
    case "location": {
      const locationDiff = String(a.countries?.[0] || "").localeCompare(
        String(b.countries?.[0] || ""),
        undefined,
        { sensitivity: "base" }
      );
      if (locationDiff !== 0) return locationDiff;
      return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base",
      });
    }
    case "date": {
      const aDate = a.nextExam?.datetime || "";
      const bDate = b.nextExam?.datetime || "";
      const dateDiff = String(aDate).localeCompare(String(bDate));
      if (dateDiff !== 0) return dateDiff;
      return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base",
      });
    }
    case "name":
    default:
      return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
        sensitivity: "base",
      });
  }
}

function hasActiveFilters(filters, statusFilter) {
  return Boolean(filters.date || filters.name || filters.location || statusFilter);
}

export default function CandidateList() {
  const [originalCandidates, setOriginalCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hideFilterModal, setHideFilterModal] = useState(true);
  const [filtersObject, setFiltersObject] = useState(emptyFilters);
  const [statusFilter, setStatusFilter] = useState(null);
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    let cancelled = false;

    async function fetchCandidates() {
      setLoading(true);
      setError(null);
      try {
        const [candidatesData, locationsData] = await Promise.all([
          getCandidates(),
          getLocations(),
        ]);
        if (cancelled) return;

        const locationMap = buildLocationMap(
          Array.isArray(locationsData) ? locationsData : []
        );
        const enriched = (Array.isArray(candidatesData) ? candidatesData : []).map(
          (candidate) => enrichCandidate(candidate, locationMap)
        );
        setOriginalCandidates(enriched);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError(err);
        setOriginalCandidates([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCandidates();

    return () => {
      cancelled = true;
    };
  }, []);

  const candidates = useMemo(() => {
    return originalCandidates
      .filter((candidate) =>
        matchesFilters(candidate, filtersObject, statusFilter)
      )
      .sort((a, b) => compareCandidates(a, b, sortBy));
  }, [originalCandidates, filtersObject, statusFilter, sortBy]);

  const counts = useMemo(() => {
    return {
      total: originalCandidates.length,
      pending: originalCandidates.filter((c) => c.statusCounts.pending > 0)
        .length,
      started: originalCandidates.filter((c) => c.statusCounts.started > 0)
        .length,
      finished: originalCandidates.filter((c) => c.statusCounts.finished > 0)
        .length,
      locations: new Set(
        originalCandidates.flatMap((c) => c.countries || [])
      ).size,
    };
  }, [originalCandidates]);

  const rangeLabel = useMemo(() => {
    const dates = originalCandidates
      .flatMap((candidate) => candidate.exams || [])
      .map((exam) => parseApiDatetime(exam.datetime))
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (!dates.length) return "All pupils";

    const start = dates[0].toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
    });
    const end = dates[dates.length - 1].toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `Exams from ${start} to ${end}`;
  }, [originalCandidates]);

  function handleReset() {
    setFiltersObject(emptyFilters);
    setStatusFilter(null);
    setSortBy("name");
  }

  function handleStatusStripClick(status) {
    setStatusFilter((current) => (current === status ? null : status));
  }

  const modalFiltersActive = hasActiveFilters(filtersObject, null);
  const filtersActive = hasActiveFilters(filtersObject, statusFilter);

  return (
    <main className="CandidateList">
      <div className="PageHeader">
        <div>
          <p className="PageEyebrow">{rangeLabel}</p>
          <h2>Candidates</h2>
        </div>
      </div>

      {!loading && !error ? (
        <section className="StatGrid" aria-label="Candidates summary">
          <article className="StatCard">
            <p className="StatLabel">Candidates</p>
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
            <p className="StatHint">With pending exams</p>
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
            <p className="StatHint">With live exams</p>
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
            <p className="StatHint">With finished exams</p>
          </button>
        </section>
      ) : null}

      <div className="Toolbar">
        <FilterModal
          hide={hideFilterModal}
          setHide={setHideFilterModal}
          setFiltersObject={setFiltersObject}
          title="Filter candidates"
          nameLabel="Candidate name"
          namePlaceholder="Match candidate name"
        />
        <div className="SortControl">
          <label htmlFor="sort-candidates">Sort by</label>
          <select
            id="sort-candidates"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="name">Name</option>
            <option value="date">Next exam</option>
            <option value="exams">Exam count</option>
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
            disabled={!filtersActive && sortBy === "name"}
          >
            Reset
          </button>
        </div>
      </div>

      <div id="CandidateList">
        {loading ? (
          <>
            <p className="LoadingState">Loading candidates...</p>
            <div className="SkeletonCard" />
            <div className="SkeletonCard" />
            <div className="SkeletonCard" />
          </>
        ) : error ? (
          <div className="ErrorState">
            <p>Couldn&apos;t load candidates</p>
            <p>The candidates API didn&apos;t respond.</p>
          </div>
        ) : candidates.length ? (
          candidates.map((candidate) => (
            <CandidateCard candidate={candidate} key={candidate.id} />
          ))
        ) : (
          <div className="EmptyState">
            <p>No candidates to display...</p>
          </div>
        )}
      </div>

      {!loading && !error && candidates.length ? (
        <p className="ListFooter">
          Showing {candidates.length} of {originalCandidates.length} candidates
          {statusFilter ? ` · ${getStatusLabel(statusFilter)} only` : ""}
        </p>
      ) : null}
    </main>
  );
}
