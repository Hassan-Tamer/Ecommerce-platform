const PATHS = {
  shop: (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-6h4v6" />
    </>
  ),
  cart: (
    <>
      <path d="M6.5 8h11l-1 12h-9l-1-12z" />
      <path d="M9 8V6.8a3 3 0 0 1 6 0V8" />
    </>
  ),
  heart: (
    <path d="M12 19.2s-6.4-3.9-6.4-8.2a3.5 3.5 0 0 1 6.4-2 3.5 3.5 0 0 1 6.4 2c0 4.3-6.4 8.2-6.4 8.2z" />
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19.5c1.1-2.8 3.2-4.2 6.5-4.2s5.4 1.4 6.5 4.2" />
    </>
  ),
  admin: (
    <>
      <path d="M8 4.5h8v3.2H8z" />
      <path d="M7 7.7h10V20H7z" />
      <path d="M10 12h4M10 15.5h4" />
    </>
  ),
  logout: (
    <>
      <path d="M10 6H6.5v12H10" />
      <path d="M10 12h8" />
      <path d="M15 9l3 3-3 3" />
    </>
  ),
  signin: (
    <>
      <path d="M14 6h3.5v12H14" />
      <path d="M6 12h8" />
      <path d="M11 9l3 3-3 3" />
    </>
  ),
  register: (
    <>
      <circle cx="10" cy="8" r="3" />
      <path d="M4.5 19c1-2.6 2.8-4 5.5-4 1.2 0 2.3.3 3.2.9" />
      <path d="M17 11v6M14 14h6" />
    </>
  ),
  chat: (
    <>
      <path d="M5 6.5h14v9H9.2L5 19v-3.5z" />
      <path d="M8.5 10h7M8.5 12.5h4.5" />
    </>
  ),
  close: (
    <path d="M7 7l10 10M17 7 7 17" />
  ),
  send: (
    <path d="M5 12h12.5M13 7.5 17.5 12 13 16.5" />
  ),
  orders: (
    <>
      <path d="M4.5 8.5 12 4.5l7.5 4v11L12 19.5l-7.5-4z" />
      <path d="M12 12.2 19.5 8.5M12 12.2V19.5M12 12.2 4.5 8.5" />
    </>
  ),
  products: (
    <>
      <path d="M5 7.5h14v11H5z" />
      <path d="M9 7.5V6a3 3 0 0 1 6 0v1.5" />
      <path d="M5 12h14" />
    </>
  ),
  inventory: (
    <>
      <path d="M4 7h16M4 13h16M4 19h16" />
      <path d="M8 7v6M15 13v6" />
    </>
  ),
}

export default function Icon({ name }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  )
}
