import { useMemo, useState } from 'react'
import { ALL_PRODUCTS, formatVnd, type ProductType } from '../../data/sampleProducts'

const TYPE_LABEL: Record<ProductType, string> = {
  game_disc: 'Đĩa game',
  controller: 'Tay cầm',
  accessory: 'Phụ kiện',
}

export default function AdminProductsPage() {
  const [query, setQuery] = useState('')
  const [published, setPublished] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALL_PRODUCTS.map((p) => [p.id, true])),
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ALL_PRODUCTS
    return ALL_PRODUCTS.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
  }, [query])

  return (
    <div>
      <div className="admin-toolbar">
        <h1 style={{ margin: 0 }}>Sản phẩm ({filtered.length}/{ALL_PRODUCTS.length})</h1>
        <input
          className="search__input"
          style={{ position: 'static', maxWidth: 280 }}
          type="search"
          placeholder="Tìm theo tên hoặc danh mục..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Loại</th>
              <th>Nền tảng</th>
              <th>Giá</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{TYPE_LABEL[p.productType]}</td>
                <td>{p.platforms?.join(', ') ?? '-'}</td>
                <td>{formatVnd(p.price)}</td>
                <td>
                  <button
                    type="button"
                    className={`status-pill status-pill--${published[p.id] ? 'active' : 'locked'}`}
                    style={{ border: 'none', cursor: 'pointer' }}
                    onClick={() => setPublished((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                  >
                    {published[p.id] ? 'Đang bán' : 'Ẩn'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13.5, marginTop: 'var(--space-3)' }}>
        Dữ liệu minh hoạ từ catalog mẫu — sẽ nối CRUD thật (thêm/sửa/xoá sản phẩm) khi có API domain Catalog.
      </p>
    </div>
  )
}
