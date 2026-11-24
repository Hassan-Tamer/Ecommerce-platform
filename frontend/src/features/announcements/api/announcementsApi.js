import { apiRequest } from '../../auth/api/authApi'

export function listAnnouncements({ signal } = {}) {
  return apiRequest('/announcements', { signal })
}

export function listAdminAnnouncements({ active, signal } = {}) {
  const params = new URLSearchParams()
  if (active === true) params.set('active', 'true')
  if (active === false) params.set('active', 'false')
  const query = params.toString()
  return apiRequest(`/admin/announcements${query ? `?${query}` : ''}`, { signal })
}

export function createAnnouncement(body) {
  return apiRequest('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateAnnouncement(id, body) {
  return apiRequest(`/admin/announcements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteAnnouncement(id) {
  return apiRequest(`/admin/announcements/${id}`, { method: 'DELETE' })
}