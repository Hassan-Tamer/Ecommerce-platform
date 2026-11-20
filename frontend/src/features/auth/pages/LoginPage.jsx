import { Link } from 'react-router-dom'
import LoginForm from '../components/LoginForm'
import '../auth.css'

export default function LoginPage() {
  return (
    <div className="auth-page">
      <header className="auth-page__header">
        <h1>Sign in</h1>
        <p>Sign in to Alimama.</p>
      </header>
      <LoginForm />
      <p className="auth-form__footer">
        No account? <Link to="/register">Create one</Link>
      </p>
    </div>
  )
}