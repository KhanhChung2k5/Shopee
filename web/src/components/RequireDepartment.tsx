import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { canAccessSection, type Department } from '../admin/access'
import { EmptyState } from './ui'

/**
 * Wraps a single /admin/* page. Reads allowed departments for the CURRENT
 * route from admin/access.ts (the single source of truth also used by the
 * sidebar) — so adding a new admin page only means adding one line there,
 * never touching this component or duplicating the rule.
 */
export default function RequireDepartment({ children, section }: { children: ReactNode; section?: string }) {
  const { user } = useAuth()
  const location = useLocation()

  const department = (user?.department ?? null) as Department | null
  // `section` lets a nested page (e.g. /admin/don-hang/:id) reuse its parent section's rule.
  const allowed = canAccessSection(section ?? location.pathname, department)

  if (!allowed) {
    return (
      <div className="bg-surface-container-lowest rounded-xl shadow-sm">
        <EmptyState
          icon="lock"
          title="Bạn không có quyền xem mục này"
          description="Chỉ nhân viên thuộc bộ phận phù hợp mới truy cập được. Vui lòng liên hệ quản trị viên nếu bạn cần quyền truy cập."
        />
      </div>
    )
  }

  return <>{children}</>
}
