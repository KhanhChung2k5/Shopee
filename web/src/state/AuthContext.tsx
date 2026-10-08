import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiFetch } from '../lib/api'

export interface AuthUser {
  id: string
  role: string
  fullName: string
  department: string | null
}

interface AuthContextValue {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  /** False until the initial localStorage read completes — guards (RequireStaff etc.)
   *  must wait for this before deciding to redirect, otherwise they see the pre-hydration
   *  `user === null` and bounce an already-logged-in visitor to /dang-nhap. */
  ready: boolean
  login: (emailOrPhone: string, password: string) => Promise<AuthUser>
  register: (email: string, phone: string, password: string, fullName: string) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'chotomua_auth'

interface AuthResponse {
  token: string
  userId: string
  role: string
  fullName: string
  department: string | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { token: string; user: AuthUser }
        setToken(parsed.token)
        setUser(parsed.user)
      }
    } catch {
      // corrupted/blocked storage — just start logged out
    } finally {
      setReady(true)
    }
  }, [])

  const persist = (data: AuthResponse): AuthUser => {
    const nextUser: AuthUser = { id: data.userId, role: data.role, fullName: data.fullName, department: data.department }
    setToken(data.token)
    setUser(nextUser)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token, user: nextUser }))
    } catch {
      // ignore — session still works in-memory for this tab
    }
    return nextUser
  }

  // Returns the logged-in user so callers (LoginPage) can decide where to
  // navigate based on role/department without racing React's state update.
  const login = async (emailOrPhone: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, password }),
    })
    return persist(data)
  }

  const register = async (email: string, phone: string, password: string, fullName: string) => {
    const data = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, phone: phone || null, password, fullName }),
    })
    return persist(data)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({ token, user, isAuthenticated: token !== null, ready, login, register, logout }),
    [token, user, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
