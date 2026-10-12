import { useEffect, useState } from 'react'
import CatalogProductGrid from './CatalogProductGrid'
import { fetchProducts, type CatalogProductSummary } from '../lib/catalog'
import { SUGGESTED_PRODUCTS } from '../data/sampleProducts'
import ProductCard from './ProductCard'
import { useRevealOnScroll } from '../state/useRevealOnScroll'

const PAGE_SIZE = 10

export default function SuggestedProducts() {
  const [products, setProducts] = useState<CatalogProductSummary[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [usingSampleData, setUsingSampleData] = useState(false)
  const revealRef = useRevealOnScroll<HTMLUListElement>(!loading)

  useEffect(() => {
    let active = true
    fetchProducts(new URLSearchParams({ page: '0', size: String(PAGE_SIZE) }))
      .then((result) => {
        if (!active) return
        setProducts(result.content)
        setUsingSampleData(result.content.length === 0)
        setPage(result.page)
        setHasMore(result.content.length > 0 && result.page + 1 < result.totalPages)
      })
      .catch(() => {
        if (active) {
          setUsingSampleData(true)
          setError('API chưa tải được sản phẩm; đang hiển thị dữ liệu mẫu.')
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const result = await fetchProducts(new URLSearchParams({ page: String(page + 1), size: String(PAGE_SIZE) }))
      setProducts((current) => [...current, ...result.content])
      setPage(result.page)
      setHasMore(result.page + 1 < result.totalPages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được thêm sản phẩm.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <section id="suggested-products" className="section" aria-labelledby="suggested-heading">
      <div className="container">
        <h2 id="suggested-heading" className="section-title section-title--plain">Gợi ý hôm nay</h2>
        {error && <p role="alert" style={{ color: 'var(--color-urgent)' }}>{error}</p>}
        {!loading && usingSampleData && <p role="status" style={{ color: 'var(--color-muted-foreground)' }}>API chưa có sản phẩm đã xuất bản; đang hiển thị dữ liệu mẫu.</p>}
        {loading ? <p>Đang tải sản phẩm…</p> : usingSampleData
          ? <ul className="product-grid reveal-grid is-visible" ref={revealRef}>{SUGGESTED_PRODUCTS.map((product) => <ProductCard key={product.id} product={product} />)}</ul>
          : <CatalogProductGrid products={products} className="product-grid reveal-grid" listRef={revealRef} />}
        {!usingSampleData && hasMore && (
          <div className="load-more-wrap">
            <button className="button button--outline" type="button" disabled={loadingMore} onClick={() => void loadMore()}>
              {loadingMore ? 'Đang tải…' : 'Xem thêm sản phẩm'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
