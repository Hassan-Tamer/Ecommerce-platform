import { apiRequest } from '../../auth/api/authApi'

export function listAdminCoupons({ signal } = {}) {
  return apiRequest('/admin/coupons', { signal })
}

export function createCoupon(body) {
  return apiRequest('/admin/coupons', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateCoupon(id, body) {
  return apiRequest(`/admin/coupons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteCoupon(id) {
  return apiRequest(`/admin/coupons/${id}`, { method: 'DELETE' })
}
