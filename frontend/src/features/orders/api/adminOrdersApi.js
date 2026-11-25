import { apiRequest } from '../../auth/api/authApi'

export function getAdminSummary({ signal } = {}) {
  return apiRequest('/admin/summary', { signal })
}

export function listAdminOrders({ limit = 20, signal } = {}) {
  const params = new URLSearchParams()
  if (limit != null) params.set('limit', String(limit))
  const query = params.toString()
  return apiRequest(`/admin/orders${query ? `?${query}` : ''}`, { signal })
}