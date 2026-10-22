import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import CatalogProductGrid from '../components/CatalogProductGrid'
import { Alert, Button, Card, Loading, Page, PageHeader, inputClass } from '../components/ui'
import { cacheCategories, fetchCategories, fetchProducts, getCachedCategories, type CatalogCategory, type CatalogProductSummary } from '../lib/catalog'

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

  useEffect(() => {
    let active = true
    const cachedCategory = getCachedCategories().find((item) => item.slug === slug) ?? null
    if (cachedCategory) setCategory(cachedCategory)
    setLoading(true)
    setError('')
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
        } else {
          setCategory(null)
          setProducts([])
        }
        setPage(0)
      })
      .catch((err: unknown) => {
        if (!active) return
        const cached = getCachedCategories().find((item) => item.slug === slug)
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

  return (
    <Page>
      <PageHeader
        breadcrumb={[{ label: 'Trang chủ', to: '/' }, { label: category?.name ?? 'Danh mục' }]}
        title={category?.name ?? (loading ? 'Đang tải danh mục…' : 'Không tìm thấy danh mục')}
        subtitle={loading ? undefined : `${filtered.length} sản phẩm`}
      />

      <Card className="flex flex-wrap items-center gap-space-sm !p-space-md" role="group" aria-label="Lọc và sắp xếp sản phẩm">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">search</span>
          <input aria-label="Tìm trong danh mục" className={`${inputClass} pl-9`} placeholder="Tìm tên sản phẩm..." value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} />
        </div>
        <select aria-label="Lọc thương hiệu" className={`${inputClass} !w-auto`} value={brand} onChange={(event) => { setBrand(event.target.value); setPage(0) }}>
          <option value="">Tất cả thương hiệu</option>
          {brands.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select aria-label="Lọc loại sản phẩm" className={`${inputClass} !w-auto`} value={productType} onChange={(event) => { setProductType(event.target.value); setPage(0) }}>
          <option value="">Tất cả loại</option>
          <option value="game_disc">Đĩa game</option>
          <option value="controller">Tay cầm</option>
          <option value="accessory">Phụ kiện</option>
        </select>
        <select aria-label="Sắp xếp sản phẩm" className={`${inputClass} !w-auto md:ml-auto`} value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="name">Tên A–Z</option>
          <option value="name-desc">Tên Z–A</option>
          <option value="price-asc">Giá tăng dần</option>
          <option value="price-desc">Giá giảm dần</option>
        </select>
      </Card>

      {error && <Alert>{error}</Alert>}
      {loading ? <Loading>Đang tải sản phẩm…</Loading> : <>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Hiển thị {filtered.length === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} trong {filtered.length} sản phẩm
        </p>
        <CatalogProductGrid products={visible} />
        {pageCount > 1 && <nav className="flex items-center justify-center gap-space-md" aria-label="Phân trang">
          <Button variant="outline" icon="chevron_left" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Trước</Button>
          <span className="font-title-md text-title-md text-on-surface">Trang {page + 1}/{pageCount}</span>
          <Button variant="outline" disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>
            Tiếp <span className="material-symbols-outlined text-base">chevron_right</span>
          </Button>
        </nav>}
      </>}
    </Page>
  )
}
