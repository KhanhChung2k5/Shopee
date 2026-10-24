import { useState, type FormEvent } from 'react'
import { apiFetch } from '../../lib/api'
import type { PromotionProgram, Voucher } from './types'
import { dateTime, errorMessage, money, toIso, toLocalInput } from './types'
import { a } from '../adminUi'
import { buttonClass } from '../../components/ui'
import { typeLabel, type ProductType } from '../../lib/catalog'
import { audienceLabel } from '../../lib/loyalty'
import { useDialog } from '../../state/DialogContext'

const PRODUCT_TYPES: ProductType[] = ['game_disc', 'controller', 'accessory']

interface VoucherForm {
  promotionProgramId: string
  code: string
  type: Voucher['type']
  value: string
  expiresAt: string
  targetProductTypes: string[]
}

const EMPTY_FORM: VoucherForm = {
  promotionProgramId: '', code: '', type: 'percentage', value: '', expiresAt: '', targetProductTypes: [],
}

interface Props {
  token: string
  programs: PromotionProgram[]
  vouchers: Voucher[]
  onChanged: () => Promise<void>
}

export default function VoucherManager({ token, programs, vouchers, onChanged }: Props) {
  const { confirm } = useDialog()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<VoucherForm>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedProgram = programs.find((program) => program.id === form.promotionProgramId)

  const edit = (voucher: Voucher) => {
    setEditingId(voucher.id)
    setForm({
      promotionProgramId: voucher.promotionProgramId,
      code: voucher.code,
      type: voucher.type,
      value: String(voucher.value),
      expiresAt: toLocalInput(voucher.expiresAt),
      targetProductTypes: voucher.targetProductTypes ?? [],
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
        editingId ? `/marketing/vouchers/${editingId}` : '/marketing/vouchers',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify({ ...form, value: Number(form.value), expiresAt: toIso(form.expiresAt) }),
        },
        token,
      )
      await onChanged()
      reset()
    } catch (cause) {
      setError(errorMessage(cause, 'Không lưu được voucher'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (voucher: Voucher) => {
    if (!(await confirm({ title: 'Xoá voucher', message: <>Xoá voucher <strong>{voucher.code}</strong>? Khách sẽ không dùng được mã này nữa.</>, confirmLabel: 'Xoá', tone: 'danger' }))) return
    setError(null)
    try {
      await apiFetch(`/marketing/vouchers/${voucher.id}`, { method: 'DELETE' }, token)
      if (editingId === voucher.id) reset()
      await onChanged()
    } catch (cause) {
      setError(errorMessage(cause, 'Không xóa được voucher'))
    }
  }

  return (
    <section className={a.card}>
      <h2 className="font-headline-md text-headline-md text-on-surface mb-space-md">Voucher ({vouchers.length})</h2>
      {programs.length === 0 && <p>Tạo chương trình trước khi thêm voucher.</p>}
      <form onSubmit={save} className={a.formGrid}>
        <label>
          Chương trình
          <select className={a.input} required value={form.promotionProgramId}
            onChange={(event) => setForm({ ...form, promotionProgramId: event.target.value })}>
            <option value="">Chọn chương trình</option>
            {programs.map((program) => <option key={program.id} value={program.id}>{program.code} · {program.name}</option>)}
          </select>
        </label>
        <label>
          Mã voucher
          <input className={a.input} required maxLength={50} pattern="[A-Za-z0-9_-]+"
            value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
        </label>
        <label>
          Kiểu giảm
          <select className={a.input} value={form.type}
            onChange={(event) => setForm({ ...form, type: event.target.value as Voucher['type'] })}>
            <option value="percentage">Phần trăm</option>
            <option value="fixed_amount">Số tiền</option>
          </select>
        </label>
        <label>
          Giá trị
          <input className={a.input} type="number" required min="0.01" step="0.01"
            max={form.type === 'percentage' ? '100' : '9999999999.99'}
            value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} />
        </label>
        <label>
          Hết hạn (tùy chọn)
          <input className={a.input} type="datetime-local"
            value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} />
        </label>
        {selectedProgram && (
          <p className="md:col-span-2 font-body-md text-body-md text-on-surface-variant">
            Chương trình <strong>{selectedProgram.name}</strong>: {dateTime.format(new Date(selectedProgram.startAt))} → {dateTime.format(new Date(selectedProgram.endAt))}
            {' · '}{audienceLabel(selectedProgram.targetLoyaltyTier)}. Hạn voucher phải nằm trong thời gian này.
          </p>
        )}
        <fieldset className="md:col-span-2">
          <legend className="font-label-md text-label-md text-on-surface-variant mb-1">Áp dụng cho loại sản phẩm (bỏ trống = mọi sản phẩm)</legend>
          <div className="flex flex-wrap gap-space-xs">
            {PRODUCT_TYPES.map((type) => {
              const on = form.targetProductTypes.includes(type)
              return (
                <button key={type} type="button" className={buttonClass(on ? 'primary' : 'outline', 'sm')} aria-pressed={on}
                  onClick={() => setForm({ ...form, targetProductTypes: on
                    ? form.targetProductTypes.filter((t) => t !== type)
                    : [...form.targetProductTypes, type] })}>
                  {typeLabel[type]}
                </button>
              )
            })}
          </div>
        </fieldset>
        {error && <p role="alert" className={a.formMessage}>{error}</p>}
        <div className={a.formActions}>
          <button className={buttonClass('primary')} type="submit" disabled={busy || programs.length === 0}>
            {busy ? 'Đang lưu...' : editingId ? 'Lưu voucher' : 'Thêm voucher'}
          </button>
          {editingId && <button className={buttonClass('outline')} type="button" onClick={reset}>Huỷ sửa</button>}
        </div>
      </form>

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead><tr><th>Mã</th><th>Chương trình</th><th>Khách hàng</th><th>Sản phẩm</th><th>Mức giảm</th><th>Hết hạn</th><th>Thao tác</th></tr></thead>
          <tbody>
            {vouchers.map((voucher) => (
              <tr key={voucher.id}>
                <td>{voucher.code}</td>
                <td>{programs.find((program) => program.id === voucher.promotionProgramId)?.name ?? '—'}</td>
                <td>{audienceLabel(programs.find((program) => program.id === voucher.promotionProgramId)?.targetLoyaltyTier)}</td>
                <td>{voucher.targetProductTypes?.length
                  ? voucher.targetProductTypes.map((t) => typeLabel[t as ProductType] ?? t).join(', ')
                  : 'Mọi sản phẩm'}</td>
                <td>{voucher.type === 'percentage' ? `${voucher.value}%` : money.format(voucher.value)}</td>
                <td>{voucher.expiresAt ? dateTime.format(new Date(voucher.expiresAt)) : 'Theo chương trình'}</td>
                <td>
                  <div className={a.rowActions}>
                    <button className={buttonClass('outline')} type="button" onClick={() => edit(voucher)}>Sửa</button>
                    <button className={buttonClass('outline')} type="button" onClick={() => remove(voucher)}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
            {vouchers.length === 0 && <tr><td colSpan={7}>Chưa có voucher nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
