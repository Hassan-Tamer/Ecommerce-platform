import { getToken } from '../../auth/api/authApi'

function resolveBaseUrl() {
  const raw = import.meta.env.VITE_API_URL
  if (raw === undefined || raw === '') {
    throw new Error('Set VITE_API_URL in frontend/.env (see frontend/.env.example)')
  }
  return String(raw).trim().replace(/\/+$/, '').replace(/\/api$/, '')
}

const baseUrl = resolveBaseUrl()

async function request(path, options = {}) {
  const headers = { ...options.headers }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const detail = data?.detail
    const message =
      (typeof detail === 'string' && detail) ||
      (Array.isArray(detail) && detail.map((entry) => entry.msg).join(', ')) ||
      data?.message ||
      response.statusText ||
      'Request failed'
    throw new Error(message)
  }

  return data
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
