import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { findProduct } from '../data/sampleProducts'

export interface CartLine {
  productId: string
  quantity: number
}

interface CartContextValue {
  lines: CartLine[]
  totalQuantity: number
  addItem: (productId: string, quantity?: number) => void
  removeItem: (productId: string) => void
  setQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([])

  const addItem = (productId: string, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId)
      if (existing) {
        return prev.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l))
      }
      return [...prev, { productId, quantity }]
    })
  }

  const removeItem = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId))
  }

  const setQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)))
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
      const product = findProduct(l.productId)
      return product ? { ...l, product } : null
    })
    .filter((l): l is { productId: string; quantity: number; product: NonNullable<ReturnType<typeof findProduct>> } => l !== null)
}
