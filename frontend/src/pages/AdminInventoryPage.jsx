import { useState } from 'react'
import { useAuth } from '../features/auth/context/AuthContext'
import { isLowStock, saveInventory, useCatalog } from '../features/admin/catalogStore'
import Button from '../components/Button'
import { notImplemented } from '../lib/notImplemented'
import './AdminInventoryPage.css'

export default function AdminInventoryPage() {
  const { user, isAuthenticated } = useAuth()
  const isAdmin = true || (isAuthenticated && user?.role === 'admin')
  const products = useCatalog()
  const [selectedId, setSelectedId] = useState(null)
  const [add, setAdd] = useState('')
  const [alertAt, setAlertAt] = useState('')
  const [message, setMessage] = useState('')

  const selected = products.find((product) => product.id === selectedId) ?? null
  const low = products.filter(isLowStock)

  if (!isAdmin) {
    return (
      <article className="desk">
        <h1>Inventory</h1>
        <p className="desk__lead">This desk is for shop staff.</p>
      </article>
    )
  }

  function choose(product) {
    setSelectedId(product.id)
    setAdd('')
    setAlertAt(String(product.alertAt))
    setMessage('')
  }

  function onSubmit(event) {
    event.preventDefault()
    if (!selected) {
      setMessage('Choose a product from the list.')
      return
    }

    const addText = add.trim()
    const alertText = alertAt.trim()
    const amount = addText === '' ? 0 : Number(addText)
    const level = Number(alertText)

    if (!Number.isInteger(amount) || amount < 0) {
      setMessage('Enter how many to add, or leave it blank.')
      return
    }
    if (!alertText || !Number.isInteger(level) || level < 0) {
      setMessage('Enter the stock level that should raise an alert.')
      return
    }

    saveInventory(selected.id, { add: amount, alertAt: level })
    setAdd('')
    setAlertAt(String(level))
    setMessage('')
    notImplemented('Saving inventory')
  }

  return (
    <article className="desk inventory">
      <h1>Inventory</h1>
      <p className="desk__lead">
        Add stock and set the level that raises an alert. Photos and descriptions stay on Products.
      </p>

      <section className="inventory__alerts" aria-label="Low stock">
        {low.length === 0 ? (
          <p>Nothing is at its alert level.</p>
        ) : (
          <ul>
            {low.map((product) => (
              <li key={product.id}>
                {product.name} has {product.stock} left. The alert is set at {product.alertAt}.
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="inventory__layout">
        <section className="inventory__card">
          <h2>{selected ? selected.name : 'Receive stock'}</h2>
          <form className="inventory__form" onSubmit={onSubmit}>
            <label className="inventory__field" htmlFor="inventory-add">
              Add stock
              <input
                id="inventory-add"
                inputMode="numeric"
                value={add}
                onChange={(event) => {
                  setAdd(event.target.value)
                  setMessage('')
                }}
                placeholder={selected ? '0' : 'Choose a product'}
                autoComplete="off"
              />
            </label>
            <label className="inventory__field" htmlFor="inventory-alert">
              Alert when stock is at or below
              <input
                id="inventory-alert"
                inputMode="numeric"
                value={alertAt}
                onChange={(event) => {
                  setAlertAt(event.target.value)
                  setMessage('')
                }}
                autoComplete="off"
              />
            </label>
            {selected ? (
              <p className="inventory__hint">{selected.stock} on hand now.</p>
            ) : (
              <p className="inventory__hint">Choose a product, then add units or change its alert.</p>
            )}
            {message ? (
              <p className="inventory__message" role="alert">
                {message}
              </p>
            ) : null}
            <Button type="submit">Save inventory</Button>
          </form>
        </section>

        <section className="inventory__card">
          <h2>On hand</h2>
          {products.length === 0 ? (
            <p className="inventory__hint">No products in this sample list.</p>
          ) : (
            <ul className="inventory__list">
              {products.map((product) => {
                const lowStock = isLowStock(product)
                return (
                  <li key={product.id} className="inventory__row">
                    <div>
                      <strong>{product.name}</strong>
                      <span>
                        {product.stock} on hand · alert at {product.alertAt}
                      </span>
                    </div>
                    <span className={lowStock ? 'inventory__flag inventory__flag--low' : 'inventory__flag'}>
                      {lowStock ? 'Low' : 'Ok'}
                    </span>
                    <button
                      type="button"
                      className="inventory__edit"
                      aria-pressed={selectedId === product.id}
                      onClick={() => choose(product)}
                    >
                      Adjust
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </article>
  )
}
