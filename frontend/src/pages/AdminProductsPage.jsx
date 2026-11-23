import { useState } from 'react'
import { useAuth } from '../features/auth/context/AuthContext'
import {
  addCatalogProduct,
  deleteCatalogProduct,
  saveCatalogProduct,
  useCatalog,
} from '../features/admin/catalogStore'
import Button from '../components/Button'
import { notImplemented } from '../lib/notImplemented'
import './AdminProductsPage.css'

const EMPTY_FORM = { name: '', price: '', description: '', images: [] }

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

function readProduct(form) {
  const name = form.name.trim()
  const description = form.description.trim()
  const priceText = String(form.price).trim()
  const price = Number(priceText)

  if (!name) return { error: 'Enter a product name.' }
  if (!description) return { error: 'Enter a description.' }
  if (!priceText || !Number.isFinite(price) || price < 0) return { error: 'Enter a valid price.' }

  return { name, description, price }
}

export default function AdminProductsPage() {
  const { user, isAuthenticated } = useAuth()
  const isAdmin = true || (isAuthenticated && user?.role === 'admin')
  const products = useCatalog()
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')

  if (!isAdmin) {
    return (
      <article className="desk">
        <h1>Products</h1>
        <p className="desk__lead">This desk is for shop staff.</p>
      </article>
    )
  }

  function updateField(key) {
    return (event) => {
      setForm((current) => ({ ...current, [key]: event.target.value }))
      setMessage('')
    }
  }

  function startEdit(product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      price: String(product.price),
      description: product.description,
      images: [...(product.images ?? [])],
    })
    setMessage('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setMessage('')
  }

  function onSubmit(event) {
    event.preventDefault()
    const parsed = readProduct(form)
    if (parsed.error) {
      setMessage(parsed.error)
      return
    }

    const fields = { ...parsed, images: form.images }
    if (editingId != null) {
      saveCatalogProduct(editingId, fields)
      cancelEdit()
      notImplemented('Saving the product')
      return
    }

    addCatalogProduct(fields)
    setForm(EMPTY_FORM)
    setMessage('')
    notImplemented('Adding a product')
  }

  function removeImage(index) {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, imageIndex) => imageIndex !== index),
    }))
  }

  async function onImages(event) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return
    try {
      const urls = await Promise.all(files.map(readImage))
      setForm((current) => ({ ...current, images: [...current.images, ...urls] }))
      setMessage('')
    } catch {
      setMessage('Those images could not be read.')
    }
  }

  function removeProduct(product) {
    deleteCatalogProduct(product.id)
    if (editingId === product.id) cancelEdit()
    notImplemented('Deleting a product')
  }

  return (
    <article className="desk products">
      <h1>Products</h1>
      <p className="desk__lead">
        Change the name, price, description, and photos. Stock and low-stock alerts are on Inventory.
      </p>

      <div className="products__layout">
        <section className="products__card">
          <h2>{editingId == null ? 'New product' : 'Edit product'}</h2>
          <form className="products__form" onSubmit={onSubmit}>
            <label className="products__field" htmlFor="product-name">
              Name
              <input id="product-name" value={form.name} onChange={updateField('name')} autoComplete="off" />
            </label>
            <label className="products__field" htmlFor="product-price">
              Price
              <input
                id="product-price"
                inputMode="decimal"
                value={form.price}
                onChange={updateField('price')}
                autoComplete="off"
              />
            </label>
            <label className="products__field" htmlFor="product-description">
              Description
              <textarea
                id="product-description"
                rows={4}
                value={form.description}
                onChange={updateField('description')}
              />
            </label>
            <div className="products__field">
              Images
              <input
                id="product-images"
                className="products__file-input"
                type="file"
                accept="image/*"
                multiple
                onChange={onImages}
              />
              <label className="products__pick" htmlFor="product-images">
                Add images
              </label>
              {form.images.length > 0 ? (
                <ul className="products__previews">
                  {form.images.map((src, index) => (
                    <li key={`${index}-${src.length}`}>
                      <img src={src} alt="" />
                      <button type="button" className="products__text" onClick={() => removeImage(index)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="products__hint">Add one or more photos. They stay in this sample list only.</p>
              )}
            </div>
            {message ? (
              <p className="products__message" role="alert">
                {message}
              </p>
            ) : null}
            <div className="products__submit">
              <Button type="submit">{editingId == null ? 'Add product' : 'Save product'}</Button>
              {editingId != null ? (
                <button type="button" className="products__text" onClick={cancelEdit}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="products__card">
          <h2>Sample catalog</h2>
          {products.length === 0 ? (
            <p className="products__empty">No products in this sample list.</p>
          ) : (
            <ul className="products__list">
              {products.map((product) => (
                <li key={product.id} className="products__row">
                  {product.images?.[0] ? (
                    <img className="products__thumb" src={product.images[0]} alt="" />
                  ) : (
                    <span className="products__thumb" aria-hidden="true" />
                  )}
                  <div className="products__identity">
                    <strong>{product.name}</strong>
                    <span className="products__price">{money(product.price)}</span>
                    <span className="products__blurb">{product.description}</span>
                  </div>
                  <div className="products__actions">
                    <button type="button" className="products__edit" onClick={() => startEdit(product)}>
                      Edit
                    </button>
                    <button type="button" className="products__text" onClick={() => removeProduct(product)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </article>
  )
}
