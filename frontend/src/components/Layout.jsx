import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/context/AuthContext'
import Button from './Button'
import './Layout.css'

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuth()

  return (
    <div className="layout">
      <header className="layout__header">
        <div className="layout__inner">
          <Link className="layout__brand" to="/">
            Store
          </Link>
          <nav className="layout__nav" aria-label="Main">
            {isAuthenticated ? (
              <>
                <span className="layout__user">
                  {user?.name ?? user?.email ?? 'Account'}
                </span>
                <Button type="button" variant="ghost" onClick={logout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link className="layout__link" to="/login">
                  Sign in
                </Link>
                <Link to="/register">
                  <Button type="button">Register</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="layout__main">
        <Outlet />
      </main>
    </div>
  )
}