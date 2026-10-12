import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { ApiError, apiFetch } from '../../lib/api'
import { fetchCategories, formatVnd, type CatalogCategory, type ProductType } from '../../lib/catalog'
import { useAuth } from '../../state/AuthContext'

interface AdminProduct {
  id: string
  categoryId: string | null
  brandName: string | null
  name: string
  description: string | null
  status: 'draft' | 'published'
  productType: ProductType
  platforms: string[] | null
  publisher: string | null
  genre: string | null
  ageRating: string | null
  releaseDate: string | null
  connectionType: string | null
  warrantyMonths: number | null
  originCountry: string | null
  imageUrls: string[] | null
}

interface AdminVariant {
  id: string
  productId: string
  sku: string
  attributes: Record<string, unknown> | string[] | null
  price: number
  comparePrice: number | null
  status: 'active' | 'inactive'
}

const EMPTY_FORM = {
  name: '', categoryId: '', brandName: '', description: '', status: 'draft' as 'draft' | 'published',
  productType: 'accessory' as ProductType, platforms: '', publisher: '', genre: '', ageRating: '',
  releaseDate: '', connectionType: '', warrantyMonths: '', originCountry: '', sku: '', price: '', comparePrice: '', attributes: '',
}

export default function AdminProductsPage() {
  const { token } = useAuth()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [variants, setVariants] = useState<AdminVariant[]>([])
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [query, setQuery] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [editingVariant, setEditingVariant] = useState<AdminVariant | null>(null)
  const [files, setFiles] = useState<FileList | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [productData, variantData, categoryData] = await Promise.all([
        apiFetch<AdminProduct[]>('/api/catalog/products', {}, token),
        apiFetch<AdminVariant[]>('/api/catalog/product-variants', {}, token),
        fetchCategories(),
      ])
      setProducts(productData)
      setVariants(variantData)
      setCategories(categoryData)
      setError('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không tải được dữ liệu sản phẩm. Kiểm tra API và quyền Sales/Admin.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { void refresh() }, [refresh])

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('vi')
    return products.filter((product) => !term || product.name.toLocaleLowerCase('vi').includes(term)
      || (product.brandName ?? '').toLocaleLowerCase('vi').includes(term))
  }, [products, query])

  const startCreate = () => {
    setEditing(null)
    setEditingVariant(null)
    setForm(EMPTY_FORM)
    setFiles(null)
    setShowForm(true)
  }

  const startEdit = (product: AdminProduct) => {
    const variant = variants.find((item) => item.productId === product.id) ?? null
    setEditing(product)
    setEditingVariant(variant)
    setForm({
      name: product.name, categoryId: product.categoryId ?? '', brandName: product.brandName ?? '',
      description: product.description ?? '', status: product.status, productType: product.productType,
      platforms: product.platforms?.join(', ') ?? '', publisher: product.publisher ?? '', genre: product.genre ?? '',
      ageRating: product.ageRating ?? '', releaseDate: product.releaseDate ?? '', connectionType: product.connectionType ?? '',
      warrantyMonths: product.warrantyMonths == null ? '' : String(product.warrantyMonths),
      originCountry: product.originCountry ?? '',
      sku: variant?.sku ?? '', price: variant ? String(variant.price) : '',
      comparePrice: variant?.comparePrice == null ? '' : String(variant.comparePrice),
      attributes: variant?.attributes ? JSON.stringify(variant.attributes) : '',
    })
    setFiles(null)
    setShowForm(true)
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    setSaving(true)
    setError('')
    try {
      let variantAttributes: Record<string, unknown> | string[] | null = null
      if (form.attributes.trim()) {
        try { variantAttributes = JSON.parse(form.attributes) as Record<string, unknown> | string[] }
        catch { throw new Error('Thuộc tính biến thể phải là JSON hợp lệ.') }
      }
      const payload = {
        name: form.name.trim(), categoryId: form.categoryId || null, brandName: form.brandName || null,
        description: form.description || null, status: form.status, productType: form.productType,
        platforms: form.platforms.trim() ? form.platforms.split(',').map((item) => item.trim()).filter(Boolean) : null,
        publisher: form.publisher || null, genre: form.genre || null, ageRating: form.ageRating || null,
        releaseDate: form.releaseDate || null, connectionType: form.connectionType || null,
        warrantyMonths: form.warrantyMonths === '' ? null : Number(form.warrantyMonths),
        originCountry: form.originCountry.trim() || null,
      }
      const saved = editing
        ? await apiFetch<AdminProduct>(`/api/catalog/products/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) }, token)
        : await apiFetch<AdminProduct>('/api/catalog/products', { method: 'POST', body: JSON.stringify(payload) }, token)

      if (form.sku.trim() && form.price !== '') {
        const variantPayload = {
          productId: saved.id, sku: form.sku.trim(), attributes: variantAttributes, price: Number(form.price),
          comparePrice: form.comparePrice === '' ? null : Number(form.comparePrice), status: 'active',
        }
        if (editingVariant) await apiFetch(`/api/catalog/product-variants/${editingVariant.id}`, { method: 'PUT', body: JSON.stringify(variantPayload) }, token)
        else await apiFetch('/api/catalog/product-variants', { method: 'POST', body: JSON.stringify(variantPayload) }, token)
      }

      if (files?.length) {
        const upload = new FormData()
        Array.from(files).forEach((file) => upload.append('files', file))
        await apiFetch(`/api/catalog/products/${saved.id}/images`, { method: 'POST', body: upload }, token)
      }
      setShowForm(false)
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Lưu sản phẩm thất bại.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (product: AdminProduct) => {
    if (!token || !window.confirm(`Xoá sản phẩm “${product.name}”?`)) return
    try {
      await apiFetch(`/api/catalog/products/${product.id}`, { method: 'DELETE' }, token)
      await refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không xoá được sản phẩm.')
    }
  }

  return <div>
    <div className="admin-toolbar">
      <h1 style={{ margin: 0 }}>Sản phẩm ({filtered.length}/{products.length})</h1>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input className="search__input" style={{ position: 'static', maxWidth: 280 }} type="search" placeholder="Tìm tên hoặc thương hiệu..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <button type="button" className="button button--primary" onClick={startCreate}>+ Thêm sản phẩm</button>
      </div>
    </div>
    {error && <p role="alert" style={{ color: 'var(--color-urgent)' }}>{error}</p>}
    {showForm && <form className="catalog-form" onSubmit={save}>
      <div className="catalog-form__heading"><h2>{editing ? 'Sửa sản phẩm' : 'Tạo sản phẩm'}</h2><button className="button button--outline" type="button" onClick={() => setShowForm(false)}>Đóng</button></div>
      <label>Tên sản phẩm<input required maxLength={255} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <label>Danh mục<select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}><option value="">Chưa phân loại</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label>Thương hiệu<input maxLength={255} value={form.brandName} onChange={(e) => setForm({ ...form, brandName: e.target.value })} /></label>
      <label>Loại<select value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value as ProductType })}><option value="game_disc">Đĩa game</option><option value="controller">Tay cầm</option><option value="accessory">Phụ kiện</option></select></label>
      <label>Trạng thái<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}><option value="draft">Bản nháp</option><option value="published">Đang bán</option></select></label>
      <label>Nền tảng, phân cách bằng dấu phẩy<input placeholder="PS5, PC" value={form.platforms} onChange={(e) => setForm({ ...form, platforms: e.target.value })} /></label>
      <label>Nhà phát hành<input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} /></label>
      <label>Thể loại<input value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} /></label>
      <label>Phân loại tuổi<input value={form.ageRating} onChange={(e) => setForm({ ...form, ageRating: e.target.value })} /></label>
      <label>Kết nối<select value={form.connectionType} onChange={(e) => setForm({ ...form, connectionType: e.target.value })}><option value="">Không áp dụng</option><option value="wired">Có dây</option><option value="wireless">Không dây</option><option value="bluetooth">Bluetooth</option></select></label>
      <label>Bảo hành (tháng)<input type="number" min="0" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })} /></label>
      <label>Xuất xứ<input maxLength={100} placeholder="Ví dụ: Nhật Bản" value={form.originCountry} onChange={(e) => setForm({ ...form, originCountry: e.target.value })} /></label>
      <label>Mã SKU biến thể<input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
      <label>Giá bán<input required type="number" min="0" step="1000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
      <label>Giá so sánh<input type="number" min="0" step="1000" value={form.comparePrice} onChange={(e) => setForm({ ...form, comparePrice: e.target.value })} /></label>
      <label>Thuộc tính biến thể (JSON)<input placeholder='{"màu":"Đen"}' value={form.attributes} onChange={(e) => setForm({ ...form, attributes: e.target.value })} /></label>
      <label className="catalog-form__wide">Mô tả<textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label className="catalog-form__wide">Ảnh sản phẩm<input type="file" accept="image/*" multiple onChange={(e) => setFiles(e.target.files)} /><small>Ảnh được tải lên sau khi lưu thông tin sản phẩm.</small></label>
      <div className="catalog-form__actions"><button className="button button--primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu sản phẩm'}</button></div>
    </form>}
    {loading ? <p>Đang tải sản phẩm…</p> : <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Tên</th><th>Danh mục</th><th>Thương hiệu / loại</th><th>SKU / giá</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
      <tbody>{filtered.map((product) => {
        const variant = variants.find((item) => item.productId === product.id)
        const categoryName = categories.find((item) => item.id === product.categoryId)?.name ?? '—'
        return <tr key={product.id}>
          <td>{product.name}</td><td>{categoryName}</td><td>{product.brandName ?? '—'} · {product.productType}</td>
          <td>{variant ? <>{variant.sku}<br />{formatVnd(variant.price)}</> : 'Chưa có biến thể'}</td>
          <td><span className={`status-pill status-pill--${product.status === 'published' ? 'active' : 'locked'}`}>{product.status === 'published' ? 'Đang bán' : 'Bản nháp'}</span></td>
          <td><div className="admin-row-actions"><button type="button" className="button button--outline" onClick={() => startEdit(product)}>Sửa</button><button type="button" className="button button--outline" onClick={() => void remove(product)}>Xoá</button></div></td>
        </tr>
      })}</tbody>
    </table></div>}
  </div>
}
