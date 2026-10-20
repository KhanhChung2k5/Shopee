import { useState, useEffect } from 'react'
import type { Product } from '../data/sampleProducts'
import ProductCard from './ProductCard'

export default function ProductGridStatic({ products, itemsPerPage = 12 }: { products: Product[], itemsPerPage?: number }) {
  const [currentPage, setCurrentPage] = useState(1)

  // Reset page when products change (e.g., new category or filter)
  useEffect(() => {
    setCurrentPage(1)
  }, [products])

  if (products.length === 0) {
    return <p style={{ color: 'var(--color-muted-foreground)', padding: 'var(--space-5) 0' }}>Không tìm thấy sản phẩm nào.</p>
  }

  const totalPages = Math.ceil(products.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentProducts = products.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div>
      <ul className="product-grid">
        {currentProducts.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </ul>
      
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="pagination-btn" 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            aria-label="Trang trước"
          >
            &lt;
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`pagination-btn ${currentPage === page ? 'pagination-btn--active' : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}

          <button 
            className="pagination-btn" 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            aria-label="Trang tiếp"
          >
            &gt;
          </button>
        </div>
      )}
    </div>
  )
}
