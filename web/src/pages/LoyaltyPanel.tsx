import { useEffect, useState } from 'react'
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
      <section className="checkout-section">
        <h2 className="checkout-section__title">Điểm thành viên</h2>
        {error && <p role="alert" style={{ color: 'var(--color-urgent)' }}>{error}</p>}
        {!summary && !error && <p>Đang tải điểm...</p>}
        {summary && (
          <>
            <p style={{ fontSize: 24, fontWeight: 800, marginBlock: 'var(--space-3)' }}>
              {summary.balance.toLocaleString('vi-VN')} điểm
            </p>
            <p style={{ color: 'var(--color-muted-foreground)' }}>
              Hạng: {summary.tier ?? 'Chưa xếp hạng'}
            </p>
          </>
        )}
      </section>

      {summary && (
        <section className="checkout-section">
          <h2 className="checkout-section__title">Lịch sử điểm</h2>
          {summary.transactions.length === 0 && <p>Chưa có giao dịch điểm nào.</p>}
          {summary.transactions.map((transaction) => (
            <div key={transaction.id} className="radio-card" style={{ justifyContent: 'space-between' }}>
              <div>
                <p className="radio-card__title">{transaction.reason ?? 'Giao dịch điểm'}</p>
                <p className="radio-card__desc">{dateTime.format(new Date(transaction.createdAt))}</p>
              </div>
              <strong style={{ color: transaction.points >= 0 ? 'var(--color-trust)' : 'var(--color-urgent)' }}>
                {transaction.points > 0 ? '+' : ''}{transaction.points.toLocaleString('vi-VN')}
              </strong>
            </div>
          ))}
        </section>
      )}
    </>
  )
}
