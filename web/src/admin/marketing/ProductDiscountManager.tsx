import { useState, type FormEvent } from 'react'
import { apiFetch } from '../../lib/api'
import type { ProductDiscount, PromotionProgram } from './types'
import { errorMessage, money } from './types'

interface ProductForm {
  promotionProgramId: string
  variantId: string
  kind: 'percentage' | 'flash'
  amount: string
  limitQty: string
}

const EMPTY_FORM: ProductForm = {
  promotionProgramId: '', variantId: '', kind: 'flash', amount: '', limitQty: '',
}

interface Props {
  token: string
  programs: PromotionProgram[]
  discounts: ProductDiscount[]
  onChanged: () => Promise<void>
}

export default function ProductDiscountManager({ token, programs, discounts, onChanged }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const edit = (discount: ProductDiscount) => {
    setEditingId(discount.id)
    setForm({
      promotionProgramId: discount.promotionProgramId,
      variantId: discount.variantId,
      kind: discount.flashPrice === null ? 'percentage' : 'flash',
      amount: String(discount.flashPrice ?? discount.discountPercent ?? ''),
      limitQty: discount.limitQty === null ? '' : String(discount.limitQty),
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
    const isFlash = form.kind === 'flash'
    try {
      await apiFetch(
        editingId ? `/marketing/product-discounts/${editingId}` : '/marketing/product-discounts',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify({
            promotionProgramId: form.promotionProgramId,
            variantId: form.variantId.trim(),
            discountPercent: isFlash ? null : Number(form.amount),
            flashPrice: isFlash ? Number(form.amount) : null,
            limitQty: isFlash ? Number(form.limitQty) : null,
          }),
        },
        token,
      )
      await onChanged()
      reset()
    } catch (cause) {
      setError(errorMessage(cause, 'Không lưu được ưu đãi SKU'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (discount: ProductDiscount) => {
    if (!window.confirm('Xóa ưu đãi SKU này?')) return
    setError(null)
    try {
      await apiFetch(`/marketing/product-discounts/${discount.id}`, { method: 'DELETE' }, token)
      if (editingId === discount.id) reset()
      await onChanged()
    } catch (cause) {
      setError(errorMessage(cause, 'Không xóa được ưu đãi SKU'))
    }
  }

  return (
    <section className="admin-stat-card" style={{ marginTop: 'var(--space-4)' }}>
      <h2 style={{ marginTop: 0 }}>Ưu đãi SKU / Flash Sale ({discounts.length})</h2>
      <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13 }}>
        Nhập ID biến thể sản phẩm từ P2. Khi API catalog có sẵn, trường này sẽ đổi thành bộ chọn SKU.
      </p>
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
          ID biến thể (SKU)
          <input className="search__input" required placeholder="UUID của product_variants"
            value={form.variantId} onChange={(event) => setForm({ ...form, variantId: event.target.value })} />
        </label>
        <label>
          Kiểu ưu đãi
          <select className="search__input" value={form.kind}
            onChange={(event) => setForm({ ...form, kind: event.target.value as ProductForm['kind'], amount: '', limitQty: '' })}>
            <option value="flash">Giá Flash Sale</option>
            <option value="percentage">Giảm phần trăm</option>
          </select>
        </label>
        <label>
          {form.kind === 'flash' ? 'Giá Flash Sale' : 'Phần trăm giảm'}
          <input className="search__input" type="number" required min="0.01"
            max={form.kind === 'flash' ? '9999999999.99' : '100'} step="0.01"
            value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
        </label>
        {form.kind === 'flash' && (
          <label>
            Giới hạn số lượng
            <input className="search__input" type="number" required min="1" step="1"
              value={form.limitQty} onChange={(event) => setForm({ ...form, limitQty: event.target.value })} />
          </label>
        )}
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
          <thead><tr><th>Chương trình</th><th>SKU</th><th>Mức giảm</th><th>Đã bán / Giới hạn</th><th>Thao tác</th></tr></thead>
          <tbody>
            {discounts.map((discount) => (
              <tr key={discount.id}>
                <td>{programs.find((program) => program.id === discount.promotionProgramId)?.code ?? '—'}</td>
                <td><code>{discount.variantId}</code></td>
                <td>{discount.flashPrice === null ? `${discount.discountPercent}%` : money.format(discount.flashPrice)}</td>
                <td>{discount.limitQty === null ? '—' : `${discount.soldQty}/${discount.limitQty}`}</td>
                <td>
                  <div className="marketing-actions">
                    <button className="button button--outline" type="button" onClick={() => edit(discount)} disabled={discount.soldQty > 0}>Sửa</button>
                    <button className="button button--outline" type="button" onClick={() => remove(discount)} disabled={discount.soldQty > 0}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
            {discounts.length === 0 && <tr><td colSpan={5}>Chưa có ưu đãi SKU nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
