import { useState, type FormEvent } from 'react'
import { Alert, Badge, Button, Card, CardTitle, Field, Modal, inputClass } from '../components/ui'
import { apiFetch, ApiError } from '../lib/api'
import { formatVnd } from '../lib/catalog'
import { formatOrderDate as formatDate } from '../lib/orderStatus'
import {
  BANKS, REFUND_STATUS_LABEL, REFUND_STATUS_TONE, RETURN_WINDOW_DAYS, maskAccount, type BankAccount, type Refund,
} from '../lib/refunds'

const EMPTY_BANK: BankAccount = { bankName: '', bankAccountNo: '', bankAccountName: '' }

/** Bank, account number and holder — where the shop transfers the refund. */
function BankAccountFields({ value, onChange, disabled }: { value: BankAccount; onChange: (next: BankAccount) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
      <Field label="Ngân hàng">
        <input className={inputClass} list="refund-banks" value={value.bankName} disabled={disabled} maxLength={100}
          onChange={(e) => onChange({ ...value, bankName: e.target.value })} placeholder="VD: Vietcombank" />
        <datalist id="refund-banks">{BANKS.map((bank) => <option key={bank} value={bank} />)}</datalist>
      </Field>
      <Field label="Số tài khoản">
        <input className={inputClass} inputMode="numeric" value={value.bankAccountNo} disabled={disabled} maxLength={20}
          onChange={(e) => onChange({ ...value, bankAccountNo: e.target.value.replace(/\D/g, '') })} placeholder="Chỉ gồm chữ số" />
      </Field>
      <Field label="Chủ tài khoản" className="sm:col-span-2">
        <input className={inputClass} value={value.bankAccountName} disabled={disabled} maxLength={255}
          onChange={(e) => onChange({ ...value, bankAccountName: e.target.value.toUpperCase() })} placeholder="VD: NGUYEN VAN A" />
      </Field>
    </div>
  )
}

function bankProblem(bank: BankAccount) {
  if (!bank.bankName.trim()) return 'Vui lòng nhập ngân hàng nhận tiền'
  if (!/^\d{6,20}$/.test(bank.bankAccountNo)) return 'Số tài khoản gồm 6–20 chữ số'
  if (!bank.bankAccountName.trim()) return 'Vui lòng nhập tên chủ tài khoản'
  return null
}

function RefundStatusLine({ refund }: { refund: Refund }) {
  return (
    <div className="rounded-lg bg-surface-container-low px-space-md py-space-sm space-y-1 font-body-md text-body-md">
      <div className="flex flex-wrap items-center gap-space-xs">
        <Badge tone={REFUND_STATUS_TONE[refund.status]}>{REFUND_STATUS_LABEL[refund.status]}</Badge>
        {refund.refundAmount != null && <strong className="text-on-surface">{formatVnd(Number(refund.refundAmount))}</strong>}
        <span className="text-on-surface-variant font-label-md text-label-md">Gửi lúc {formatDate(refund.requestedAt)}</span>
      </div>
      {refund.bankAccountNo && (
        <p className="text-on-surface-variant">Nhận qua {refund.bankName} · {maskAccount(refund.bankAccountNo)} · {refund.bankAccountName}</p>
      )}
      {refund.status === 'rejected' && refund.staffNote && <p className="text-error">Lý do từ chối: {refund.staffNote}</p>}
      {refund.status === 'refunded' && (
        <p className="text-secondary">Đã chuyển khoản {refund.refundedAt ? `lúc ${formatDate(refund.refundedAt)}` : ''}{refund.transferRef ? ` · Mã GD ${refund.transferRef}` : ''}</p>
      )}
    </div>
  )
}

/**
 * Under each delivered line: its refund status, or a "Yêu cầu hoàn tiền" button while the return window is open.
 * A rejected request can be sent again.
 */
export function ItemRefund({ orderItemId, productName, refunds, deliveredAt, token, onChanged }: {
  orderItemId: string
  productName: string
  refunds: Refund[]
  deliveredAt: string | null
  token: string
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const latest = refunds.filter((r) => r.orderItemId === orderItemId).at(-1)
  const deadline = deliveredAt ? new Date(new Date(deliveredAt).getTime() + RETURN_WINDOW_DAYS * 86_400_000) : null
  const windowOpen = !deadline || deadline.getTime() > Date.now()
  const canRequest = (!latest || latest.status === 'rejected') && windowOpen

  return (
    <div className="ml-20 space-y-space-xs">
      {latest && <RefundStatusLine refund={latest} />}
      {canRequest && (
        <Button variant="outline" size="sm" icon="currency_exchange" onClick={() => setOpen(true)}>
          {latest ? 'Gửi lại yêu cầu hoàn tiền' : 'Yêu cầu trả hàng / hoàn tiền'}
        </Button>
      )}
      {!latest && !windowOpen && (
        <p className="font-label-md text-label-md text-on-surface-variant">Đã quá {RETURN_WINDOW_DAYS} ngày kể từ khi nhận hàng — không thể yêu cầu hoàn tiền.</p>
      )}
      {open && (
        <ReturnRequestModal orderItemId={orderItemId} productName={productName} deadline={deadline} token={token}
          onClose={() => setOpen(false)} onDone={() => { setOpen(false); onChanged() }} />
      )}
    </div>
  )
}

function ReturnRequestModal({ orderItemId, productName, deadline, token, onClose, onDone }: {
  orderItemId: string
  productName: string
  deadline: Date | null
  token: string
  onClose: () => void
  onDone: () => void
}) {
  const [reason, setReason] = useState('')
  const [bank, setBank] = useState(EMPTY_BANK)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (reason.trim().length < 5) return setError('Vui lòng mô tả lý do (ít nhất 5 ký tự)')
    const problem = bankProblem(bank)
    if (problem) return setError(problem)
    setBusy(true)
    setError(null)
    try {
      await apiFetch('/refund-returns', { method: 'POST', body: JSON.stringify({ orderItemId, reason: reason.trim(), ...bank }) }, token)
      onDone()
    } catch (reasonError) {
      setError(reasonError instanceof ApiError ? reasonError.message : 'Không gửi được yêu cầu hoàn tiền')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      eyebrow="Trả hàng / hoàn tiền"
      title={productName}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-space-sm w-full">
          <Button variant="outline" disabled={busy} onClick={onClose}>Huỷ</Button>
          <Button type="submit" form="return-request-form" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi yêu cầu'}</Button>
        </div>
      }
    >
      <form id="return-request-form" noValidate onSubmit={(e) => void submit(e)} className="space-y-space-md">
        <p className="font-body-md text-body-md text-on-surface-variant">
          CSKH sẽ xem xét yêu cầu. Khi được duyệt, số tiền bạn đã trả cho sản phẩm này (đã trừ phần giảm giá) sẽ được
          chuyển khoản về tài khoản bên dưới.{deadline ? ` Hạn gửi yêu cầu: ${formatDate(deadline.toISOString())}.` : ''}
        </p>
        <Field label="Lý do trả hàng">
          <textarea className={inputClass} rows={3} maxLength={500} value={reason} disabled={busy}
            onChange={(e) => setReason(e.target.value)} placeholder="VD: Tay cầm bị drift cần analog trái…" />
        </Field>
        <BankAccountFields value={bank} onChange={setBank} disabled={busy} />
        {error && <Alert>{error}</Alert>}
      </form>
    </Modal>
  )
}

/** A paid order that got cancelled: what is owed back, and the bank account form if the buyer has not given one yet. */
export function CancellationRefundCard({ refund, token, onChanged }: { refund: Refund; token: string; onChanged: () => void }) {
  const [bank, setBank] = useState<BankAccount>({
    bankName: refund.bankName ?? '', bankAccountNo: refund.bankAccountNo ?? '', bankAccountName: refund.bankAccountName ?? '',
  })
  const [editing, setEditing] = useState(!refund.bankAccountNo)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const canEdit = refund.status === 'requested' || refund.status === 'approved'

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const problem = bankProblem(bank)
    if (problem) return setError(problem)
    setBusy(true)
    setError(null)
    try {
      await apiFetch(`/refund-returns/${refund.id}/bank-account`, { method: 'PATCH', body: JSON.stringify(bank) }, token)
      setEditing(false)
      onChanged()
    } catch (reasonError) {
      setError(reasonError instanceof ApiError ? reasonError.message : 'Không lưu được tài khoản nhận tiền')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card as="section" className="space-y-space-sm">
      <CardTitle icon="currency_exchange">Hoàn tiền đơn huỷ</CardTitle>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Shop đã nhận tiền chuyển khoản của đơn này nên sẽ hoàn lại toàn bộ {formatVnd(Number(refund.refundAmount ?? 0))}.
      </p>
      <RefundStatusLine refund={refund} />
      {canEdit && editing && (
        <form noValidate onSubmit={(e) => void save(e)} className="space-y-space-sm">
          <p className="font-title-md text-title-md text-on-surface">Tài khoản nhận tiền hoàn</p>
          <BankAccountFields value={bank} onChange={setBank} disabled={busy} />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" size="sm" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu tài khoản nhận tiền'}</Button>
        </form>
      )}
      {canEdit && !editing && (
        <Button variant="outline" size="sm" icon="edit" onClick={() => setEditing(true)}>Đổi tài khoản nhận tiền</Button>
      )}
    </Card>
  )
}
