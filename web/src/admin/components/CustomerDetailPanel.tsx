import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../../lib/api'
import { formatVnd } from '../../lib/catalog'
import { RFM_LABEL } from '../../lib/crm'
import { useAuth } from '../../state/AuthContext'
import { canAccessSection, type Department } from '../access'
import { a, statusPillClass } from '../adminUi'
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, orderCode, paymentShort, type StaffOrderSummary } from '../orders'
import { age, type Customer } from '../types/customer'

interface CustomerDetail {
  customer: Customer
  loyaltyTier: string | null
  loyaltyBalance: number | null
  rfmSegment: string | null
  lastPurchaseAt: string | null
  createdAt: string
  lastLoginAt: string | null
  deliveredSpend: number
  addresses: { id: string; recipientName: string; phone: string; fullAddress: string; isDefault: boolean }[]
  orders: StaffOrderSummary[]
}

const STATUS_LABEL: Record<string, string> = { active: 'Hoạt động', locked: 'Đã khoá', deleted: 'Đã xoá' }
const TIER_LABEL: Record<string, string> = { bronze: 'Đồng', silver: 'Bạc', gold: 'Vàng', diamond: 'Kim cương' }
const GENDER_LABEL: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' }
const dateVi = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '—')
const timeVi = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

/** GET /customers/{id}/detail — the account, its CRM figures, addresses and every order with its status. */
export default function CustomerDetailPanel({ customerId, onClose, onEdit }: { customerId: string; onClose: () => void; onEdit?: (customer: Customer) => void }) {
  const { token, user } = useAuth()
  const [detail, setDetail] = useState<CustomerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  // Sales, warehouse and admin open orders; CS only reads them here.
  const canOpenOrder = canAccessSection('/admin/don-hang', (user?.department ?? null) as Department | null)

  useEffect(() => {
    let active = true
    setDetail(null)
    setError(null)
    apiFetch<CustomerDetail>(`/customers/${customerId}/detail`, {}, token)
      .then((d) => { if (active) setDetail(d) })
      .catch((e) => { if (active) setError(e instanceof ApiError ? e.message : 'Không tải được thông tin khách hàng') })
    return () => { active = false }
  }, [customerId, token])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const c = detail?.customer
  const delivered = detail?.orders.filter((o) => o.status === 'delivered').length ?? 0
  const open = detail?.orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length ?? 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-labelledby="customer-detail-title" onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-3xl overflow-y-auto bg-surface p-space-lg shadow-xl space-y-space-md">
        <div className="flex items-start justify-between gap-space-md">
          <div>
            <h2 id="customer-detail-title" className="font-headline-md text-headline-md text-on-surface">
              {c ? c.fullName ?? 'Khách hàng' : 'Chi tiết khách hàng'}
            </h2>
            {c && <p className="font-body-md text-body-md text-on-surface-variant">{c.email ?? '—'} · {c.phone ?? '—'}</p>}
          </div>
          <div className="flex items-center gap-space-sm">
            {c && <span className={statusPillClass(c.status)}>{STATUS_LABEL[c.status] ?? c.status}</span>}
            {c && onEdit && c.status !== 'deleted' && (
              <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 font-label-md text-label-md text-on-surface hover:border-primary cursor-pointer" onClick={() => onEdit(c)}>
                <span className="material-symbols-outlined !text-base">edit</span>Sửa thông tin
              </button>
            )}
            <button ref={closeRef} type="button" aria-label="Đóng" onClick={onClose}
              className="material-symbols-outlined rounded-lg p-1 text-on-surface-variant hover:bg-surface-container cursor-pointer">close</button>
          </div>
        </div>

        {error && <p role="alert" className="font-body-md text-body-md text-error">{error}</p>}
        {!detail && !error && <p className="font-body-md text-body-md text-on-surface-variant">Đang tải…</p>}

        {detail && c && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
              {[
                ['Đơn đã giao', `${delivered} / ${detail.orders.length} đơn`],
                ['Đã chi thực tế', formatVnd(detail.deliveredSpend)],
                ['LTV dự báo', formatVnd(c.ltv)],
                ['Đơn đang xử lý', `${open}`],
              ].map(([label, value]) => (
                <div key={label} className={a.card + ' !p-space-md'}>
                  <div className={a.statLabel}>{label}</div>
                  <div className="font-title-lg text-title-lg text-on-surface">{value}</div>
                </div>
              ))}
            </div>

            <section className={a.card}>
              <h3 className="font-title-md text-title-md text-on-surface mb-space-sm">Thông tin tài khoản</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-space-lg gap-y-1.5 font-body-md text-body-md">
                {[
                  ['Giới tính', c.gender ? GENDER_LABEL[c.gender] ?? c.gender : '—'],
                  ['Ngày sinh', c.dob ? `${dateVi(c.dob)} (${age(c.dob)} tuổi)` : '—'],
                  ['Hạng thành viên', detail.loyaltyTier ? `${TIER_LABEL[detail.loyaltyTier] ?? detail.loyaltyTier} · ${detail.loyaltyBalance ?? 0} điểm` : '—'],
                  ['Nhóm RFM', detail.rfmSegment ? RFM_LABEL[detail.rfmSegment] ?? detail.rfmSegment : '—'],
                  ['Ngày tạo tài khoản', dateVi(detail.createdAt)],
                  ['Đăng nhập gần nhất', timeVi(detail.lastLoginAt)],
                  ['Mua gần nhất', dateVi(detail.lastPurchaseAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-space-md border-b border-line py-1">
                    <dt className="text-on-surface-variant">{label}</dt>
                    <dd className="text-on-surface text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className={a.card}>
              <h3 className="font-title-md text-title-md text-on-surface mb-space-sm">Sổ địa chỉ ({detail.addresses.length})</h3>
              {detail.addresses.length === 0
                ? <p className="font-body-md text-body-md text-on-surface-variant">Khách chưa lưu địa chỉ nào.</p>
                : <ul className="space-y-1.5 font-body-md text-body-md">
                  {detail.addresses.map((ad) => (
                    <li key={ad.id}>
                      <strong className="text-on-surface">{ad.recipientName}</strong> · {ad.phone}
                      {ad.isDefault && <span className="ml-1.5 rounded bg-secondary-container px-1.5 py-0.5 font-label-sm text-label-sm text-on-secondary-container">Mặc định</span>}
                      <div className="text-on-surface-variant">{ad.fullAddress}</div>
                    </li>
                  ))}
                </ul>}
            </section>

            <section>
              <h3 className="font-title-md text-title-md text-on-surface mb-space-sm">Lịch sử đơn hàng ({detail.orders.length})</h3>
              {detail.orders.length === 0
                ? <p className={a.card + ' font-body-md text-body-md text-on-surface-variant'}>Khách chưa có đơn hàng nào.</p>
                : <div className={a.tableWrap}>
                  <table className={a.table}>
                    <thead>
                      <tr><th>Mã đơn</th><th>Ngày đặt</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th></tr>
                    </thead>
                    <tbody>
                      {detail.orders.map((o) => (
                        <tr key={o.id}>
                          <td className="whitespace-nowrap">
                            {canOpenOrder
                              ? <Link className="font-bold text-primary underline" to={`/admin/don-hang/${o.id}`}>{orderCode(o.id)}</Link>
                              : <span className="font-bold">{orderCode(o.id)}</span>}
                          </td>
                          <td className="whitespace-nowrap">{timeVi(o.createdAt)}</td>
                          <td>{o.itemCount}</td>
                          <td className="whitespace-nowrap">
                            {formatVnd(o.totalAmount)}
                            {o.refundedAmount > 0 && <div className="font-label-sm text-label-sm text-error">Đã hoàn {formatVnd(o.refundedAmount)}</div>}
                          </td>
                          <td className="whitespace-nowrap">{paymentShort(o)}</td>
                          <td><span className={statusPillClass(ORDER_STATUS_TONE[o.status])}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>}
            </section>
          </>
        )}
      </aside>
    </div>
  )
}
