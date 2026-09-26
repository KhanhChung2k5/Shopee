import { useSearchParams } from 'react-router-dom'
import { searchProducts } from '../data/sampleProducts'
import ProductGridStatic from '../components/ProductGridStatic'
import ProductFilterBar from '../components/ProductFilterBar'
import { useProductFilters } from '../state/useProductFilters'

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const results = searchProducts(q)
  const filters = useProductFilters(results)

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-5)' }}>
      <h1 className="section-title">
        {q ? `Kết quả cho "${q}" (${filters.filtered.length}/${results.length})` : 'Nhập từ khoá để tìm kiếm'}
      </h1>
      <ProductFilterBar filters={filters} />
      <ProductGridStatic products={filters.filtered} />
    </div>
  )
}
