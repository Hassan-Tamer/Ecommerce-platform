import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { pathAfterAuth } from '../pathAfterAuth'
import Button from '../../../components/Button'
import FormField from '../../../components/FormField'

export default function LoginForm() {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setLocalError(null)
    const next = pathAfterAuth(location.state?.from)
    try {
      await login({ email, password })
      navigate(next, { replace: true })
    } catch {
      // The form shows the error from auth state.
    }
  }

  const displayError = localError ?? error

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {displayError && (
        <p className="auth-form__error" role="alert">
          {displayError}
        </p>
      )}
      <FormField
        id="login-email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <FormField
        id="login-password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}