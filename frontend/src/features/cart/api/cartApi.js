import { apiRequest } from '../../auth/api/authApi'

export function listCart({ signal } = {}) {
  return apiRequest('/cart', { signal })
}

export function addCartItem(productId, quantity = 1) {
  return apiRequest('/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity }),
  })
}

export function updateCartItem(productId, quantity) {
  return apiRequest(`/cart/items/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  })
}

export function removeCartItem(productId) {
  return apiRequest(`/cart/items/${productId}`, { method: 'DELETE' })
}

export function applyCartCoupon(code) {
  return apiRequest('/cart/coupon', {
    method: 'POST',
    body: JSON.stringify({ code: code.trim() }),
  })
}