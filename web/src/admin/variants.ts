/** Product variants as admin pick-lists use them (GET /api/catalog/product-variants). */
import { describeAttributes } from '../lib/catalog'

/** A product variant as /api/catalog/product-variants returns it. */
export interface VariantOption {
  id: string
  productId: string
  productName: string
  sku: string
  status: string
  attributes?: unknown
  price?: number
}

/** "Product name (attributes) · SKU" — how a variant is named anywhere staff pick or read one. */
export function variantLabel(variant: Pick<VariantOption, 'productName' | 'sku' | 'attributes'>): string {
  const attributes = describeAttributes(variant.attributes)
  return `${variant.productName}${attributes ? ` (${attributes})` : ''} · ${variant.sku}`
}
