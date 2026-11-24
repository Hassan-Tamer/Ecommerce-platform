import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { formatPrice } from '../features/catalog/api/productsApi'
import * as cartApi from '../features/cart/api/cartApi'
import { useCart } from '../features/cart/CartContext'
import Button from '../components/Button'
import Icon from '../components/icons'
import './CartPage.css'

export default function CartPage() {
  const { items, setQuantity, removeItem } = useCart()
  const [coupon, setCoupon] = useState('')
  const [pricing, setPricing] = useState(null)
  const [couponError, setCouponError] = useState(null)
  const [applying, setApplying] = useState(false)

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items],
  )

  useEffect(() => {
    setPricing(null)
    setCouponError(null)
  }, [items])

  async function onApplyCoupon(event) {
    event.preventDefault()
    const code = coupon.trim()
    if (!code) {
      setCouponError('Enter a coupon code.')
      setPricing(null)
      return
    }

    setApplying(true)
    setCouponError(null)
    try {
      const data = await cartApi.applyCartCoupon(code)
      setPricing(data)
    } catch (err) {
      setPricing(null)
      setCouponError(err.message || 'Coupon could not be applied.')
    } finally {
      setApplying(false)
    }
  }

  const displayTotal = pricing != null ? Number(pricing.total) : subtotal

  return (
    <article className="desk cart-page">
      <h1>Your cart</h1>
      {items.length === 0 ? (
        <div className="cart-empty">
          <div className="cart-empty__mark" aria-hidden="true">
            <Icon name="cart" />
          </div>
          <h2>Your cart is empty</h2>
          <p>Add something from the catalog and it will show up here.</p>
          <Link className="btn btn--primary" to="/">
            Shop the catalog
          </Link>
        </div>
      ) : (
        <>
          <p className="desk__lead">Change a quantity here. Checkout is where you pay.</p>
          <div className="cart-page__grid">
            <section className="cart-page__card">
              <h2>Items</h2>
              <ul className="cart-page__lines">
                {items.map((item) => (
                  <li key={item.id} className="cart-page__line">
                    {item.image ? <img src={item.image} alt="" /> : <span className="cart-page__blank" />}
                    <div>
                      <div className="cart-page__top">
                        <h3>
                          <Link to={`/products/${item.slug}`}>{item.name}</Link>
                        </h3>
                        <p className="cart-page__price">{formatPrice(Number(item.price) * item.quantity)}</p>
                      </div>
                      <div className="cart-page__controls">
                        <div className="cart-page__stepper">
                          <button
                            type="button"
                            aria-label={`Decrease ${item.name}`}
                            onClick={() => setQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            −
                          </button>
                          <span>{item.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Increase ${item.name}`}
                            onClick={() => setQuantity(item.id, item.quantity + 1)}
                            disabled={
                              item.stockQuantity != null && item.quantity >= item.stockQuantity
                            }
                          >
                            +
                          </button>
                        </div>
                        <button type="button" className="desk__remove" onClick={() => removeItem(item.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <aside className="cart-page__card cart-page__summary">
              <h2>Summary</h2>
              <form className="cart-page__coupon" onSubmit={onApplyCoupon}>
                <label htmlFor="coupon">
                  Coupon
                  <input
                    id="coupon"
                    value={coupon}
                    onChange={(event) => setCoupon(event.target.value)}
                    autoComplete="off"
                    disabled={applying}
                  />
                </label>
                {couponError ? (
                  <p className="cart-page__coupon-error" role="alert">
                    {couponError}
                  </p>
                ) : null}
                {pricing?.coupon ? (
                  <p className="cart-page__coupon-applied">
                    Applied <strong>{pricing.coupon.code}</strong>
                  </p>
                ) : null}
                <Button type="submit" variant="ghost" disabled={applying}>
                  {applying ? 'Applying…' : 'Apply coupon'}
                </Button>
              </form>
              <dl className="cart-page__totals">
                <div className="cart-page__total-row">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(pricing != null ? Number(pricing.subtotal) : subtotal)}</dd>
                </div>
                {pricing != null && Number(pricing.discount) > 0 ? (
                  <div className="cart-page__total-row cart-page__total-row--discount">
                    <dt>Discount</dt>
                    <dd>−{formatPrice(Number(pricing.discount))}</dd>
                  </div>
                ) : null}
                <div className="cart-page__total cart-page__total-row">
                  <dt>Total</dt>
                  <dd>
                    <strong>{formatPrice(displayTotal)}</strong>
                  </dd>
                </div>
              </dl>
              <Link className="cart-page__checkout" to="/checkout">
                <Button type="button">Checkout</Button>
              </Link>
            </aside>
          </div>
        </>
      )}
    </article>
  )
}