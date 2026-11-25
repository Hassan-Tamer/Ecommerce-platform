import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { formatPrice } from '../features/catalog/api/productsApi'
import { useCart } from '../features/cart/CartContext'
import { useAuth } from '../features/auth/context/AuthContext'
import * as cartApi from '../features/cart/api/cartApi'
import * as ordersApi from '../features/orders/api/ordersApi'
import { CHECKOUT_COUPON_KEY } from '../features/orders/orderUi'
import Button from '../components/Button'
import './CheckoutPage.css'

function readStoredCoupon() {
  try {
    return sessionStorage.getItem(CHECKOUT_COUPON_KEY)?.trim() || null
  } catch {
    return null
  }
}

function clearStoredCoupon() {
  try {
    sessionStorage.removeItem(CHECKOUT_COUPON_KEY)
  } catch {
    // ignore
  }
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { user, ready } = useAuth()
  const { items, reloadCart } = useCart()

  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [apartment, setApartment] = useState('')
  const [floor, setFloor] = useState('')
  const [phone, setPhone] = useState('')

  const [pricing, setPricing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [profileReady, setProfileReady] = useState(false)

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items],
  )

  useEffect(() => {
    if (!ready) return
    if (user) {
      setStreet((current) => current || user.street || '')
      setCity((current) => current || user.city || '')
      setApartment((current) => current || user.apartment_number || '')
      setFloor((current) => current || user.floor || '')
      setPhone((current) => current || user.phone || '')
    }
    setProfileReady(true)
    // Prefill once per signed-in user; no GET /auth/me on this page.
  }, [ready, user?.id])

  useEffect(() => {
    const code = readStoredCoupon()
    if (!code || items.length === 0) {
      setPricing(null)
      return undefined
    }

    const controller = new AbortController()
    cartApi
      .applyCartCoupon(code)
      .then((data) => {
        if (!controller.signal.aborted) setPricing(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setPricing(null)
          clearStoredCoupon()
        }
      })

    return () => controller.abort()
  }, [items])

  const displaySubtotal = pricing != null ? Number(pricing.subtotal) : subtotal
  const discount = pricing != null ? Number(pricing.discount) : 0
  const displayTotal = pricing != null ? Number(pricing.total) : subtotal

  async function onSubmit(event) {
    event.preventDefault()
    if (submitting || items.length === 0) return

    setSubmitting(true)
    setSubmitError(null)

    const shippingAddress = {
      street: street.trim(),
      city: city.trim(),
    }
    const apt = apartment.trim()
    const floorVal = floor.trim()
    const phoneVal = phone.trim()
    if (apt) shippingAddress.apartment_number = apt
    if (floorVal) shippingAddress.floor = floorVal
    if (phoneVal) shippingAddress.phone = phoneVal

    const couponCode = readStoredCoupon()
    const body = {
      shipping_address: shippingAddress,
      shipping_amount: 0,
    }
    if (couponCode) body.coupon_code = couponCode

    let idempotencyKey
    try {
      idempotencyKey = crypto.randomUUID()
    } catch {
      idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    }

    try {
      const order = await ordersApi.createOrder(body, { idempotencyKey })
      clearStoredCoupon()
      await reloadCart()
      navigate('/orders', { state: { highlightOrderId: order.id } })
    } catch (err) {
      setSubmitError(err.message || 'Could not place order.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="desk checkout">
      <h1>Checkout</h1>
      {!profileReady && items.length > 0 ? (
        <p className="desk__lead">Loading your delivery details…</p>
      ) : null}
      {items.length === 0 ? (
        <p className="desk__lead">
          Add something from the <Link to="/">catalog</Link> before checkout.
        </p>
      ) : (
        <>
          <p className="desk__lead">Where it should go, and how you want to pay.</p>
          <form className="checkout__grid" onSubmit={onSubmit}>
            <div className="checkout__main">
              <section className="checkout__card">
                <h2>Delivery</h2>
                <div className="checkout__fields">
                  <label className="checkout__field" htmlFor="checkout-street">
                    Street
                    <input
                      id="checkout-street"
                      autoComplete="street-address"
                      value={street}
                      onChange={(event) => setStreet(event.target.value)}
                      required
                      disabled={submitting}
                    />
                  </label>
                  <label className="checkout__field" htmlFor="checkout-city">
                    City
                    <input
                      id="checkout-city"
                      autoComplete="address-level2"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      required
                      disabled={submitting}
                    />
                  </label>
                  <label className="checkout__field" htmlFor="checkout-apartment">
                    Apartment (optional)
                    <input
                      id="checkout-apartment"
                      value={apartment}
                      onChange={(event) => setApartment(event.target.value)}
                      disabled={submitting}
                    />
                  </label>
                  <label className="checkout__field" htmlFor="checkout-floor">
                    Floor (optional)
                    <input
                      id="checkout-floor"
                      value={floor}
                      onChange={(event) => setFloor(event.target.value)}
                      disabled={submitting}
                    />
                  </label>
                  <label className="checkout__field" htmlFor="checkout-phone">
                    Phone (optional)
                    <input
                      id="checkout-phone"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      disabled={submitting}
                    />
                  </label>
                </div>
              </section>

              <section className="checkout__card">
                <h2>Payment</h2>
                <p className="checkout__note">Cash on delivery. Pay when the order arrives.</p>
              </section>
            </div>

            <aside className="checkout__card checkout__summary">
              <h2>Your order</h2>
              <ul className="checkout__lines">
                {items.map((item) => (
                  <li key={item.id} className="checkout__line">
                    {item.image ? <img src={item.image} alt="" /> : <span className="checkout__blank" />}
                    <div>
                      <h3>{item.name}</h3>
                      <p>Qty {item.quantity}</p>
                    </div>
                    <p className="checkout__price">{formatPrice(Number(item.price) * item.quantity)}</p>
                  </li>
                ))}
              </ul>
              <dl className="checkout__totals">
                <div className="checkout__total-row">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(displaySubtotal)}</dd>
                </div>
                {discount > 0 ? (
                  <div className="checkout__total-row checkout__total-row--discount">
                    <dt>Discount</dt>
                    <dd>−{formatPrice(discount)}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="checkout__total">
                <span>Total</span>
                <strong>{formatPrice(displayTotal)}</strong>
              </p>
              {submitError ? (
                <p className="checkout__error" role="alert">
                  {submitError}
                </p>
              ) : null}
              <Button type="submit" disabled={submitting || !ready || !profileReady}>
                {submitting ? 'Placing order…' : 'Place order'}
              </Button>
            </aside>
          </form>
        </>
      )}
    </article>
  )
}