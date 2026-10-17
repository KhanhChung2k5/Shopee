import type { useProductFilters } from '../state/useProductFilters'

export default function ProductFilterBar({ filters }: { filters: ReturnType<typeof useProductFilters> }) {
  const { availablePlatforms, availableTypes, selectedPlatforms, selectedTypes, togglePlatform, toggleType, hasActiveFilters, clear, typeLabels } = filters

  if (availablePlatforms.length === 0 && availableTypes.length === 0) return null

  return (
    <div className="filter-bar" role="group" aria-label="Bộ lọc sản phẩm">
      {availableTypes.length > 1 &&
        availableTypes.map((t) => (
          <button
            key={t}
            type="button"
            className={`filter-chip${selectedTypes.has(t) ? ' filter-chip--active' : ''}`}
            aria-pressed={selectedTypes.has(t)}
            onClick={() => toggleType(t)}
          >
            {typeLabels[t]}
          </button>
        ))}
      {availablePlatforms.map((pl) => (
        <button
          key={pl}
          type="button"
          className={`filter-chip${selectedPlatforms.has(pl) ? ' filter-chip--active' : ''}`}
          aria-pressed={selectedPlatforms.has(pl)}
          onClick={() => togglePlatform(pl)}
        >
          {pl}
        </button>
      ))}
      {hasActiveFilters && (
        <button type="button" className="filter-chip filter-chip--clear" onClick={clear}>
          Xoá lọc ✕
        </button>
      )}
    </div>
  )
}
