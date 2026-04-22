import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isEmployer } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="navbar">
      <Link className="brand" to="/jobs" onClick={closeMenu}>Job <span>Aggregator</span></Link>

      <button className="menu-btn" type="button" onClick={() => setMenuOpen((prev) => !prev)} aria-label="Toggle navigation menu">
        ☰
      </button>

      <div className={`nav-shell ${menuOpen ? 'open' : ''}`}>
        <nav>
          <NavLink to="/team" onClick={closeMenu}>Team</NavLink>
          <NavLink to="/jobs" onClick={closeMenu}>Jobs</NavLink>
          {!isEmployer && <NavLink to="/employer" onClick={closeMenu}>For Employers</NavLink>}
          {isEmployer && <NavLink to="/employer/workspace" onClick={closeMenu}>Employer Workspace</NavLink>}
          {user && <NavLink to="/saved" onClick={closeMenu}>Saved</NavLink>}
          {user && <NavLink to="/resume" onClick={closeMenu}>Resume Match</NavLink>}
        </nav>

        <div className="auth-actions">
          {!user ? (
            <>
              <Link to="/login" className="btn-link" onClick={closeMenu}>Login</Link>
              <Link to="/register" className="btn-link" onClick={closeMenu}>Register</Link>
              <Link to="/employer/login" className="btn-link" onClick={closeMenu}>Employer Login</Link>
            </>
          ) : (
            <button className="btn" onClick={() => { logout(); closeMenu(); }}>
              Logout ({user.username}{isEmployer ? ' / employer' : ''})
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
