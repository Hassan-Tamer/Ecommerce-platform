const STATUS_LABEL = {
  pending: 'Placed',
  paid: 'Packing',
  shipped: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const ORDER_TRACK_STEPS = ['Placed', 'Packing', 'Shipped', 'Out for delivery', 'Delivered']

export function orderStatusLabel(status) {
  return STATUS_LABEL[status] ?? status
}

export function orderStepIndex(status) {
  switch (status) {
    case 'pending':
      return 0
    case 'paid':
      return 1
    case 'shipped':
      return 3
    case 'delivered':
      return 4
    case 'cancelled':
      return -1
    default:
      return 0
  }
}

export function orderShowsMap(status) {
  return status === 'shipped' || status === 'delivered'
}

export function orderPillClass(status) {
  if (status === 'shipped') return 'orders__pill orders__pill--travel'
  if (status === 'delivered') return 'orders__pill orders__pill--done'
  if (status === 'cancelled') return 'orders__pill orders__pill--cancelled'
  return 'orders__pill'
}

export function formatShippingAddress(address) {
  if (!address || typeof address !== 'object') return ''
  const parts = [
    address.street,
    address.apartment_number ? `Apt ${address.apartment_number}` : null,
    address.city,
  ].filter(Boolean)
  return parts.join(', ')
}

export const CHECKOUT_COUPON_KEY = 'checkout_coupon_code'

const ADMIN_STATUS_LABEL = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function adminDeskStatusLabel(status) {
  return ADMIN_STATUS_LABEL[status] ?? status
}

export function adminStatusClass(status) {
  const key = typeof status === 'string' ? status.toLowerCase() : 'pending'
  const modifier = ['paid', 'packing', 'pending', 'shipped', 'delivered', 'cancelled'].includes(key)
    ? key
    : 'pending'
  return `admin__status admin__status--${modifier}`
}