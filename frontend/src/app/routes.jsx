import { Route, Routes } from 'react-router-dom'
import Layout from '../components/Layout'
import RequireAuth from '../components/RequireAuth'
import LoginPage from '../features/auth/pages/LoginPage'
import RegisterPage from '../features/auth/pages/RegisterPage'
import AccountPage from '../pages/AccountPage'
import AdminPage from '../pages/AdminPage'
import AdminInventoryPage from '../pages/AdminInventoryPage'
import AdminProductsPage from '../pages/AdminProductsPage'
import CartPage from '../pages/CartPage'
import CheckoutPage from '../pages/CheckoutPage'
import HomePage from '../pages/HomePage'
import OrdersPage from '../pages/OrdersPage'
import ProductPage from '../pages/ProductPage'
import WishlistPage from '../pages/WishlistPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="products/:slug" element={<ProductPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="account" element={<RequireAuth><AccountPage /></RequireAuth>} />
        <Route path="cart" element={<RequireAuth><CartPage /></RequireAuth>} />
        <Route path="wishlist" element={<RequireAuth><WishlistPage /></RequireAuth>} />
        <Route path="checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
        <Route path="orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="admin/products" element={<AdminProductsPage />} />
        <Route path="admin/inventory" element={<AdminInventoryPage />} />
      </Route>
    </Routes>
  )
}