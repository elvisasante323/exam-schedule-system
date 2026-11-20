import { NavLink } from "react-router-dom";

export default function Navigation() {
  return (
    <nav className="Navigation">
      <section className="MainLinks">
        <NavLink
          className={({ isActive }) => (isActive ? "Link LinkActive" : "Link")}
          to="/"
          end
        >
          Home
        </NavLink>
        <NavLink
          className={({ isActive }) => (isActive ? "Link LinkActive" : "Link")}
          to="/sessions"
        >
          Schedule
        </NavLink>
        <NavLink
          className={({ isActive }) => (isActive ? "Link LinkActive" : "Link")}
          to="/candidates"
        >
          Candidates
        </NavLink>
        <NavLink
          className={({ isActive }) => (isActive ? "Link LinkActive" : "Link")}
          to="/exam-map"
        >
          Map
        </NavLink>
      </section>
    </nav>
  );
}
