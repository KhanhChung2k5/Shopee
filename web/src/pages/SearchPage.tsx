import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CatalogProductGrid from '../components/CatalogProductGrid'
import ProductFilterBar from '../components/ProductFilterBar'
import { Alert, Loading, Page, PageHeader } from '../components/ui'
import { fetchProducts, type CatalogProductSummary } from '../lib/catalog'
import { useProductFilters } from '../state/useProductFilters'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const typeParam = searchParams.get('type') ?? ''
  const [results, setResults] = useState<CatalogProductSummary[]>([])
  const [isRecommendation, setIsRecommendation] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setIsRecommendation(false)

    const params = new URLSearchParams({ page: '0', size: '100' })
    if (q.trim()) params.set('search', q.trim())
    if (typeParam) params.set('productType', typeParam)

    fetchProducts(params)
      .then(async (result) => {
        if (!active) return
        if (result.content && result.content.length > 0) {
          setResults(result.content)
        } else if (q.trim()) {
          // Fallback to all products with smart client match or recommendations
          try {
            const allRes = await fetchProducts(new URLSearchParams({ page: '0', size: '100' }))
            if (!active) return
            const needle = q.trim().toLowerCase()
            const clientMatched = allRes.content.filter((p) => {
              const nameMatch = p.name.toLowerCase().includes(needle)
              const platformMatch = p.platforms?.some((pl) => pl.toLowerCase().includes(needle))
              const xboxMatch = needle.includes('xbox') && (p.productType === 'controller' || p.platforms?.some(pl => pl.toLowerCase().includes('xbox')))
              const switchMatch = needle.includes('switch') && (p.productType === 'controller' || p.productType === 'game_disc')
              return nameMatch || platformMatch || xboxMatch || switchMatch
            })

            if (clientMatched.length > 0) {
              setResults(clientMatched)
            } else {
              setResults(allRes.content)
              setIsRecommendation(true)
            }
          } catch {
            setResults([])
          }
        } else {
          setResults([])
        }
      })
      .catch(() => {
        if (active) {
          setError('Không tải được sản phẩm. Vui lòng thử lại sau.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [q, typeParam])

  const filters = useProductFilters(results)

  return (
    <Page>
      <PageHeader
        breadcrumb={[{ label: 'Trang chủ', to: '/' }, { label: 'Tìm kiếm' }]}
        title={q ? `Kết quả cho "${q}"` : 'Tất cả sản phẩm'}
        subtitle={
          loading
            ? undefined
            : isRecommendation
              ? `Không tìm thấy chính xác sản phẩm cho "${q}". Gợi ý ${filters.filtered.length} sản phẩm gaming nổi bật:`
              : `${filters.filtered.length} sản phẩm`
        }
      />
      <ProductFilterBar filters={filters} />
      {error && <Alert>{error}</Alert>}
      {loading ? (
        <Loading>Đang tải sản phẩm…</Loading>
      ) : filters.filtered.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-space-xl text-center border border-dashed border-outline-variant my-space-md">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-space-sm">filter_alt_off</span>
          <h3 className="font-title-lg text-title-lg text-on-surface mb-1">Không tìm thấy sản phẩm phù hợp</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-space-md max-w-md mx-auto">
            Không có mặt hàng nào khớp với điều kiện lọc hiện tại.
          </p>
          {filters.hasActiveFilters && (
            <button
              type="button"
              onClick={filters.clear}
              className="px-space-lg py-2 bg-primary text-on-primary font-title-md text-title-md rounded-lg hover:bg-primary-container transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              <span>Xoá toàn bộ bộ lọc</span>
            </button>
          )}
        </div>
      ) : (
        <CatalogProductGrid products={filters.filtered} />
      )}
    </Page>
  )
}
