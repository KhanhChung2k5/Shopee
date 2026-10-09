import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CatalogProductGrid from '../components/CatalogProductGrid'
import ProductGridStatic from '../components/ProductGridStatic'
import ProductFilterBar from '../components/ProductFilterBar'
import { fetchProducts, type CatalogProductSummary } from '../lib/catalog'
import { useProductFilters } from '../state/useProductFilters'
import { searchProducts } from '../data/sampleProducts'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [results, setResults] = useState<CatalogProductSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [usingSampleData, setUsingSampleData] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    fetchProducts(new URLSearchParams({ search: q.trim(), page: '0', size: '100' }))
      .then((result) => {
        if (!active) return
        setResults(result.content)
        setUsingSampleData(result.totalElements === 0)
      })
      .catch(() => {
        if (active) {
          setUsingSampleData(true)
          setError('API chưa tải được sản phẩm; đang hiển thị dữ liệu mẫu.')
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [q])

  const filters = useProductFilters(results)
  const sampleFilters = useProductFilters(searchProducts(q))

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-5)' }}>
      <h1 className="section-title">
        {q ? `Kết quả cho "${q}" (${usingSampleData ? sampleFilters.filtered.length : filters.filtered.length})` : `Tất cả sản phẩm (${usingSampleData ? sampleFilters.filtered.length : filters.filtered.length})`}
      </h1>
      <ProductFilterBar filters={usingSampleData ? sampleFilters : filters} />
      {error && <p role="alert" style={{ color: 'var(--color-urgent)' }}>{error}</p>}
      {!loading && usingSampleData && !error && <p role="status" style={{ color: 'var(--color-muted-foreground)' }}>API chưa có sản phẩm đã xuất bản; đang hiển thị dữ liệu mẫu.</p>}
      {loading ? <p>Đang tải sản phẩm…</p> : usingSampleData
        ? <ProductGridStatic products={sampleFilters.filtered} />
        : <CatalogProductGrid products={filters.filtered} />}
    </div>
  )
}
