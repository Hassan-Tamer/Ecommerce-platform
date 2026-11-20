import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/context/AuthContext'
import Button from './Button'
import './Layout.css'

export default function Layout() {
  const { isAuthenticated, ready, user, logout } = useAuth()

  return (
    <div className="layout">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="layout__header">
        <div className="layout__inner">
          <Link className="layout__brand" to="/">
            Alimama
          </Link>
          <nav className="layout__nav" aria-label="Main">
            <Link className="layout__link" to="/">
              Shop
            </Link>
            {ready && isAuthenticated ? (
              <>
                <span className="layout__user">
                  {user?.name ?? user?.email ?? 'Account'}
                </span>
                <Button type="button" variant="ghost" onClick={logout}>
                  Log out
                </Button>
              </>
            ) : ready ? (
              <>
                <Link className="layout__link" to="/login">
                  Sign in
                </Link>
                <Link to="/register">
                  <Button type="button">Register</Button>
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      </header>
      <main id="main" className="layout__main">
        <Outlet />
      </main>
    </div>
  )
}
