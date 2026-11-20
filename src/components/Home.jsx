import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="Home">
      <section className="HomeCard">
        <p className="PageEyebrow">VICTVS Exam Scheduler</p>
        <h2>Keep every session on track</h2>
        <p>
          Browse the schedule, advance status as invigilation progresses, and
          see where candidates are sitting, in one place.
        </p>
        <div className="HomeActions">
          <Link className="Button Button--teal" to="/sessions">
            Open schedule
          </Link>
          <Link className="Button" to="/exam-map">
            View map
          </Link>
        </div>
      </section>
    </main>
  );
}
