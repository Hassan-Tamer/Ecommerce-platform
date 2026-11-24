import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { pathAfterAuth } from '../pathAfterAuth'
import Button from '../../../components/Button'
import FormField from '../../../components/FormField'

export default function RegisterForm() {
  const { register, loading, error } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setLocalError(null)
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }
    const next = pathAfterAuth(location.state?.from)
    try {
      await register({ name, email, password, confirmPassword })
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
        id="register-name"
        label="Name"
        type="text"
        autoComplete="name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <FormField
        id="register-email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <FormField
        id="register-password"
        label="Password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <FormField
        id="register-confirm-password"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}