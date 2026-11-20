import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { formatPrice, getProductBySlug } from '../features/catalog/api/productsApi'
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
          </div>
        </div>
      )}
    </article>
  )
}
