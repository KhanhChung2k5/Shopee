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
      if (body?.message) message = body.message
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return null as T
  return res.json() as Promise<T>
}
