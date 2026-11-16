import { useCallback, useState } from 'react'
import { useAuth } from '../../state/AuthContext'

/**
 * Trạng thái của thanh tìm kiếm quản trị: từ khoá tìm gần đây, từ khoá ghim (tối đa 3) và bản ghi đã xem gần đây.
 * Chỉ lưu trong trình duyệt của từng nhân viên (localStorage, theo user + trang).
 */

export const MAX_PINNED = 3
const MAX_RECENT = 5
const MAX_VIEWED = 6

function storageKey(userId: string | undefined, page: string, kind: string) {
  return `chotomua_${kind}_${userId ?? 'anon'}_${page}`
}

function readList<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeList(key: string, value: unknown[]) {
  try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* trình duyệt chặn lưu trữ: bỏ qua */ }
}

function usePersistentList<T>(page: string, kind: string) {
  const { user } = useAuth()
  const key = storageKey(user?.id, page, kind)
  // Đổi tài khoản / trang thì đọc lại danh sách của khoá mới ngay khi render (không cần effect).
  const [state, setState] = useState(() => ({ key, items: readList<T>(key) }))
  const items = state.key === key ? state.items : readList<T>(key)
  const update = useCallback((fn: (current: T[]) => T[]) => {
    setState((current) => {
      const next = fn(current.key === key ? current.items : readList<T>(key))
      writeList(key, next)
      return { key, items: next }
    })
  }, [key])
  return [items, update] as const
}

/** Từ khoá đã tìm gần đây và từ khoá đã ghim của một trang. */
export function useSavedSearches(page: string) {
  const [recent, setRecent] = usePersistentList<string>(page, 'search_recent')
  const [pinned, setPinned] = usePersistentList<string>(page, 'search_pinned')

  const remember = useCallback((term: string) => {
    const t = term.trim()
    if (t.length < 2) return
    setRecent((list) => [t, ...list.filter((x) => x !== t)].slice(0, MAX_RECENT))
  }, [setRecent])

  /** Ghim / bỏ ghim. Trả về false khi đã đủ 3 ghim. */
  const togglePin = useCallback((term: string) => {
    const t = term.trim()
    if (!t) return true
    if (!pinned.includes(t) && pinned.length >= MAX_PINNED) return false
    setPinned((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t].slice(0, MAX_PINNED)))
    return true
  }, [pinned, setPinned])

  const forget = useCallback((term: string) => setRecent((list) => list.filter((x) => x !== term)), [setRecent])

  return { recent, pinned, remember, togglePin, forget }
}

export type ViewMode = 'list' | 'grid'

/** Kiểu Danh sách / Lưới của một trang, nhớ trong trình duyệt. */
export function useViewMode(page: string) {
  const key = `chotomua_layout_${page}`
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(key) === 'grid' ? 'grid' : 'list'
    } catch {
      return 'list'
    }
  })
  const choose = useCallback((next: ViewMode) => {
    setMode(next)
    try { localStorage.setItem(key, next) } catch { /* trình duyệt chặn lưu trữ */ }
  }, [key])
  return [mode, choose] as const
}

export interface ViewedItem { id: string; label: string }

/** Bản ghi đã mở gần đây (khách hàng, đơn hàng, ticket…). */
export function useRecentViews(page: string) {
  const [items, setItems] = usePersistentList<ViewedItem>(page, 'viewed')
  const push = useCallback((id: string, label: string) => {
    setItems((list) => [{ id, label }, ...list.filter((x) => x.id !== id)].slice(0, MAX_VIEWED))
  }, [setItems])
  const clear = useCallback(() => setItems(() => []), [setItems])
  return { items, push, clear }
}


/** Không dấu, chữ thường — để tìm "nguyen" ra "Nguyễn". */
export function normalize(text: string | null | undefined) {
  return (text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim()
}

export function matches(term: string, ...fields: Array<string | number | null | undefined>) {
  const t = normalize(term)
  if (!t) return true
  return fields.some((f) => normalize(f == null ? '' : String(f)).includes(t))
}
