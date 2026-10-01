import { useEffect, useRef, useState, type FormEvent } from 'react'
import { apiFetch, ApiError } from '../lib/api'

interface WalletBalance {
  balance: number
}

interface WalletTransaction {
  id: string
  orderId: string | null
  type: 'topup' | 'refund' | 'payment'
  amount: number
  createdAt: string
}

interface WalletTopUpResult {
  paymentId: string
  paymentStatus: string
  transaction: WalletTransaction
  balance: number
  simulated: boolean
}

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 2 })
const dateTime = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' })

const transactionNames: Record<WalletTransaction['type'], string> = {
  topup: 'Nạp ví',
  refund: 'Hoàn tiền',
  payment: 'Thanh toán đơn hàng',
}

export default function WalletPanel({ token }: { token: string }) {
  const [balance, setBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pendingRequestId = useRef<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([
      apiFetch<WalletBalance>('/wallet', {}, token),
      apiFetch<WalletTransaction[]>('/wallet/transactions', {}, token),
    ])
      .then(([wallet, history]) => {
        if (!active) return
        setBalance(wallet.balance)
        setTransactions(history)
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiError ? err.message : 'Không tải được ví')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [token])

  const topUp = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting) return
    setError(null)
    setSuccess(null)
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0 || !/^\d+(\.\d{1,2})?$/.test(amount)) {
      setError('Nhập số tiền lớn hơn 0, tối đa 2 chữ số thập phân')
      return
    }

    setSubmitting(true)
    try {
      pendingRequestId.current ??= crypto.randomUUID()
      const result = await apiFetch<WalletTopUpResult>(
        '/wallet/topups',
        { method: 'POST', body: JSON.stringify({ requestId: pendingRequestId.current, amount: value }) },
        token,
      )
      pendingRequestId.current = null
      setBalance(result.balance)
      setTransactions((current) => [result.transaction, ...current])
      setAmount('')
      setSuccess('Nạp ví giả lập thành công.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nạp ví thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <section className="checkout-section">
        <h2 className="checkout-section__title">Ví của tôi</h2>
        {loading ? <p>Đang tải ví...</p> : <p style={{ fontSize: 24, fontWeight: 800, marginBlock: 'var(--space-3)' }}>{balance === null ? '—' : money.format(balance)}</p>}
        <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13 }}>
          Chức năng nạp tiền đang giả lập để thử nghiệm. Không chuyển khoản hoặc sử dụng tiền thật.
        </p>
        <form onSubmit={topUp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13.5 }}>
            Số tiền nạp giả lập
            <input
              className="search__input"
              type="number"
              min="0.01"
              max="9999999999.99"
              step="0.01"
              required
              value={amount}
              onChange={(event) => {
                pendingRequestId.current = null
                setAmount(event.target.value)
              }}
              style={{ paddingInline: 16, position: 'static' }}
            />
          </label>
          {error && <p role="alert" style={{ color: 'var(--color-urgent)', margin: 0 }}>{error}</p>}
          {success && <p role="status" style={{ color: 'var(--color-trust)', margin: 0 }}>{success}</p>}
          <button className="button button--primary" type="submit" disabled={loading || submitting} style={{ alignSelf: 'flex-start' }}>
            {submitting ? 'Đang nạp...' : 'Nạp ví giả lập'}
          </button>
        </form>
      </section>

      <section className="checkout-section">
        <h2 className="checkout-section__title">Lịch sử ví</h2>
        {!loading && transactions.length === 0 && <p style={{ color: 'var(--color-muted-foreground)' }}>Chưa có giao dịch nào.</p>}
        {transactions.map((transaction) => (
          <div key={transaction.id} className="radio-card" style={{ justifyContent: 'space-between' }}>
            <div>
              <p className="radio-card__title">{transactionNames[transaction.type] ?? transaction.type}</p>
              <p className="radio-card__desc">{dateTime.format(new Date(transaction.createdAt))}</p>
            </div>
            <strong style={{ color: transaction.type === 'payment' ? 'var(--color-foreground)' : 'var(--color-trust)' }}>
              {transaction.type === 'payment' ? '−' : '+'}{money.format(transaction.amount)}
            </strong>
          </div>
        ))}
      </section>
    </>
  )
}
