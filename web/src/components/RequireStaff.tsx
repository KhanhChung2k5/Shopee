import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

/**
 * Guards the whole /admin/* subtree. Buyers and unauthenticated visitors are
 * redirected to the shared login page — /admin never renders without an
 * authenticated staff account, regardless of which URL was typed directly.
 */
export default function RequireStaff({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, ready } = useAuth()

  // Wait for the initial localStorage read before deciding — otherwise an
  // already-logged-in staff account gets bounced on the very first render,
  // while `user` is still null and localStorage hasn't been read yet.
  if (!ready) return null

  if (!isAuthenticated || user?.role !== 'staff') {
    return <Navigate to="/dang-nhap" replace />
  }

  return <>{children}</>
}
