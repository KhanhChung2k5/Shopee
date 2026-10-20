import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError, apiFetch } from '../../lib/api'
import type { InventoryMovement, InventoryStock } from '../../lib/catalog'
import { useAuth } from '../../state/AuthContext'
import { a, chipClass } from '../adminUi'
import { buttonClass } from '../../components/ui'

interface Warehouse { id: string; name: string; address: string | null }
const movementLabel: Record<InventoryMovement['type'], string> = { import: 'Nhập hàng', export: 'Xuất hàng', adjust: 'Điều chỉnh' }

export default function AdminInventoryPage() {
  const { token } = useAuth()
  const [stocks, setStocks] = useState<InventoryStock[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseId, setWarehouseId] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<InventoryStock | null>(null)
  const [movements, setMovements] = useState<InventoryMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [warehouseData, stockData] = await Promise.all([
        apiFetch<Warehouse[]>('/api/catalog/warehouses', {}, token),
        apiFetch<InventoryStock[]>(`/api/catalog/inventory/stocks${warehouseId ? `?warehouseId=${warehouseId}` : ''}`, {}, token),
      ])
      setWarehouses(warehouseData)
      setStocks(stockData)
      setError('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được tồn kho. Cần tài khoản Warehouse/Admin và backend đang chạy.')
    } finally {
      setLoading(false)
    }
  }, [token, warehouseId])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (selected) setSelected(stocks.find((stock) => stock.id === selected.id) ?? null)
  }, [stocks, selected])

  useEffect(() => {
    if (!token || !selected) { setMovements([]); return }
    apiFetch<InventoryMovement[]>(`/api/catalog/inventory/stocks/${selected.id}/movements`, {}, token)
      .then(setMovements)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Không tải được lịch sử kho.'))
  }, [token, selected])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('vi')
    return stocks.filter((stock) => !term || stock.sku.toLocaleLowerCase('vi').includes(term)
      || stock.warehouseName.toLocaleLowerCase('vi').includes(term))
  }, [stocks, query])
  const lowStock = filtered.filter((stock) => stock.availableQuantity < 30).length

  const adjust = async (stock: InventoryStock) => {
    const next = window.prompt(`Nhập số lượng thực tế cho SKU ${stock.sku}:`, String(stock.quantity))
    if (next == null || next.trim() === '') return
    const quantity = Number(next)
    if (!Number.isInteger(quantity) || quantity < 0) { setError('Số lượng phải là số nguyên không âm.'); return }
    try {
      await apiFetch(`/api/catalog/inventory/stocks/${stock.variantId}/${stock.warehouseId}`, {
        method: 'PUT', body: JSON.stringify({ quantity }),
      }, token)
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không cập nhật được số lượng.')
    }
  }

  const exportStock = async (stock: InventoryStock) => {
    const entered = window.prompt(`Số lượng xuất cho SKU ${stock.sku} (khả dụng ${stock.availableQuantity}):`, '1')
    if (entered == null || entered.trim() === '') return
    const quantity = Number(entered)
    if (!Number.isInteger(quantity) || quantity < 1) { setError('Số lượng xuất phải là số nguyên lớn hơn 0.'); return }
    if (quantity > stock.availableQuantity) { setError(`Chỉ còn ${stock.availableQuantity} sản phẩm khả dụng để xuất.`); return }
    try {
      await apiFetch('/api/catalog/inventory/exports', {
        method: 'POST',
        body: JSON.stringify({ variantId: stock.variantId, warehouseId: stock.warehouseId, quantity }),
      }, token)
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xuất được số lượng tồn kho đã chọn.')
    }
  }

  return <div>
    <div className={a.toolbar}>
      <h1 className="!mb-0">Tồn kho ({filtered.length})</h1>
      <div className="flex flex-wrap items-center gap-2.5">
        <input className={`${a.input} !w-64`} type="search" placeholder="Tìm SKU hoặc kho..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className={chipClass(false)} aria-label="Lọc theo kho" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          <option value="">Tất cả kho</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
        </select>
      </div>
    </div>
    {error && <p role="alert" className="font-body-md text-body-md text-error mb-space-md">{error}</p>}
    {lowStock > 0 && <div className={`${a.bulkBar} !bg-error-container !border-error !text-on-error-container`}>⚠ {lowStock} biến thể sắp hết hàng (khả dụng dưới 30)</div>}
    {loading ? <p>Đang tải tồn kho…</p> : <div className={a.tableWrap}><table className={a.table}>
      <thead><tr><th>SKU / biến thể</th><th>Kho</th><th>Tồn thực tế</th><th>Đã giữ</th><th>Khả dụng</th><th>Thao tác</th></tr></thead>
      <tbody>{filtered.map((stock) => <tr key={stock.id} className={selected?.id === stock.id ? 'is-selected' : ''}>
        <td><button className={a.linkButton} type="button" onClick={() => setSelected(stock)}>{stock.sku}</button></td>
        <td>{stock.warehouseName}</td><td>{stock.quantity}</td><td>{stock.reservedQuantity}</td>
        <td className={stock.availableQuantity < 30 ? 'text-error font-bold' : undefined}>{stock.availableQuantity}</td>
        <td><div className={a.rowActions}><button type="button" className={buttonClass('outline')} onClick={() => void adjust(stock)}>Điều chỉnh</button><button type="button" className={buttonClass('outline')} disabled={stock.availableQuantity < 1} onClick={() => void exportStock(stock)}>Xuất kho</button></div></td>
      </tr>)}</tbody>
    </table>{filtered.length === 0 && <p className={a.empty}>Chưa có dữ liệu tồn kho.</p>}</div>}
    {selected && <section className="mt-space-xl">
      <div className={a.toolbar}><h2 className="font-headline-md text-headline-md text-on-surface">Lịch sử · {selected.sku} / {selected.warehouseName}</h2><button className={buttonClass('outline')} type="button" onClick={() => setSelected(null)}>Đóng</button></div>
      {movements.length === 0 ? <p>Chưa có biến động tồn kho.</p> : <div className={a.tableWrap}><table className={a.table}><thead><tr><th>Thời gian</th><th>Loại</th><th>Số lượng thay đổi</th><th>Tham chiếu</th></tr></thead><tbody>
        {movements.map((movement) => <tr key={movement.id}><td>{new Date(movement.occurredAt).toLocaleString('vi-VN')}</td><td>{movementLabel[movement.type]}</td><td>{movement.quantity > 0 ? '+' : ''}{movement.quantity}</td><td>{movement.goodsReceiptId ?? movement.orderId ?? (movement.type === 'export' ? 'Xuất kho thủ công' : 'Điều chỉnh thủ công')}</td></tr>)}
      </tbody></table></div>}
    </section>}
  </div>
}
