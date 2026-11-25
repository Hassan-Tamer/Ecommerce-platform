import { apiRequest } from '../auth/api/authApi'

export function listAdminProductsPage({ cursor, limit = 50, signal } = {}) {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  if (limit != null) params.set('limit', String(limit))
  params.set('sort', 'name')
  const query = params.toString()
  return apiRequest(`/admin/products${query ? `?${query}` : ''}`, { signal })
}

export async function listAllAdminProducts({ signal } = {}) {
  const items = []
  let cursor = null
  for (;;) {
    const page = await listAdminProductsPage({ cursor, limit: 50, signal })
    const rows = page?.items ?? []
    items.push(...rows)
    if (!page?.next_cursor) break
    cursor = page.next_cursor
  }
  return items
}

function appendIfPresent(form, key, value) {
  if (value === undefined || value === null) return
  if (key !== 'images' && String(value).trim() === '') return
  form.append(key, String(value))
}

export function createAdminProduct({
  categoryId,
  name,
  price,
  description,
  stockQuantity,
  stockAlertAt,
  isActive,
  imageFiles,
}) {
  const form = new FormData()
  form.append('category_id', String(categoryId))
  form.append('name', name)
  form.append('price', String(price))
  appendIfPresent(form, 'description', description)
  form.append('stock_quantity', String(stockQuantity ?? 0))
  form.append('stock_alert_at', String(stockAlertAt ?? 5))
  form.append('is_active', isActive === false ? 'false' : 'true')
  for (const file of imageFiles ?? []) {
    form.append('images', file)
  }
  return apiRequest('/admin/products', { method: 'POST', body: form })
}

export function updateAdminProduct(
  productId,
  {
    categoryId,
    name,
    price,
    description,
    stockQuantity,
    stockAlertAt,
    isActive,
    imageFiles,
  },
) {
  const form = new FormData()
  if (categoryId != null) form.append('category_id', String(categoryId))
  if (name != null) form.append('name', name)
  if (price != null) form.append('price', String(price))
  if (description !== undefined) form.append('description', description ?? '')
  if (stockQuantity != null) form.append('stock_quantity', String(stockQuantity))
  if (stockAlertAt != null) form.append('stock_alert_at', String(stockAlertAt))
  if (isActive != null) form.append('is_active', isActive ? 'true' : 'false')
  for (const file of imageFiles ?? []) {
    form.append('images', file)
  }
  return apiRequest(`/admin/products/${productId}`, { method: 'PATCH', body: form })
}

export function patchAdminProductStock(productId, { addStock, stockAlertAt }) {
  const body = {}
  if (addStock != null) body.add_stock = addStock
  if (stockAlertAt != null) body.stock_alert_at = stockAlertAt
  return apiRequest(`/admin/products/${productId}/stock`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deactivateAdminProduct(productId) {
  return apiRequest(`/admin/products/${productId}`, { method: 'DELETE' })
}