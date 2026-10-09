import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { findProduct, type Product, type ProductType } from '../data/sampleProducts'

const CART_STORAGE_KEY = 'chotomua_cart'

export interface CartProductSnapshot {
  name: string
  price: number
  comparePrice?: number | null
  imageUrl?: string | null
  productType: ProductType
  thumbSeed: number
}

export interface CartLine {
  productId: string
  quantity: number
  variantId?: string
  variantLabel?: string
  availableQuantity?: number
  productSnapshot?: CartProductSnapshot
}

interface CartContextValue {
  lines: CartLine[]
  totalQuantity: number
  addItem: (productId: string, quantity?: number, details?: Omit<CartLine, 'productId' | 'quantity'>) => void
  removeItem: (lineKey: string) => void
  setQuantity: (lineKey: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY)
      return saved ? JSON.parse(saved) as CartLine[] : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines)) } catch { /* storage can be unavailable */ }
  }, [lines])

  const addItem = (productId: string, quantity = 1, details: Omit<CartLine, 'productId' | 'quantity'> = {}) => {
    const key = details.variantId ?? productId
    setLines((prev) => {
      const existing = prev.find((line) => (line.variantId ?? line.productId) === key)
      if (existing) {
        return prev.map((line) => (line.variantId ?? line.productId) === key
          ? { ...line, ...details, quantity: Math.min(line.quantity + quantity, details.availableQuantity ?? line.availableQuantity ?? Number.MAX_SAFE_INTEGER) }
          : line)
      }
      return [...prev, { productId, quantity: Math.min(quantity, details.availableQuantity ?? Number.MAX_SAFE_INTEGER), ...details }]
    })
  }

  const removeItem = (lineKey: string) => {
    setLines((prev) => prev.filter((line) => (line.variantId ?? line.productId) !== lineKey))
  }

  const setQuantity = (lineKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(lineKey)
      return
    }
    setLines((prev) => prev.map((line) => (line.variantId ?? line.productId) === lineKey
      ? { ...line, quantity: Math.min(quantity, line.availableQuantity ?? Number.MAX_SAFE_INTEGER) }
      : line))
  }

  const clearCart = () => setLines([])

  const totalQuantity = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines])

  const value = useMemo(
    () => ({ lines, totalQuantity, addItem, removeItem, setQuantity, clearCart }),
    [lines, totalQuantity],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export function useCartLinesWithProducts() {
  const { lines } = useCart()
  return lines
    .map((l) => {
      const sample = findProduct(l.productId)
      const product: Product | undefined = l.productSnapshot
        ? { id: l.productId, category: '', comparePrice: l.productSnapshot.comparePrice ?? l.productSnapshot.price,
          description: '', name: l.productSnapshot.name, price: l.productSnapshot.price,
          thumbSeed: l.productSnapshot.thumbSeed, imageUrl: l.productSnapshot.imageUrl ?? undefined,
          productType: l.productSnapshot.productType }
        : sample
      return product ? { ...l, lineKey: l.variantId ?? l.productId, product } : null
    })
    .filter((l): l is CartLine & { lineKey: string; product: Product } => l !== null)
}
