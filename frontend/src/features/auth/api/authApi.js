let accessToken = null

try {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
} catch {
  // Storage can be unavailable. Tokens are not kept there.
}

export function getApiBase() {
  const raw = import.meta.env.VITE_API_URL
  if (raw === undefined || String(raw).trim() === '') return ''
  const base = String(raw).trim().replace(/\/+$/, '').replace(/\/api$/, '')
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    try {
      const api = new URL(base)
      const localApi = api.hostname === 'localhost' || api.hostname === '127.0.0.1'
      const devPage = window.location.port === '5173'
      if (localApi && devPage && api.origin !== window.location.origin) return ''
    } catch {
      return base
    }
  }
  return base
}

const baseUrl = getApiBase()

export function getToken() {
  return accessToken
}

export function setToken(token) {
  accessToken = token || null
}

export function clearToken() {
  accessToken = null
}

async function request(path, options = {}) {
  const headers = {
    ...options.headers,
  }
  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include',
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

let refreshInFlight = null

export function refresh() {
  if (!refreshInFlight) {
    refreshInFlight = request('/auth/refresh', { method: 'POST' }).finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export function register({ email, password, confirmPassword, name }) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      confirm_password: confirmPassword,
      name,
    }),
  })
}

export function login({ email, password }) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout() {
  return request('/auth/logout', { method: 'POST' })
}
