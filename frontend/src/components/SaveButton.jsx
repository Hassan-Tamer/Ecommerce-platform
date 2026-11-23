import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/context/AuthContext'
import { useWishlist } from '../features/wishlist/WishlistContext'
import Icon from './icons'

export default function SaveButton({ product, compact = false }) {
  const { isAuthenticated } = useAuth()
  const { toggleItem, hasItem } = useWishlist()
  const navigate = useNavigate()
  const location = useLocation()
  const saved = hasItem(product.id)

  function onClick() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
      return
    }
    toggleItem(product)
  }

  return (
    <button
      type="button"
      className={compact ? 'save save--icon' : 'save'}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name}`}
      onClick={onClick}
    >
      <Icon name="heart" />
      {compact ? null : <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  )
}
