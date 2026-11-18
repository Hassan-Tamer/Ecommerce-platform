import './FormField.css'

export default function FormField({ id, label, ...inputProps }) {
  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={id}>
        {label}
      </label>
      <input className="form-field__input" id={id} {...inputProps} />
    </div>
  )
}