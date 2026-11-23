import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const [items, setItems] = useState([])

  const addItem = useCallback((product) => {
    setItems((current) => {
      if (current.some((item) => item.id === product.id)) return current
      return [
        ...current,
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.images?.[0]?.url ?? product.image ?? null,
        },
      ]
    })
  }, [])

  const removeItem = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const toggleItem = useCallback((product) => {
    setItems((current) => {
      if (current.some((item) => item.id === product.id)) {
        return current.filter((item) => item.id !== product.id)
      }
      return [
        ...current,
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.images?.[0]?.url ?? product.image ?? null,
        },
      ]
    })
  }, [])

  const hasItem = useCallback((id) => items.some((item) => item.id === id), [items])

  const value = useMemo(
    () => ({ items, count: items.length, addItem, removeItem, toggleItem, hasItem }),
    [items, addItem, removeItem, toggleItem, hasItem],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used within WishlistProvider')
  return context
}
