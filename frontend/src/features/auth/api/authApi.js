import { apiClient } from '../../../lib/apiClient'

export function register({ email, password, name }) {
  return apiClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  })
}

export function login({ email, password }) {
  return apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}