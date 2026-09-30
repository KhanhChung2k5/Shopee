import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'

/**
 * Guards the whole /admin/* subtree. Buyers and unauthenticated visitors are
 * redirected to the shared login page — /admin never renders without an
 * authenticated staff account, regardless of which URL was typed directly.
 */
export default function RequireStaff({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated || user?.role !== 'staff') {
    return <Navigate to="/dang-nhap" replace />
  }

  return <>{children}</>
}
