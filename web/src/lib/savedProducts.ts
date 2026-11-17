import { useCallback, useSyncExternalStore } from 'react'
import { useAuth } from '../state/AuthContext'
import type { ProductType } from './catalog'

/**
 * "Yêu thích" and "Đã xem gần đây", kept in this browser per account (guests share one list).
 * Stored client-side on purpose: it needs no new table or migration on the shared database.
 */
export interface SavedProduct {
  id: string
  name: string
  price: number | null
  comparePrice: number | null
  imageUrl: string | null
  productType: ProductType
  /** When it was favourited or last viewed (ms). */
  at: number
}

type ListName = 'favorites' | 'recent'
const LIMIT: Record<ListName, number> = { favorites: 100, recent: 20 }
const EMPTY: SavedProduct[] = []

const keyFor = (list: ListName, userId: string | null | undefined) => `ctm:${list}:${userId ?? 'guest'}`

// Cache of parsed lists so useSyncExternalStore gets a stable snapshot between writes.
const cache = new Map<string, SavedProduct[]>()
const listeners = new Set<() => void>()

function read(key: string): SavedProduct[] {
  const hit = cache.get(key)
  if (hit) return hit
  let value: SavedProduct[] = EMPTY
  try {
    const raw = localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed)) value = parsed.filter((p) => p && typeof p.id === 'string')
  } catch {
    value = EMPTY // private mode, blocked storage or a corrupt entry: behave as empty
  }
  cache.set(key, value)
  return value
}

function write(key: string, value: SavedProduct[]) {
  cache.set(key, value)
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage full or blocked: keep it in memory */ }
  listeners.forEach((notify) => notify())
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  // Another tab changed a list: drop the cache so the next read sees it.
  const onStorage = (e: StorageEvent) => { if (e.key?.startsWith('ctm:')) { cache.delete(e.key); notify() } }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(notify); window.removeEventListener('storage', onStorage) }
}

function useList(list: ListName) {
  const { user } = useAuth()
  const key = keyFor(list, user?.id)
  const items = useSyncExternalStore(subscribe, () => read(key), () => EMPTY)
  return { key, items }
}

/** Puts the product first (newest), without duplicates, trimmed to the list size. */
function upsert(key: string, list: ListName, product: Omit<SavedProduct, 'at'>) {
  const rest = read(key).filter((p) => p.id !== product.id)
  write(key, [{ ...product, at: Date.now() }, ...rest].slice(0, LIMIT[list]))
}

export function useFavorites() {
  const { key, items } = useList('favorites')
  const isFavorite = useCallback((id: string) => items.some((p) => p.id === id), [items])
  const toggle = useCallback((product: Omit<SavedProduct, 'at'>) => {
    if (read(key).some((p) => p.id === product.id)) write(key, read(key).filter((p) => p.id !== product.id))
    else upsert(key, 'favorites', product)
  }, [key])
  const remove = useCallback((id: string) => write(key, read(key).filter((p) => p.id !== id)), [key])
  return { items, isFavorite, toggle, remove }
}

export function useRecentlyViewed() {
  const { key, items } = useList('recent')
  const record = useCallback((product: Omit<SavedProduct, 'at'>) => upsert(key, 'recent', product), [key])
  const clear = useCallback(() => write(key, EMPTY), [key])
  const remove = useCallback((id: string) => write(key, read(key).filter((p) => p.id !== id)), [key])
  return { items, record, clear, remove }
}
