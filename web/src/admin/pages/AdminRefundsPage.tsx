import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { a } from '../adminUi'
import { Badge, buttonClass, cx } from '../../components/ui'
import { ApiError, apiFetch } from '../../lib/api'
import { formatVnd } from '../../lib/catalog'
import { timeVi } from '../../lib/crm'
import { REFUND_KIND_LABEL, REFUND_STATUS_LABEL, REFUND_STATUS_TONE, type Refund, type RefundStatus } from '../../lib/refunds'
import { useAuth } from '../../state/AuthContext'
import { useDialog } from '../../state/DialogContext'
import { canAccessSection, type Department } from '../access'
import { orderCode } from '../orders'

const FILTERS: [RefundStatus | 'all', string][] = [
  ['requested', 'Chờ duyệt'],
  ['approved', 'Chờ chuyển tiền'],
  ['refunded', 'Đã hoàn'],
  ['rejected', 'Từ chối'],
  ['all', 'Tất cả'],
]

/**
 * Hoàn tiền: CSKH duyệt / từ chối yêu cầu trả hàng, rồi chuyển khoản trả khách bằng tay và ghi lại mã giao dịch.
 * Đơn chuyển khoản đã nhận tiền mà bị huỷ xuất hiện sẵn ở "Chờ chuyển tiền".
 */
export default function AdminRefundsPage() {
  const { token, user } = useAuth()
  const { confirm, prompt } = useDialog()
  const canOpenOrders = canAccessSection('/admin/don-hang', (user?.department ?? null) as Department | null)
  const [filter, setFilter] = useState<RefundStatus | 'all'>('requested')
  const [refunds, setRefunds] = useState<Refund[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    if (!token) return
    apiFetch<Refund[]>(`/refund-returns${filter === 'all' ? '' : `?status=${filter}`}`, {}, token)
      .then((data) => { setRefunds(data); setError('') })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Không tải được yêu cầu hoàn tiền'))
  }, [token, filter])

  useEffect(load, [load])

  const act = async (refund: Refund, path: string, body: unknown) => {
    if (!token) return
    setBusy(refund.id)
    setError('')
    try {
      await apiFetch(`/refund-returns/${refund.id}/${path}`, { method: 'PATCH', body: JSON.stringify(body) }, token)
      load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Không cập nhật được yêu cầu hoàn tiền')
    } finally {
      setBusy(null)
    }
  }

  const approve = async (refund: Refund) => {
    const ok = await confirm({
      title: 'Duyệt hoàn tiền',
      message: <>Duyệt hoàn <strong>{formatVnd(Number(refund.refundAmount ?? 0))}</strong> cho {refund.customerName ?? 'khách'}? Sau đó hãy chuyển khoản và ghi nhận mã giao dịch.</>,
      confirmLabel: 'Duyệt',
    })
    if (ok) void act(refund, 'approve', {})
  }

  const reject = async (refund: Refund) => {
    const note = await prompt({
      title: 'Từ chối hoàn tiền',
      message: 'Khách sẽ thấy lý do này trong chi tiết đơn hàng.',
      label: 'Lý do từ chối', type: 'textarea', placeholder: 'VD: Sản phẩm đã qua sử dụng, thiếu phụ kiện…',
      confirmLabel: 'Từ chối', cancelLabel: 'Quay lại', tone: 'danger',
    })
    if (note != null) void act(refund, 'reject', { note })
  }

  const markRefunded = async (refund: Refund) => {
    const transferRef = await prompt({
      title: 'Ghi nhận đã chuyển tiền',
      message: <>Đã chuyển <strong>{formatVnd(Number(refund.refundAmount ?? 0))}</strong> tới {refund.bankName} · {refund.bankAccountNo} · {refund.bankAccountName}?</>,
      label: 'Mã giao dịch ngân hàng', placeholder: 'VD: FT24300123456',
      confirmLabel: 'Đã hoàn tiền', cancelLabel: 'Quay lại',
    })
    if (transferRef != null) void act(refund, 'refunded', { transferRef })
  }

  return (
    <div>
      <div className={a.toolbar}>
        <h1 className="!mb-0">Hoàn tiền</h1>
      </div>
      <div className={cx(a.filterBar, 'mb-space-md')}>
        {FILTERS.map(([key, label]) => (
          <button key={key} type="button" className={buttonClass(filter === key ? 'primary' : 'outline', 'sm')} onClick={() => setFilter(key)}>{label}</button>
        ))}
      </div>
      {error && <p role="alert" className="font-body-md text-body-md text-error mb-space-md">{error}</p>}

      {!refunds && <div className={a.empty}>Đang tải…</div>}
      {refunds?.length === 0 && <div className={a.empty}>Không có yêu cầu hoàn tiền nào ở mục này.</div>}

      <div className="space-y-space-md">
        {refunds?.map((r) => (
          <div key={r.id} className={a.card}>
            <div className="flex flex-wrap items-start justify-between gap-space-sm">
              <div className="min-w-0">
                <div className="font-title-md text-title-md text-on-surface">
                  {r.kind === 'cancellation' ? 'Hoàn tiền cả đơn (đơn đã huỷ)' : `${r.productName ?? 'Sản phẩm'}${r.quantity ? ` × ${r.quantity}` : ''}`}
                </div>
                <div className="font-body-md text-body-md text-on-surface-variant">
                  {r.customerName ?? 'Khách hàng'}{r.customerEmail ? ` (${r.customerEmail})` : ''} · {timeVi(r.requestedAt)} ·{' '}
                  {canOpenOrders
                    ? <Link className="text-primary underline" to={`/admin/don-hang/${r.orderId}`}>Đơn {orderCode(r.orderId)}</Link>
                    : <>Đơn {orderCode(r.orderId)}</>}
                </div>
              </div>
              <div className="flex items-center gap-space-sm">
                <Badge>{REFUND_KIND_LABEL[r.kind]}</Badge>
                <Badge tone={REFUND_STATUS_TONE[r.status]}>{REFUND_STATUS_LABEL[r.status]}</Badge>
                <strong className="font-title-md text-title-md text-primary whitespace-nowrap">{formatVnd(Number(r.refundAmount ?? 0))}</strong>
              </div>
            </div>

            {r.reason && <p className="mt-space-sm font-body-md text-body-md text-on-surface whitespace-pre-line">{r.reason}</p>}

            <dl className="mt-space-sm grid grid-cols-1 sm:grid-cols-3 gap-space-sm rounded-lg bg-surface-container-low p-space-sm font-body-md text-body-md">
              <div><dt className="font-label-md text-label-md text-on-surface-variant">Ngân hàng</dt><dd>{r.bankName ?? '—'}</dd></div>
              <div><dt className="font-label-md text-label-md text-on-surface-variant">Số tài khoản</dt><dd className="font-mono">{r.bankAccountNo ?? '—'}</dd></div>
              <div><dt className="font-label-md text-label-md text-on-surface-variant">Chủ tài khoản</dt><dd>{r.bankAccountName ?? '—'}</dd></div>
            </dl>

            {r.status === 'rejected' && r.staffNote && <p className="mt-space-xs font-body-md text-body-md text-error">Lý do từ chối: {r.staffNote}</p>}
            {r.status === 'refunded' && (
              <p className="mt-space-xs font-body-md text-body-md text-secondary">
                Đã chuyển {r.refundedAt ? timeVi(r.refundedAt) : ''} · Mã GD <span className="font-mono">{r.transferRef}</span>
              </p>
            )}

            {(r.status === 'requested' || r.status === 'approved') && (
              <div className={cx(a.rowActions, 'mt-space-sm')}>
                {r.status === 'requested' && (
                  <>
                    <button type="button" className={buttonClass('primary', 'sm')} disabled={busy === r.id} onClick={() => void approve(r)}>Duyệt hoàn tiền</button>
                    <button type="button" className={buttonClass('outline', 'sm')} disabled={busy === r.id} onClick={() => void reject(r)}>Từ chối</button>
                  </>
                )}
                {r.status === 'approved' && (r.bankAccountNo
                  ? <button type="button" className={buttonClass('primary', 'sm')} disabled={busy === r.id} onClick={() => void markRefunded(r)}>Ghi nhận đã chuyển tiền</button>
                  : <span className="font-label-md text-label-md text-on-surface-variant">Chờ khách khai tài khoản nhận tiền trong chi tiết đơn hàng.</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
