import { cx } from '../../components/ui'
import type { ViewMode } from './listSearchState'

const OPTIONS: { id: ViewMode; label: string; icon: string }[] = [
  { id: 'list', label: 'Danh sách', icon: 'view_list' },
  { id: 'grid', label: 'Lưới', icon: 'grid_view' },
]

export function ViewModeToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div role="group" aria-label="Kiểu hiển thị" className="inline-flex rounded-lg bg-surface-container-low p-0.5">
      {OPTIONS.map((option) => {
        const active = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cx(
              'inline-flex items-center gap-1 rounded-md px-space-sm py-1.5 font-label-md text-label-md cursor-pointer transition-colors',
              active ? 'bg-inverse-surface text-inverse-on-surface' : 'text-on-surface-variant hover:text-on-surface',
            )}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">{option.icon}</span>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
