import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CatalogProductGrid from '../components/CatalogProductGrid'
import { cacheCategories, fetchCategories, fetchProducts, getCachedCategories, type CatalogCategory, type CatalogProductSummary } from '../lib/catalog'
import ProductGridStatic from '../components/ProductGridStatic'
import ProductFilterBar from '../components/ProductFilterBar'
import { CATEGORIES, categorySlug, productsByCategorySlug } from '../data/sampleProducts'
import { useProductFilters } from '../state/useProductFilters'

const PAGE_SIZE = 12
const API_PAGE_SIZE = 100

async function fetchCategoryProducts(categoryId: string) {
  const firstPage = await fetchProducts(new URLSearchParams({
    categoryId,
    page: '0',
    size: String(API_PAGE_SIZE),
  }))
  const products = [...firstPage.content]
  for (let page = 1; page < firstPage.totalPages; page += 1) {
    const nextPage = await fetchProducts(new URLSearchParams({
      categoryId,
      page: String(page),
      size: String(API_PAGE_SIZE),
    }))
    products.push(...nextPage.content)
  }
  return products
}

function SampleCategoryPage({ slug, name }: { slug: string; name: string }) {
  const filters = useProductFilters(productsByCategorySlug(slug))
  return <div className="container" style={{ paddingBlock: 'var(--space-5)' }}>
    <nav aria-label="breadcrumb" style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 'var(--space-3)' }}>
      <Link to="/">Trang chủ</Link> / {name}
    </nav>
    <p role="status" style={{ color: 'var(--color-muted-foreground)' }}>Chưa có sản phẩm API cho danh mục này; đang hiển thị dữ liệu mẫu.</p>
    <h1 className="section-title">{name}</h1>
    <ProductFilterBar filters={filters} />
    <ProductGridStatic products={filters.filtered} />
  </div>
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const [category, setCategory] = useState<CatalogCategory | null>(() =>
    getCachedCategories().find((item) => item.slug === slug) ?? null,
  )
  const [products, setProducts] = useState<CatalogProductSummary[]>([])
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('')
  const [productType, setProductType] = useState('')
  const [sort, setSort] = useState('name')
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [usingSampleData, setUsingSampleData] = useState(false)

  useEffect(() => {
    let active = true
    const cachedCategory = getCachedCategories().find((item) => item.slug === slug) ?? null
    if (cachedCategory) setCategory(cachedCategory)
    setLoading(true)
    setError('')
    setUsingSampleData(false)
    fetchCategories()
      .then(async (categories) => {
        if (!active) return
        cacheCategories(categories)
        const found = categories.find((item) => item.slug === slug) ?? null
        if (found) {
          setCategory(found)
          const categoryProducts = await fetchCategoryProducts(found.id)
          if (!active) return
          setProducts(categoryProducts)
          const sampleCategory = CATEGORIES.find((item) => categorySlug(item.label) === slug)
          setUsingSampleData(categoryProducts.length === 0 && !!sampleCategory)
        } else {
          const sampleCategory = CATEGORIES.find((item) => categorySlug(item.label) === slug)
          setCategory(sampleCategory && slug ? { id: '', name: sampleCategory.label, slug, parentId: null } : null)
          setProducts([])
          setUsingSampleData(!!sampleCategory)
        }
        setPage(0)
      })
      .catch((err: unknown) => {
        if (!active) return
        const cached = getCachedCategories().find((item) => item.slug === slug)
        const sampleCategory = CATEGORIES.find((item) => categorySlug(item.label) === slug)
        if (sampleCategory && slug) {
          setCategory({ id: '', name: sampleCategory.label, slug, parentId: null })
          setProducts([])
          setUsingSampleData(true)
          setError('API danh mục chưa kết nối; đang hiển thị dữ liệu mẫu.')
          return
        }
        if (cached) {
          setCategory(cached)
          setProducts([])
          setError('Đang giữ tên danh mục đã tải trước đó, nhưng không tải được sản phẩm. Hãy kiểm tra backend rồi thử lại.')
          return
        }
        setError(err instanceof Error ? err.message : 'Không tải được danh mục sản phẩm.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [slug])

  const brands = useMemo(() => [...new Set(products.map((product) => product.brandName).filter((value): value is string => !!value))].sort(), [products])
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi')
    const result = products.filter((product) =>
      (!needle || product.name.toLocaleLowerCase('vi').includes(needle))
      && (!brand || product.brandName === brand)
      && (!productType || product.productType === productType),
    )
    return result.sort((a, b) => {
      if (sort === 'price-asc') return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER)
      if (sort === 'price-desc') return (b.price ?? -1) - (a.price ?? -1)
      if (sort === 'name-desc') return b.name.localeCompare(a.name, 'vi')
      return a.name.localeCompare(b.name, 'vi')
    })
  }, [products, query, brand, productType, sort])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (!loading && usingSampleData && slug && category) return <SampleCategoryPage slug={slug} name={category.name} />

  return (
    <div className="container" style={{ paddingBlock: 'var(--space-5)' }}>
      <nav aria-label="breadcrumb" style={{ fontSize: 13, color: 'var(--color-muted-foreground)', marginBottom: 'var(--space-3)' }}>
        <Link to="/">Trang chủ</Link> / {category?.name ?? 'Danh mục'}
      </nav>
      <h1 className="section-title">{category?.name ?? (loading ? 'Đang tải danh mục…' : 'Không tìm thấy danh mục')}</h1>
      <div className="filter-bar" role="group" aria-label="Lọc và sắp xếp sản phẩm">
        <input aria-label="Tìm trong danh mục" className="search__input" style={{ position: 'static', maxWidth: 260 }} placeholder="Tìm tên sản phẩm..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} />
        <select aria-label="Lọc thương hiệu" className="filter-chip" value={brand} onChange={(event) => { setBrand(event.target.value); setPage(0) }}>
          <option value="">Tất cả thương hiệu</option>
          {brands.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select aria-label="Lọc loại sản phẩm" className="filter-chip" value={productType} onChange={(event) => { setProductType(event.target.value); setPage(0) }}>
          <option value="">Tất cả loại</option>
          <option value="game_disc">Đĩa game</option>
          <option value="controller">Tay cầm</option>
          <option value="accessory">Phụ kiện</option>
        </select>
        <select aria-label="Sắp xếp sản phẩm" className="filter-chip" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="name">Tên A–Z</option>
          <option value="name-desc">Tên Z–A</option>
          <option value="price-asc">Giá tăng dần</option>
          <option value="price-desc">Giá giảm dần</option>
        </select>
      </div>

      {error && <p role="alert" style={{ color: 'var(--color-urgent)' }}>{error}</p>}
      {loading ? <p>Đang tải sản phẩm…</p> : <>
        <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13 }}>Hiển thị {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} trong {filtered.length} sản phẩm</p>
        <CatalogProductGrid products={visible} />
        {pageCount > 1 && <nav className="filter-bar" aria-label="Phân trang">
          <button className="filter-chip" type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>← Trước</button>
          <span>Trang {page + 1}/{pageCount}</span>
          <button className="filter-chip" type="button" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>Tiếp →</button>
        </nav>}
      </>}
    </div>
  )
}
