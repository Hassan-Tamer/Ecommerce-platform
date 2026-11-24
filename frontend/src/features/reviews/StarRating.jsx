import './StarRating.css'

const STAR_PATH =
  'M12 2.6l2.55 5.17 5.7.83-4.12 4.02.97 5.68L12 15.6l-5.1 2.7.97-5.68L3.75 8.6l5.7-.83L12 2.6z'

function StarShape() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={STAR_PATH} />
    </svg>
  )
}

function fillAmount(index, value) {
  const rest = value - (index - 1)
  if (rest >= 0.75) return 1
  if (rest >= 0.25) return 0.5
  return 0
}

export default function StarRating({ value = 0, caption, size = 'md' }) {
  const numeric = Number(value) || 0
  const rounded = Math.round(numeric * 2) / 2
  return (
    <span className={`stars stars--${size}`}>
      <span className="stars__row" role="img" aria-label={`${rounded.toFixed(1)} out of 5`}>
        {[1, 2, 3, 4, 5].map((index) => (
          <span key={index} className="stars__star">
            <span className="stars__empty">
              <StarShape />
            </span>
            <span className="stars__fill" style={{ width: `${fillAmount(index, rounded) * 100}%` }}>
              <StarShape />
            </span>
          </span>
        ))}
      </span>
      {caption ? <span className="stars__caption">{caption}</span> : null}
    </span>
  )
}

export function StarPicker({ value, onChange }) {
  return (
    <fieldset className="reviews__stars">
      <legend>Your rating</legend>
      <div className="stars__picker">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={star <= value ? 'is-on' : ''}
            aria-pressed={value === star}
            aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
            onClick={() => onChange(star)}
          >
            <StarShape />
          </button>
        ))}
      </div>
    </fieldset>
  )
}
