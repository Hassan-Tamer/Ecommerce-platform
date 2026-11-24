import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/context/AuthContext'
import * as cartApi from './api/cartApi'

const CartContext = createContext(null)

function itemFromCartLine(line) {
  const product = line.product
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: Number(line.unit_price ?? product.price),
    image: product.images?.[0]?.url ?? product.image ?? null,
    quantity: line.quantity,
    stockQuantity: product.stock_quantity ?? null,
  }
}

function itemFromProduct(product, quantity = 1) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: Number(product.price),
    image: product.images?.[0]?.url ?? product.image ?? null,
    quantity,
    stockQuantity: product.stock_quantity ?? null,
  }
}

function stockCap(item) {
  return item?.stockQuantity ?? null
}

function canReachQuantity(items, productId, targetQuantity, catalogStock) {
  const existing = items.find((item) => item.id === productId)
  const max = stockCap(existing) ?? catalogStock ?? null
  if (max == null) return true
  return targetQuantity <= max
}

async function replaceItemsFromServer(setItems) {
  try {
    const data = await cartApi.listCart()
    const rows = data?.items ?? []
    setItems(rows.map(itemFromCartLine))
  } catch {
  }
}

export function CartProvider({ children }) {
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
    cartApi
      .listCart({ signal: controller.signal })
      .then((data) => {
        const rows = data?.items ?? []
        setItems(rows.map(itemFromCartLine))
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

  const removeItem = useCallback(async (id) => {
    let snapshot
    setItems((current) => {
      snapshot = current
      return current.filter((item) => item.id !== id)
    })

    try {
      await cartApi.removeCartItem(id)
    } catch {
      setItems(snapshot)
    }
  }, [])

  const addItem = useCallback(async (product) => {
    const id = product.id
    const catalogStock = product.stock_quantity ?? null
    let snapshot
    let skip = false

    setItems((current) => {
      snapshot = current
      const existing = current.find((item) => item.id === id)
      const nextQty = (existing?.quantity ?? 0) + 1
      if (!canReachQuantity(current, id, nextQty, catalogStock)) {
        skip = true
        return current
      }
      if (existing) {
        return current.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      }
      return [...current, itemFromProduct(product, 1)]
    })
    if (skip) return

    try {
      const line = await cartApi.addCartItem(id, 1)
      setItems((current) => {
        const mapped = itemFromCartLine(line)
        if (!current.some((item) => item.id === id)) return current
        return current.map((item) => (item.id === id ? mapped : item))
      })
    } catch (err) {
      setItems(snapshot)
      if (err.status === 409) await replaceItemsFromServer(setItems)
    }
  }, [])

  const setQuantity = useCallback(
    async (id, quantity) => {
      if (quantity <= 0) {
        await removeItem(id)
        return
      }

      let snapshot
      let skip = false
      setItems((current) => {
        snapshot = current
        if (!canReachQuantity(current, id, quantity, null)) {
          skip = true
          return current
        }
        return current.map((item) => (item.id === id ? { ...item, quantity } : item))
      })
      if (skip) return

      try {
        const line = await cartApi.updateCartItem(id, quantity)
        setItems((current) =>
          current.map((item) => (item.id === id ? itemFromCartLine(line) : item)),
        )
      } catch (err) {
        setItems(snapshot)
        if (err.status === 409) await replaceItemsFromServer(setItems)
      }
    },
    [removeItem],
  )

  const count = items.reduce((sum, item) => sum + item.quantity, 0)

  const value = useMemo(
    () => ({ items, count, loading, addItem, setQuantity, removeItem }),
    [items, count, loading, addItem, setQuantity, removeItem],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}