import { isP3DemoMode, P3DemoError, p3DemoFetch } from '../demo/p3DemoApi'

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
  // P3-DEMO-INTEGRATION-SEAM: remove this branch after P1/P2/P4/P5 APIs are
  // integrated. The rest of the app remains on the same apiFetch contract.
  if (isP3DemoMode()) {
    try {
      return await p3DemoFetch<T>(path, options)
    } catch (error) {
      if (error instanceof P3DemoError) throw new ApiError(error.status, error.message)
      throw error
    }
  }

  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    let message = `Lỗi ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) message = body.message
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return null as T
  return res.json() as Promise<T>
}
