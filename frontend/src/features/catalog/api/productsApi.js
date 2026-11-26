import { apiRequest } from '../../auth/api/authApi'

function request(path, options = {}) {
  return apiRequest(path, options)
}

export function formatPrice(value) {
  const amount = Number(value)
  if (Number.isNaN(amount)) return String(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function listCategories({ signal } = {}) {
  return request('/products/categories', { signal })
}

export function listProducts(filters = {}, { signal } = {}) {
  const params = new URLSearchParams()
  const q = filters.q?.trim()
  if (q) params.set('q', q)
  if (filters.category) params.set('category_slug', filters.category)
  if (filters.min !== undefined && filters.min !== '') params.set('min_price', filters.min)
  if (filters.max !== undefined && filters.max !== '') params.set('max_price', filters.max)
  if (filters.sort && filters.sort !== 'id') params.set('sort', filters.sort)
  if (filters.cursor) params.set('cursor', filters.cursor)
  if (filters.limit != null) params.set('limit', String(filters.limit))
  const query = params.toString()
  return request(`/products${query ? `?${query}` : ''}`, { signal })
}

export function getProductBySlug(slug, { signal } = {}) {
  return request(`/products/slug/${encodeURIComponent(slug)}`, { signal })
}

export function getProduct(productId, { signal } = {}) {
  return request(`/products/${productId}`, { signal })
}
