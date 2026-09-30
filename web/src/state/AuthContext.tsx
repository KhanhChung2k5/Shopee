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
  login: (emailOrPhone: string, password: string) => Promise<void>
  register: (email: string, phone: string, password: string, fullName: string) => Promise<void>
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
    }
  }, [])

  const persist = (data: AuthResponse) => {
    const nextUser: AuthUser = { id: data.userId, role: data.role, fullName: data.fullName, department: data.department }
    setToken(data.token)
    setUser(nextUser)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: data.token, user: nextUser }))
    } catch {
      // ignore — session still works in-memory for this tab
    }
  }

  const login = async (emailOrPhone: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrPhone, password }),
    })
    persist(data)
  }

  const register = async (email: string, phone: string, password: string, fullName: string) => {
    const data = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, phone: phone || null, password, fullName }),
    })
    persist(data)
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
    () => ({ token, user, isAuthenticated: token !== null, login, register, logout }),
    [token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
