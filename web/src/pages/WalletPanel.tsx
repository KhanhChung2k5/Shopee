import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Alert, Button, Card, CardTitle, Field, Loading, cx, inputClass } from '../components/ui'
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

const transactionIcons: Record<WalletTransaction['type'], string> = {
  topup: 'add_card',
  refund: 'currency_exchange',
  payment: 'shopping_bag',
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
      <Card as="section" className="!p-0 overflow-hidden">
        <div className="bg-gradient-to-r from-primary via-primary-container to-primary text-on-primary p-space-lg space-y-space-xs">
          <p className="flex items-center gap-space-xs font-title-md text-title-md opacity-90">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            Số dư ví Chợ Tốt Mua
          </p>
          <p className="font-headline-xl text-headline-xl">{loading ? '…' : balance === null ? '—' : money.format(balance)}</p>
        </div>
        <form onSubmit={topUp} className="p-space-lg space-y-space-sm">
          <Alert tone="info">Chức năng nạp tiền đang giả lập để thử nghiệm. Không chuyển khoản hoặc sử dụng tiền thật.</Alert>
          <div className="flex flex-wrap items-end gap-space-sm">
            <Field label="Số tiền nạp giả lập" className="flex-1 min-w-[200px]">
              <input
                className={inputClass}
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
              />
            </Field>
            <Button type="submit" icon="add" disabled={loading || submitting}>
              {submitting ? 'Đang nạp...' : 'Nạp ví giả lập'}
            </Button>
          </div>
          {error && <Alert>{error}</Alert>}
          {success && <Alert tone="success">{success}</Alert>}
        </form>
      </Card>

      <Card as="section">
        <CardTitle icon="history">Lịch sử ví</CardTitle>
        {loading && <Loading />}
        {!loading && transactions.length === 0 && <p className="font-body-md text-body-md text-on-surface-variant">Chưa có giao dịch nào.</p>}
        <div className="divide-y divide-line">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center gap-space-md py-space-sm">
              <span className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-xl">{transactionIcons[transaction.type] ?? 'payments'}</span>
              </span>
              <div className="flex-1">
                <p className="font-title-md text-title-md text-on-surface">{transactionNames[transaction.type] ?? transaction.type}</p>
                <p className="font-label-md text-label-md text-on-surface-variant">{dateTime.format(new Date(transaction.createdAt))}</p>
              </div>
              <strong className={cx('font-price-md text-price-md', transaction.type === 'payment' ? 'text-on-surface' : 'text-secondary')}>
                {transaction.type === 'payment' ? '−' : '+'}{money.format(transaction.amount)}
              </strong>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}
