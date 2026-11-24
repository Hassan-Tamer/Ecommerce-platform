import { Link } from 'react-router-dom'
import { useState } from 'react'
import { formatPrice } from '../features/catalog/api/productsApi'
import { useCart } from '../features/cart/CartContext'
import Button from '../components/Button'
import Icon from '../components/icons'
import { notImplemented } from '../lib/notImplemented'
import './CartPage.css'

export default function CartPage() {
  const { items, setQuantity, removeItem } = useCart()
  const [coupon, setCoupon] = useState('')
  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)

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
              <form
                className="cart-page__coupon"
                onSubmit={(event) => {
                  event.preventDefault()
                  notImplemented('Applying a coupon')
                }}
              >
                <label htmlFor="coupon">
                  Coupon
                  <input id="coupon" value={coupon} onChange={(event) => setCoupon(event.target.value)} />
                </label>
                <Button type="submit" variant="ghost">
                  Apply coupon
                </Button>
              </form>
              <p className="cart-page__total">
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </p>
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
