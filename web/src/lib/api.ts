export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * Thin fetch wrapper: JSON in/out, optional Bearer token, throws ApiError with
 * the backend's message field on non-2xx so callers can show it directly.
 */
export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    let message = `Lỗi ${res.status}`
    try {
      const body = await res.json()
      // Backend modules answer {message}; the CRM module answers {error:{code,message}}.
      if (body?.message) message = body.message
      else if (body?.error?.message) message = body.error.message
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ApiError(res.status, message)
  }

  // A write that changes what the storefront shows (catalogue edits, stock moved by an order) drops the cached reads.
  const method = (options.method ?? 'GET').toUpperCase()
  if (method !== 'GET' && (path.startsWith('/api/catalog') || path.startsWith('/orders'))) clearPublicCache()

  if (res.status === 204) return null as T
  return res.json() as Promise<T>
}

/**
 * Shared short-lived cache for PUBLIC catalogue reads (no token): several components of one page asking for the same
 * URL share a single request, and navigating back within the TTL needs no request at all. Same 30 s window as the
 * backend's storefront cache. Never use it for carts, orders, prices at checkout or anything per-user.
 */
const publicCache = new Map<string, { at: number; promise: Promise<unknown> }>()
const PUBLIC_TTL_MS = 30_000

export function cachedPublicFetch<T>(path: string): Promise<T> {
  const hit = publicCache.get(path)
  if (hit && Date.now() - hit.at < PUBLIC_TTL_MS) return hit.promise as Promise<T>
  const promise = apiFetch<T>(path).catch((error: unknown) => {
    publicCache.delete(path) // never keep a failure
    throw error
  })
  publicCache.set(path, { at: Date.now(), promise })
  return promise
}

/** Drop cached catalogue reads (after staff edited products/categories in this tab). */
export function clearPublicCache() {
  publicCache.clear()
}
