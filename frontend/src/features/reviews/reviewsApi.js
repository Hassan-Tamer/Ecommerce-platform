import { apiRequest } from '../auth/api/authApi'

export function listProductReviews(slug, { cursor, limit, signal } = {}) {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  if (limit != null) params.set('limit', String(limit))
  const query = params.toString()
  const path = `/products/slug/${encodeURIComponent(slug)}/reviews${query ? `?${query}` : ''}`
  return apiRequest(path, { signal })
}

/** Fetches every page for a product (server caps page size at 100). */
export async function listAllProductReviews(slug, { signal } = {}) {
  const items = []
  let cursor
  let average = 0
  let count = 0

  for (;;) {
    const page = await listProductReviews(slug, { cursor, limit: 100, signal })
    average = page.average ?? average
    count = page.count ?? count
    if (Array.isArray(page.items)) {
      items.push(...page.items)
    }
    if (!page.next_cursor) break
    cursor = page.next_cursor
  }

  return { average, count, items }
}

export function postProductReview(slug, payload) {
  return apiRequest(`/products/slug/${encodeURIComponent(slug)}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteReview(reviewId) {
  return apiRequest(`/admin/reviews/${reviewId}`, { method: 'DELETE' })
}