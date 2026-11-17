import { useEffect, useId, useRef, useState } from 'react'
import { buttonClass } from '../../../components/ui'
import { isoDay } from '../../reports'
import { DASHBOARD_PRODUCT_TYPES, DASHBOARD_SEGMENTS } from './dashboardApi'
import { typeLabel, type ProductType } from '../../../lib/catalog'
import { RFM_LABEL } from '../../../lib/crm'

const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'] as const
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const

type Grain = 'month' | 'quarter' | 'year'

const SEGMENT_OPTIONS = DASHBOARD_SEGMENTS.map((id) => ({ id, label: RFM_LABEL[id] ?? id }))
const TYPE_OPTIONS = DASHBOARD_PRODUCT_TYPES.map((id) => ({ id, label: typeLabel[id as ProductType] ?? id }))

function parseIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) }
}

function monthStart(year: number, month: number) {
  return isoDay(new Date(year, month, 1))
}

function monthEnd(year: number, month: number) {
  return isoDay(new Date(year, month + 1, 0))
}

function rangeLabel(from: string, to: string) {
  const start = parseIso(from)
  const end = parseIso(to)
  if (!start || !end) return `${from} – ${to}`
  const left = `${MONTHS[start.month]} ${start.year}`
  const right = `${MONTHS[end.month]} ${end.year}`
  return left === right ? left : `${left} – ${right}`
}

function overlapsMonth(from: string, to: string, year: number, month: number) {
  return monthStart(year, month) <= to && monthEnd(year, month) >= from
}

/** Năm đang diễn ra chỉ tới hết tháng hiện tại; năm đã qua vẫn đủ 12 tháng. */
function fullYearEndMonth(year: number, now = new Date()) {
  return year === now.getFullYear() ? now.getMonth() : 11
}

function fullYearRange(year: number, now = new Date()) {
  return [monthStart(year, 0), monthEnd(year, fullYearEndMonth(year, now))] as const
}

function snapped(start: number, end: number, grain: Grain, year: number): [number, number] {
  const a = Math.min(start, end)
  const b = Math.max(start, end)
  if (grain === 'year') return [0, fullYearEndMonth(year)]
  if (grain === 'quarter') return [Math.floor(a / 3) * 3, Math.floor(b / 3) * 3 + 2]
  return [a, b]
}

export function DashboardFilters({ from, to, onRange, segments, onSegments, productTypes, onProductTypes }: {
  from: string
  to: string
  onRange: (from: string, to: string) => void
  segments: string[]
  onSegments: (next: string[]) => void
  productTypes: string[]
  onProductTypes: (next: string[]) => void
}) {
  const reset = () => {
    const [start, end] = fullYearRange(new Date().getFullYear())
    onRange(start, end)
    onSegments([...DASHBOARD_SEGMENTS])
    onProductTypes([...DASHBOARD_PRODUCT_TYPES])
  }

  return (
    <div className="mb-space-lg flex flex-col gap-3">
      <TimelineRange from={from} to={to} onRange={onRange} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-2xl">
          <FilterMultiSelect label="Phân khúc RFM" options={SEGMENT_OPTIONS} value={segments} onChange={onSegments} emptyLabel="phân khúc" />
          <FilterMultiSelect label="Loại sản phẩm" options={TYPE_OPTIONS} value={productTypes} onChange={onProductTypes} emptyLabel="loại" />
        </div>
        <button type="button" className={buttonClass('outline', 'md')} onClick={reset}>Đặt lại bộ lọc</button>
      </div>
    </div>
  )
}

function TimelineRange({ from, to, onRange }: {
  from: string
  to: string
  onRange: (from: string, to: string) => void
}) {
  const parsed = parseIso(from)
  const [year, setYear] = useState(parsed?.year ?? new Date().getFullYear())
  const [grain, setGrain] = useState<Grain>('month')
  const [preview, setPreview] = useState<{ from: string; to: string } | null>(null)
  const drag = useRef<'start' | 'end' | 'new' | null>(null)
  const newAnchor = useRef(0)
  const fromPointer = useRef(false)
  const previewRef = useRef<{ from: string; to: string } | null>(null)
  const yearRef = useRef(year)
  const grainRef = useRef(grain)
  const fromRef = useRef(from)
  const toRef = useRef(to)
  const onRangeRef = useRef(onRange)
  yearRef.current = year
  grainRef.current = grain
  fromRef.current = from
  toRef.current = to
  onRangeRef.current = onRange

  useEffect(() => {
    if (parsed) setYear(parsed.year)
  }, [parsed?.year])

  const edgeRange = (edge: 'start' | 'end', month: number) => {
    const selectedYear = yearRef.current
    if (edge === 'start') {
      let nextFrom = monthStart(selectedYear, month)
      const end = toRef.current
      if (nextFrom > end) {
        const endDate = parseIso(end)
        nextFrom = endDate && endDate.year === selectedYear ? monthStart(selectedYear, endDate.month) : end
      }
      return { from: nextFrom, to: end }
    }
    let nextTo = monthEnd(selectedYear, month)
    const start = fromRef.current
    if (nextTo < start) {
      const startDate = parseIso(start)
      nextTo = startDate && startDate.year === selectedYear ? monthEnd(selectedYear, startDate.month) : start
    }
    return { from: start, to: nextTo }
  }

  const showPreview = (next: { from: string; to: string }) => {
    previewRef.current = next
    setPreview(next)
  }

  const applyIndexes = (start: number, end: number) => {
    const [fromMonth, toMonth] = snapped(start, end, grainRef.current, yearRef.current)
    const selectedYear = yearRef.current
    onRangeRef.current(monthStart(selectedYear, fromMonth), monthEnd(selectedYear, toMonth))
  }

  useEffect(() => {
    const monthAt = (event: PointerEvent) => {
      const node = (event.target instanceof Element ? event.target : null)?.closest?.('[data-month]')
        ?? document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-month]')
      const index = Number(node?.getAttribute('data-month'))
      if (!Number.isInteger(index) || index < 0 || index > 11) return null
      return index
    }
    const move = (event: PointerEvent) => {
      if (drag.current == null) return
      const index = monthAt(event)
      if (index == null) return
      if (drag.current === 'new') {
        const [fromMonth, toMonth] = snapped(newAnchor.current, index, grainRef.current, yearRef.current)
        const selectedYear = yearRef.current
        showPreview({ from: monthStart(selectedYear, fromMonth), to: monthEnd(selectedYear, toMonth) })
        return
      }
      showPreview(edgeRange(drag.current, index))
    }
    const up = () => {
      if (drag.current == null || previewRef.current == null) return
      const next = previewRef.current
      drag.current = null
      previewRef.current = null
      setPreview(null)
      onRangeRef.current(next.from, next.to)
      window.setTimeout(() => { fromPointer.current = false }, 0)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  const shownFrom = preview?.from ?? from
  const shownTo = preview?.to ?? to
  const active = (month: number) => overlapsMonth(shownFrom, shownTo, year, month)
  const firstActive = MONTHS.findIndex((_, month) => active(month))
  const lastActive = MONTHS.reduce((found, _, month) => (active(month) ? month : found), -1)

  return (
    <div className="rounded-2xl border border-[#d5e6f6] bg-white px-4 py-3 text-slate-600 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="material-symbols-outlined text-[20px] text-[#3B9EFF]" aria-hidden>calendar_month</span>
        <select
          aria-label="Độ chi tiết thời gian"
          value={grain}
          onChange={(event) => setGrain(event.target.value as Grain)}
          className="!w-auto !min-w-0 !rounded-none !border-0 !bg-transparent !px-0 !py-0 !pr-5 !shadow-none cursor-pointer appearance-none bg-[length:16px] bg-[right_center] bg-no-repeat font-medium !text-slate-700 focus:!border-0 focus:!ring-0"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")' }}
        >
          <option value="month">Tháng</option>
          <option value="quarter">Quý</option>
          <option value="year">Năm</option>
        </select>
        <span className="font-medium text-slate-500" aria-live="polite">{rangeLabel(from, to)}</span>
      </div>

      <div role="group" aria-label={`Khoảng thời gian năm ${year}`}>
        <div className="mb-1 flex items-center gap-1">
          <button type="button" aria-label="Năm trước" className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" onClick={() => setYear((value) => value - 1)}>
            <span className="material-symbols-outlined text-base" aria-hidden>chevron_left</span>
          </button>
          <button type="button" className="rounded px-1 font-medium text-slate-700 hover:bg-slate-100" onClick={() => {
            const [start, end] = fullYearRange(year)
            onRange(start, end)
          }}>
            {year}
          </button>
          <button type="button" aria-label="Năm sau" className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" onClick={() => setYear((value) => value + 1)}>
            <span className="material-symbols-outlined text-base" aria-hidden>chevron_right</span>
          </button>
        </div>
        <div className="grid grid-cols-12 gap-x-[3px]">
          {QUARTERS.map((label, quarter) => (
            <button
              key={label}
              type="button"
              className="col-span-3 rounded py-0.5 text-center text-[13px] text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              onClick={() => onRange(monthStart(year, quarter * 3), monthEnd(year, quarter * 3 + 2))}
            >
              {label}
            </button>
          ))}
          {MONTHS.map((label, month) => {
            const on = active(month)
            const showStart = on && month === firstActive && parseIso(shownFrom)?.year === year
            const showEnd = on && month === lastActive && parseIso(shownTo)?.year === year
            const beginEdge = (edge: 'start' | 'end') => {
              fromPointer.current = true
              drag.current = edge
              showPreview(edgeRange(edge, month))
            }
            return (
              <div key={label} data-month={month} className="relative mt-1 min-w-0">
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={`${label} ${year}`}
                  className="relative h-8 w-full cursor-pointer border-0 bg-transparent p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B9EFF]"
                  onPointerDown={(event) => {
                    if ((event.target as Element).closest('[data-edge]')) return
                    fromPointer.current = true
                    if (showStart && showEnd) {
                      const rect = event.currentTarget.getBoundingClientRect()
                      beginEdge(event.clientX < rect.left + rect.width / 2 ? 'start' : 'end')
                      return
                    }
                    if (showStart) { beginEdge('start'); return }
                    if (showEnd) { beginEdge('end'); return }
                    drag.current = 'new'
                    newAnchor.current = month
                    showPreview({ from: monthStart(year, month), to: monthEnd(year, month) })
                  }}
                  onClick={() => {
                    if (fromPointer.current) {
                      fromPointer.current = false
                      return
                    }
                    applyIndexes(month, month)
                  }}
                >
                  <span className="pointer-events-none block pb-1 text-center text-[11px] leading-none text-slate-400 sm:text-[12px]">{label}</span>
                  <span className={`block h-[18px] rounded-[3px] ${on ? 'bg-[#3B9EFF]' : 'bg-[#e7eef6]'}`} />
                </button>
                {showStart && (
                  <button
                    type="button"
                    data-edge="start"
                    aria-label={`Kéo mốc bắt đầu, đang ở ${label} ${year}`}
                    className="absolute bottom-0 left-0 z-20 flex h-6 w-6 -translate-x-1/2 cursor-ew-resize items-center justify-center border-0 bg-transparent p-0"
                    onPointerDown={(event) => { event.stopPropagation(); event.preventDefault(); beginEdge('start') }}
                  >
                    <span className="h-3.5 w-3.5 rounded-full bg-[#3a3f46]" />
                  </button>
                )}
                {showEnd && (
                  <button
                    type="button"
                    data-edge="end"
                    aria-label={`Kéo mốc kết thúc, đang ở ${label} ${year}`}
                    className="absolute bottom-0 right-0 z-20 flex h-6 w-6 translate-x-1/2 cursor-ew-resize items-center justify-center border-0 bg-transparent p-0"
                    onPointerDown={(event) => { event.stopPropagation(); event.preventDefault(); beginEdge('end') }}
                  >
                    <span className="h-3.5 w-3.5 rounded-full bg-[#3a3f46]" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FilterMultiSelect({ label, options, value, onChange, emptyLabel }: {
  label: string
  options: { id: string; label: string }[]
  value: string[]
  onChange: (next: string[]) => void
  emptyLabel: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const allRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [menuBox, setMenuBox] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null)
  const allSelected = options.length > 0 && options.every((option) => value.includes(option.id))
  const summary = value.length === 0
    ? 'Không chọn'
    : allSelected
      ? 'Tất cả'
      : value.length <= 2
        ? options.filter((option) => value.includes(option.id)).map((option) => option.label).join(', ')
        : `${value.length} ${emptyLabel}`

  useEffect(() => {
    if (!open) return
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect()
      if (!rect) return
      const spaceBelow = window.innerHeight - rect.bottom - 12
      const spaceAbove = rect.top - 12
      const openUp = spaceBelow < 220 && spaceAbove > spaceBelow
      setMenuBox({
        top: openUp ? undefined : rect.bottom + 4,
        bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left,
        width: Math.max(rect.width, 220),
        maxHeight: Math.max(160, Math.min(288, openUp ? spaceAbove : spaceBelow)),
      })
    }
    place()
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = value.length > 0 && !allSelected
  }, [value.length, allSelected, open])

  return (
    <div className="relative min-w-0" ref={rootRef}>
      <span id={`${listId}-label`} className="mb-1 block font-label-md text-label-md text-on-surface-variant">{label}</span>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-surface-container-lowest px-3 py-2 text-left"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate font-body-md text-body-md text-on-surface" title={summary}>{summary}</span>
        <span className="material-symbols-outlined shrink-0 text-base text-on-surface-variant" aria-hidden>{open ? 'expand_less' : 'expand_more'}</span>
      </button>
      {open && menuBox && (
        <div
          ref={menuRef}
          id={listId}
          role="group"
          aria-labelledby={`${listId}-label`}
          className="fixed z-[60] overflow-y-auto rounded-xl border border-line bg-surface-container-lowest p-1 shadow-lg"
          style={{ top: menuBox.top, bottom: menuBox.bottom, left: menuBox.left, width: menuBox.width, maxHeight: menuBox.maxHeight }}
        >
          <label className="!flex-row !items-center !gap-2 cursor-pointer rounded-lg px-2 py-1.5 font-title-md text-title-md !text-on-surface hover:bg-surface-container">
            <input
              ref={allRef}
              type="checkbox"
              checked={allSelected}
              onChange={() => onChange(allSelected ? [] : options.map((option) => option.id))}
            />
            Chọn tất cả
          </label>
          {options.map((option) => (
            <label key={option.id} className="!flex-row !items-center !gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-surface-container">
              <input
                type="checkbox"
                checked={value.includes(option.id)}
                onChange={() => onChange(value.includes(option.id) ? value.filter((id) => id !== option.id) : [...value, option.id])}
              />
              <span className="truncate font-body-md text-body-md !text-on-surface">{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
