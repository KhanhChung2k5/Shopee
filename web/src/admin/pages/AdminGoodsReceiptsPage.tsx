import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, apiFetch } from '../../lib/api'
import { formatVnd, type GoodsReceipt } from '../../lib/catalog'
import { useAuth } from '../../state/AuthContext'

interface Warehouse { id: string; name: string }
interface Variant { id: string; productId: string; sku: string; status: string }
interface ReceiptLine { variantId: string; quantity: string; unitCost: string }

const EMPTY_LINE: ReceiptLine = { variantId: '', quantity: '1', unitCost: '' }

export default function AdminGoodsReceiptsPage() {
  const { token } = useAuth()
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [warehouseId, setWarehouseId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [lines, setLines] = useState<ReceiptLine[]>([{ ...EMPTY_LINE }])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [receiptData, warehouseData, variantData] = await Promise.all([
        apiFetch<GoodsReceipt[]>('/api/catalog/goods-receipts', {}, token),
        apiFetch<Warehouse[]>('/api/catalog/warehouses', {}, token),
        apiFetch<Variant[]>('/api/catalog/product-variants', {}, token),
      ])
      setReceipts(receiptData)
      setWarehouses(warehouseData)
      setVariants(variantData.filter((variant) => variant.status === 'active'))
      setWarehouseId((current) => current || warehouseData[0]?.id || '')
      setError('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được phiếu nhập. Cần tài khoản Warehouse/Admin và backend đang chạy.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { void refresh() }, [refresh])

  const updateLine = (index: number, change: Partial<ReceiptLine>) => {
    setLines((current) => current.map((line, itemIndex) => itemIndex === index ? { ...line, ...change } : line))
  }

  const createReceipt = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    if (lines.some((line) => !line.variantId || Number(line.quantity) < 1 || Number(line.unitCost) < 0)) {
      setError('Chọn biến thể và nhập số lượng/đơn giá hợp lệ cho từng dòng.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await apiFetch('/api/catalog/goods-receipts', {
        method: 'POST',
        body: JSON.stringify({
          warehouseId,
          supplierName: supplierName.trim() || null,
          items: lines.map((line) => ({ variantId: line.variantId, quantity: Number(line.quantity), unitCost: Number(line.unitCost) })),
        }),
      }, token)
      setSupplierName('')
      setLines([{ ...EMPTY_LINE }])
      setShowForm(false)
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Tạo phiếu nhập thất bại.')
    } finally {
      setSaving(false)
    }
  }

  const transition = async (receipt: GoodsReceipt, action: 'approve' | 'reject') => {
    if (!token) return
    const actionLabel = action === 'approve' ? 'duyệt' : 'từ chối'
    if (!window.confirm(`Bạn muốn ${actionLabel} phiếu ${receipt.code}?`)) return
    try {
      await apiFetch(`/api/catalog/goods-receipts/${receipt.id}/${action}`, { method: 'POST' }, token)
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Không thể ${actionLabel} phiếu nhập.`)
    }
  }

  return <div>
    <div className="admin-toolbar">
      <h1 style={{ margin: 0 }}>Phiếu nhập hàng ({receipts.length})</h1>
      <button className="button button--primary" type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? 'Đóng biểu mẫu' : '+ Tạo phiếu nhập'}</button>
    </div>
    {error && <p role="alert" style={{ color: 'var(--color-urgent)' }}>{error}</p>}
    {showForm && <form className="catalog-form" onSubmit={createReceipt}>
      <div className="catalog-form__heading"><h2>Phiếu nhập mới</h2></div>
      <label>Kho nhận<select required value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}><option value="">Chọn kho</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
      <label>Nhà cung cấp<input maxLength={255} value={supplierName} onChange={(event) => setSupplierName(event.target.value)} /></label>
      <div className="catalog-form__wide">
        <h3>Sản phẩm nhập</h3>
        {lines.map((line, index) => <div className="receipt-line" key={index}>
          <label>Biến thể / SKU<select required value={line.variantId} onChange={(event) => updateLine(index, { variantId: event.target.value })}><option value="">Chọn SKU</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.sku}</option>)}</select></label>
          <label>Số lượng<input required type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} /></label>
          <label>Đơn giá nhập<input required type="number" min="0" step="1000" value={line.unitCost} onChange={(event) => updateLine(index, { unitCost: event.target.value })} /></label>
          <button className="button button--outline" type="button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Xoá dòng</button>
        </div>)}
        <button className="button button--outline" type="button" onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}>+ Thêm dòng hàng</button>
      </div>
      <div className="catalog-form__actions"><button className="button button--primary" disabled={saving || !warehouseId || variants.length === 0}>{saving ? 'Đang tạo…' : 'Tạo phiếu chờ duyệt'}</button></div>
    </form>}
    {loading ? <p>Đang tải phiếu nhập…</p> : <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Mã phiếu</th><th>Thời gian</th><th>Kho / nhà cung cấp</th><th>Sản phẩm</th><th>Tổng giá trị</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>{receipts.map((receipt) => <tr key={receipt.id}>
        <td>{receipt.code}</td><td>{new Date(receipt.receivedAt).toLocaleString('vi-VN')}</td>
        <td>{receipt.warehouseName}<br />{receipt.supplierName ?? '—'}</td>
        <td>{receipt.items.map((item) => `${item.sku} × ${item.quantity}`).join(', ')}</td><td>{formatVnd(receipt.totalCost)}</td>
        <td><span className={`status-pill status-pill--${receipt.status === 'approved' ? 'active' : receipt.status === 'rejected' ? 'deleted' : 'locked'}`}>{receipt.status === 'pending' ? 'Chờ duyệt' : receipt.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}</span></td>
        <td>{receipt.status === 'pending' ? <div className="admin-row-actions"><button className="button button--primary" type="button" onClick={() => void transition(receipt, 'approve')}>Duyệt</button><button className="button button--outline" type="button" onClick={() => void transition(receipt, 'reject')}>Từ chối</button></div> : '—'}</td>
      </tr>)}</tbody>
    </table>{receipts.length === 0 && <p className="admin-empty">Chưa có phiếu nhập nào.</p>}</div>}
  </div>
}
