import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Button from '../../../components/Button'
import FormField from '../../../components/FormField'

export default function RegisterForm() {
  const { register, loading, error } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setLocalError(null)
    try {
      await register({ name, email, password })
    } catch {
      setLocalError('Registration failed. Wire up the backend when ready.')
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
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}