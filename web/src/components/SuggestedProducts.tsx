import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductTile from './ProductTile'
import { fetchProducts, type CatalogProductSummary, type ProductType } from '../lib/catalog'

type Tab = 'all' | ProductType

interface TabItem {
  id: Tab
  label: string
  icon: string
}

const TABS: TabItem[] = [
  { id: 'all', label: 'Tất Cả', icon: '🔥' },
  { id: 'controller', label: 'Tay Cầm Gaming', icon: '🎮' },
  { id: 'game_disc', label: 'Đĩa Game Mới', icon: '💿' },
  { id: 'accessory', label: 'Phụ Kiện Console', icon: '🛡️' },
]

const PLATFORM_OPTIONS = [
  { id: 'all', label: 'Tất Cả Nền Tảng' },
  { id: 'PS5', label: 'PlayStation 5' },
  { id: 'PC', label: 'PC / Steam Tương Thích' },
]

const PRICE_OPTIONS = [
  { id: 'all', label: 'Mọi Mức Giá' },
  { id: 'under-1m', label: 'Dưới 1 Triệu', max: 1000000 },
  { id: '1m-2m', label: '1 - 2 Triệu', min: 1000000, max: 2000000 },
  { id: 'over-2m', label: 'Trên 2 Triệu', min: 2000000 },
]

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name'

// Offline fallback when the catalog API is unreachable — no orders/reviews to show, so no sold count or rating.
const STITCH_DEFAULT_PRODUCTS: CatalogProductSummary[] = ([
  {
    id: '9386ce6f-e18e-50c9-8092-8c75ec4d4b9a',
    categoryId: '01010101-0000-0000-0000-000000000002',
    name: 'Đĩa PS5 Horizon Zero Dawn Remastered',
    productType: 'game_disc',
    brandName: 'Playstation Studios',
    price: 1249000,
    comparePrice: 1249000,
    imageUrls: [
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-d1-1.webp',
    ],
    platforms: ['PS5'],
  },
  {
    id: 'da16eedf-0a60-525c-855c-6783bd9af2bb',
    categoryId: '01010101-0000-0000-0000-000000000001',
    name: 'Tay cầm không dây DualSense - Chroma Indigo',
    productType: 'controller',
    brandName: 'Sony PlayStation',
    price: 2299000,
    comparePrice: 2299000,
    imageUrls: [
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-c1-1.webp',
    ],
    platforms: ['PS5/PC'],
  },
  {
    id: 'ed6de72d-7afd-5f30-bd3a-e4ad9db6411e',
    categoryId: '01010101-0000-0000-0000-000000000002',
    name: 'Đĩa PS5 Astro Bot',
    productType: 'game_disc',
    brandName: 'Playstation Studios',
    price: 1499000,
    comparePrice: 1499000,
    imageUrls: [
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-d4-1.webp',
    ],
    platforms: ['PS5'],
  },
  {
    id: '976110cc-8f9c-519e-91e1-1cfebf415135',
    categoryId: '01010101-0000-0000-0000-000000000001',
    name: 'Tay cầm DualSense - Chroma Pearl',
    productType: 'controller',
    brandName: 'Sony PlayStation',
    price: 1339900,
    comparePrice: 1339900,
    imageUrls: [
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-c2-1.webp',
    ],
    platforms: ['PS5/PC'],
  },
  {
    id: 'eb538024-56e6-5134-aef6-927c163ac9aa',
    categoryId: '01010101-0000-0000-0000-000000000002',
    name: 'Đĩa PS5 Stellar Blade',
    productType: 'game_disc',
    brandName: 'Playstation Studios',
    price: 1799000,
    comparePrice: 1799000,
    imageUrls: [
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-d5-1.webp',
    ],
    platforms: ['PS5'],
  },
  {
    id: '2d75c302-3457-5a9c-99be-6e844546018f',
    categoryId: '01010101-0000-0000-0000-000000000002',
    name: 'Đĩa PS5 Spider-Man 2 Standard',
    productType: 'game_disc',
    brandName: 'Playstation Studios',
    price: 14499000,
    comparePrice: 14499000,
    imageUrls: [
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-d9-1.webp',
    ],
    platforms: ['PS5'],
  },
  {
    id: '0a13b6d2-1e8a-51c3-91c8-310351af0c60',
    categoryId: '01010101-0000-0000-0000-000000000001',
    name: 'Tay cầm không dây DualSense Edge',
    productType: 'controller',
    brandName: 'Sony PlayStation',
    price: 5699000,
    comparePrice: 5699000,
    imageUrls: [
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-c5-1.webp',
    ],
    platforms: ['PS5/PC'],
  },
  {
    id: '916871f7-a4b6-51e6-afb8-fa8f8d9c6aef',
    categoryId: '01010101-0000-0000-0000-000000000003',
    name: 'Đế sạc cho tay cầm DualSense',
    productType: 'accessory',
    brandName: 'Sony PlayStation',
    price: 799000,
    comparePrice: 799000,
    imageUrls: [
      'https://egjqoclztrflmtuxclsp.supabase.co/storage/v1/object/public/CNPM/products/gallery/sp-a5-1.webp',
    ],
    platforms: ['PS5'],
  },
] satisfies Omit<CatalogProductSummary, 'soldCount' | 'ratingAverage' | 'ratingCount'>[])
  .map((product) => ({ ...product, soldCount: 0, ratingAverage: null, ratingCount: 0 }))

const INITIAL_DISPLAY_COUNT = 12

export default function SuggestedProducts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab') as Tab | null
  const platformFromUrl = searchParams.get('platform') ?? ''

  const activeTab: Tab = (tabFromUrl && ['all', 'controller', 'game_disc', 'accessory'].includes(tabFromUrl))
    ? tabFromUrl
    : 'all'

  const [allProducts, setAllProducts] = useState<CatalogProductSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlatform, setSelectedPlatform] = useState<string>(platformFromUrl || 'all')
  const [selectedPrice, setSelectedPrice] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('featured')
  const [visibleCount, setVisibleCount] = useState(INITIAL_DISPLAY_COUNT)

  // Sync platform when URL changes
  useEffect(() => {
    if (platformFromUrl) {
      setSelectedPlatform(platformFromUrl)
    } else {
      setSelectedPlatform('all')
    }
  }, [platformFromUrl])

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(INITIAL_DISPLAY_COUNT)
  }, [activeTab, selectedPlatform, selectedPrice, sortBy])

  // Fetch all products to support instant zero-delay dynamic client-side filtering
  useEffect(() => {
    let active = true
    setLoading(true)
    fetchProducts(new URLSearchParams({ page: '0', size: '100' }))
      .then((res) => {
        if (!active) return
        if (res.content && res.content.length > 0) {
          setAllProducts(res.content)
        } else {
          setAllProducts(STITCH_DEFAULT_PRODUCTS)
        }
      })
      .catch(() => {
        if (!active) return
        setAllProducts(STITCH_DEFAULT_PRODUCTS)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Calculate live counts for each tab
  const counts = useMemo(() => {
    const list = allProducts.length > 0 ? allProducts : STITCH_DEFAULT_PRODUCTS
    return {
      all: list.length,
      controller: list.filter((p) => p.productType === 'controller').length,
      game_disc: list.filter((p) => p.productType === 'game_disc').length,
      accessory: list.filter((p) => p.productType === 'accessory').length,
    }
  }, [allProducts])

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    const base = allProducts.length > 0 ? allProducts : STITCH_DEFAULT_PRODUCTS
    let result = [...base]

    // 1. Filter by Tab (Product Type)
    if (activeTab !== 'all') {
      result = result.filter((p) => p.productType === activeTab)
    }

    // 2. Filter by Platform
    if (selectedPlatform !== 'all') {
      result = result.filter((p) => {
        if (!p.platforms || p.platforms.length === 0) return true
        const needle = selectedPlatform.toLowerCase()
        return p.platforms.some((pl) => {
          const lower = pl.toLowerCase()
          if (needle === 'pc') return lower.includes('pc') || lower.includes('steam')
          return lower.includes(needle)
        })
      })
    }

    // 3. Filter by Price Range
    if (selectedPrice !== 'all') {
      const range = PRICE_OPTIONS.find((r) => r.id === selectedPrice)
      if (range) {
        result = result.filter((p) => {
          const price = p.price ?? 0
          if (range.min != null && price < range.min) return false
          if (range.max != null && price > range.max) return false
          return true
        })
      }
    }

    // 4. Sort
    result.sort((a, b) => {
      if (sortBy === 'price-asc') return (a.price ?? 0) - (b.price ?? 0)
      if (sortBy === 'price-desc') return (b.price ?? 0) - (a.price ?? 0)
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'vi')
      return 0
    })

    return result
  }, [allProducts, activeTab, selectedPlatform, selectedPrice, sortBy])

  const displayedProducts = filteredProducts.slice(0, visibleCount)

  const handleTabClick = (tabId: Tab) => {
    const next = new URLSearchParams(searchParams)
    if (tabId === 'all') {
      next.delete('tab')
    } else {
      next.set('tab', tabId)
    }
    setSearchParams(next, { replace: true })
  }

  const handlePlatformClick = (platformId: string) => {
    const next = new URLSearchParams(searchParams)
    if (platformId === 'all') {
      next.delete('platform')
      setSelectedPlatform('all')
    } else {
      next.set('platform', platformId)
      setSelectedPlatform(platformId)
    }
    setSearchParams(next, { replace: true })
  }

  const handleResetFilters = () => {
    setSelectedPlatform('all')
    setSelectedPrice('all')
    setSortBy('featured')
    const next = new URLSearchParams(searchParams)
    next.delete('tab')
    next.delete('platform')
    setSearchParams(next, { replace: true })
  }

  const hasActiveFilters = activeTab !== 'all' || selectedPlatform !== 'all' || selectedPrice !== 'all' || sortBy !== 'featured'

  return (
    <section id="goi-y" className="space-y-space-md scroll-mt-36">
      {/* Header & Main Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md border-b-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              Gợi Ý Cho Game Thủ
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-xs">
              {filteredProducts.length} sản phẩm
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Tuyển chọn tay cầm gaming &amp; đĩa game bán chạy nhất được cộng đồng đánh giá cao
          </p>
        </div>

        {/* Primary Type Tabs */}
        <div className="flex items-center gap-space-xs overflow-x-auto pb-1" id="filter-tabs">
          {TABS.map((tab) => {
            const count = counts[tab.id]
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                className={`px-space-md py-2 font-title-md text-title-md rounded-lg shadow-sm whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-inverse-surface text-inverse-on-surface font-semibold ring-2 ring-inverse-surface shadow'
                    : 'bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-outline-variant/30'
                }`}
                type="button"
                onClick={() => handleTabClick(tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-inverse-on-surface/20 text-inverse-on-surface'
                      : 'bg-surface-container-high text-on-surface-variant'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Secondary Quick Filter Bar (Platform, Price, Sort) */}
      <div className="bg-surface-container-lowest p-space-sm rounded-xl border border-outline-variant/20 shadow-sm flex flex-wrap items-center justify-between gap-space-sm text-label-md font-label-md">
        {/* Platform chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-on-surface-variant font-medium text-xs whitespace-nowrap flex items-center gap-1">
            <span className="material-symbols-outlined text-base">devices</span>
            Hệ máy:
          </span>
          {PLATFORM_OPTIONS.map((item) => {
            const isSelected = selectedPlatform === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePlatformClick(item.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Right side: Price filter & Sort select */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-on-surface-variant font-medium text-xs whitespace-nowrap">Giá:</span>
            <select
              aria-label="Lọc theo khoảng giá"
              value={selectedPrice}
              onChange={(e) => setSelectedPrice(e.target.value)}
              className="h-8 px-2 py-0.5 bg-surface-container rounded-md text-xs text-on-surface border-0 outline-none cursor-pointer"
            >
              {PRICE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-on-surface-variant font-medium text-xs whitespace-nowrap">Sắp xếp:</span>
            <select
              aria-label="Sắp xếp sản phẩm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="h-8 px-2 py-0.5 bg-surface-container rounded-md text-xs text-on-surface border-0 outline-none cursor-pointer"
            >
              <option value="featured">Nổi bật nhất</option>
              <option value="price-asc">Giá: Thấp → Cao</option>
              <option value="price-desc">Giá: Cao → Thấp</option>
              <option value="name">Tên: A → Z</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-primary hover:underline flex items-center gap-0.5 cursor-pointer font-medium ml-1"
              title="Đặt lại toàn bộ bộ lọc"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              <span>Xoá lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Grid or Empty State */}
      {loading && allProducts.length === 0 ? (
        <div className="py-12 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary mb-2">progress_activity</span>
          <p className="font-body-md text-body-md">Đang tải danh sách sản phẩm gaming…</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-space-xl text-center border border-dashed border-outline-variant my-space-md">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-space-sm">filter_alt_off</span>
          <h3 className="font-title-lg text-title-lg text-on-surface mb-1">Không tìm thấy sản phẩm nào phù hợp</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-space-md max-w-md mx-auto">
            Không có mặt hàng nào khớp với điều kiện lọc hiện tại. Bạn vui lòng đổi bộ lọc hoặc xem tất cả sản phẩm.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="px-space-lg py-2 bg-primary text-on-primary font-title-md text-title-md rounded-lg hover:bg-primary-container transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            <span>Đặt lại bộ lọc</span>
          </button>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-space-md"
          id="suggested-grid"
        >
          {displayedProducts.map((prod, index) => (
            <ProductTile key={prod.id} product={prod} index={index} />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {filteredProducts.length > visibleCount && (
        <div className="text-center pt-space-sm">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + INITIAL_DISPLAY_COUNT)}
            className="px-space-xl py-3 bg-surface-container-lowest hover:bg-surface-container text-on-surface font-title-md text-title-md rounded-lg shadow-sm border border-outline-variant/30 transition-all cursor-pointer flex items-center gap-space-xs mx-auto group hover:shadow"
          >
            <span>
              Xem thêm {Math.min(INITIAL_DISPLAY_COUNT, filteredProducts.length - visibleCount)} /{' '}
              {filteredProducts.length - visibleCount} sản phẩm còn lại
            </span>
            <span className="material-symbols-outlined text-lg group-hover:translate-y-0.5 transition-transform">
              expand_more
            </span>
          </button>
        </div>
      )}
    </section>
  )
}
