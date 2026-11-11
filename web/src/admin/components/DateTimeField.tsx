import { useEffect, useMemo, useRef, useState } from 'react'
import { buttonClass, cx } from '../../components/ui'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function parseLocal(value: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toDateTimeValue(date: Date) {
  return `${toDateValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatLabel(value: string, withTime: boolean) {
  const date = parseLocal(value)
  if (!date) return withTime ? 'Chọn ngày giờ' : 'Chọn ngày'
  const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
  if (!withTime) return day
  return `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Lịch chọn ngày, có thêm giờ khi soạn chiến dịch. */
export default function DateTimeField({ value, onChange, withTime = false }: {
  value: string
  onChange: (next: string) => void
  withTime?: boolean
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const current = parseLocal(value) ?? new Date()
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(() => new Date(current.getFullYear(), current.getMonth(), 1))
  const [hour, setHour] = useState(() => current.getHours() % 12 || 12)
  const [minute, setMinute] = useState(current.getMinutes() - (current.getMinutes() % 5))
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>(current.getHours() >= 12 ? 'PM' : 'AM')

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const cells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const first = new Date(year, month, 1)
    const lead = (first.getDay() + 6) % 7
    const days = new Date(year, month + 1, 0).getDate()
    const items: Array<{ day: number; outside: boolean }> = []
    for (let i = 0; i < lead; i += 1) {
      const prev = new Date(year, month, -lead + i + 1)
      items.push({ day: prev.getDate(), outside: true })
    }
    for (let day = 1; day <= days; day += 1) items.push({ day, outside: false })
    while (items.length % 7 !== 0) items.push({ day: items.length - lead - days + 1, outside: true })
    return items
  }, [cursor])

  const commit = (day: number, outside: boolean) => {
    if (outside) return
    let hours = hour % 12
    if (meridiem === 'PM') hours += 12
    if (meridiem === 'AM' && hour === 12) hours = 0
    const next = new Date(cursor.getFullYear(), cursor.getMonth(), day, withTime ? hours : 0, withTime ? minute : 0)
    onChange(withTime ? toDateTimeValue(next) : toDateValue(next))
    if (!withTime) setOpen(false)
  }

  const selected = parseLocal(value)

  return (
    <div className="relative" ref={rootRef}>
      <button type="button" className={cx(buttonClass(value ? 'outline' : 'primary'), 'w-full justify-between')} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="material-symbols-outlined text-base">calendar_month</span>
        {formatLabel(value, withTime)}
        <span className="material-symbols-outlined text-base">expand_more</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-[320px] rounded-xl border border-line bg-surface-container-lowest p-space-sm shadow-lg">
          <div className="flex items-center justify-between mb-space-xs">
            <button type="button" className={buttonClass('ghost', 'sm')} aria-label="Tháng trước" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>‹</button>
            <strong>Tháng {cursor.getMonth() + 1}, {cursor.getFullYear()}</strong>
            <button type="button" className={buttonClass('ghost', 'sm')} aria-label="Tháng sau" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>›</button>
          </div>
          <div className="grid grid-cols-7 text-center font-label-sm text-label-sm text-on-surface-variant mb-1">
            {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, index) => {
              const active = !cell.outside && selected && selected.getFullYear() === cursor.getFullYear() && selected.getMonth() === cursor.getMonth() && selected.getDate() === cell.day
              return (
                <button key={`${cell.day}-${index}`} type="button" disabled={cell.outside} className={cx('h-8 rounded-lg text-sm', cell.outside && 'text-on-surface-variant/40', active ? 'bg-primary text-on-primary' : 'hover:bg-surface-container')} onClick={() => commit(cell.day, cell.outside)}>
                  {cell.outside ? '' : cell.day}
                </button>
              )
            })}
          </div>
          {withTime && (
            <div className="mt-space-sm grid grid-cols-3 gap-space-xs">
              <label className="font-label-sm text-label-sm text-on-surface-variant">Giờ
                <select className="w-full rounded-lg border border-line px-2 py-1" value={hour} onChange={(e) => setHour(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{pad(n)}</option>)}
                </select>
              </label>
              <label className="font-label-sm text-label-sm text-on-surface-variant">Phút
                <select className="w-full rounded-lg border border-line px-2 py-1" value={minute} onChange={(e) => setMinute(Number(e.target.value))}>
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((n) => <option key={n} value={n}>{pad(n)}</option>)}
                </select>
              </label>
              <label className="font-label-sm text-label-sm text-on-surface-variant">AM/PM
                <select className="w-full rounded-lg border border-line px-2 py-1" value={meridiem} onChange={(e) => setMeridiem(e.target.value as 'AM' | 'PM')}>
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </label>
            </div>
          )}
          <div className="mt-space-sm flex justify-end gap-space-xs">
            <button type="button" className={buttonClass('ghost', 'sm')} onClick={() => { const now = new Date(); onChange(withTime ? toDateTimeValue(now) : toDateValue(now)); setOpen(false) }}>{withTime ? 'Now' : 'Today'}</button>
            {withTime && <button type="button" className={buttonClass('primary', 'sm')} onClick={() => { if (selected) commit(selected.getDate(), false); else commit(new Date().getDate(), false); setOpen(false) }}>Chọn</button>}
          </div>
        </div>
      )}
    </div>
  )
}

export function initials(name: string | null | undefined) {
  const parts = (name ?? '?').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
