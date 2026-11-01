import { useId, useMemo, useState } from 'react'
import { describeAttributes } from '../../lib/catalog'
import { variantLabel, type VariantOption } from '../variants'

const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()

interface Props {
  variants: VariantOption[]
  value: string
  onChange: (variantId: string) => void
  placeholder?: string
}

/**
 * Search-as-you-type picker: staff type part of the product name (accents optional) or the SKU,
 * instead of having to remember which code is which product.
 */
export default function VariantPicker({ variants, value, onChange, placeholder = 'Gõ tên sản phẩm hoặc SKU…' }: Props) {
  const listId = useId()
  const selected = variants.find((variant) => variant.id === value)
  const [query, setQuery] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const sorted = useMemo(() => [...variants].sort((x, y) => x.productName.localeCompare(y.productName, 'vi')), [variants])
  const matches = useMemo(() => {
    const words = fold(query ?? '').split(/\s+/).filter(Boolean)
    return sorted.filter((variant) => {
      const haystack = fold(`${variant.productName} ${variant.sku}`)
      return words.every((word) => haystack.includes(word))
    })
  }, [sorted, query])

  const pick = (variant: VariantOption) => {
    onChange(variant.id)
    setQuery(null)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input type="search" role="combobox" aria-expanded={open} aria-controls={listId} autoComplete="off"
        placeholder={placeholder}
        value={query ?? (selected ? variantLabel(selected) : '')}
        onFocus={() => { setQuery(''); setOpen(true) }}
        onBlur={() => { setQuery(null); setOpen(false) }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && open && matches[0]) { event.preventDefault(); pick(matches[0]) }
          if (event.key === 'Escape') (event.target as HTMLInputElement).blur()
        }} />
      {open && (
        <ul id={listId} role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-surface-container-lowest py-1 shadow-lg">
          {matches.length === 0 && <li className="px-space-sm py-2 font-body-md text-body-md text-on-surface-variant">Không có sản phẩm khớp</li>}
          {matches.map((variant) => (
            <li key={variant.id} role="option" aria-selected={variant.id === value}
              className={`cursor-pointer px-space-sm py-1.5 hover:bg-surface-container ${variant.id === value ? 'bg-surface-container' : ''}`}
              onMouseDown={(event) => { event.preventDefault(); pick(variant) }}>
              <div className="font-body-md text-body-md text-on-surface">{variant.productName}{describeAttributes(variant.attributes) ? ` (${describeAttributes(variant.attributes)})` : ''}</div>
              <small className="font-label-sm text-label-sm text-on-surface-variant">{variant.sku}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
