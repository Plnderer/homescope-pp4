export default function Header({ activePage, onNavigate }) {
  const pages = ['Overview', 'Market', 'Model', 'Predict'];

  return (
    <header className="site-header">
      <button className="brand" onClick={() => onNavigate('Overview')} aria-label="Go to HomeScope overview">
        HOMESCOPE
      </button>

      <nav className="top-nav" aria-label="Primary navigation">
        {pages.map((page) => (
          <button
            key={page}
            className={activePage === page ? 'nav-link active' : 'nav-link'}
            onClick={() => onNavigate(page)}
          >
            {page}
          </button>
        ))}
      </nav>
    </header>
  );
}
