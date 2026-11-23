import { AuthProvider } from '../features/auth/context/AuthContext'
import { CartProvider } from '../features/cart/CartContext'
import { WishlistProvider } from '../features/wishlist/WishlistContext'

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </CartProvider>
    </AuthProvider>
  )
}