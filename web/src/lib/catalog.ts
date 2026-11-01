import { API_BASE, cachedPublicFetch } from './api'

export type ProductType = 'game_disc' | 'controller' | 'accessory'

export interface CatalogCategory {
  id: string
  name: string
  slug: string
  parentId: string | null
}

export interface CatalogProductSummary {
  id: string
  categoryId: string | null
  name: string
  brandName: string | null
  productType: ProductType
  platforms: string[] | null
  imageUrls: string[] | null
  price: number | null
  comparePrice: number | null
  /** Units on non-cancelled orders (same rule as the top-sellers ranking). */
  soldCount: number
  /** Average of buyers' reviews, one decimal; null until the product has a review. */
  ratingAverage: number | null
  ratingCount: number
}

/** 950 → "950", 1250 → "1,3k", 12000 → "12k" (Vietnamese decimal comma). */
export function formatSoldCount(count: number) {
  if (count < 1000) return String(count)
  const thousands = count / 1000
  return `${thousands >= 10 ? Math.round(thousands) : thousands.toFixed(1).replace(/\.0$/, '').replace('.', ',')}k`
}

export interface CatalogVariant {
  id: string
  sku: string
  attributes: Record<string, unknown> | string[] | null
  price: number
  comparePrice: number | null
  imageUrl: string | null
  availableQuantity: number
}

export interface CatalogProduct extends Omit<CatalogProductSummary, 'price' | 'comparePrice' | 'soldCount' | 'ratingAverage' | 'ratingCount'> {
  description: string | null
  publisher: string | null
  genre: string | null
  ageRating: string | null
  releaseDate: string | null
  connectionType: 'wired' | 'wireless' | 'bluetooth' | null
  warrantyMonths: number | null
  originCountry: string | null
  variants: CatalogVariant[]
}

export interface PageResult<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface InventoryStock {
  id: string
  variantId: string
  sku: string
  warehouseId: string
  warehouseName: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  productId: string
  productName: string
  imageUrl: string | null
  attributes: Record<string, unknown> | unknown[] | null
}

/** {"Màu":"Đen","Phiên bản":"Tiêu chuẩn"} → "Màu: Đen · Phiên bản: Tiêu chuẩn" (also accepts a JSON string). */
export function describeAttributes(attributes: unknown): string {
  let value = attributes
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return value as string }
  }
  if (Array.isArray(value)) return value.map(String).join(' · ')
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).map(([k, v]) => `${k}: ${String(v)}`).join(' · ')
  }
  return ''
}

export interface InventoryMovement {
  id: string
  stockId: string
  variantId: string
  sku: string
  warehouseId: string
  type: 'import' | 'export' | 'adjust'
  quantity: number
  orderId: string | null
  goodsReceiptId: string | null
  occurredAt: string
}

export interface GoodsReceiptItem {
  id: string
  variantId: string
  sku: string
  productName: string
  quantity: number
  unitCost: number
  lineTotal: number
}

export interface GoodsReceipt {
  id: string
  code: string
  employeeId: string
  warehouseId: string
  warehouseName: string
  supplierName: string | null
  status: 'pending' | 'approved' | 'rejected'
  receivedAt: string
  totalCost: number
  items: GoodsReceiptItem[]
  /** Account that drew the receipt up — it may not approve or reject it (segregation of duties). */
  createdByUserId: string | null
  createdByName: string | null
  decidedByName: string | null
  decidedAt: string | null
}

export const fetchCategories = () => cachedPublicFetch<CatalogCategory[]>('/api/catalog/categories')

const CATEGORY_CACHE_KEY = 'chotomua_catalog_categories_v1'

export function getCachedCategories(): CatalogCategory[] {
  try {
    const raw = localStorage.getItem(CATEGORY_CACHE_KEY)
    if (!raw) return []
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value.filter((item): item is CatalogCategory =>
      !!item
      && typeof item.id === 'string'
      && typeof item.name === 'string'
      && typeof item.slug === 'string'
      && (item.parentId === null || typeof item.parentId === 'string'),
    )
  } catch {
    return []
  }
}

export function cacheCategories(categories: CatalogCategory[]) {
  if (categories.length === 0) return
  try {
    localStorage.setItem(CATEGORY_CACHE_KEY, JSON.stringify(categories))
  } catch {
    // The live API remains the source of truth if browser storage is unavailable.
  }
}

export function fetchProducts(params: URLSearchParams) {
  const query = params.toString()
  return cachedPublicFetch<PageResult<CatalogProductSummary>>(`/api/products${query ? `?${query}` : ''}`)
}

export const fetchProduct = (id: string) => cachedPublicFetch<CatalogProduct>(`/api/products/${id}`)

/** Best sellers, as GET /api/products/top-sellers returns them. */
export interface TopSellerItem {
  productId: string
  name: string
  price: number | null
  soldQuantity: number
  imageUrl: string | null
}

/**
 * Best sellers — always the same request (top 10) sliced per caller, so the header, the hero and the leaderboard
 * on one page share a single call.
 */
export const fetchTopSellers = (limit: number) =>
  cachedPublicFetch<TopSellerItem[]>('/api/products/top-sellers?limit=10').then((items) => items.slice(0, limit))

export const formatVnd = (amount: number | null | undefined) =>
  amount == null ? 'Chưa có giá' : `${amount.toLocaleString('vi-VN')} ₫`

// Product photos live in the Supabase Storage bucket, already stored as ≤1200px WebP
// (~80 KB), so absolute URLs are used as-is; relative paths are legacy local uploads.
export function resolveCatalogImageUrl(url: string | null | undefined) {
  if (!url) return undefined
  return /^(https?:|data:|blob:)/i.test(url)
    ? url
    : `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`
}

export const typeLabel: Record<ProductType, string> = {
  game_disc: 'Đĩa game',
  controller: 'Tay cầm',
  accessory: 'Phụ kiện',
}
