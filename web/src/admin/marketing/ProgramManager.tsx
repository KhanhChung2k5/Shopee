import { useState, type FormEvent } from 'react'
import { apiFetch } from '../../lib/api'
import type { PromotionProgram } from './types'
import { dateTime, errorMessage, toIso, toLocalInput } from './types'
import { a } from '../adminUi'
import { buttonClass } from '../../components/ui'
import { LOYALTY_TIERS, audienceLabel } from '../../lib/loyalty'
import { useDialog } from '../../state/DialogContext'

interface ProgramForm {
  code: string
  name: string
  programType: string
  targetLoyaltyTier: string
  startAt: string
  endAt: string
}

const EMPTY_FORM: ProgramForm = {
  code: '', name: '', programType: 'seasonal', targetLoyaltyTier: '', startAt: '', endAt: '',
}

interface Props {
  token: string
  programs: PromotionProgram[]
  onChanged: () => Promise<void>
}

export default function ProgramManager({ token, programs, onChanged }: Props) {
  const { confirm } = useDialog()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ProgramForm>(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const edit = (program: PromotionProgram) => {
    setEditingId(program.id)
    setForm({
      code: program.code,
      name: program.name,
      programType: program.programType,
      targetLoyaltyTier: program.targetLoyaltyTier ?? '',
      startAt: toLocalInput(program.startAt),
      endAt: toLocalInput(program.endAt),
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
        editingId ? `/marketing/programs/${editingId}` : '/marketing/programs',
        {
          method: editingId ? 'PUT' : 'POST',
          body: JSON.stringify({
            ...form,
            targetLoyaltyTier: form.targetLoyaltyTier || null,
            startAt: toIso(form.startAt),
            endAt: toIso(form.endAt),
          }),
        },
        token,
      )
      await onChanged()
      reset()
    } catch (cause) {
      setError(errorMessage(cause, 'Không lưu được chương trình'))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (program: PromotionProgram) => {
    if (!(await confirm({ title: 'Xoá chương trình khuyến mãi', message: <>Xoá chương trình <strong>{program.code} · {program.name}</strong>? Chỉ xoá được khi chương trình không còn voucher hay ưu đãi.</>, confirmLabel: 'Xoá', tone: 'danger' }))) return
    setError(null)
    try {
      await apiFetch(`/marketing/programs/${program.id}`, { method: 'DELETE' }, token)
      if (editingId === program.id) reset()
      await onChanged()
    } catch (cause) {
      setError(errorMessage(cause, 'Không xóa được chương trình'))
    }
  }

  return (
    <section className={`${a.card} mb-space-lg`}>
      <h2 className="font-headline-md text-headline-md text-on-surface mb-space-md">Chương trình khuyến mãi ({programs.length})</h2>
      <form onSubmit={save} className={a.formGrid}>
        <label>
          Mã chương trình
          <input className={a.input} required maxLength={50} pattern="[A-Za-z0-9_-]+"
            value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
        </label>
        <label>
          Tên chương trình
          <input className={a.input} required maxLength={255}
            value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label>
          Loại chương trình
          <input className={a.input} required maxLength={20}
            value={form.programType} onChange={(event) => setForm({ ...form, programType: event.target.value })} />
        </label>
        <label>
          Dành cho khách hàng
          <select className={a.input} value={form.targetLoyaltyTier}
            onChange={(event) => setForm({ ...form, targetLoyaltyTier: event.target.value })}>
            <option value="">Mọi khách hàng</option>
            {LOYALTY_TIERS.map((tier) => (
              <option key={tier.code} value={tier.code}>Hạng {tier.label} trở lên (từ {tier.minPoints.toLocaleString('vi-VN')} điểm)</option>
            ))}
          </select>
        </label>
        <label>
          Bắt đầu
          <input className={a.input} type="datetime-local" required
            value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} />
        </label>
        <label>
          Kết thúc
          <input className={a.input} type="datetime-local" required
            value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} />
        </label>
        {error && <p role="alert" className={a.formMessage}>{error}</p>}
        <div className={a.formActions}>
          <button className={buttonClass('primary')} type="submit" disabled={busy}>
            {busy ? 'Đang lưu...' : editingId ? 'Lưu chương trình' : 'Thêm chương trình'}
          </button>
          {editingId && <button className={buttonClass('outline')} type="button" onClick={reset}>Huỷ sửa</button>}
        </div>
      </form>

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead><tr><th>Mã</th><th>Tên</th><th>Loại</th><th>Khách hàng</th><th>Thời gian</th><th>Thao tác</th></tr></thead>
          <tbody>
            {programs.map((program) => (
              <tr key={program.id}>
                <td>{program.code}</td>
                <td>{program.name}</td>
                <td>{program.programType}</td>
                <td>{audienceLabel(program.targetLoyaltyTier)}</td>
                <td>{dateTime.format(new Date(program.startAt))} – {dateTime.format(new Date(program.endAt))}</td>
                <td>
                  <div className={a.rowActions}>
                    <button className={buttonClass('outline')} type="button" onClick={() => edit(program)}>Sửa</button>
                    <button className={buttonClass('outline')} type="button" onClick={() => remove(program)}>Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
            {programs.length === 0 && <tr><td colSpan={6}>Chưa có chương trình nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
