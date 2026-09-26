import { useMemo, useState } from 'react'
import type { Product, ProductType } from '../data/sampleProducts'

const TYPE_LABELS: Record<ProductType, string> = {
  game_disc: 'Đĩa game',
  controller: 'Tay cầm',
  accessory: 'Phụ kiện',
}

export function useProductFilters(products: Product[]) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set())
  const [selectedTypes, setSelectedTypes] = useState<Set<ProductType>>(new Set())

  const availablePlatforms = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => p.platforms?.forEach((pl) => set.add(pl)))
    return Array.from(set).sort()
  }, [products])

  const availableTypes = useMemo(() => {
    const set = new Set<ProductType>()
    products.forEach((p) => set.add(p.productType))
    return Array.from(set)
  }, [products])

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(platform)) next.delete(platform)
      else next.add(platform)
      return next
    })
  }

  const toggleType = (type: ProductType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const platformOk = selectedPlatforms.size === 0 || p.platforms?.some((pl) => selectedPlatforms.has(pl))
      const typeOk = selectedTypes.size === 0 || selectedTypes.has(p.productType)
      return platformOk && typeOk
    })
  }, [products, selectedPlatforms, selectedTypes])

  const hasActiveFilters = selectedPlatforms.size > 0 || selectedTypes.size > 0

  const clear = () => {
    setSelectedPlatforms(new Set())
    setSelectedTypes(new Set())
  }

  return {
    filtered,
    availablePlatforms,
    availableTypes,
    selectedPlatforms,
    selectedTypes,
    togglePlatform,
    toggleType,
    hasActiveFilters,
    clear,
    typeLabels: TYPE_LABELS,
  }
}
