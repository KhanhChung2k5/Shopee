import type { useProductFilters } from '../state/useProductFilters'
import { Chip } from './ui'

export default function ProductFilterBar({ filters }: { filters: ReturnType<typeof useProductFilters> }) {
  const { availablePlatforms, availableTypes, selectedPlatforms, selectedTypes, togglePlatform, toggleType, hasActiveFilters, clear, typeLabels } = filters

  if (availablePlatforms.length === 0 && availableTypes.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-space-xs" role="group" aria-label="Bộ lọc sản phẩm">
      {availableTypes.length > 1 &&
        availableTypes.map((t) => (
          <Chip key={t} active={selectedTypes.has(t)} onClick={() => toggleType(t)}>
            {typeLabels[t]}
          </Chip>
        ))}
      {availablePlatforms.map((pl) => (
        <Chip key={pl} active={selectedPlatforms.has(pl)} onClick={() => togglePlatform(pl)}>
          {pl}
        </Chip>
      ))}
      {hasActiveFilters && (
        <button type="button" className="px-space-sm py-1.5 font-title-md text-title-md text-primary hover:underline cursor-pointer" onClick={clear}>
          Xoá lọc ✕
        </button>
      )}
    </div>
  )
}
