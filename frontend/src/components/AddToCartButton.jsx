import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/context/AuthContext'
import { useCart } from '../features/cart/CartContext'

export default function AddToCartButton({ product }) {
  const { isAuthenticated } = useAuth()
  const { items, addItem } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [added, setAdded] = useState(false)

  const inCart = items.find((item) => item.id === product.id)
  const stock = inCart?.stockQuantity ?? product.stock_quantity ?? null
  const cartQty = inCart?.quantity ?? 0
  const outOfStock = stock === 0
  const atMax = stock != null && cartQty >= stock

  function onClick() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
      return
    }
    if (outOfStock || atMax) return
    addItem(product)
    setAdded(true)
  }

  let label = 'Add to cart'
  if (added) label = 'Added to cart'
  else if (outOfStock) label = 'Out of stock'
  else if (atMax) label = 'Max in cart'

  return (
    <button
      type="button"
      className="add-cart"
      onClick={onClick}
      disabled={isAuthenticated && (outOfStock || atMax)}
    >
      {label}
    </button>
  )
}