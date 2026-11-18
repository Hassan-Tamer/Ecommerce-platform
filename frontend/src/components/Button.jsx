import './Button.css'

export default function Button({
  type = 'button',
  variant = 'primary',
  disabled = false,
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}