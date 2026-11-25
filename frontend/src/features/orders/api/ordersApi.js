import { apiRequest } from '../../auth/api/authApi'

export function listOrders({ signal } = {}) {
  return apiRequest('/orders', { signal })
}

export function getOrder(orderId, { signal } = {}) {
  return apiRequest(`/orders/${orderId}`, { signal })
}

export function createOrder(body, { idempotencyKey } = {}) {
  const headers = {}
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
  return apiRequest('/orders', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}