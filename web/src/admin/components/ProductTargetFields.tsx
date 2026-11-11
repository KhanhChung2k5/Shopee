import { useEffect, useState } from 'react'
import { buttonClass } from '../../components/ui'
import { formatVnd } from '../../lib/catalog'
import {
  fetchProductFacets, previewProductAudience, searchCrmProducts,
  type CrmProduct, type CrmProductFilter, type ProductFacets,
} from '../../lib/crm'

export interface ProductTargetValue {
  productIds: string[]
  filter: CrmProductFilter | null
}

export const EMPTY_TARGET: ProductTargetValue = { productIds: [], filter: null }

const TYPE_LABEL: Record<string, string> = {
  game_disc: 'Đĩa game',
  controller: 'Tay cầm',
  accessory: 'Phụ kiện',
}

export function cleanProductFilter(raw: CrmProductFilter | null): CrmProductFilter | null {
  if (!raw) return null
  const filter: CrmProductFilter = {}
  if (raw.keyword?.trim()) filter.keyword = raw.keyword.trim()
  if (raw.productType) filter.productType = raw.productType
  if (raw.categoryId) filter.categoryId = raw.categoryId
  if (raw.genre) filter.genre = raw.genre
  if (raw.platform) filter.platform = raw.platform
  if (raw.priceMin != null && raw.priceMin !== ('' as unknown as number) && !Number.isNaN(Number(raw.priceMin))) filter.priceMin = Number(raw.priceMin)
  if (raw.priceMax != null && raw.priceMax !== ('' as unknown as number) && !Number.isNaN(Number(raw.priceMax))) filter.priceMax = Number(raw.priceMax)
  if (raw.publishedOnly) filter.publishedOnly = true
  const keyed = Object.keys(filter).filter((key) => key !== 'publishedOnly')
  return keyed.length > 0 || filter.publishedOnly ? filter : null
}

/** Chọn sản phẩm cụ thể hoặc bộ lọc catalog — cùng hợp đồng với màn CRM (product-target). */
export default function ProductTargetFields({ token, value, onChange }: {
  token: string
  value: ProductTargetValue
  onChange: (next: ProductTargetValue) => void
}) {
  const [facets, setFacets] = useState<ProductFacets | null>(null)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<CrmProduct[]>([])
  const [picked, setPicked] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState('')

  useEffect(() => {
    fetchProductFacets(token).then(setFacets).catch(() => setFacets(null))
  }, [token])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ publishedOnly: 'true' })
      if (query.trim()) params.set('keyword', query.trim())
      searchCrmProducts(token, params)
        .then((data) => setHits(data.products.slice(0, 8)))
        .catch(() => setHits([]))
    }, 250)
    return () => window.clearTimeout(handle)
  }, [token, query])

  useEffect(() => {
    const filter = cleanProductFilter(value.filter)
    if (value.productIds.length === 0 && !filter) {
      setPreview('Chưa chọn sản phẩm hay bộ lọc.')
      return
    }
    const handle = window.setTimeout(() => {
      previewProductAudience(token, { productIds: value.productIds, filter })
        .then((data) => setPreview(`${data.productCount} sản phẩm khớp · ${data.activeBuyerCount} khách đang hoạt động từng mua.`))
        .catch(() => setPreview('Không ước tính được số người nhận.'))
    }, 300)
    return () => window.clearTimeout(handle)
  }, [token, value])

  const toggleProduct = (product: CrmProduct) => {
    setPicked((names) => ({ ...names, [product.id]: product.name }))
    const next = value.productIds.includes(product.id)
      ? value.productIds.filter((id) => id !== product.id)
      : [...value.productIds, product.id]
    onChange({ ...value, productIds: next })
  }

  const patchFilter = (patch: Partial<CrmProductFilter>) => {
    onChange({ ...value, filter: { ...(value.filter ?? { publishedOnly: true }), ...patch } })
  }

  const filter = value.filter ?? {}

  return (
    <div className="md:col-span-2 space-y-space-sm rounded-lg border border-line p-space-md">
      <div className="font-title-md text-title-md text-on-surface">Sản phẩm mục tiêu</div>
      <p className="font-body-md text-body-md text-on-surface-variant">Chọn sản phẩm cụ thể, hoặc một bộ lọc. Có thể dùng cùng phân khúc.</p>
      <label>Tìm sản phẩm
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tên, hãng…" />
      </label>
      {hits.length > 0 && (
        <ul className="max-h-40 overflow-y-auto divide-y divide-line rounded-lg border border-line">
          {hits.map((product) => (
            <li key={product.id}>
              <label className="!flex-row items-center gap-space-sm !text-on-surface px-space-sm py-1.5 cursor-pointer">
                <input type="checkbox" checked={value.productIds.includes(product.id)} onChange={() => toggleProduct(product)} />
                <span className="min-w-0">
                  <span className="block truncate">{product.name}</span>
                  <span className="block font-label-md text-label-md text-on-surface-variant">{TYPE_LABEL[product.productType ?? ''] ?? product.productType} · {formatVnd(product.price)}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {value.productIds.length > 0 && (
        <p className="font-label-md text-label-md text-on-surface-variant">Đã chọn {value.productIds.length} sản phẩm{Object.keys(picked).length ? `: ${value.productIds.map((id) => picked[id] ?? id.slice(0, 8)).join(', ')}` : ''}.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
        <label>Từ khóa bộ lọc<input value={filter.keyword ?? ''} onChange={(e) => patchFilter({ keyword: e.target.value })} placeholder="VD: FIFA" /></label>
        <label>Loại sản phẩm
          <select value={filter.productType ?? ''} onChange={(e) => patchFilter({ productType: e.target.value || null })}>
            <option value="">Tất cả</option>
            {(facets?.productTypes ?? Object.keys(TYPE_LABEL)).map((type) => <option key={type} value={type}>{TYPE_LABEL[type] ?? type}</option>)}
          </select>
        </label>
        <label>Danh mục
          <select value={filter.categoryId ?? ''} onChange={(e) => patchFilter({ categoryId: e.target.value || null })}>
            <option value="">Tất cả</option>
            {facets?.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label>Thể loại
          <select value={filter.genre ?? ''} onChange={(e) => patchFilter({ genre: e.target.value || null })}>
            <option value="">Tất cả</option>
            {facets?.genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
          </select>
        </label>
        <label>Nền tảng
          <select value={filter.platform ?? ''} onChange={(e) => patchFilter({ platform: e.target.value || null })}>
            <option value="">Tất cả</option>
            {facets?.platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
          </select>
        </label>
        <label className="!flex-row items-center gap-space-xs !text-on-surface self-end pb-2">
                <input type="checkbox" checked={Boolean(value.filter?.publishedOnly)} onChange={(e) => patchFilter({ publishedOnly: e.target.checked })} />
          Chỉ sản phẩm đang bán
        </label>
        <label>Giá từ<input type="number" min={0} value={filter.priceMin ?? ''} onChange={(e) => patchFilter({ priceMin: e.target.value === '' ? null : Number(e.target.value) })} /></label>
        <label>Giá đến<input type="number" min={0} value={filter.priceMax ?? ''} onChange={(e) => patchFilter({ priceMax: e.target.value === '' ? null : Number(e.target.value) })} /></label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <p className="font-body-md text-body-md text-on-surface-variant">{preview}</p>
        <button type="button" className={buttonClass('outline', 'sm')} onClick={() => onChange(EMPTY_TARGET)}>Xóa mục tiêu sản phẩm</button>
      </div>
    </div>
  )
}
