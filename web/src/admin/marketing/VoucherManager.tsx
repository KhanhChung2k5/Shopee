import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { apiFetch } from '../../lib/api'
import type { PromotionProgram, Voucher } from './types'
import { dateTime, errorMessage, money, toIso, toLocalInput } from './types'
import { a } from '../adminUi'
import { buttonClass } from '../../components/ui'
import { fetchProducts, typeLabel, type CatalogProductSummary, type ProductType } from '../../lib/catalog'
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
  targetProductIds: string[]
  /** '' = unlimited per buyer. */
  perCustomerLimit: string
  minOrderAmount: string
  maxDiscountAmount: string
  usageLimit: string
  newCustomersOnly: boolean
}

const EMPTY_FORM: VoucherForm = {
  promotionProgramId: '', code: '', type: 'percentage', value: '', expiresAt: '', targetProductTypes: [],
  targetProductIds: [], perCustomerLimit: '1',
  minOrderAmount: '', maxDiscountAmount: '', usageLimit: '', newCustomersOnly: false,
}

const optionalNumber = (value: string) => (value.trim() === '' ? null : Number(value))

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
  // Orders were priced with a used voucher's terms: only its expiry and total uses may still change.
  const termsLocked = !!editingId && (vouchers.find((v) => v.id === editingId)?.usedCount ?? 0) > 0
  const programOf = (voucher: Voucher) => programs.find((program) => program.id === voucher.promotionProgramId)

  // Products a voucher can be limited to (the published catalogue), and a search box to pick them.
  const [products, setProducts] = useState<CatalogProductSummary[]>([])
  const [productQuery, setProductQuery] = useState('')
  useEffect(() => {
    fetchProducts(new URLSearchParams({ page: '0', size: '500' }))
      .then((page) => setProducts(page.content))
      .catch(() => setProducts([]))
  }, [])
  const productName = useMemo(() => new Map(products.map((p) => [p.id, p.name])), [products])
  const productMatches = useMemo(() => {
    const term = productQuery.trim().toLocaleLowerCase('vi')
    return products.filter((p) => !term || p.name.toLocaleLowerCase('vi').includes(term)).slice(0, 50)
  }, [products, productQuery])
  const toggleProduct = (id: string) => setForm((f) => ({
    ...f,
    targetProductIds: f.targetProductIds.includes(id) ? f.targetProductIds.filter((x) => x !== id) : [...f.targetProductIds, id],
  }))
  const scopeOf = (voucher: Voucher) => {
    const parts = [
      ...(voucher.targetProductTypes ?? []).map((t) => typeLabel[t as ProductType] ?? t),
      ...(voucher.targetProductIds ?? []).map((id) => productName.get(id) ?? 'Sản phẩm đã ẩn'),
    ]
    return parts.length ? parts.join(', ') : 'Mọi sản phẩm'
  }

  const edit = (voucher: Voucher) => {
    setEditingId(voucher.id)
    setForm({
      promotionProgramId: voucher.promotionProgramId,
      code: voucher.code,
      type: voucher.type,
      value: String(voucher.value),
      expiresAt: toLocalInput(voucher.expiresAt),
      targetProductTypes: voucher.targetProductTypes ?? [],
      targetProductIds: voucher.targetProductIds ?? [],
      perCustomerLimit: voucher.perCustomerLimit == null ? '' : String(voucher.perCustomerLimit),
      minOrderAmount: voucher.minOrderAmount == null ? '' : String(voucher.minOrderAmount),
      maxDiscountAmount: voucher.maxDiscountAmount == null ? '' : String(voucher.maxDiscountAmount),
      usageLimit: voucher.usageLimit == null ? '' : String(voucher.usageLimit),
      newCustomersOnly: voucher.newCustomersOnly,
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
          body: JSON.stringify({
            ...form,
            value: Number(form.value),
            expiresAt: toIso(form.expiresAt),
            minOrderAmount: optionalNumber(form.minOrderAmount),
            maxDiscountAmount: form.type === 'percentage' ? optionalNumber(form.maxDiscountAmount) : null,
            usageLimit: optionalNumber(form.usageLimit),
            perCustomerLimit: optionalNumber(form.perCustomerLimit),
          }),
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
          <select className={a.input} required value={form.promotionProgramId} disabled={termsLocked}
            onChange={(event) => setForm({ ...form, promotionProgramId: event.target.value })}>
            <option value="">Chọn chương trình</option>
            {programs.map((program) => <option key={program.id} value={program.id}>{program.code} · {program.name}</option>)}
          </select>
        </label>
        <label>
          Mã voucher
          <input className={a.input} required maxLength={50} pattern="[A-Za-z0-9_-]+" disabled={termsLocked}
            value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
        </label>
        <label>
          Kiểu giảm
          <select className={a.input} value={form.type} disabled={termsLocked}
            onChange={(event) => setForm({ ...form, type: event.target.value as Voucher['type'], maxDiscountAmount: '' })}>
            <option value="percentage">Phần trăm</option>
            <option value="fixed_amount">Số tiền</option>
          </select>
        </label>
        <label>
          Giá trị
          <input className={a.input} type="number" required min="0.01" step="0.01"
            max={form.type === 'percentage' ? '100' : '9999999999.99'} disabled={termsLocked}
            value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} />
        </label>
        <label>
          Đơn tối thiểu (tùy chọn)
          <input className={a.input} type="number" min="0.01" step="0.01" max="9999999999.99" placeholder="Không giới hạn" disabled={termsLocked}
            value={form.minOrderAmount} onChange={(event) => setForm({ ...form, minOrderAmount: event.target.value })} />
        </label>
        {form.type === 'percentage' && (
          <label>
            Giảm tối đa (tùy chọn)
            <input className={a.input} type="number" min="0.01" step="0.01" max="9999999999.99" placeholder="Không giới hạn" disabled={termsLocked}
              value={form.maxDiscountAmount} onChange={(event) => setForm({ ...form, maxDiscountAmount: event.target.value })} />
          </label>
        )}
        <label>
          Tổng lượt dùng (tùy chọn)
          <input className={a.input} type="number" min="1" step="1" placeholder="Không giới hạn"
            value={form.usageLimit} onChange={(event) => setForm({ ...form, usageLimit: event.target.value })} />
        </label>
        <label>
          Số lượt mỗi khách
          <input className={a.input} type="number" min="1" step="1" placeholder="Không giới hạn"
            value={form.perCustomerLimit} onChange={(event) => setForm({ ...form, perCustomerLimit: event.target.value })} />
          <span className="font-label-sm text-label-sm text-on-surface-variant">1 = mỗi khách dùng một lần · để trống = dùng nhiều lần</span>
        </label>
        <label className="flex items-center gap-space-xs self-end">
          <input type="checkbox" checked={form.newCustomersOnly} disabled={termsLocked}
            onChange={(event) => setForm({ ...form, newCustomersOnly: event.target.checked })} />
          Chỉ khách hàng mới (đơn đầu tiên)
        </label>
        <label>
          Hết hạn (tùy chọn)
          <input className={a.input} type="datetime-local"
            value={form.expiresAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} />
        </label>
        {selectedProgram && (
          <p className="md:col-span-2 font-body-md text-body-md text-on-surface-variant">
            Chương trình <strong>{selectedProgram.name}</strong> ({selectedProgram.programType}): {dateTime.format(new Date(selectedProgram.startAt))} → {dateTime.format(new Date(selectedProgram.endAt))}
            {' · '}{audienceLabel(selectedProgram.targetLoyaltyTier)}. Hạn voucher phải nằm trong thời gian này.
          </p>
        )}
        <fieldset className="md:col-span-2">
          <legend className="font-label-md text-label-md text-on-surface-variant mb-1">Áp dụng cho loại sản phẩm (bỏ trống cả loại và sản phẩm = mọi sản phẩm)</legend>
          <div className="flex flex-wrap gap-space-xs">
            {PRODUCT_TYPES.map((type) => {
              const on = form.targetProductTypes.includes(type)
              return (
                <button key={type} type="button" className={buttonClass(on ? 'primary' : 'outline', 'sm')} aria-pressed={on} disabled={termsLocked}
                  onClick={() => setForm({ ...form, targetProductTypes: on
                    ? form.targetProductTypes.filter((t) => t !== type)
                    : [...form.targetProductTypes, type] })}>
                  {typeLabel[type]}
                </button>
              )
            })}
          </div>
        </fieldset>
        <fieldset className="md:col-span-2">
          <legend className="font-label-md text-label-md text-on-surface-variant mb-1">
            Và/hoặc sản phẩm cụ thể ({form.targetProductIds.length} đã chọn): voucher giảm cho món thuộc loại đã chọn hoặc là sản phẩm đã chọn
          </legend>
          {form.targetProductIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-space-xs">
              {form.targetProductIds.map((id) => (
                <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2.5 py-0.5 font-label-md text-label-md text-on-primary-fixed">
                  {productName.get(id) ?? 'Sản phẩm đã ẩn'}
                  {!termsLocked && (
                    <button type="button" aria-label={'Bỏ ' + (productName.get(id) ?? 'sản phẩm')} className="cursor-pointer" onClick={() => toggleProduct(id)}>
                      <span className="material-symbols-outlined !text-sm">close</span>
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {!termsLocked && (
            <>
              <input className={a.input} type="search" placeholder="Tìm sản phẩm theo tên…" value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)} />
              <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-line divide-y divide-line">
                {productMatches.length === 0 && <p className="px-space-sm py-2 text-on-surface-variant">Không có sản phẩm phù hợp.</p>}
                {productMatches.map((p) => (
                  <label key={p.id} className="!flex-row items-center gap-space-xs px-space-sm py-1.5 cursor-pointer hover:bg-surface-container-low">
                    <input type="checkbox" checked={form.targetProductIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                    <span className="flex-1">{p.name}</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">{typeLabel[p.productType]}</span>
                  </label>
                ))}
              </div>
            </>
          )}
        </fieldset>
        {termsLocked && (
          <p className="md:col-span-2 font-body-md text-body-md text-on-surface-variant">
            Voucher đã có đơn sử dụng nên chỉ đổi được hạn dùng, tổng lượt dùng và số lượt mỗi khách. Muốn đổi mức giảm hay điều kiện, hãy tạo voucher mới.
          </p>
        )}
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
          <thead><tr><th>Mã</th><th>Chương trình</th><th>Khách hàng</th><th>Sản phẩm</th><th>Mức giảm</th><th>Điều kiện</th><th>Đã dùng</th><th>Hết hạn</th><th>Thao tác</th></tr></thead>
          <tbody>
            {vouchers.map((voucher) => (
              <tr key={voucher.id}>
                <td>{voucher.code}</td>
                <td>{programOf(voucher)?.name ?? '—'}
                  {programOf(voucher) && <span className="block text-on-surface-variant">{programOf(voucher)!.programType}</span>}</td>
                <td>{audienceLabel(programOf(voucher)?.targetLoyaltyTier)}{voucher.newCustomersOnly && ' · Khách hàng mới'}</td>
                <td>{scopeOf(voucher)}</td>
                <td>{voucher.type === 'percentage' ? `${voucher.value}%` : money.format(voucher.value)}
                  {voucher.maxDiscountAmount != null && <span className="block text-on-surface-variant">tối đa {money.format(voucher.maxDiscountAmount)}</span>}</td>
                <td>{voucher.minOrderAmount != null ? `Đơn từ ${money.format(voucher.minOrderAmount)}` : 'Mọi đơn'}
                  <span className="block text-on-surface-variant">
                    {voucher.perCustomerLimit == null ? 'Mỗi khách dùng nhiều lần' : `Mỗi khách ${voucher.perCustomerLimit} lần`}
                  </span></td>
                <td>{voucher.usageLimit != null ? `${voucher.usedCount}/${voucher.usageLimit}` : voucher.usedCount}</td>
                <td>{voucher.expiresAt ? dateTime.format(new Date(voucher.expiresAt)) : 'Theo chương trình'}</td>
                <td>
                  <div className={a.rowActions}>
                    <button className={buttonClass('outline')} type="button" onClick={() => edit(voucher)}>Sửa</button>
                    <button className={buttonClass('outline')} type="button" onClick={() => remove(voucher)}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
            {vouchers.length === 0 && <tr><td colSpan={9}>Chưa có voucher nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
