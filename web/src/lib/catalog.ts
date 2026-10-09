import { API_BASE, apiFetch } from './api'

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

export interface CatalogProduct extends Omit<CatalogProductSummary, 'price' | 'comparePrice'> {
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
}

export const fetchCategories = () => apiFetch<CatalogCategory[]>('/api/catalog/categories')

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
  return apiFetch<PageResult<CatalogProductSummary>>(`/api/products${query ? `?${query}` : ''}`)
}

export const fetchProduct = (id: string) => apiFetch<CatalogProduct>(`/api/products/${id}`)

export const formatVnd = (amount: number | null | undefined) =>
  amount == null ? 'Chưa có giá' : `${amount.toLocaleString('vi-VN')} ₫`

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
