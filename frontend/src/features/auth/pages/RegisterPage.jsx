import { Link } from 'react-router-dom'
import RegisterForm from '../components/RegisterForm'
import '../auth.css'

export default function RegisterPage() {
  return (
    <div className="auth-page">
      <header className="auth-page__header">
        <h1>Create account</h1>
        <p>Create an account to shop at Alimama.</p>
      </header>
      <RegisterForm />
      <p className="auth-form__footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </div>
  )
}