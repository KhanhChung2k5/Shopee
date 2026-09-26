import { useMemo, useState } from 'react'
import { INITIAL_STOCK } from '../data/sampleInventory'

export default function AdminInventoryPage() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return INITIAL_STOCK
    return INITIAL_STOCK.filter((r) => r.productName.toLowerCase().includes(q) || r.warehouse.toLowerCase().includes(q))
  }, [query])

  const lowStockCount = INITIAL_STOCK.filter((r) => r.quantity - r.reservedQty < 30).length

  return (
    <div>
      <div className="admin-toolbar">
        <h1 style={{ margin: 0 }}>Tồn kho ({filtered.length}/{INITIAL_STOCK.length})</h1>
        <input
          className="search__input"
          style={{ position: 'static', maxWidth: 280 }}
          type="search"
          placeholder="Tìm theo sản phẩm hoặc kho..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {lowStockCount > 0 && (
        <div className="admin-bulk-bar" style={{ background: 'var(--color-urgent-light)', borderColor: 'var(--color-urgent)' }}>
          ⚠ {lowStockCount} sản phẩm sắp hết hàng (tồn khả dụng &lt; 30)
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Kho</th>
              <th>Số lượng</th>
              <th>Đã giữ chỗ</th>
              <th>Khả dụng</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const available = r.quantity - r.reservedQty
              return (
                <tr key={`${r.productId}-${r.warehouse}`}>
                  <td>{r.productName}</td>
                  <td>{r.warehouse}</td>
                  <td>{r.quantity}</td>
                  <td>{r.reservedQty}</td>
                  <td style={{ color: available < 30 ? 'var(--color-urgent)' : undefined, fontWeight: available < 30 ? 700 : 400 }}>
                    {available}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13.5, marginTop: 'var(--space-3)' }}>
        Dữ liệu minh hoạ — sẽ thay bằng <code>InventoryStock</code>/<code>InventoryMovement</code> thật khi có API domain Catalog.
      </p>
    </div>
  )
}
