import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ApiError, apiFetch } from '../../lib/api'
import { formatVnd, type GoodsReceipt, type InventoryStock } from '../../lib/catalog'
import { useAuth } from '../../state/AuthContext'
import { a, statusPillClass } from '../adminUi'
import { buttonClass } from '../../components/ui'
import { useDialog } from '../../state/DialogContext'
import VariantPicker from '../components/VariantPicker'
import type { VariantOption } from '../variants'
import { SearchBox, StatusFilter } from '../components/ListSearch'
import { matches } from '../components/listSearchState'

interface Warehouse { id: string; name: string }
interface ReceiptLine { variantId: string; quantity: string; unitCost: string }

const EMPTY_LINE: ReceiptLine = { variantId: '', quantity: '1', unitCost: '' }

export default function AdminGoodsReceiptsPage() {
  const { token, user } = useAuth()
  const { confirm } = useDialog()
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [variants, setVariants] = useState<VariantOption[]>([])
  const [stocks, setStocks] = useState<InventoryStock[]>([])
  const [warehouseId, setWarehouseId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [lines, setLines] = useState<ReceiptLine[]>([{ ...EMPTY_LINE }])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | GoodsReceipt['status']>('all')
  const shown = useMemo(() => receipts.filter((r) => (statusFilter === 'all' || r.status === statusFilter)
    && matches(query, r.code, r.supplierName, r.warehouseName, r.createdByName, ...r.items.flatMap((item) => [item.productName, item.sku]))),
  [receipts, query, statusFilter])

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [receiptData, warehouseData, variantData, stockData] = await Promise.all([
        apiFetch<GoodsReceipt[]>('/api/catalog/goods-receipts', {}, token),
        apiFetch<Warehouse[]>('/api/catalog/warehouses', {}, token),
        apiFetch<VariantOption[]>('/api/catalog/product-variants', {}, token),
        apiFetch<InventoryStock[]>('/api/catalog/inventory/stocks', {}, token),
      ])
      setReceipts(receiptData)
      setStocks(stockData)
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

  /** What staff check a line against: stock already in the receiving warehouse and the last approved unit cost. */
  const lineHint = (variantId: string) => {
    if (!variantId) return null
    const stock = stocks.find((item) => item.variantId === variantId && item.warehouseId === warehouseId)
    const lastCost = receipts.filter((receipt) => receipt.status === 'approved')
      .flatMap((receipt) => receipt.items.filter((item) => item.variantId === variantId).map((item) => ({ at: receipt.receivedAt, cost: item.unitCost })))
      .sort((x, y) => y.at.localeCompare(x.at))[0]
    return `Tồn tại kho này: ${stock ? stock.quantity : 0}${lastCost ? ` · Giá nhập gần nhất: ${formatVnd(lastCost.cost)}` : ' · Chưa từng nhập'}`
  }

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
    if (!(await confirm({
      title: action === 'approve' ? 'Duyệt phiếu nhập' : 'Từ chối phiếu nhập',
      message: action === 'approve'
        ? <>Duyệt phiếu <strong>{receipt.code}</strong>? Số lượng trên phiếu sẽ được cộng vào tồn kho.</>
        : <>Từ chối phiếu <strong>{receipt.code}</strong>? Tồn kho không thay đổi.</>,
      confirmLabel: action === 'approve' ? 'Duyệt' : 'Từ chối',
      tone: action === 'approve' ? 'primary' : 'danger',
    }))) return
    try {
      await apiFetch(`/api/catalog/goods-receipts/${receipt.id}/${action}`, { method: 'POST' }, token)
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Không thể ${actionLabel} phiếu nhập.`)
    }
  }

  return <div>
    <div className={a.toolbar}>
      <h1 className="!mb-0">Phiếu nhập hàng ({shown.length}/{receipts.length})</h1>
      <div className="flex flex-wrap items-start gap-2.5">
      <SearchBox page="goods-receipts" placeholder="Tìm mã phiếu, nhà cung cấp, sản phẩm..." value={query} onChange={setQuery} />
      <button className={buttonClass('primary')} type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? 'Đóng biểu mẫu' : '+ Tạo phiếu nhập'}</button>
      </div>
    </div>
    <StatusFilter options={[['all', 'Tất cả'], ['pending', 'Chờ duyệt'], ['approved', 'Đã duyệt'], ['rejected', 'Đã từ chối']] as const} value={statusFilter} onChange={setStatusFilter}
      counts={{ all: receipts.length, pending: receipts.filter((r) => r.status === 'pending').length, approved: receipts.filter((r) => r.status === 'approved').length, rejected: receipts.filter((r) => r.status === 'rejected').length }} />
    {error && <p role="alert" className="font-body-md text-body-md text-error mb-space-md">{error}</p>}
    {showForm && <form className={a.catalogForm} onSubmit={createReceipt}>
      <div className={a.formHeading}><h2>Phiếu nhập mới</h2></div>
      <label>Kho nhận<select required value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)}><option value="">Chọn kho</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label>
      <label>Nhà cung cấp<input maxLength={255} value={supplierName} onChange={(event) => setSupplierName(event.target.value)} /></label>
      <div className={a.formWide}>
        <h3>Sản phẩm nhập</h3>
        {lines.map((line, index) => <div className={a.receiptLine} key={index}>
          <label>Sản phẩm<VariantPicker variants={variants} value={line.variantId} onChange={(variantId) => updateLine(index, { variantId })} /></label>
          <label>Số lượng<input required type="number" min="1" step="1" value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} /></label>
          <label>Đơn giá nhập<input required type="number" min="0" step="1000" value={line.unitCost} onChange={(event) => updateLine(index, { unitCost: event.target.value })} /></label>
          <button className={buttonClass('outline')} type="button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Xoá dòng</button>
          {line.variantId && <small className="md:col-span-4 font-label-md text-label-md text-on-surface-variant">{lineHint(line.variantId)}</small>}
        </div>)}
        <button className={buttonClass('outline')} type="button" onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}>+ Thêm dòng hàng</button>
      </div>
      <div className={a.formActions}><button className={buttonClass('primary')} disabled={saving || !warehouseId || variants.length === 0}>{saving ? 'Đang tạo…' : 'Tạo phiếu chờ duyệt'}</button></div>
    </form>}
    {loading ? <p>Đang tải phiếu nhập…</p> : <div className={a.tableWrap}><table className={a.table}>
      <thead><tr><th>Mã phiếu</th><th>Thời gian</th><th>Kho / nhà cung cấp</th><th>Sản phẩm</th><th>Tổng giá trị</th><th>Người lập / người duyệt</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>{shown.map((receipt) => <tr key={receipt.id}>
        <td>{receipt.code}</td><td>{new Date(receipt.receivedAt).toLocaleString('vi-VN')}</td>
        <td>{receipt.warehouseName}<br />{receipt.supplierName ?? '—'}</td>
        <td>{receipt.items.length === 0 ? '—' : <ul className="max-h-32 overflow-y-auto">{receipt.items.map((item) => <li key={item.id}>{item.productName} × {item.quantity} <small className="block text-on-surface-variant">{item.sku}</small></li>)}</ul>}</td><td>{formatVnd(receipt.totalCost)}</td>
        <td>{receipt.createdByName ?? '—'}<br /><small>{receipt.decidedByName
          ? `${receipt.status === 'rejected' ? 'Từ chối' : 'Duyệt'}: ${receipt.decidedByName}${receipt.decidedAt ? ` (${new Date(receipt.decidedAt).toLocaleDateString('vi-VN')})` : ''}`
          : receipt.status === 'pending' ? 'Chờ người khác duyệt' : '—'}</small></td>
        <td><span className={statusPillClass(receipt.status === 'approved' ? 'active' : receipt.status === 'rejected' ? 'deleted' : 'locked')}>{receipt.status === 'pending' ? 'Chờ duyệt' : receipt.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}</span></td>
        <td>{receipt.status === 'pending' && receipt.createdByUserId === user?.id ? <small>Người lập không tự duyệt</small> : receipt.status === 'pending' ? <div className={a.rowActions}><button className={buttonClass('primary')} type="button" onClick={() => void transition(receipt, 'approve')}>Duyệt</button><button className={buttonClass('outline')} type="button" onClick={() => void transition(receipt, 'reject')}>Từ chối</button></div> : '—'}</td>
      </tr>)}</tbody>
    </table>{receipts.length === 0 && <p className={a.empty}>Chưa có phiếu nhập nào.</p>}</div>}
  </div>
}
