import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchNotifications } from '../lib/crm'
import { useAuth } from '../state/AuthContext'

/** Header bell with the buyer's unread CRM notification count (campaigns, survey invitations). */
export default function NotificationBell() {
  const { token, user } = useAuth()
  const [unread, setUnread] = useState(0)
  const isBuyer = !!token && user?.role === 'buyer'

  useEffect(() => {
    if (!isBuyer || !token) return
    let active = true
    const refresh = () => fetchNotifications(token)
      .then((d) => { if (active) setUnread(d.notifications.filter((n) => n.status !== 'read').length) })
      .catch(() => { /* bell is best-effort */ })
    refresh()
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('notifications:changed', refresh)
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('notifications:changed', refresh) }
  }, [isBuyer, token])

  if (!isBuyer) return null

  return (
    <Link className="relative flex flex-col items-center text-on-surface hover:text-primary transition-colors p-space-xs" to="/thong-bao" title="Thông báo">
      <span className="material-symbols-outlined text-2xl">notifications</span>
      <span className="hidden md:block font-label-sm text-label-sm mt-0.5">Thông báo</span>
      {unread > 0 && (
        <span className="absolute top-0 right-1 min-w-4 h-4 px-1 bg-primary text-on-primary font-label-sm text-label-sm rounded-full flex items-center justify-center font-bold">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
