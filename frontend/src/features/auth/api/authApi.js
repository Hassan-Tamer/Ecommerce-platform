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

const NO_REFRESH = new Set(['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'])

let sessionHandler = null
let refreshInFlight = null

export function setSessionHandler(handler) {
  sessionHandler = handler
}

function decodePayload(token) {
  const part = token.split('.')[1]
  if (!part) return null
  const pad = part.length % 4 === 0 ? '' : '='.repeat(4 - (part.length % 4))
  try {
    return JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/') + pad))
  } catch {
    return null
  }
}

export function readRole() {
  const payload = accessToken ? decodePayload(accessToken) : null
  return typeof payload?.role === 'string' ? payload.role : null
}

function isExpired(token) {
  const payload = decodePayload(token)
  if (!payload?.exp) return false
  return payload.exp * 1000 <= Date.now() + 30_000
}

function errorFrom(response, data) {
  const detail = data?.detail
  const message =
    (typeof detail === 'string' && detail) ||
    (Array.isArray(detail) && detail.map((entry) => entry.msg).join(', ')) ||
    data?.message ||
    response.statusText ||
    'Request failed'
  const error = new Error(message)
  error.status = response.status
  return error
}

function failSession(error) {
  clearToken()
  sessionHandler?.(null)
  throw error
}

export function refresh() {
  if (!refreshInFlight) {
    refreshInFlight = send('/auth/refresh', { method: 'POST' }, true)
      .then((data) => {
        if (data?.token) setToken(data.token)
        else clearToken()
        sessionHandler?.(data?.user ?? null)
        return data
      })
      .catch((error) => failSession(error))
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

async function send(path, options, retried) {
  const pathname = path.split('?')[0]
  const canRefresh = !retried && !NO_REFRESH.has(pathname)

  if (canRefresh && accessToken && isExpired(accessToken)) {
    try {
      await refresh()
    } catch {
      // The session is already cleared. Continue this request without a token.
    }
  }

  const headers = { ...options.headers }
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (options.body && !isFormData) headers['Content-Type'] = 'application/json'
  if (accessToken && pathname !== '/auth/refresh') {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })
  const data = await response.json().catch(() => null)

  if (response.status === 401 && canRefresh) {
    await refresh()
    return send(path, options, true)
  }

  if (!response.ok) throw errorFrom(response, data)
  return data
}

export function apiRequest(path, options = {}) {
  return send(path, options, false)
}

export function register({ email, password, confirmPassword, name }) {
  return apiRequest('/auth/register', {
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
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout() {
  return apiRequest('/auth/logout', { method: 'POST' })
}

export function getMe() {
  return apiRequest('/auth/me')
}

export function patchMe(body) {
  return apiRequest('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function uploadProfilePhoto(file) {
  const form = new FormData()
  form.append('file', file)
  return apiRequest('/auth/me/photo', {
    method: 'POST',
    body: form,
  })
}
