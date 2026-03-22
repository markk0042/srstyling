import { NavLink } from 'react-router-dom'

export function Header() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <NavLink to="/" className="brand">
          <div className="m-stripes" aria-hidden>
            <span className="s1" />
            <span className="s2" />
            <span className="s3" />
          </div>
          <span className="brand-name">SR Styling</span>
          <span className="brand-tag">Performance &amp; aesthetics</span>
        </NavLink>
        <nav className="nav" aria-label="Primary">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            Home
          </NavLink>
          <NavLink
            to="/configure"
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            Configure
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              isActive ? 'nav-cta active' : 'nav-cta'
            }
          >
            Contact
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
