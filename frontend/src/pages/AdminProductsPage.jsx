import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatPrice } from '../features/catalog/api/productsApi'
import { listCategories } from '../features/catalog/api/productsApi'
import * as adminProductsApi from '../features/admin/adminProductsApi'
import { useAuth } from '../features/auth/context/AuthContext'
import Button from '../components/Button'
import './AdminProductsPage.css'

const EMPTY_FORM = {
  categoryId: '',
  name: '',
  price: '',
  description: '',
  stockQuantity: '0',
  stockAlertAt: '5',
  isActive: true,
  imageFiles: [],
  existingPreviews: [],
}

function isAtAlert(product) {
  const alertAt = product.stock_alert_at ?? 5
  return product.stock_quantity <= alertAt
}

function isLowStock(product) {
  return product.is_active !== false && isAtAlert(product)
}

function readProductFields(form) {
  const name = form.name.trim()
  const description = form.description.trim()
  const priceText = String(form.price).trim()
  const price = Number(priceText)
  const categoryId = Number(form.categoryId)
  const stockQuantity = Number(form.stockQuantity)
  const stockAlertAt = Number(form.stockAlertAt)

  if (!categoryId) return { error: 'Choose a category.' }
  if (!name) return { error: 'Enter a product name.' }
  if (!priceText || !Number.isFinite(price) || price < 0) return { error: 'Enter a valid price.' }
  if (!Number.isInteger(stockQuantity) || stockQuantity < 0) return { error: 'Enter a valid stock quantity.' }
  if (!Number.isInteger(stockAlertAt) || stockAlertAt < 0) return { error: 'Enter a valid alert level.' }

  return { name, description, price, categoryId, stockQuantity, stockAlertAt, isActive: form.isActive }
}

function productThumb(product) {
  return product.images?.[0]?.url ?? null
}

function DeactivateProductDialog({ product, busy, error, onCancel, onConfirm }) {
  const cancelRef = useRef(onCancel)
  const busyRef = useRef(busy)
  cancelRef.current = onCancel
  busyRef.current = busy

  useEffect(() => {
    const previous = document.activeElement
    const onKey = (event) => {
      if (event.key === 'Escape' && !busyRef.current) cancelRef.current()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])

  return createPortal(
    <div
      className="products-dialog__backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel()
      }}
    >
      <div
        className="products-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="deactivate-product-title"
        aria-describedby="deactivate-product-body"
      >
        <h2 id="deactivate-product-title">Deactivate this product?</h2>
        <p id="deactivate-product-body">
          <strong>{product.name}</strong> will leave the shop. Stock and photos stay on the desk so you can turn it
          back on later.
        </p>
        {error ? (
          <p className="products-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="products-dialog__actions">
          <button type="button" className="products-dialog__cancel" onClick={onCancel} disabled={busy} autoFocus>
            Cancel
          </button>
          <button type="button" className="products-dialog__confirm" onClick={onConfirm} disabled={busy}>
            {busy ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function AdminProductsPage() {
  const { user, isAuthenticated, ready } = useAuth()
  const isAdmin = isAuthenticated && user?.role === 'admin'

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const [stockDrafts, setStockDrafts] = useState({})
  const [query, setQuery] = useState('')
  const [highlightedId, setHighlightedId] = useState(null)
  const [pendingDeactivate, setPendingDeactivate] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [dialogError, setDialogError] = useState('')

  const reload = useCallback(async (signal) => {
    setLoading(true)
    setLoadError(null)
    try {
      const [cats, rows] = await Promise.all([
        listCategories({ signal }),
        adminProductsApi.listAllAdminProducts({ signal }),
      ])
      setCategories(cats ?? [])
      setProducts(rows)
    } catch (err) {
      if (err.name === 'AbortError') return
      setLoadError(err.message || 'Could not load products.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!ready || !isAdmin) return undefined
    const controller = new AbortController()
    reload(controller.signal)
    return () => controller.abort()
  }, [ready, isAdmin, reload])

  const lowStock = useMemo(() => products.filter(isLowStock), [products])

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((product) => {
      const haystack = [product.name, product.slug, product.description, product.category?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [products, query])

  useEffect(() => {
    if (highlightedId == null) return undefined
    document.getElementById(`product-row-${highlightedId}`)?.scrollIntoView({ block: 'nearest' })
    return undefined
  }, [highlightedId, visibleProducts])

  if (!ready) {
    return (
      <article className="desk">
        <h1>Products</h1>
        <p className="desk__lead">Loading…</p>
      </article>
    )
  }

  if (!isAdmin) {
    return (
      <article className="desk">
        <h1>Products</h1>
        <p className="desk__lead">This desk is for shop staff with an admin account.</p>
      </article>
    )
  }

  function updateField(key) {
    return (event) => {
      const value = key === 'isActive' ? event.target.checked : event.target.value
      setForm((current) => ({ ...current, [key]: value }))
      setMessage('')
    }
  }

  function startEdit(product) {
    setEditingId(product.id)
    setForm({
      categoryId: String(product.category?.id ?? ''),
      name: product.name,
      price: String(product.price),
      description: product.description ?? '',
      stockQuantity: String(product.stock_quantity ?? 0),
      stockAlertAt: String(product.stock_alert_at ?? 5),
      isActive: product.is_active,
      imageFiles: [],
      existingPreviews: (product.images ?? []).map((img) => img.url),
    })
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setMessage('')
  }

  async function onSubmit(event) {
    event.preventDefault()
    const parsed = readProductFields(form)
    if (parsed.error) {
      setMessage(parsed.error)
      return
    }

    setSaving(true)
    setMessage('')
    try {
      if (editingId != null) {
        await adminProductsApi.updateAdminProduct(editingId, {
          categoryId: parsed.categoryId,
          name: parsed.name,
          price: parsed.price,
          description: parsed.description,
          stockQuantity: parsed.stockQuantity,
          stockAlertAt: parsed.stockAlertAt,
          isActive: parsed.isActive,
          imageFiles: form.imageFiles,
        })
        cancelEdit()
      } else {
        await adminProductsApi.createAdminProduct({
          categoryId: parsed.categoryId,
          name: parsed.name,
          price: parsed.price,
          description: parsed.description,
          stockQuantity: parsed.stockQuantity,
          stockAlertAt: parsed.stockAlertAt,
          isActive: parsed.isActive,
          imageFiles: form.imageFiles,
        })
        setForm(EMPTY_FORM)
      }
      await reload()
    } catch (err) {
      setMessage(err.message || 'Could not save product.')
    } finally {
      setSaving(false)
    }
  }

  function removeNewImage(index) {
    setForm((current) => ({
      ...current,
      imageFiles: current.imageFiles.filter((_, i) => i !== index),
    }))
  }

  function onImages(event) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return
    setForm((current) => ({ ...current, imageFiles: [...current.imageFiles, ...files] }))
    setMessage('')
  }

  function askDeactivate(product) {
    setDialogError('')
    setPendingDeactivate(product)
  }

  async function confirmDeactivate() {
    const product = pendingDeactivate
    if (!product || deleting) return
    setDeleting(true)
    setDialogError('')
    try {
      await adminProductsApi.deactivateAdminProduct(product.id)
      if (editingId === product.id) cancelEdit()
      setPendingDeactivate(null)
      await reload()
    } catch (err) {
      setDialogError(err.message || 'Could not deactivate product.')
    } finally {
      setDeleting(false)
    }
  }

  function showInCatalog(product) {
    setQuery('')
    setHighlightedId(product.id)
  }

  async function saveQuickStock(product) {
    const draft = stockDrafts[product.id] ?? { add: '', alertAt: String(product.stock_alert_at ?? 5) }
    const addText = draft.add.trim()
    const amount = addText === '' ? 0 : Number(addText)
    const alertAt = Number(draft.alertAt)

    if (!Number.isInteger(amount) || amount < 0) {
      setMessage('Enter how many units to add, or leave blank.')
      return
    }
    if (!Number.isInteger(alertAt) || alertAt < 0) {
      setMessage('Enter a valid alert level.')
      return
    }

    setMessage('')
    try {
      await adminProductsApi.patchAdminProductStock(product.id, {
        addStock: amount,
        stockAlertAt: alertAt,
      })
      setStockDrafts((current) => {
        const next = { ...current }
        delete next[product.id]
        return next
      })
      await reload()
    } catch (err) {
      setMessage(err.message || 'Could not update stock.')
    }
  }

  function updateStockDraft(productId, patch) {
    setStockDrafts((current) => ({
      ...current,
      [productId]: { add: '', alertAt: '5', ...current[productId], ...patch },
    }))
  }

  const newImagePreviews = form.imageFiles.map((file) => URL.createObjectURL(file))

  return (
    <article className="desk products">
      <h1>Products</h1>
      <p className="desk__lead">Catalog, photos, stock, and low-stock alerts in one place.</p>

      {loadError ? (
        <p className="desk__lead desk__lead--error" role="alert">
          {loadError}
        </p>
      ) : null}

      <section
        className={lowStock.length === 0 ? 'products__alerts products__alerts--clear' : 'products__alerts'}
        aria-labelledby="low-stock-heading"
      >
        <div className="products__alerts-head">
          <h2 id="low-stock-heading">Low stock</h2>
          <span className="products__alerts-count">{lowStock.length}</span>
        </div>
        {lowStock.length === 0 ? (
          <p className="products__alerts-empty">Every active product is above its alert level.</p>
        ) : (
          <ul className="products__alerts-list">
            {lowStock.map((product) => (
              <li key={product.id}>
                <button type="button" onClick={() => showInCatalog(product)}>
                  <strong>{product.name}</strong>
                  <span>
                    {product.stock_quantity} left · alert at {product.stock_alert_at ?? 5}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="products__layout">
        <section className="products__card">
          <h2>{editingId == null ? 'New product' : 'Edit product'}</h2>
          <form className="products__form" onSubmit={onSubmit}>
            <label className="products__field" htmlFor="product-category">
              Category
              <select
                id="product-category"
                value={form.categoryId}
                onChange={updateField('categoryId')}
                required
                disabled={saving}
              >
                <option value="">Select…</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="products__field" htmlFor="product-name">
              Name
              <input
                id="product-name"
                value={form.name}
                onChange={updateField('name')}
                autoComplete="off"
                disabled={saving}
              />
            </label>
            <label className="products__field" htmlFor="product-price">
              Price
              <input
                id="product-price"
                inputMode="decimal"
                value={form.price}
                onChange={updateField('price')}
                autoComplete="off"
                disabled={saving}
              />
            </label>
            <label className="products__field" htmlFor="product-description">
              Description
              <textarea
                id="product-description"
                rows={4}
                value={form.description}
                onChange={updateField('description')}
                disabled={saving}
              />
            </label>
            <div className="products__split">
              <label className="products__field" htmlFor="product-stock">
                Stock on hand
                <input
                  id="product-stock"
                  inputMode="numeric"
                  value={form.stockQuantity}
                  onChange={updateField('stockQuantity')}
                  disabled={saving}
                />
              </label>
              <label className="products__field" htmlFor="product-alert">
                Alert at or below
                <input
                  id="product-alert"
                  inputMode="numeric"
                  value={form.stockAlertAt}
                  onChange={updateField('stockAlertAt')}
                  disabled={saving}
                />
              </label>
            </div>
            <label className="products__checkbox">
              <input type="checkbox" checked={form.isActive} onChange={updateField('isActive')} disabled={saving} />
              Active in the shop
            </label>
            <div className="products__field">
              Images
              <input
                id="product-images"
                className="products__file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                onChange={onImages}
                disabled={saving}
              />
              <label className="products__pick" htmlFor="product-images">
                Add images
              </label>
              {(form.existingPreviews.length > 0 || newImagePreviews.length > 0) && (
                <ul className="products__previews">
                  {form.existingPreviews.map((src) => (
                    <li key={src}>
                      <img src={src} alt="" />
                      <span className="products__hint">On server</span>
                    </li>
                  ))}
                  {newImagePreviews.map((src, index) => (
                    <li key={src}>
                      <img src={src} alt="" />
                      <button type="button" className="products__text" onClick={() => removeNewImage(index)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="products__hint">New uploads append to existing product photos.</p>
            </div>
            {message ? (
              <p className="products__message" role="alert">
                {message}
              </p>
            ) : null}
            <div className="products__submit">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId == null ? 'Add product' : 'Save product'}
              </Button>
              {editingId != null ? (
                <button type="button" className="products__text" onClick={cancelEdit}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="products__card products__catalog">
          <div className="products__catalog-head">
            <h2>
              Catalog{' '}
              {loading
                ? '(loading…)'
                : query.trim()
                  ? `(${visibleProducts.length} of ${products.length})`
                  : `(${products.length})`}
            </h2>
            <label className="products__search">
              <span className="visually-hidden">Search products</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or category"
                autoComplete="off"
              />
            </label>
          </div>
          {products.length === 0 && !loading ? (
            <p className="products__empty">No products yet.</p>
          ) : visibleProducts.length === 0 ? (
            <p className="products__empty">No products match “{query.trim()}”.</p>
          ) : (
            <ul className="products__list">
              {visibleProducts.map((product) => {
                const thumb = productThumb(product)
                const low = isAtAlert(product)
                const draft = stockDrafts[product.id] ?? {
                  add: '',
                  alertAt: String(product.stock_alert_at ?? 5),
                }
                return (
                  <li
                    key={product.id}
                    id={`product-row-${product.id}`}
                    className={
                      highlightedId === product.id ? 'products__row products__row--focus' : 'products__row'
                    }
                  >
                    {thumb ? <img className="products__thumb" src={thumb} alt="" /> : <span className="products__thumb" aria-hidden="true" />}
                    <div className="products__identity">
                      <strong>{product.name}</strong>
                      <span className="products__price">{formatPrice(product.price)}</span>
                      <span className="products__stock-line">
                        {product.stock_quantity} on hand · alert at {product.stock_alert_at ?? 5}
                        {!product.is_active ? ' · inactive' : ''}
                      </span>
                      <span className="products__blurb">{product.description}</span>
                      <div className="products__quick-stock">
                        <label className="products__quick-label">
                          Add stock
                          <input
                            inputMode="numeric"
                            value={draft.add}
                            onChange={(event) => updateStockDraft(product.id, { add: event.target.value })}
                            placeholder="0"
                          />
                        </label>
                        <label className="products__quick-label">
                          Alert
                          <input
                            inputMode="numeric"
                            value={draft.alertAt}
                            onChange={(event) => updateStockDraft(product.id, { alertAt: event.target.value })}
                          />
                        </label>
                        <button type="button" className="products__edit" onClick={() => saveQuickStock(product)}>
                          Update stock
                        </button>
                      </div>
                    </div>
                    <div className="products__actions">
                      <span className={low ? 'products__flag products__flag--low' : 'products__flag'}>
                        {low ? 'Low' : 'Ok'}
                      </span>
                      <button type="button" className="products__edit" onClick={() => startEdit(product)}>
                        Edit
                      </button>
                      <button type="button" className="products__text" onClick={() => askDeactivate(product)}>
                        Deactivate
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
      {pendingDeactivate ? (
        <DeactivateProductDialog
          product={pendingDeactivate}
          busy={deleting}
          error={dialogError}
          onCancel={() => {
            if (!deleting) {
              setPendingDeactivate(null)
              setDialogError('')
            }
          }}
          onConfirm={confirmDeactivate}
        />
      ) : null}
    </article>
  )
}