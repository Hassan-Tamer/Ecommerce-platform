import { getToken } from './storage'

const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export async function apiClient(path, options = {}) {
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
    const message = data?.message ?? response.statusText ?? 'Request failed'
    throw new Error(message)
  }

  return data
}