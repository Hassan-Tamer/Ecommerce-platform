import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAvatarPreview } from '../features/account/avatarPreview'
import { useAuth } from '../features/auth/context/AuthContext'
import { useCart } from '../features/cart/CartContext'
import { useWishlist } from '../features/wishlist/WishlistContext'
import Assistant from './Assistant'
import Button from './Button'
import Icon from './icons'
import './Layout.css'
import '../pages/shop.css'

function navClass({ isActive }) {
  return isActive ? 'layout__link is-active' : 'layout__link'
}

export default function Layout() {
  const { isAuthenticated, ready, user, logout } = useAuth()
  const { count } = useCart()
  const { count: saved } = useWishlist()
  const avatar = useAvatarPreview() || user?.photo || user?.avatar_url || null
  const name = user?.name ?? 'Account'

  return (
    <div className="layout">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="layout__header">
        <div className="layout__inner">
          <Link className="layout__brand" to="/">
            <span className="layout__mark" aria-hidden="true">A</span>
            Alimama
          </Link>
          <nav className="layout__nav" aria-label="Main">
            <NavLink className={navClass} to="/" end>
              <Icon name="shop" />
              <span className="layout__label">Shop</span>
            </NavLink>
            {ready && isAuthenticated ? (
              <>
                <NavLink className={navClass} to="/cart" aria-label={count > 0 ? `Cart, ${count}` : 'Cart'}>
                  <Icon name="cart" />
                  <span className="layout__label">Cart</span>
                  {count > 0 ? <span className="layout__count">{count}</span> : null}
                </NavLink>
                <NavLink className={navClass} to="/wishlist" aria-label={saved > 0 ? `Wishlist, ${saved}` : 'Wishlist'}>
                  <Icon name="heart" />
                  <span className="layout__label">Saved</span>
                  {saved > 0 ? <span className="layout__count">{saved}</span> : null}
                </NavLink>
                <NavLink className={navClass} to="/orders">
                  <Icon name="orders" />
                  <span className="layout__label">Orders</span>
                </NavLink>
                {user?.role === 'admin' ? (
                  <>
                    <NavLink className={navClass} to="/admin" end>
                      <Icon name="admin" />
                      <span className="layout__label">Desk</span>
                    </NavLink>
                    <NavLink className={navClass} to="/admin/products">
                      <Icon name="products" />
                      <span className="layout__label">Products</span>
                    </NavLink>
                  </>
                ) : null}
                <span className="layout__account">
                  <NavLink className={navClass} to="/account">
                    <span className="layout__avatar">
                      {avatar ? <img src={avatar} alt="" /> : <Icon name="user" />}
                    </span>
                    <span className="layout__name">{name}</span>
                  </NavLink>
                  <button type="button" className="layout__link" onClick={logout}>
                    <Icon name="logout" />
                    <span className="layout__label">Log out</span>
                  </button>
                </span>
              </>
            ) : ready ? (
              <>
                <NavLink className={navClass} to="/login">
                  <Icon name="signin" />
                  <span className="layout__label">Sign in</span>
                </NavLink>
                <Link className="layout__register" to="/register">
                  <Button type="button">
                    <Icon name="register" />
                    Register
                  </Button>
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      </header>
      <main id="main" className="layout__main">
        <Outlet />
      </main>
      <Assistant />
    </div>
  )
}
