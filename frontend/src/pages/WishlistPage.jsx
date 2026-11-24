import { Link } from 'react-router-dom'
import { formatPrice } from '../features/catalog/api/productsApi'
import { useCart } from '../features/cart/CartContext'
import { useWishlist } from '../features/wishlist/WishlistContext'
import Button from '../components/Button'
import Icon from '../components/icons'

export default function WishlistPage() {
  const { items, loading, removeItem } = useWishlist()
  const { addItem } = useCart()

  return (
    <article className="desk">
      <h1>Wishlist</h1>
      {loading ? (
        <p className="desk__lead">Loading your saved items…</p>
      ) : items.length === 0 ? (
        <div className="wishlist-empty">
          <div className="wishlist-empty__mark" aria-hidden="true">
            <Icon name="heart" />
          </div>
          <h2>Nothing saved yet</h2>
          <p>Use the heart on a product to keep it here.</p>
          <Link className="btn btn--primary" to="/">
            Shop the catalog
          </Link>
        </div>
      ) : (
        <>
          <p className="desk__lead">Saved to your account.</p>
          <ul className="desk__lines">
            {items.map((item) => (
              <li key={item.id} className="cart-line">
                {item.image ? <img src={item.image} alt="" /> : <span className="cart-line__blank" />}
                <div>
                  <h2>
                    <Link to={`/products/${item.slug}`}>{item.name}</Link>
                  </h2>
                  <p className="wishlist__price">{formatPrice(Number(item.price))}</p>
                  <div className="wishlist__actions">
                    <Button type="button" onClick={() => addItem(item)}>
                      Add to cart
                    </Button>
                    <button type="button" className="desk__remove" onClick={() => removeItem(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </article>
  )
}
