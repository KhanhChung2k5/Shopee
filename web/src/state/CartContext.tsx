import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { findProduct, type Product, type ProductType } from '../data/sampleProducts'
import { demoVariantIdForProduct, isP3DemoMode } from '../demo/p3DemoApi'
import { apiFetch, ApiError } from '../lib/api'
import { useAuth } from './AuthContext'

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
  updatedAt: string
}

export interface CartLine {
  id: string
  productId: string
  variantId: string
  quantity: number
  isSelected: boolean
  available: boolean
  source: 'api' | 'sample'
  product: Product
}

interface CartContextValue {
  lines: CartLine[]
  totalQuantity: number
  isLoading: boolean
  error: string | null
  busyIds: ReadonlySet<string>
  addItem: (variantId: string, quantity?: number) => Promise<void>
  removeItem: (lineId: string) => Promise<void>
  setQuantity: (lineId: string, quantity: number) => Promise<void>
  setSelected: (lineId: string, selected: boolean) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
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
    source: 'api',
    product: {
      id: item.variantId,
      name: item.productName ?? 'Sản phẩm không còn tồn tại',
      price,
      comparePrice: price,
      thumbSeed: seedFromId(item.variantId),
      imageUrl: item.imageUrl ?? undefined,
      productType: normalizeProductType(item.productType),
      category: '',
    },
  }
}

function sampleLine(product: Product, quantity: number): CartLine {
  return {
    id: `sample:${product.id}`,
    productId: product.id,
    variantId: product.id,
    quantity,
    isSelected: true,
    available: true,
    source: 'sample',
    product,
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [apiLines, setApiLines] = useState<CartLine[]>([])
  const [sampleLines, setSampleLines] = useState<CartLine[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())

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

    // P3-DEMO-INTEGRATION-SEAM: P2's current sample IDs are not UUIDs. Only
    // demo mode maps them; production keeps requiring a real Catalog variant.
    const requestVariantId = isP3DemoMode()
      ? demoVariantIdForProduct(variantId) ?? variantId
      : variantId

    // Temporary compatibility path for P2's mock catalog. Once P2 supplies
    // real variant UUIDs, this same call automatically uses the Cart API.
    if (!token || !UUID_PATTERN.test(requestVariantId)) {
      const product = findProduct(variantId)
      if (!product) {
        setError('Không tìm thấy sản phẩm để thêm vào giỏ hàng')
        return
      }
      setSampleLines((current) => {
        const existing = current.find((line) => line.variantId === variantId)
        if (!existing) return [...current, sampleLine(product, quantity)]
        return current.map((line) =>
          line.id === existing.id ? { ...line, quantity: line.quantity + quantity } : line,
        )
      })
      return
    }

    markBusy(variantId, true)
    try {
      const item = await apiFetch<CartItemApiResponse>('/cart-items', {
        method: 'POST',
        body: JSON.stringify({ variantId: requestVariantId, quantity }),
      }, token)
      const line = apiLine(item)
      setApiLines((current) => [...current.filter((entry) => entry.id !== line.id), line])
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể thêm sản phẩm vào giỏ hàng'))
    } finally {
      markBusy(variantId, false)
    }
  }

  const removeItem = async (lineId: string) => {
    const sample = sampleLines.some((line) => line.id === lineId)
    if (sample) {
      setSampleLines((current) => current.filter((line) => line.id !== lineId))
      return
    }
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

  const setQuantity = async (lineId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(lineId)
      return
    }

    const sample = sampleLines.some((line) => line.id === lineId)
    if (sample) {
      setSampleLines((current) => current.map((line) => line.id === lineId ? { ...line, quantity } : line))
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
      setApiLines((current) => current.map((entry) => entry.id === lineId ? line : entry))
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể cập nhật số lượng'))
    } finally {
      markBusy(lineId, false)
    }
  }

  const setSelected = async (lineId: string, selected: boolean) => {
    const sample = sampleLines.some((line) => line.id === lineId)
    if (sample) {
      setSampleLines((current) => current.map((line) => line.id === lineId ? { ...line, isSelected: selected } : line))
      return
    }
    if (!token) return

    markBusy(lineId, true)
    setError(null)
    try {
      const item = await apiFetch<CartItemApiResponse>(`/cart-items/${lineId}/selection`, {
        method: 'PATCH',
        body: JSON.stringify({ isSelected: selected }),
      }, token)
      const line = apiLine(item)
      setApiLines((current) => current.map((entry) => entry.id === lineId ? line : entry))
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể cập nhật lựa chọn'))
    } finally {
      markBusy(lineId, false)
    }
  }

  const clearCart = async () => {
    setSampleLines([])
    if (!token) return
    const ids = apiLines.map((line) => line.id)
    await Promise.all(ids.map((id) => apiFetch(`/cart-items/${id}`, { method: 'DELETE' }, token)))
    setApiLines([])
  }

  const lines = useMemo(() => [...apiLines, ...sampleLines], [apiLines, sampleLines])
  const totalQuantity = useMemo(() => lines.reduce((sum, line) => sum + line.quantity, 0), [lines])
  const value: CartContextValue = {
    lines,
    totalQuantity,
    isLoading,
    error,
    busyIds,
    addItem,
    removeItem,
    setQuantity,
    setSelected,
    clearCart,
    refreshCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}

export function useCartLinesWithProducts() {
  return useCart().lines
}
