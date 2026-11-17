import type { ReactNode } from 'react'
import { formatVnd } from '../lib/catalog'
import { remainingUsesBadge, voucherConditionLabel, voucherScopeLabel, type AvailableVoucher } from '../lib/vouchers'

/**
 * A buyer's voucher as a ticket: the discount on the left; name, scope, conditions, a "used %" bar and the
 * buyer's remaining uses ("x2") on the right. {@code action} sits bottom-right (e.g. "Dùng ngay").
 */
export default function VoucherTicket({ voucher, now, action }: {
  voucher: AvailableVoucher
  /** When the voucher list was loaded (ms), for the "expires soon" hint. */
  now: number
  action?: ReactNode
}) {
  const conditions = voucherConditionLabel({ ...voucher, remainingUses: null, remainingForYou: undefined })
  const expires = new Date(voucher.endsAt)
  const soonMs = expires.getTime() - now
  const expiresLabel = soonMs > 0 && soonMs < 24 * 60 * 60 * 1000
    ? `Sắp hết hạn: còn ${Math.max(1, Math.round(soonMs / 3_600_000))} giờ`
    : `HSD: ${expires.toLocaleDateString('vi-VN')}`

  return (
    <div className="relative flex h-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      <div className="relative w-28 flex-shrink-0 flex flex-col items-center justify-center gap-1 p-space-sm bg-primary text-on-primary text-center">
        <span className="font-headline-md text-headline-md">{voucher.type === 'percentage' ? `-${voucher.value}%` : `-${formatVnd(voucher.value)}`}</span>
        <span className="font-label-sm text-label-sm opacity-90 break-all">{voucher.code}</span>
        <span className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-surface" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5 p-space-md border-l-2 border-dashed border-line">
        <span
          className="absolute top-2 right-2 rounded-md bg-error/10 px-1.5 py-0.5 font-label-md text-label-md font-semibold text-error"
          title={voucher.remainingForYou == null ? 'Bạn dùng được nhiều lần' : `Bạn còn ${voucher.remainingForYou} lượt dùng`}
        >
          {remainingUsesBadge(voucher)}
        </span>
        <p className="pr-14 font-title-md text-title-md text-on-surface line-clamp-2">{voucher.programName}</p>
        <p className="font-label-md text-label-md text-on-surface-variant line-clamp-2">{voucherScopeLabel(voucher)}</p>
        {conditions && <p className="font-label-md text-label-md text-on-surface-variant">{conditions}</p>}

        {voucher.usedPercent != null && (
          <div className="pt-0.5" aria-label={`Đã dùng ${voucher.usedPercent}%`}>
            <div className="h-1.5 w-full rounded-full bg-surface-container-high overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-error" style={{ width: `${Math.max(voucher.usedPercent, 3)}%` }} />
            </div>
            <p className="mt-0.5 font-label-sm text-label-sm text-error">
              Đã dùng {voucher.usedPercent}%{voucher.usedPercent >= 80 ? ', sắp hết' : ''}
            </p>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-space-sm pt-1">
          <span className={`font-label-sm text-label-sm ${soonMs < 24 * 60 * 60 * 1000 ? 'text-error' : 'text-on-surface-variant'}`}>{expiresLabel}</span>
          {action}
        </div>
      </div>
    </div>
  )
}
