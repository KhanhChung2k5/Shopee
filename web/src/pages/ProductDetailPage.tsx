import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProductThumb from '../components/ProductThumb'
import { Alert, Badge, Button, ButtonLink, Card, CardTitle, EmptyState, Loading, Page, QtyStepper } from '../components/ui'
import { fetchProduct, formatVnd, resolveCatalogImageUrl, type CatalogProduct, type ProductType } from '../lib/catalog'
import { useCart } from '../state/CartContext'
import { useAuth } from '../state/AuthContext'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function attributesLabel(attributes: Record<string, unknown> | string[] | null) {
  if (!attributes) return ''
  if (Array.isArray(attributes)) return attributes.join(' · ')
  return Object.entries(attributes).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')
}

const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  game_disc: 'Đĩa game',
  controller: 'Tay cầm',
  accessory: 'Phụ kiện',
}
const CONNECTION_LABELS: Record<NonNullable<CatalogProduct['connectionType']>, string> = { wired: 'Có dây', wireless: 'Không dây', bluetooth: 'Bluetooth' }

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addItem, error: cartError } = useCart()
  const { token } = useAuth()
  const [product, setProduct] = useState<CatalogProduct | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setProduct(null)
    setSelectedVariantId('')
    setQty(1)
    setActiveImg(0)
    if (!id || !UUID_PATTERN.test(id)) {
      setProduct(null)
      setError('Không tìm thấy sản phẩm.')
      setLoading(false)
      return () => { active = false }
    }
    fetchProduct(id)
      .then((data) => {
        if (!active) return
        setProduct(data)
        setSelectedVariantId(data.variants[0]?.id ?? '')
        setQty(1)
        setActiveImg(0)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Không tải được sản phẩm.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const variant = useMemo(() => product?.variants.find((item) => item.id === selectedVariantId) ?? null, [product, selectedVariantId])
  const gallery = product?.imageUrls?.length ? product.imageUrls : variant?.imageUrl ? [variant.imageUrl] : []
  const available = variant?.availableQuantity ?? 0
  const canBuy = !!variant && available > 0 && qty <= available
  const name = product?.name ?? ''
  const description = product?.description
  const productType = product?.productType ?? 'accessory'
  const thumbSeed = 0
  const price = variant?.price ?? null
  const comparePrice = variant?.comparePrice ?? null
  const pct = price != null && comparePrice != null && comparePrice > price
    ? Math.round((1 - price / comparePrice) * 100)
    : 0
  const detailRows = [
    { label: 'Loại sản phẩm', value: PRODUCT_TYPE_LABELS[productType] },
    { label: 'Thương hiệu', value: product?.brandName },
    { label: 'Xuất xứ', value: product?.originCountry },
    { label: 'Nền tảng', value: product?.platforms?.join(', ') },
    { label: 'Ngày phát hành', value: product?.releaseDate ? new Date(`${product.releaseDate}T00:00:00`).toLocaleDateString('vi-VN') : undefined },
    { label: 'Nhà phát hành', value: product?.publisher },
    { label: 'Thể loại', value: product?.genre },
    { label: 'Độ tuổi', value: product?.ageRating },
    {
      label: 'Kết nối',
      value: product?.connectionType ? CONNECTION_LABELS[product.connectionType] : undefined,
    },
    {
      label: 'Bảo hành',
      value: product?.warrantyMonths != null ? `${product.warrantyMonths} tháng` : undefined,
    },
  ].filter((row): row is { label: string; value: string } => typeof row.value === 'string' && row.value.trim().length > 0)

  const purchase = async (goToCart: boolean) => {
    if (!token) {
      navigate('/dang-nhap', { state: { from: `/san-pham/${id}` } })
      return
    }
    if (!product || !canBuy || !variant) return
    setIsAdding(true)
    try {
      const added = await addItem(variant.id, qty)
      if (added && goToCart) navigate('/gio-hang')
    } finally {
      setIsAdding(false)
    }
  }

  if (loading) return <Page><Loading>Đang tải thông tin sản phẩm…</Loading></Page>
  if (!product) {
    return (
      <Page narrow>
        <Card>
          <EmptyState
            icon="search_off"
            title={error || 'Không tìm thấy sản phẩm.'}
            action={<ButtonLink to="/#danh-muc" variant="outline">Xem danh mục sản phẩm</ButtonLink>}
          />
        </Card>
      </Page>
    )
  }

  return (
    <Page>
      <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1 font-label-md text-label-md text-on-surface-variant">
        <Link className="hover:text-primary" to="/">Trang chủ</Link>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span>{PRODUCT_TYPE_LABELS[productType]}</span>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
        <span className="text-on-surface truncate max-w-xs">{name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
        <Card className="lg:col-span-5 space-y-space-sm">
          <div className="aspect-square rounded-lg overflow-hidden bg-surface-container-low">
            <ProductThumb seed={thumbSeed} productType={productType} imageUrl={gallery[activeImg]} appearance="detail" />
          </div>
          {gallery.length > 1 && <div className="grid grid-cols-5 gap-space-xs" role="list" aria-label="Ảnh sản phẩm khác">
            {gallery.map((url, index) => (
              <button
                key={url}
                type="button"
                role="listitem"
                className={`aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-colors ${index === activeImg ? 'border-primary' : 'border-transparent hover:border-line'}`}
                onClick={() => setActiveImg(index)}
                aria-label={`Xem ảnh ${index + 1}`}
                aria-current={index === activeImg}
              >
                <img className="w-full h-full object-cover" src={resolveCatalogImageUrl(url, 200)} alt="" loading="lazy" />
              </button>
            ))}
          </div>}
        </Card>

        <div className="lg:col-span-7 space-y-space-md">
          <Card className="space-y-space-md">
            <div className="flex flex-wrap items-center gap-space-xs">
              <Badge tone="success">Chính Hãng</Badge>
              <Badge tone="info">{PRODUCT_TYPE_LABELS[productType]}</Badge>
              {product.platforms?.map((platform) => <Badge key={platform}>{platform}</Badge>)}
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">{name}</h1>
            {description && <p className="font-body-lg text-body-lg text-on-surface-variant whitespace-pre-line">{description}</p>}

            <div className="flex flex-wrap items-baseline gap-space-sm rounded-lg bg-surface-container-low px-space-md py-space-sm">
              <span className="font-headline-lg text-headline-lg text-primary">{formatVnd(price)}</span>
              {pct > 0 && <>
                <span className="font-body-lg text-body-lg text-outline line-through">{formatVnd(comparePrice)}</span>
                <Badge tone="primary" className="font-bold">-{pct}%</Badge>
              </>}
            </div>

            <div className="flex flex-wrap gap-space-md font-body-md text-body-md text-on-surface-variant">
              <span>{variant ? `Mã: ${variant.sku}` : 'Chưa có SKU'}</span>
              <span className={available > 0 ? 'text-secondary font-semibold' : 'text-error font-semibold'}>{available > 0 ? `Còn ${available} sản phẩm` : 'Hết hàng'}</span>
            </div>

            <fieldset className="space-y-space-xs">
              <legend className="font-title-md text-title-md text-on-surface mb-space-xs">Tùy chọn sản phẩm</legend>
              {product.variants.length ? <div className="flex flex-wrap gap-space-xs">
                {product.variants.map((item) => {
                  const checked = selectedVariantId === item.id
                  return (
                    <label key={item.id} className={`flex items-center gap-space-xs rounded-lg border px-space-md py-2 cursor-pointer transition-colors font-body-md text-body-md has-focus-visible:ring-2 has-focus-visible:ring-primary ${checked ? 'border-primary bg-primary-fixed text-on-primary-fixed' : 'border-line text-on-surface hover:border-primary'}`}>
                      <input className="sr-only" type="radio" name="variant" value={item.id} checked={checked} onChange={() => { setSelectedVariantId(item.id); setQty(1) }} />
                      <span>{attributesLabel(item.attributes) || 'Mặc định'} · {formatVnd(item.price)} · {item.availableQuantity > 0 ? `Còn ${item.availableQuantity}` : 'Hết hàng'}</span>
                    </label>
                  )
                })}
              </div> : <p className="font-body-md text-body-md text-on-surface-variant">Sản phẩm không có lựa chọn biến thể.</p>}
            </fieldset>

            <div className="flex items-center gap-space-md">
              <span className="font-title-md text-title-md text-on-surface">Số lượng</span>
              <QtyStepper
                value={qty}
                decreaseDisabled={!canBuy || qty <= 1}
                increaseDisabled={!canBuy || qty >= available}
                onDecrease={() => setQty((value) => Math.max(1, value - 1))}
                onIncrease={() => setQty((value) => Math.min(available, value + 1))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              <Button variant="secondary" size="lg" icon="add_shopping_cart" disabled={!canBuy || isAdding} onClick={() => void purchase(false)}>Thêm vào giỏ hàng</Button>
              <Button size="lg" icon="shopping_bag" disabled={!canBuy || isAdding} onClick={() => void purchase(true)}>Mua ngay</Button>
            </div>
            {cartError && <Alert>{cartError}</Alert>}
            {!canBuy && <Alert tone="info">Sản phẩm/biến thể hiện không đủ tồn kho để mua.</Alert>}
          </Card>

          <Card as="section" aria-labelledby="product-specs-title">
            <CardTitle icon="list_alt"><span id="product-specs-title">Thông số sản phẩm</span></CardTitle>
            {detailRows.length > 0
              ? <dl className="divide-y divide-line">
                {detailRows.map((row) => (
                  <div key={row.label} className="grid grid-cols-3 gap-space-md py-2 font-body-md text-body-md">
                    <dt className="text-on-surface-variant">{row.label}</dt>
                    <dd className="col-span-2 text-on-surface">{row.value}</dd>
                  </div>
                ))}
              </dl>
              : <p className="font-body-md text-body-md text-on-surface-variant">Thông số sản phẩm đang được cập nhật.</p>}
          </Card>
        </div>
      </div>
    </Page>
  )
}
