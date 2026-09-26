import { useParams, Link } from 'react-router-dom'
import { CATEGORIES, categorySlug, productsByCategorySlug } from '../data/sampleProducts'
import ProductGridStatic from '../components/ProductGridStatic'
import ProductFilterBar from '../components/ProductFilterBar'
import { useProductFilters } from '../state/useProductFilters'

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const category = CATEGORIES.find((c) => categorySlug(c.label) === slug)
  const products = slug ? productsByCategorySlug(slug) : []
  const filters = useProductFilters(products)

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-5)' }}>
      <nav aria-label="breadcrumb" style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 'var(--space-3)' }}>
        <Link to="/">Trang chủ</Link> / {category?.label ?? 'Danh mục'}
      </nav>
      <h1 className="section-title">{category?.label ?? 'Không tìm thấy danh mục'}</h1>
      <ProductFilterBar filters={filters} />
      <ProductGridStatic products={filters.filtered} />
    </div>
  )
}
