const TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

function resolveBaseUrl() {
  const raw = import.meta.env.VITE_API_URL
  if (raw === undefined || raw === '') {
    throw new Error('Set VITE_API_URL in frontend/.env (see frontend/.env.example)')
  }
  return String(raw).trim().replace(/\/+$/, '').replace(/\/api$/, '')
}

const baseUrl = resolveBaseUrl()

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function setRefreshToken(token) {
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token)
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function logout() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return Promise.resolve(null)
  return request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

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
      (Array.isArray(detail) && detail.map((e) => e.msg).join(', ')) ||
      data?.message ||
      response.statusText ||
      'Request failed'
    throw new Error(message)
  }

  return data
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