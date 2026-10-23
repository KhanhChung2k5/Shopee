import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Alert, Badge, Card, EmptyState, Loading, Page, PageHeader, buttonClass, cx } from '../components/ui'
import { ApiError } from '../lib/api'
import { fetchNotifications, markNotificationRead, timeVi, type AppNotification } from '../lib/crm'
import { useAuth } from '../state/AuthContext'

/** Trung tâm thông báo của khách (p5-16/p5-19): chiến dịch, lời mời khảo sát. */
export default function NotificationsPage() {
  const { token, isAuthenticated, isReady } = useAuth()
  const [items, setItems] = useState<AppNotification[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    fetchNotifications(token)
      .then((d) => setItems(d.notifications))
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được thông báo'))
  }, [token])

  if (!isReady) return <Page><Loading /></Page>
  if (!isAuthenticated) return <Navigate to="/dang-nhap" replace state={{ from: '/thong-bao' }} />

  const markRead = async (n: AppNotification) => {
    if (!token || n.status === 'read') return
    try {
      const updated = await markNotificationRead(token, n.id)
      setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, status: updated.status ?? 'read' } : x)) ?? null)
      window.dispatchEvent(new Event('notifications:changed'))
    } catch { /* keep it unread; the user can retry */ }
  }

  const unread = items?.filter((n) => n.status !== 'read').length ?? 0

  return (
    <Page narrow>
      <PageHeader
        breadcrumb={[{ label: 'Tài khoản', to: '/ho-so' }, { label: 'Thông báo' }]}
        title="Thông báo"
        subtitle={items ? (unread ? `${unread} thông báo chưa đọc` : 'Bạn đã đọc hết thông báo') : undefined}
      />
      {error && <Alert>{error}</Alert>}
      {!items && !error && <Loading />}
      {items?.length === 0 && <Card><EmptyState icon="notifications" title="Chưa có thông báo" description="Ưu đãi và lời mời khảo sát dành cho bạn sẽ xuất hiện tại đây." /></Card>}
      <div className="space-y-space-sm">
        {items?.map((n) => {
          const unreadItem = n.status !== 'read'
          const isSurvey = n.referenceType === 'survey' && n.referenceId
          return (
            <Card key={n.id} className={cx('!p-space-md flex items-start gap-space-md', unreadItem && 'ring-1 ring-primary/40')}>
              <span className={cx('w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center', isSurvey ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 'bg-primary-fixed text-on-primary-fixed')}>
                <span className="material-symbols-outlined text-xl">{isSurvey ? 'rate_review' : 'campaign'}</span>
              </span>
              <div className="flex-1 min-w-0 space-y-space-xs">
                <div className="flex flex-wrap items-center gap-space-xs">
                  <Badge tone={isSurvey ? 'info' : 'primary'}>{isSurvey ? 'Khảo sát' : 'Ưu đãi'}</Badge>
                  {unreadItem && <Badge tone="danger">Mới</Badge>}
                  <span className="font-label-md text-label-md text-on-surface-variant">{timeVi(n.sentAt)}</span>
                </div>
                <p className="font-body-lg text-body-lg text-on-surface whitespace-pre-line">{n.content}</p>
                <div className="flex flex-wrap gap-space-xs">
                  {isSurvey && <Link className={buttonClass('primary', 'sm')} to={`/khao-sat/${n.referenceId}`} onClick={() => void markRead(n)}>Làm khảo sát</Link>}
                  {unreadItem && <button type="button" className={buttonClass('ghost', 'sm')} onClick={() => void markRead(n)}>Đánh dấu đã đọc</button>}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </Page>
  )
}
