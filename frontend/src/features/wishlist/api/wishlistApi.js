import { apiRequest } from '../../auth/api/authApi'

export function listWishlist({ signal } = {}) {
  return apiRequest('/wishlist', { signal })
}

export function addToWishlist(productId) {
  return apiRequest(`/wishlist/${productId}`, { method: 'PUT' })
}

export function removeFromWishlist(productId) {
  return apiRequest(`/wishlist/${productId}`, { method: 'DELETE' })
}