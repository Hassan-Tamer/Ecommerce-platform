export function pathAfterAuth(from) {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) return '/'
  const path = from.split('?')[0]
  if (path === '/account' || path === '/login' || path === '/register') return '/'
  return from
}
