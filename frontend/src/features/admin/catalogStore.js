import { useSyncExternalStore } from 'react'

const INITIAL = [
  {
    id: 1,
    name: 'Linen market tote',
    price: 28,
    description: 'A washed linen tote with a flat base for market runs.',
    images: [],
    active: true,
    stock: 14,
    alertAt: 5,
  },
  {
    id: 2,
    name: 'Brass desk lamp',
    price: 64,
    description: 'A small brass lamp for a desk, with a linen shade.',
    images: [],
    active: true,
    stock: 6,
    alertAt: 6,
  },
  {
    id: 3,
    name: 'Gold hoop earrings',
    price: 36,
    description: 'Lightweight hoops in a warm gold finish.',
    images: [],
    active: true,
    stock: 1,
    alertAt: 3,
  },
  {
    id: 4,
    name: 'Ceramic pour-over',
    price: 42,
    description: 'Stoneware pour-over sized for one or two cups.',
    images: [],
    active: true,
    stock: 9,
    alertAt: 4,
  },
  {
    id: 5,
    name: 'Wool throw blanket',
    price: 88,
    description: 'A soft wool throw in a natural oat color.',
    images: [],
    active: false,
    stock: 0,
    alertAt: 2,
  },
  {
    id: 6,
    name: 'Cedar soap dish',
    price: 18,
    description: 'A small cedar dish for a bar of soap.',
    images: [],
    active: true,
    stock: 22,
    alertAt: 6,
  },
]

let products = INITIAL
let nextId = INITIAL.length + 1
const listeners = new Set()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getProducts() {
  return products
}

export function useCatalog() {
  return useSyncExternalStore(subscribe, getProducts, getProducts)
}

export function isLowStock(product) {
  return product.stock <= product.alertAt
}

export function addCatalogProduct(fields) {
  const product = {
    id: nextId,
    name: fields.name,
    price: fields.price,
    description: fields.description,
    images: fields.images,
    active: true,
    stock: 0,
    alertAt: 5,
  }
  nextId += 1
  products = [...products, product]
  emit()
  return product
}

export function saveCatalogProduct(id, fields) {
  products = products.map((product) =>
    product.id === id
      ? {
          ...product,
          name: fields.name,
          price: fields.price,
          description: fields.description,
          images: fields.images,
        }
      : product,
  )
  emit()
}

export function deleteCatalogProduct(id) {
  products = products.filter((product) => product.id !== id)
  emit()
}

export function saveInventory(id, { add, alertAt }) {
  products = products.map((product) =>
    product.id === id
      ? { ...product, stock: product.stock + add, alertAt }
      : product,
  )
  emit()
}
