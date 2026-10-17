import { useState, type FormEvent } from 'react'
import { apiFetch } from '../../lib/api'
import type { InvoiceDiscount, PromotionProgram } from './types'
import { errorMessage, money } from './types'

interface InvoiceForm {
  promotionProgramId: string
  kind: 'percentage' | 'fixed_amount'
  value: string
}

const EMPTY_FORM: InvoiceForm = { promotionProgramId: '', kind: 'percentage', value: '' }

interface Props {
  token: string
  programs: PromotionProgram[]
  discounts: InvoiceDiscount[]
  onChanged: () => Promise<void>
}

export default function InvoiceDiscountManager({ token, programs, discounts, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<InvoiceForm>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const edit = (discount: InvoiceDiscount) => {
    setEditingId(discount.id)
    setForm({
      promotionProgramId: discount.promotionProgramId,
      kind: discount.discountAmount === null ? 'percentage' : 'fixed_amount',
      value: String(discount.discountAmount ?? discount.discountPercent ?? ''),
    })
    setError(null)
  }

  const reset = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await apiFetch(
        editingId ? `/marketing/invoice-discounts/${editingId}` : '/marketing/invoice-discounts',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify({
            promotionProgramId: form.promotionProgramId,
            discountAmount: form.kind === 'fixed_amount' ? Number(form.value) : null,
            discountPercent: form.kind === 'percentage' ? Number(form.value) : null,
          }),
        },
        token,
      )
      await onChanged()
      reset()
    } catch (cause) {
      setError(errorMessage(cause, 'Không lưu được ưu đãi hóa đơn'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (discount: InvoiceDiscount) => {
    if (!window.confirm('Xóa ưu đãi hóa đơn này?')) return
    setError(null)
    try {
      await apiFetch(`/marketing/invoice-discounts/${discount.id}`, { method: 'DELETE' }, token)
      if (editingId === discount.id) reset()
      await onChanged()
    } catch (cause) {
      setError(errorMessage(cause, 'Không xóa được ưu đãi hóa đơn'))
    }
  }

  return (
    <section className="admin-stat-card" style={{ marginTop: 'var(--space-4)' }}>
      <h2 style={{ marginTop: 0 }}>Ưu đãi hóa đơn ({discounts.length})</h2>
      <form onSubmit={save} className="marketing-form">
        <label>
          Chương trình
          <select className="search__input" required value={form.promotionProgramId}
            onChange={(event) => setForm({ ...form, promotionProgramId: event.target.value })}>
            <option value="">Chọn chương trình</option>
            {programs.map((program) => <option key={program.id} value={program.id}>{program.code} · {program.name}</option>)}
          </select>
        </label>
        <label>
          Kiểu giảm
          <select className="search__input" value={form.kind}
            onChange={(event) => setForm({ ...form, kind: event.target.value as InvoiceForm['kind'], value: '' })}>
            <option value="percentage">Phần trăm</option>
            <option value="fixed_amount">Số tiền</option>
          </select>
        </label>
        <label>
          Giá trị giảm
          <input className="search__input" type="number" required min="0.01"
            max={form.kind === 'percentage' ? '100' : '9999999999.99'} step="0.01"
            value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} />
        </label>
        {error && <p role="alert" className="marketing-form__message">{error}</p>}
        <div className="marketing-form__actions">
          <button className="button button--primary" type="submit" disabled={busy || programs.length === 0}>
            {busy ? 'Đang lưu...' : editingId ? 'Lưu ưu đãi' : 'Thêm ưu đãi'}
          </button>
          {editingId && <button className="button button--outline" type="button" onClick={reset}>Huỷ sửa</button>}
        </div>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Chương trình</th><th>Mức giảm</th><th>Thao tác</th></tr></thead>
          <tbody>
            {discounts.map((discount) => (
              <tr key={discount.id}>
                <td>{programs.find((program) => program.id === discount.promotionProgramId)?.code ?? '—'}</td>
                <td>{discount.discountAmount === null ? `${discount.discountPercent}%` : money.format(discount.discountAmount)}</td>
                <td>
                  <div className="marketing-actions">
                    <button className="button button--outline" type="button" onClick={() => edit(discount)}>Sửa</button>
                    <button className="button button--outline" type="button" onClick={() => remove(discount)}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
            {discounts.length === 0 && <tr><td colSpan={3}>Chưa có ưu đãi hóa đơn nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
