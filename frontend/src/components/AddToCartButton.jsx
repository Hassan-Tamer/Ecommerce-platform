import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/context/AuthContext'
import { useCart } from '../features/cart/CartContext'

export default function AddToCartButton({ product }) {
  const { isAuthenticated } = useAuth()
  const { addItem } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [added, setAdded] = useState(false)

  function onClick() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
      return
    }
    addItem(product)
    setAdded(true)
  }

  return (
    <button type="button" className="add-cart" onClick={onClick}>
      {added ? 'Added to cart' : 'Add to cart'}
    </button>
  )
}
