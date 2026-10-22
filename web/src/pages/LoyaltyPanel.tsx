import { useEffect, useState } from 'react'
import { Alert, Card, CardTitle, Loading, cx } from '../components/ui'
import { apiFetch, ApiError } from '../lib/api'

interface LoyaltyTransaction {
  id: string
  orderId: string | null
  points: number
  reason: string | null
  createdAt: string
}

interface LoyaltySummary {
  balance: number
  tier: string | null
  transactions: LoyaltyTransaction[]
}

const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

export default function LoyaltyPanel({ token }: { token: string }) {
  const [summary, setSummary] = useState<LoyaltySummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    apiFetch<LoyaltySummary>('/loyalty', {}, token)
      .then((data) => { if (active) setSummary(data) })
      .catch((cause) => {
        if (active) setError(cause instanceof ApiError ? cause.message : 'Không tải được điểm thành viên')
      })
    return () => { active = false }
  }, [token])

  return (
    <>
      <Card as="section" className="!p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-inverse-surface via-inverse-surface to-on-surface-variant text-inverse-on-surface p-space-lg space-y-space-xs">
          <p className="flex items-center gap-space-xs font-title-md text-title-md opacity-90">
            <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>loyalty</span>
            Điểm thành viên
          </p>
          {error && <Alert>{error}</Alert>}
          {!summary && !error && <Loading>Đang tải điểm...</Loading>}
          {summary && (
            <>
              <p className="font-headline-xl text-headline-xl">{summary.balance.toLocaleString('vi-VN')} <span className="font-title-lg text-title-lg">điểm</span></p>
              <p className="font-body-md text-body-md opacity-80">Hạng: {summary.tier ?? 'Chưa xếp hạng'}</p>
            </>
          )}
        </div>
      </Card>

      {summary && (
        <Card as="section">
          <CardTitle icon="history">Lịch sử điểm</CardTitle>
          {summary.transactions.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant">Chưa có giao dịch điểm nào.</p>}
          <div className="divide-y divide-line">
            {summary.transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-space-md py-space-sm">
                <div>
                  <p className="font-title-md text-title-md text-on-surface">{transaction.reason ?? 'Giao dịch điểm'}</p>
                  <p className="font-label-md text-label-md text-on-surface-variant">{dateTime.format(new Date(transaction.createdAt))}</p>
                </div>
                <strong className={cx('font-price-md text-price-md', transaction.points >= 0 ? 'text-secondary' : 'text-error')}>
                  {transaction.points > 0 ? '+' : ''}{transaction.points.toLocaleString('vi-VN')}
                </strong>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}
