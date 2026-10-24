import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ProductType } from '../lib/catalog'

/** What a cart line shows about its product — all of it from the cart API (GET /cart-items). */
export interface CartProduct {
  id: string
  name: string
  price: number
  comparePrice: number
  thumbSeed: number
  imageUrl?: string
  productType: ProductType
}
import { apiFetch, ApiError } from '../lib/api'
import { useAuth } from './AuthContext'
import {
  CartCenteredToast,
  FlyAnimationOverlay,
  emitCartToast,
  emitFlyAnimation,
} from '../components/AddToCartModalAndFly'

interface CartItemApiResponse {
  id: string
  variantId: string
  productName: string | null
  productType: string | null
  imageUrl: string | null
  unitPrice: number | null
  attributesJson: string | null
  quantity: number
  isSelected: boolean
  available: boolean
  availableQuantity: number
  updatedAt: string
}

export interface CartLine {
  id: string
  productId: string
  variantId: string
  quantity: number
  isSelected: boolean
  available: boolean
  availableQuantity: number | null
  source: 'api'
  product: CartProduct
}

interface CartContextValue {
  lines: CartLine[]
  totalQuantity: number
  isLoading: boolean
  error: string | null
  busyIds: ReadonlySet<string>
  addItem: (variantId: string, quantity?: number) => Promise<boolean>
  removeItem: (lineId: string) => Promise<void>
  removeSelected: () => Promise<void>
  setQuantity: (lineId: string, quantity: number) => Promise<void>
  setSelected: (lineId: string, selected: boolean) => Promise<void>
  selectAll: (selected: boolean) => Promise<void>
  buyNow: (variantId: string, quantity?: number) => Promise<boolean>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
  showToast: (title: string, subtitle?: string) => void
  triggerFlyAnimation: (startRect: DOMRect, imageUrl?: string) => void
  isBumping: boolean
}

const CartContext = createContext<CartContextValue | null>(null)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeProductType(value: string | null): ProductType {
  return value === 'game_disc' || value === 'controller' ? value : 'accessory'
}

function seedFromId(value: string) {
  return [...value].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 6
}

function apiLine(item: CartItemApiResponse): CartLine {
  const price = Number(item.unitPrice ?? 0)
  return {
    id: item.id,
    productId: item.variantId,
    variantId: item.variantId,
    quantity: item.quantity,
    isSelected: item.isSelected,
    available: item.available,
    availableQuantity: item.availableQuantity,
    source: 'api',
    product: {
      id: item.variantId,
      name: item.productName ?? 'Sản phẩm không còn tồn tại',
      price,
      comparePrice: price,
      thumbSeed: seedFromId(item.variantId),
      imageUrl: item.imageUrl ?? undefined,
      productType: normalizeProductType(item.productType),
    },
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { token: authToken, user } = useAuth()
  // /cart-items is buyer-only on the backend; staff sessions have no cart (would just 403).
  const token = user?.role === 'buyer' ? authToken : null
  const [apiLines, setApiLines] = useState<CartLine[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [isBumping, setIsBumping] = useState(false)

  const showToast = useCallback((title: string, subtitle?: string) => {
    emitCartToast(title, subtitle)
  }, [])

  const triggerFlyAnimation = useCallback((startRect: DOMRect, imageUrl?: string) => {
    emitFlyAnimation(startRect, imageUrl)
  }, [])

  const triggerBump = useCallback(() => {
    setIsBumping(true)
    setTimeout(() => setIsBumping(false), 400)
  }, [])

  const refreshCart = useCallback(async () => {
    if (!token) {
      setApiLines([])
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const items = await apiFetch<CartItemApiResponse[]>('/cart-items', {}, token)
      setApiLines(items.map(apiLine))
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không tải được giỏ hàng'))
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    void refreshCart()
  }, [refreshCart])

  const markBusy = (id: string, busy: boolean) => {
    setBusyIds((current) => {
      const next = new Set(current)
      if (busy) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const addItem = async (variantId: string, quantity = 1) => {
    setError(null)

    if (!token) {
      setError('Vui lòng đăng nhập trước khi thêm sản phẩm vào giỏ hàng')
      return false
    }
    if (!UUID_PATTERN.test(variantId)) {
      setError('Biến thể sản phẩm không hợp lệ')
      return false
    }

    markBusy(variantId, true)
    try {
      const item = await apiFetch<CartItemApiResponse>('/cart-items', {
        method: 'POST',
        body: JSON.stringify({ variantId, quantity }),
      }, token)
      const line = apiLine(item)
      setApiLines((current) => [...current.filter((entry) => entry.id !== line.id), line])
      return true
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể thêm sản phẩm vào giỏ hàng'))
      return false
    } finally {
      markBusy(variantId, false)
    }
  }

  const removeItem = async (lineId: string) => {
    if (!token) return

    markBusy(lineId, true)
    setError(null)
    try {
      await apiFetch(`/cart-items/${lineId}`, { method: 'DELETE' }, token)
      setApiLines((current) => current.filter((line) => line.id !== lineId))
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể xoá sản phẩm khỏi giỏ hàng'))
    } finally {
      markBusy(lineId, false)
    }
  }

  const removeSelected = async () => {
    if (!token) return
    const targets = apiLines.filter((line) => line.isSelected)
    if (targets.length === 0) return

    setError(null)
    targets.forEach((line) => markBusy(line.id, true))
    // Optimistic remove
    const targetIds = new Set(targets.map((t) => t.id))
    setApiLines((current) => current.filter((l) => !targetIds.has(l.id)))

    try {
      await Promise.allSettled(
        targets.map((line) => apiFetch(`/cart-items/${line.id}`, { method: 'DELETE' }, token))
      )
    } catch {
      void refreshCart()
    } finally {
      targets.forEach((line) => markBusy(line.id, false))
    }
  }

  const setQuantity = async (lineId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(lineId)
      return
    }

    if (!token) return

    markBusy(lineId, true)
    setError(null)
    try {
      const item = await apiFetch<CartItemApiResponse>(`/cart-items/${lineId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity }),
      }, token)
      const line = apiLine(item)
      setApiLines((current) => current.map((entry) => (entry.id === lineId ? line : entry)))
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể cập nhật số lượng'))
    } finally {
      markBusy(lineId, false)
    }
  }

  const setSelected = async (lineId: string, selected: boolean) => {
    if (!token) return

    markBusy(lineId, true)
    setError(null)
    try {
      const item = await apiFetch<CartItemApiResponse>(`/cart-items/${lineId}/selection`, {
        method: 'PATCH',
        body: JSON.stringify({ isSelected: selected }),
      }, token)
      const line = apiLine(item)
      setApiLines((current) => current.map((entry) => (entry.id === lineId ? line : entry)))
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể cập nhật lựa chọn'))
    } finally {
      markBusy(lineId, false)
    }
  }

  const selectAll = async (selected: boolean) => {
    if (!token) return

    const targets = apiLines.filter((l) => {
      if (selected) {
        return l.available && (l.availableQuantity === null || l.quantity <= l.availableQuantity)
      }
      return true
    })

    // Optimistic update
    setApiLines((current) =>
      current.map((line) => {
        if (selected && (!line.available || (line.availableQuantity !== null && line.quantity > line.availableQuantity))) {
          return line
        }
        return { ...line, isSelected: selected }
      })
    )

    try {
      await Promise.allSettled(
        targets
          .filter((line) => line.isSelected !== selected)
          .map((line) =>
            apiFetch<CartItemApiResponse>(
              `/cart-items/${line.id}/selection`,
              {
                method: 'PATCH',
                body: JSON.stringify({ isSelected: selected }),
              },
              token
            )
          )
      )
    } catch {
      void refreshCart()
    }
  }

  const buyNow = async (variantId: string, quantity = 1) => {
    if (!token) return false
    if (!UUID_PATTERN.test(variantId)) return false

    try {
      // 1. Ensure item is added
      await apiFetch<CartItemApiResponse>('/cart-items', {
        method: 'POST',
        body: JSON.stringify({ variantId, quantity }),
      }, token)

      // 2. Fetch fresh cart list
      const items = await apiFetch<CartItemApiResponse[]>('/cart-items', {}, token)
      const linesData = items.map(apiLine)

      // 3. Mark target variant as selected, all other items as unselected
      await Promise.allSettled(
        linesData.map((line) => {
          const shouldSelect = line.variantId === variantId
          if (line.isSelected !== shouldSelect) {
            return apiFetch<CartItemApiResponse>(
              `/cart-items/${line.id}/selection`,
              {
                method: 'PATCH',
                body: JSON.stringify({ isSelected: shouldSelect }),
              },
              token
            )
          }
          return Promise.resolve(null)
        })
      )

      // 4. Update local state
      setApiLines(
        linesData.map((line) => ({
          ...line,
          isSelected: line.variantId === variantId,
        }))
      )

      return true
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể xử lý yêu cầu Mua ngay'))
      return false
    }
  }

  const clearCart = async () => {
    if (!token) return
    const ids = apiLines.map((line) => line.id)
    await Promise.all(ids.map((id) => apiFetch(`/cart-items/${id}`, { method: 'DELETE' }, token)))
    setApiLines([])
  }

  const lines = useMemo(() => apiLines, [apiLines])
  const totalQuantity = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines])
  const value: CartContextValue = {
    lines,
    totalQuantity,
    isLoading,
    error,
    busyIds,
    addItem,
    removeItem,
    removeSelected,
    setQuantity,
    setSelected,
    selectAll,
    buyNow,
    clearCart,
    refreshCart,
    showToast,
    triggerFlyAnimation,
    isBumping,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartCenteredToast />
      <FlyAnimationOverlay onBump={triggerBump} />
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}

export function useCartLinesWithProducts() {
  return useCart().lines
}
