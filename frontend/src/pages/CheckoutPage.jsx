import { Link } from 'react-router-dom'
import { useState } from 'react'
import { formatPrice } from '../features/catalog/api/productsApi'
import { useCart } from '../features/cart/CartContext'
import Button from '../components/Button'
import { notImplemented } from '../lib/notImplemented'
import './CheckoutPage.css'

export default function CheckoutPage() {
  const { items } = useCart()
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [method, setMethod] = useState('cash')
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const total = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)

  return (
    <article className="desk checkout">
      <h1>Checkout</h1>
      {items.length === 0 ? (
        <p className="desk__lead">
          Add something from the <Link to="/">catalog</Link> before checkout.
        </p>
      ) : (
        <>
          <p className="desk__lead">Where it should go, and how you want to pay.</p>
          <form
            className="checkout__grid"
            onSubmit={(event) => {
              event.preventDefault()
              notImplemented('Placing the order')
            }}
          >
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
                    />
                  </label>
                </div>
              </section>

              <section className="checkout__card">
                <h2>Payment</h2>
                <div className="checkout__choices">
                  <label className={method === 'cash' ? 'checkout__choice is-selected' : 'checkout__choice'}>
                    <input
                      type="radio"
                      name="payment"
                      value="cash"
                      checked={method === 'cash'}
                      onChange={() => setMethod('cash')}
                    />
                    Cash on delivery
                  </label>
                  <label className={method === 'card' ? 'checkout__choice is-selected' : 'checkout__choice'}>
                    <input
                      type="radio"
                      name="payment"
                      value="card"
                      checked={method === 'card'}
                      onChange={() => setMethod('card')}
                    />
                    Card
                  </label>
                </div>
                {method === 'card' ? (
                  <div className="checkout__fields checkout__card-fields">
                    <label className="checkout__field" htmlFor="card-name">
                      Name on card
                      <input
                        id="card-name"
                        autoComplete="cc-name"
                        value={cardName}
                        onChange={(event) => setCardName(event.target.value)}
                        required
                      />
                    </label>
                    <label className="checkout__field" htmlFor="card-number">
                      Card number
                      <input
                        id="card-number"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        value={cardNumber}
                        onChange={(event) => setCardNumber(event.target.value)}
                        required
                      />
                    </label>
                    <div className="checkout__split">
                      <label className="checkout__field" htmlFor="card-expiry">
                        Expiry
                        <input
                          id="card-expiry"
                          autoComplete="cc-exp"
                          placeholder="MM/YY"
                          value={expiry}
                          onChange={(event) => setExpiry(event.target.value)}
                          required
                        />
                      </label>
                      <label className="checkout__field" htmlFor="card-cvc">
                        CVC
                        <input
                          id="card-cvc"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          value={cvc}
                          onChange={(event) => setCvc(event.target.value)}
                          required
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <p className="checkout__note">Pay when the order arrives. No card details are needed.</p>
                )}
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
              <p className="checkout__total">
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </p>
              <Button type="submit">Place order</Button>
            </aside>
          </form>
        </>
      )}
    </article>
  )
}
