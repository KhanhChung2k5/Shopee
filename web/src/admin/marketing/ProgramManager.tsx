import { useState, type FormEvent } from 'react'
import { apiFetch } from '../../lib/api'
import type { PromotionProgram } from './types'
import { dateTime, errorMessage, toIso, toLocalInput } from './types'

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
    if (!window.confirm(`Xóa chương trình ${program.code}?`)) return
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
    <section className="admin-stat-card" style={{ marginBottom: 'var(--space-4)' }}>
      <h2 style={{ marginTop: 0 }}>Chương trình khuyến mãi ({programs.length})</h2>
      <form onSubmit={save} className="marketing-form">
        <label>Mã chương trình<input className="search__input" required maxLength={50} pattern="[A-Za-z0-9_-]+" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /></label>
        <label>Tên chương trình<input className="search__input" required maxLength={255} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Loại chương trình<input className="search__input" required maxLength={20} value={form.programType} onChange={(event) => setForm({ ...form, programType: event.target.value })} /></label>
        <label>Hạng thành viên (tùy chọn)<input className="search__input" maxLength={50} value={form.targetLoyaltyTier} onChange={(event) => setForm({ ...form, targetLoyaltyTier: event.target.value })} /></label>
        <label>Bắt đầu<input className="search__input" type="datetime-local" required value={form.startAt} onChange={(event) => setForm({ ...form, startAt: event.target.value })} /></label>
        <label>Kết thúc<input className="search__input" type="datetime-local" required value={form.endAt} onChange={(event) => setForm({ ...form, endAt: event.target.value })} /></label>
        {error && <p role="alert" className="marketing-form__message">{error}</p>}
        <div className="marketing-form__actions">
          <button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Đang lưu...' : editingId ? 'Lưu chương trình' : 'Thêm chương trình'}</button>
          {editingId && <button className="button button--outline" type="button" onClick={reset}>Huỷ sửa</button>}
        </div>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Mã</th><th>Tên</th><th>Loại / Hạng</th><th>Thời gian</th><th>Thao tác</th></tr></thead>
          <tbody>
            {programs.map((program) => (
              <tr key={program.id}>
                <td>{program.code}</td>
                <td>{program.name}</td>
                <td>{program.programType}{program.targetLoyaltyTier ? ` · ${program.targetLoyaltyTier}` : ''}</td>
                <td>{dateTime.format(new Date(program.startAt))} – {dateTime.format(new Date(program.endAt))}</td>
                <td><div className="marketing-actions"><button className="button button--outline" type="button" onClick={() => edit(program)}>Sửa</button><button className="button button--outline" type="button" onClick={() => remove(program)}>Xóa</button></div></td>
              </tr>
            ))}
            {programs.length === 0 && <tr><td colSpan={5}>Chưa có chương trình nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}
