import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AddToCartButton from '../components/AddToCartButton'
import SaveButton from '../components/SaveButton'
import Announcements from '../components/Announcements'
import { formatPrice, listCategories, listProducts } from '../features/catalog/api/productsApi'
import './HomePage.css'

const SORTS = [
  { value: 'id', label: 'Catalog order' },
  { value: 'name', label: 'Name' },
  { value: 'price_asc', label: 'Price, low to high' },
  { value: 'price_desc', label: 'Price, high to low' },
]

function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}

function setOrDelete(params, key, value) {
  if (value) params.set(key, value)
  else params.delete(key)
}

function priceIsValid(value) {
  if (value === '') return true
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0
}

function categoryLabel(name) {
  return name.replace(/'S\b/g, "'s")
}

export default function HomePage() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') ?? ''
  const sort = SORTS.some((option) => option.value === params.get('sort'))
    ? params.get('sort')
    : 'id'

  const [q, setQ] = useState(() => params.get('q') ?? '')
  const [minPrice, setMinPrice] = useState(() => params.get('min') ?? '')
  const [maxPrice, setMaxPrice] = useState(() => params.get('max') ?? '')
  const debouncedQ = useDebounced(q, 300)
  const debouncedMin = useDebounced(minPrice, 300)
  const debouncedMax = useDebounced(maxPrice, 300)

  const [categories, setCategories] = useState([])
  const [categoriesError, setCategoriesError] = useState(null)
  const [products, setProducts] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [status, setStatus] = useState('loading')
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        setOrDelete(next, 'q', debouncedQ.trim())
        setOrDelete(next, 'min', debouncedMin.trim())
        setOrDelete(next, 'max', debouncedMax.trim())
        if (next.toString() === prev.toString()) return prev
        return next
      },
      { replace: true },
    )
  }, [debouncedQ, debouncedMin, debouncedMax, setParams])

  useEffect(() => {
    const controller = new AbortController()
    listCategories({ signal: controller.signal })
      .then((rows) => {
        setCategories(rows)
        setCategoriesError(null)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setCategoriesError('Categories did not load.')
      })
    return () => controller.abort()
  }, [])

  const rangeError =
    priceIsValid(minPrice) &&
    priceIsValid(maxPrice) &&
    minPrice !== '' &&
    maxPrice !== '' &&
    Number(minPrice) > Number(maxPrice)
      ? 'Minimum price is higher than the maximum.'
      : null

  const queryKey = params.toString()

  useEffect(() => {
    const current = new URLSearchParams(queryKey)
    const min = current.get('min') ?? ''
    const max = current.get('max') ?? ''
    const rawSort = current.get('sort') ?? 'id'
    const activeSort = SORTS.some((option) => option.value === rawSort) ? rawSort : 'id'

    if (rangeError) {
      setStatus('ready')
      setProducts([])
      setError(null)
      return undefined
    }

    if (!priceIsValid(min) || !priceIsValid(max)) {
      setStatus('ready')
      setError('Enter a price of zero or more.')
      setProducts([])
      return undefined
    }

    const controller = new AbortController()
    setStatus('loading')
    setError(null)
    listProducts(
      {
        q: current.get('q') ?? '',
        category: current.get('category') ?? '',
        min,
        max,
        sort: activeSort,
      },
      { signal: controller.signal },
    )
      .then((page) => {
        setProducts(page.items)
        setNextCursor(page.next_cursor ?? null)
        setStatus('ready')
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setProducts([])
        setNextCursor(null)
        setStatus('error')
        setError(err.message || 'The catalog did not load.')
      })
    return () => controller.abort()
  }, [queryKey, rangeError, reloadKey])

  function loadMore() {
    if (!nextCursor || loadingMore || status !== 'ready') return

    const current = new URLSearchParams(queryKey)
    const min = current.get('min') ?? ''
    const max = current.get('max') ?? ''
    const rawSort = current.get('sort') ?? 'id'
    const activeSort = SORTS.some((option) => option.value === rawSort) ? rawSort : 'id'

    setLoadingMore(true)
    setError(null)
    listProducts({
      q: current.get('q') ?? '',
      category: current.get('category') ?? '',
      min,
      max,
      sort: activeSort,
      cursor: nextCursor,
    })
      .then((page) => {
        setProducts((prev) => [...prev, ...page.items])
        setNextCursor(page.next_cursor ?? null)
      })
      .catch((err) => {
        setError(err.message || 'Could not load more products.')
      })
      .finally(() => setLoadingMore(false))
  }

  function updateParam(key, value) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        setOrDelete(next, key, value)
        return next
      },
      { replace: true },
    )
  }

  function clearFilters() {
    setQ('')
    setMinPrice('')
    setMaxPrice('')
    setParams(new URLSearchParams(), { replace: true })
  }

  const filtersActive = Boolean(
    params.get('q') || params.get('category') || params.get('min') || params.get('max') || (params.get('sort') && params.get('sort') !== 'id'),
  )

  const resultLabel =
    products.length === 1 ? '1 product shown' : `${products.length} products shown`

  return (
    <div className="catalog">
      <section className="counter">
        <div className="counter__inner">
          <h1>Shop the catalog</h1>
          <p>Search by name, then narrow with a category or a price range.</p>
          <form
            className="counter__search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              updateParam('q', q.trim())
            }}
          >
            <label className="visually-hidden" htmlFor="catalog-search">
              Search products
            </label>
            <input
              id="catalog-search"
              type="search"
              placeholder="Search products"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              autoComplete="off"
            />
          </form>
        </div>
      </section>

      <Announcements />

      <div className="catalog__body">
        <div className="filters">
          <div className="filters__categories" role="group" aria-label="Category">
            <button
              type="button"
              className={category ? 'chip' : 'chip chip--selected'}
              aria-pressed={!category}
              onClick={() => updateParam('category', '')}
            >
              All
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                className={category === item.slug ? 'chip chip--selected' : 'chip'}
                aria-pressed={category === item.slug}
                onClick={() => updateParam('category', item.slug)}
              >
                {categoryLabel(item.name)}
              </button>
            ))}
          </div>
          {categoriesError && <p className="filters__note">{categoriesError}</p>}

          <div className="filters__row">
            <fieldset className="filters__price">
              <legend>Price</legend>
              <label htmlFor="min-price">
                Min
                <input
                  id="min-price"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                />
              </label>
              <label htmlFor="max-price">
                Max
                <input
                  id="max-price"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
              </label>
            </fieldset>

            <label className="filters__sort" htmlFor="catalog-sort">
              Sort
              <select
                id="catalog-sort"
                value={sort}
                onChange={(event) => updateParam('sort', event.target.value === 'id' ? '' : event.target.value)}
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {filtersActive && (
              <button type="button" className="filters__clear" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
          {rangeError && (
            <p className="filters__note" role="alert">
              {rangeError}
            </p>
          )}
        </div>

        {status === 'loading' && <p className="catalog__status">Loading the catalog…</p>}

        {status === 'error' && (
          <div className="catalog__status" role="alert">
            <p>{error} Try again.</p>
            <button type="button" className="filters__clear" onClick={() => setReloadKey((key) => key + 1)}>
              Retry
            </button>
          </div>
        )}

        {status === 'ready' && !rangeError && products.length === 0 && (
          <div className="catalog__status">
            <p>Nothing matches these filters.</p>
            {filtersActive && (
              <button type="button" className="filters__clear" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        )}

        {status === 'ready' && products.length > 0 && (
          <>
            <p className="catalog__count">{resultLabel}</p>
            <ul className="catalog__grid">
              {products.map((product) => {
                const image = product.images?.[0]
                return (
                  <li key={product.id}>
                    <article className="product">
                      <Link
                        className="product__link"
                        to={`/products/${product.slug}`}
                        state={{ from: `?${params.toString()}` }}
                      >
                        <div className="product__media">
                          {image ? (
                            <img src={image.url} alt="" />
                          ) : (
                            <span className="product__placeholder">No image</span>
                          )}
                        </div>
                        <div className="product__row">
                          <h2 className="product__name">{product.name}</h2>
                          <p className="product__price">{formatPrice(product.price)}</p>
                        </div>
                        <p className="product__meta">
                          {product.category?.name ? categoryLabel(product.category.name) : ''}
                        </p>
                        {product.stock_quantity === 0 && (
                          <p className="product__stock">Out of stock</p>
                        )}
                      </Link>
                      <div className="product__actions">
                        <SaveButton product={product} compact />
                        <AddToCartButton product={product} />
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
            {nextCursor && (
              <div className="catalog__more">
                <button
                  type="button"
                  className="filters__clear"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading more…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
