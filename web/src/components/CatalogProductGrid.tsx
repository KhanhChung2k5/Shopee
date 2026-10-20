import ProductTile from './ProductTile'
import { EmptyState } from './ui'
import type { CatalogProductSummary } from '../lib/catalog'

export default function CatalogProductGrid({ products }: { products: CatalogProductSummary[] }) {
  if (products.length === 0) {
    return <EmptyState icon="search_off" title="Không tìm thấy sản phẩm nào" description="Thử đổi từ khoá hoặc bỏ bớt bộ lọc." />
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-space-md">
      {products.map((product, index) => (
        <ProductTile key={product.id} product={product} index={index} />
      ))}
    </div>
  )
}
