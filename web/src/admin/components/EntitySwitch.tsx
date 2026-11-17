import { useEffect, useMemo, useRef, useState } from 'react'
import { cx } from '../../components/ui'
import DateTimeField from './DateTimeField'

export interface SwitchItem {
  id: string
  label: string
  meta?: string
  badge?: string
}

/** Ô nhảy nhanh: gõ tên, lọc khoảng ngày tạo, rồi chọn một bản ghi. */
export default function EntitySwitch({ items, placeholder, selectedId, onSelect, from, to, onFrom, onTo }: {
  items: SwitchItem[]
  placeholder: string
  selectedId?: string | null
  onSelect: (id: string) => void
  from?: string
  to?: string
  onFrom?: (value: string) => void
  onTo?: (value: string) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = items.find((item) => item.id === selectedId)

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((item) => !needle || `${item.label} ${item.meta ?? ''}`.toLowerCase().includes(needle)).slice(0, 12)
  }, [items, query])

  return (
    <div className="relative min-w-[260px] flex-1" ref={rootRef}>
      <button type="button" className="flex w-full items-center justify-between gap-space-sm rounded-lg border border-line bg-surface-container-lowest px-space-sm py-2 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="truncate text-on-surface">{selected?.label ?? placeholder}</span>
        <span className="material-symbols-outlined text-base text-on-surface-variant">expand_more</span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[320px] rounded-xl border border-line bg-surface-container-lowest p-space-sm shadow-lg">
          <input className="w-full rounded-lg border border-line px-space-sm py-2 mb-space-sm" placeholder={placeholder} value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          {onFrom && onTo && (
            <div className="grid grid-cols-2 gap-space-xs mb-space-sm">
              <label className="font-label-sm text-label-sm text-on-surface-variant">Từ ngày<DateTimeField value={from ?? ''} onChange={onFrom} /></label>
              <label className="font-label-sm text-label-sm text-on-surface-variant">Đến ngày<DateTimeField value={to ?? ''} onChange={onTo} /></label>
            </div>
          )}
          <ul className="max-h-64 overflow-y-auto" role="listbox">
            {visible.length === 0 && <li className="px-space-sm py-2 text-on-surface-variant">Không có kết quả</li>}
            {visible.map((item) => (
              <li key={item.id}>
                <button type="button" className={cx('flex w-full items-center justify-between gap-space-sm rounded-lg px-space-sm py-1.5 text-left hover:bg-surface-container', item.id === selectedId && 'bg-primary-fixed/40')} onClick={() => { onSelect(item.id); setOpen(false) }}>
                  <span className="min-w-0">
                    <span className="block truncate font-title-md text-title-md text-on-surface">{item.label}</span>
                    {item.meta && <span className="block truncate font-label-md text-label-md text-on-surface-variant">{item.meta}</span>}
                  </span>
                  {item.badge && <span className="shrink-0 rounded-full bg-secondary-container px-2 py-0.5 font-label-sm text-label-sm text-on-secondary-container">{item.badge}</span>}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-space-xs font-label-sm text-label-sm text-on-surface-variant">Enter để chọn · Esc để đóng</p>
        </div>
      )}
    </div>
  )
}
