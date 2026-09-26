import { FLASH_SALE_PRODUCTS, VOUCHERS, formatVnd } from '../../data/sampleProducts'

export default function AdminMarketingPage() {
  return (
    <div>
      <h1>Marketing</h1>

      <div className="admin-stat-card" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="admin-stat-card__label" style={{ marginBottom: 'var(--space-3)' }}>Voucher đang chạy ({VOUCHERS.length})</div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên voucher</th>
                <th>Giá trị</th>
                <th>Điều kiện</th>
                <th>Hết hạn</th>
              </tr>
            </thead>
            <tbody>
              {VOUCHERS.map((v) => (
                <tr key={v.id}>
                  <td>{v.title}</td>
                  <td>{v.amountLabel || 'Freeship'}</td>
                  <td>{v.conditionLabel}</td>
                  <td>{v.expiryLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-stat-card">
        <div className="admin-stat-card__label" style={{ marginBottom: 'var(--space-3)' }}>Flash Sale đang chạy ({FLASH_SALE_PRODUCTS.length})</div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Giá Flash Sale</th>
                <th>Đã bán / Giới hạn</th>
                <th>Tiến độ</th>
              </tr>
            </thead>
            <tbody>
              {FLASH_SALE_PRODUCTS.map((p) => {
                const pct = Math.min(100, Math.round(((p.soldCount ?? 0) / (p.limitCount ?? 1)) * 100))
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{formatVnd(p.price)}</td>
                    <td>{p.soldCount}/{p.limitCount}</td>
                    <td>
                      <div className="admin-bar-track" style={{ width: 120 }}>
                        <div className="admin-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p style={{ color: 'var(--color-muted-foreground)', fontSize: 13.5, marginTop: 'var(--space-3)' }}>
        Dữ liệu minh hoạ — sẽ nối CRUD <code>Voucher</code>/<code>FlashSale</code> thật khi có API domain Marketing.
      </p>
    </div>
  )
}
