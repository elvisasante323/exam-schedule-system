import Navigation from "./Navigation";

export default function Header() {
  return (
    <header className="Header">
      <div className="Brand">
        <div className="BrandMark" aria-hidden="true">
          V
        </div>
        <div className="BrandText">
          <h1>VICTVS</h1>
          <span>Exam scheduling</span>
        </div>
      </div>

      <Navigation />

      <div className="HeaderMeta">
        <span className="LiveBadge">Live</span>
        <span className="Avatar" aria-hidden="true">
          EA
        </span>
      </div>
    </header>
  );
}
