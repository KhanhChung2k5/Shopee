import type { Product } from '../data/sampleProducts'
import ProductCard from './ProductCard'

export default function ProductGridStatic({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p style={{ color: 'var(--color-muted-foreground)', padding: 'var(--space-5) 0' }}>Không tìm thấy sản phẩm nào.</p>
  }
  return (
    <ul className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  )
}
