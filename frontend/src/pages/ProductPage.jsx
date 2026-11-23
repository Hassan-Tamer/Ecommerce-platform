import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import AddToCartButton from '../components/AddToCartButton'
import SaveButton from '../components/SaveButton'
import Button from '../components/Button'
import { useAuth } from '../features/auth/context/AuthContext'
import { formatPrice, getProductBySlug } from '../features/catalog/api/productsApi'
import { notImplemented } from '../lib/notImplemented'
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

  const { isAuthenticated } = useAuth()
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const images = product?.images ?? []
  const activeImage = images[imageIndex] ?? images[0]

  return (
    <article className="product-page">
      <Link className="product-page__back" to={backTo}>
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
          <div>
            <div className="product-page__media">
              {activeImage ? (
                <img src={activeImage.url} alt={product.name} />
              ) : (
                <span>No image</span>
              )}
            </div>
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
          </div>

          <div className="product-page__info">
            <p className="product-page__category">
              <Link to={`/?category=${encodeURIComponent(product.category.slug)}`}>
                {product.category.name.replace(/'S\b/g, "'s")}
              </Link>
            </p>
            <h1>{product.name}</h1>
            <p className="product-page__price">{formatPrice(product.price)}</p>
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
        <section className="reviews">
          <h2>Reviews</h2>
          <p className="reviews__empty">No reviews yet.</p>
          {isAuthenticated ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                notImplemented('Posting a review')
              }}
            >
              <fieldset className="reviews__stars">
                <legend>Your rating</legend>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={rating === value}
                    onClick={() => setRating(value)}
                  >
                    {value}
                  </button>
                ))}
              </fieldset>
              <label className="desk__field" htmlFor="review-body">
                Review
                <textarea id="review-body" rows={4} value={review} onChange={(event) => setReview(event.target.value)} />
              </label>
              <Button type="submit">Post review</Button>
            </form>
          ) : (
            <p>
              <Link to="/login" state={{ from: `/products/${product.slug}` }}>
                Sign in
              </Link>{' '}
              to post a review.
            </p>
          )}
        </section>
        </>
      )}
    </article>
  )
}
