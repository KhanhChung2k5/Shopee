import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CatalogProductGrid from '../components/CatalogProductGrid'
import ProductFilterBar from '../components/ProductFilterBar'
import { fetchProducts, type CatalogProductSummary } from '../lib/catalog'
import { useProductFilters } from '../state/useProductFilters'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [results, setResults] = useState<CatalogProductSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    fetchProducts(new URLSearchParams({ search: q.trim(), page: '0', size: '100' }))
      .then((result) => {
        if (!active) return
        setResults(result.content)
      })
      .catch(() => {
        if (active) {
          setError('Không tải được sản phẩm. Vui lòng thử lại sau.')
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [q])

  const filters = useProductFilters(results)

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-5)' }}>
      <h1 className="section-title">
        {q ? `Kết quả cho "${q}" (${filters.filtered.length})` : `Tất cả sản phẩm (${filters.filtered.length})`}
      </h1>
      <ProductFilterBar filters={filters} />
      {error && <p role="alert" style={{ color: 'var(--color-urgent)' }}>{error}</p>}
      {loading ? <p>Đang tải sản phẩm…</p> : <CatalogProductGrid products={filters.filtered} />}
    </div>
  )
}
