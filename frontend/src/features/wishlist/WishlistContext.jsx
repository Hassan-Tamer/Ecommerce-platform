import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/context/AuthContext'
import * as wishlistApi from './api/wishlistApi'

const WishlistContext = createContext(null)

function itemFromProduct(product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    image: product.images?.[0]?.url ?? product.image ?? null,
  }
}

export function WishlistProvider({ children }) {
  const { isAuthenticated, ready } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ready) return undefined
    if (!isAuthenticated) {
      setItems([])
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)
    wishlistApi
      .listWishlist({ signal: controller.signal })
      .then((data) => {
        const rows = data?.items ?? []
        setItems(rows.map(itemFromProduct))
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setItems([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [isAuthenticated, ready])

  const addItem = useCallback(async (product) => {
    const id = product.id
    let snapshot
    let skip = false
    setItems((current) => {
      snapshot = current
      if (current.some((item) => item.id === id)) {
        skip = true
        return current
      }
      return [...current, itemFromProduct(product)]
    })
    if (skip) return

    try {
      const saved = await wishlistApi.addToWishlist(id)
      setItems((current) => {
        if (!current.some((item) => item.id === id)) return current
        return current.map((item) => (item.id === id ? itemFromProduct(saved) : item))
      })
    } catch {
      setItems(snapshot)
    }
  }, [])

  const removeItem = useCallback(async (id) => {
    let snapshot
    setItems((current) => {
      snapshot = current
      return current.filter((item) => item.id !== id)
    })

    try {
      await wishlistApi.removeFromWishlist(id)
    } catch {
      setItems(snapshot)
    }
  }, [])

  const toggleItem = useCallback(
    async (product) => {
      let saved = false
      setItems((current) => {
        saved = current.some((item) => item.id === product.id)
        return current
      })
      if (saved) await removeItem(product.id)
      else await addItem(product)
    },
    [addItem, removeItem],
  )

  const hasItem = useCallback((id) => items.some((item) => item.id === id), [items])

  const reload = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([])
      return
    }
    const data = await wishlistApi.listWishlist()
    setItems((data?.items ?? []).map(itemFromProduct))
  }, [isAuthenticated])

  const value = useMemo(
    () => ({ items, count: items.length, loading, addItem, removeItem, toggleItem, hasItem, reload }),
    [items, loading, addItem, removeItem, toggleItem, hasItem, reload],
  )

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used within WishlistProvider')
  return context
}