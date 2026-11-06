import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../../components/ui'
import { a, chipClass } from '../adminUi'
import { MAX_PINNED, useSavedSearches, type ViewedItem } from './listSearchState'

/**
 * Thanh tìm kiếm dùng chung cho các trang quản trị:
 *  - ô tìm kiếm có gợi ý "tìm gần đây" và "đã ghim" (ghim tối đa 3 từ khoá),
 *  - nhóm nút lọc theo trạng thái,
 *  - dải "đã xem gần đây" (các bản ghi vừa mở).
 * Dữ liệu chỉ lưu trong trình duyệt của từng nhân viên (localStorage, theo user + trang).
 */

export function SearchBox({ page, value, onChange, placeholder = 'Tìm kiếm…', className }: {
  page: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const { recent, pinned, remember, togglePin, forget } = useSavedSearches(page)
  const [open, setOpen] = useState(false)
  const [warning, setWarning] = useState('')
  const boxRef = useRef<HTMLDivElement>(null)
  const term = value.trim()
  const isPinned = term !== '' && pinned.includes(term)

  // Ghi nhớ từ khoá sau khi ngừng gõ 1 giây.
  useEffect(() => {
    if (term.length < 2) return
    const timer = window.setTimeout(() => remember(term), 1000)
    return () => window.clearTimeout(timer)
  }, [term, remember])

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const pin = (t: string) => {
    setWarning(togglePin(t) ? '' : `Chỉ ghim được tối đa ${MAX_PINNED} từ khoá. Bỏ bớt một ghim trước.`)
  }

  const apply = (t: string) => { onChange(t); remember(t); setOpen(false) }
  const recentOnly = recent.filter((r) => !pinned.includes(r))

  return (
    <div className={cx('w-full sm:w-auto', className)}>
      <div ref={boxRef} className="relative">
        <div className="flex items-center gap-1">
          <input
            type="search"
            aria-label={placeholder}
            placeholder={placeholder}
            value={value}
            onFocus={() => setOpen(true)}
            onChange={(e) => { onChange(e.target.value); setOpen(true) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { remember(value); setOpen(false) }
              if (e.key === 'Escape') setOpen(false)
            }}
            className={cx(a.input, 'sm:w-[300px] !rounded-full')}
          />
          {term && (
            <button type="button" title={isPinned ? 'Bỏ ghim từ khoá' : 'Ghim từ khoá này'} aria-pressed={isPinned} onClick={() => pin(term)}
              className={cx('material-symbols-outlined cursor-pointer rounded-full p-1.5 hover:bg-surface-container', isPinned ? 'text-primary' : 'text-on-surface-variant')}
              style={isPinned ? { fontVariationSettings: "'FILL' 1" } : undefined}>
              keep
            </button>
          )}
        </div>
        {open && (pinned.length > 0 || recentOnly.length > 0) && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 min-w-[260px] rounded-xl border border-line bg-surface-container-lowest p-space-xs shadow-lg">
            {pinned.length > 0 && <SuggestHeading>Đã ghim ({pinned.length}/{MAX_PINNED})</SuggestHeading>}
            {pinned.map((t) => (
              <SuggestRow key={`p-${t}`} icon="keep" iconFilled label={t} onPick={() => apply(t)} actionIcon="close" actionLabel="Bỏ ghim" onAction={() => pin(t)} />
            ))}
            {recentOnly.length > 0 && <SuggestHeading>Tìm gần đây</SuggestHeading>}
            {recentOnly.map((t) => (
              <SuggestRow key={`r-${t}`} icon="history" label={t} onPick={() => apply(t)} actionIcon="keep" actionLabel="Ghim" onAction={() => pin(t)} onRemove={() => forget(t)} />
            ))}
          </div>
        )}
      </div>
      {pinned.length > 0 && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {pinned.map((t) => (
            <button key={t} type="button" onClick={() => apply(t)}
              className={cx('inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 font-label-md text-label-md cursor-pointer',
                term === t ? 'border-primary bg-primary-fixed text-on-primary-fixed' : 'border-line text-on-surface-variant hover:border-primary')}>
              <span className="material-symbols-outlined !text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>keep</span>{t}
            </button>
          ))}
        </div>
      )}
      {warning && <p role="alert" className="mt-1 font-label-md text-label-md text-error">{warning}</p>}
    </div>
  )
}

function SuggestHeading({ children }: { children: ReactNode }) {
  return <div className="px-2 pb-0.5 pt-1.5 font-label-sm text-label-sm uppercase tracking-wide text-on-surface-variant">{children}</div>
}

function SuggestRow({ icon, iconFilled, label, onPick, actionIcon, actionLabel, onAction, onRemove }: {
  icon: string
  iconFilled?: boolean
  label: string
  onPick: () => void
  actionIcon: string
  actionLabel: string
  onAction: () => void
  onRemove?: () => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg hover:bg-surface-container-low">
      <button type="button" onClick={onPick} className="flex min-w-0 flex-1 cursor-pointer items-center gap-space-xs px-2 py-1.5 text-left font-body-md text-body-md text-on-surface">
        <span className="material-symbols-outlined !text-base text-on-surface-variant" style={iconFilled ? { fontVariationSettings: "'FILL' 1" } : undefined}>{icon}</span>
        <span className="truncate">{label}</span>
      </button>
      <button type="button" title={actionLabel} aria-label={`${actionLabel}: ${label}`} onClick={onAction}
        className="material-symbols-outlined cursor-pointer rounded p-1 !text-base text-on-surface-variant hover:text-primary">{actionIcon}</button>
      {onRemove && (
        <button type="button" title="Xoá khỏi lịch sử" aria-label={`Xoá ${label} khỏi lịch sử`} onClick={onRemove}
          className="material-symbols-outlined cursor-pointer rounded p-1 !text-base text-on-surface-variant hover:text-error">close</button>
      )}
    </div>
  )
}

/** Nhóm nút lọc trạng thái. {@code counts} (tuỳ chọn) hiện số bản ghi mỗi trạng thái. */
export function StatusFilter<T extends string>({ options, value, onChange, counts, className }: {
  options: ReadonlyArray<readonly [T, string]>
  value: T
  onChange: (value: T) => void
  counts?: Partial<Record<T, number>>
  className?: string
}) {
  return (
    <div role="group" aria-label="Lọc theo trạng thái" className={cx(a.filterBar, 'mb-space-md', className)}>
      {options.map(([key, label]) => (
        <button key={key} type="button" aria-pressed={value === key} className={chipClass(value === key)} onClick={() => onChange(key)}>
          {label}{counts && counts[key] != null ? ` (${counts[key]})` : ''}
        </button>
      ))}
    </div>
  )
}

/** Dải "Đã xem gần đây". Ẩn khi chưa mở bản ghi nào. */
export function RecentViews({ items, onOpen, onClear }: { items: ViewedItem[]; onOpen: (id: string) => void; onClear?: () => void }) {
  if (items.length === 0) return null
  return (
    <div className="mb-space-md flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-0.5 font-label-md text-label-md text-on-surface-variant">
        <span className="material-symbols-outlined !text-base">history</span>Đã xem gần đây:
      </span>
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onOpen(item.id)}
          className="max-w-[220px] truncate rounded-full bg-surface-container-lowest px-2.5 py-0.5 font-label-md text-label-md text-on-surface shadow-sm hover:bg-surface-container cursor-pointer">
          {item.label}
        </button>
      ))}
      {onClear && <button type="button" className={a.linkButton + ' !font-label-md !text-label-md'} onClick={onClear}>Xoá</button>}
    </div>
  )
}
