import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import AddToCartButton from '../components/AddToCartButton'
import SaveButton from '../components/SaveButton'
import Button from '../components/Button'
import { useAuth } from '../features/auth/context/AuthContext'
import { formatPrice, getProductBySlug } from '../features/catalog/api/productsApi'
import { listAllProductReviews, postProductReview } from '../features/reviews/reviewsApi'
import StarRating, { StarPicker } from '../features/reviews/StarRating'
import './ProductPage.css'

export default function ProductPage() {
  const { slug } = useParams()
  const location = useLocation()
  const backTo = `/${location.state?.from ?? ''}`
  const [product, setProduct] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  const [reviewsData, setReviewsData] = useState({ average: 0, count: 0, items: [] })
  const [reviewsStatus, setReviewsStatus] = useState('idle')
  const [reviewsError, setReviewsError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    setError(null)
    setProduct(null)
    setImageIndex(0)
    getProductBySlug(slug, { signal: controller.signal })
      .then((row) => {
        setProduct(row)
        setStatus('ready')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setStatus('error')
        setError(err.message || 'This product did not load.')
      })
    return () => controller.abort()
  }, [slug, reloadKey])

  useEffect(() => {
    if (!slug || status !== 'ready') return undefined
    const controller = new AbortController()
    let stale = false
    setReviewsStatus('loading')
    setReviewsError(null)
    listAllProductReviews(slug, { signal: controller.signal })
      .then((data) => {
        if (stale) return
        setReviewsData({
          average: data.average ?? 0,
          count: data.count ?? 0,
          items: data.items ?? [],
        })
        setReviewsStatus('ready')
      })
      .catch((err) => {
        if (stale || err.name === 'AbortError') return
        setReviewsData({ average: 0, count: 0, items: [] })
        setReviewsError(err.message || 'Reviews did not load.')
        setReviewsStatus('error')
      })
    return () => {
      stale = true
      controller.abort()
    }
  }, [slug, status, reloadKey])

  const { isAuthenticated } = useAuth()
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { average, count, items: reviews } = reviewsData
  const images = product?.images ?? []
  const activeImage = images[imageIndex] ?? images[0]

  useEffect(() => {
    setRating(0)
    setReview('')
    setFormError('')
  }, [slug])

  function formatWhen(iso) {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  async function refreshReviews() {
    const data = await listAllProductReviews(slug)
    setReviewsData({
      average: data.average ?? 0,
      count: data.count ?? 0,
      items: data.items ?? [],
    })
    setReviewsStatus('ready')
    setReviewsError(null)
  }

  async function onPostReview(event) {
    event.preventDefault()
    if (!rating) {
      setFormError('Choose a rating.')
      return
    }
    const body = review.trim()
    setSubmitting(true)
    setFormError('')
    try {
      await postProductReview(slug, {
        rating,
        body: body || null,
      })
      await refreshReviews()
      setRating(0)
      setReview('')
    } catch (err) {
      setFormError(err.message || 'Could not post your review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="product-page">
      <Link className="product-page__back" to={backTo}>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M12.5 4.5 7 10l5.5 5.5" />
        </svg>
        Back to the catalog
      </Link>

      {status === 'loading' && <p className="product-page__status">Loading product…</p>}

      {status === 'error' && (
        <div className="product-page__status" role="alert">
          <p>{error}</p>
          {error !== 'Product not found' && (
            <button type="button" className="product-page__retry" onClick={() => setReloadKey((key) => key + 1)}>
              Retry
            </button>
          )}
        </div>
      )}

      {status === 'ready' && product && (
        <>
        <div className="product-page__layout">
          <div className="product-page__gallery">
            {images.length > 1 && (
              <div className="product-page__thumbs" role="group" aria-label="More images">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    className={index === imageIndex ? 'product-page__thumb product-page__thumb--active' : 'product-page__thumb'}
                    aria-pressed={index === imageIndex}
                    onClick={() => setImageIndex(index)}
                  >
                    <img src={image.url} alt="" />
                  </button>
                ))}
              </div>
            )}
            <div className="product-page__media">
              {activeImage ? (
                <img src={activeImage.url} alt={product.name} />
              ) : (
                <span>No image</span>
              )}
            </div>
          </div>

          <div className="product-page__info">
            <p className="product-page__category">
              <Link to={`/?category=${encodeURIComponent(product.category.slug)}`}>
                {product.category.name.replace(/'S\b/g, "'s")}
              </Link>
            </p>
            <h1>{product.name}</h1>
            <p className="product-page__price">{formatPrice(product.price)}</p>
            <p className="product-page__rating">
              <StarRating
                value={average}
                caption={`${average.toFixed(1)} · ${count} ${count === 1 ? 'review' : 'reviews'}`}
              />
            </p>
            {product.stock_quantity != null && (
              <p className="product-page__stock">
                {product.stock_quantity === 0
                  ? 'Out of stock'
                  : `${product.stock_quantity} in stock`}
              </p>
            )}
            {product.description && <p className="product-page__description">{product.description}</p>}
            <div className="product-page__actions">
              <AddToCartButton product={product} />
              <SaveButton product={product} />
            </div>
          </div>
        </div>
        <section className="reviews product-page__reviews" aria-labelledby="reviews-heading">
          <div className="reviews__head">
            <div>
              <h2 id="reviews-heading">Reviews</h2>
              <div className="reviews__summary">
                <StarRating
                  value={average}
                  caption={`${average.toFixed(1)} from ${count} ${count === 1 ? 'review' : 'reviews'}`}
                />
              </div>
            </div>
            {!isAuthenticated ? (
              <p className="reviews__signin">
                <Link to="/login" state={{ from: `/products/${product.slug}` }}>
                  Sign in
                </Link>{' '}
                to post a review.
              </p>
            ) : null}
          </div>
          {reviewsStatus === 'loading' && <p className="reviews__empty">Loading reviews…</p>}
          {reviewsStatus === 'error' && (
            <p className="reviews__error" role="alert">
              {reviewsError}
            </p>
          )}
          {reviewsStatus === 'ready' && reviews.length === 0 && (
            <p className="reviews__empty">No reviews yet.</p>
          )}
          {reviewsStatus === 'ready' && reviews.length > 0 && (
            <ul className="reviews__list">
              {reviews.map((row) => (
                <li key={row.id} className="reviews__item">
                  <div className="reviews__top">
                    <strong>{row.author}</strong>
                    <time dateTime={row.created_at}>{formatWhen(row.created_at)}</time>
                  </div>
                  <StarRating value={row.rating} size="sm" />
                  {row.title ? <p className="reviews__title">{row.title}</p> : null}
                  {row.body ? <p>{row.body}</p> : null}
                  {!row.title && !row.body ? (
                    <p className="reviews__muted">Rating only</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {isAuthenticated ? (
            <form onSubmit={onPostReview}>
              <StarPicker
                value={rating}
                onChange={(value) => {
                  setRating(value)
                  setFormError('')
                }}
              />
              <label className="desk__field" htmlFor="review-body">
                Review <span className="desk__optional">(optional)</span>
                <textarea
                  id="review-body"
                  rows={4}
                  value={review}
                  onChange={(event) => {
                    setReview(event.target.value)
                    setFormError('')
                  }}
                />
              </label>
              {formError ? (
                <p className="reviews__error" role="alert">
                  {formError}
                </p>
              ) : null}
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Posting…' : 'Post review'}
              </Button>
            </form>
          ) : null}
        </section>
        </>
      )}
    </article>
  )
}